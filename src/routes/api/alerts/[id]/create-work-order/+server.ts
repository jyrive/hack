import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function mapAlertTypeToWorkOrderType(alertType: string): string {
	if (alertType.includes('hvac')) return 'HVAC Service';
	if (alertType.includes('clean')) return 'Cleaning Service';
	if (alertType.includes('backlog')) return 'Backlog Follow-up';
	return 'General Service';
}

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	const userId = locals.user.id;

	const alertId = params.id;
	const body = await request.json().catch(() => ({}));
	const existingWorkOrderId = typeof body?.existingWorkOrderId === 'string' ? body.existingWorkOrderId : null;

	const { data: alert, error: alertError } = await locals.supabase
		.from('alerts')
		.select('id, building_name, alert_type, alert_title, alert_window, alert_score, linked_work_order_id')
		.eq('id', alertId)
		.single();

	if (alertError || !alert) {
		return json({ error: alertError?.message ?? 'Alert not found.' }, { status: 404 });
	}

	let workOrderId = existingWorkOrderId;
	let woNo = '';

	if (workOrderId) {
		const { data: existing, error: existingError } = await locals.supabase
			.from('work_orders')
			.select('id, wo_no')
			.eq('id', workOrderId)
			.single();

		if (existingError || !existing) {
			return json({ error: existingError?.message ?? 'Existing work order not found.' }, { status: 404 });
		}

		woNo = existing.wo_no as string;
	} else {
		const generatedWoNo = `ALERT-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
		const workOrderType = mapAlertTypeToWorkOrderType(String(alert.alert_type ?? 'general'));

		const { data: created, error: createError } = await locals.supabase
			.from('work_orders')
			.insert({
				wo_no: generatedWoNo,
				customer_site_name: alert.building_name,
				work_order_type_eng: workOrderType,
				priority_id: alert.alert_score && alert.alert_score > 80 ? 1 : 2,
				is_open: true,
				source_payload: {
					source: 'alert',
					alert_id: alert.id,
					alert_type: alert.alert_type,
					alert_window: alert.alert_window,
					alert_score: alert.alert_score,
					alert_title: alert.alert_title
				}
			})
			.select('id, wo_no')
			.single();

		if (createError || !created) {
			return json({ error: createError?.message ?? 'Could not create work order.' }, { status: 500 });
		}

		workOrderId = created.id as string;
		woNo = created.wo_no as string;

		const { data: templates } = await locals.supabase
			.from('work_order_checklist_templates')
			.select('item_text, sort_order')
			.eq('work_order_type_eng', workOrderType)
			.order('sort_order', { ascending: true })
			.limit(30);

		if (templates && templates.length > 0) {
			await locals.supabase.from('work_order_checklist_items').insert(
				templates.map((item) => ({
					work_order_id: workOrderId,
					item_text: item.item_text,
					sort_order: item.sort_order ?? 0,
					source: 'template',
					created_by: userId
				}))
			);
		}
	}

	const reactionText = existingWorkOrderId
		? `Alert linked to existing work order ${woNo}.`
		: `Work order ${woNo} created from alert.`;

	const { error: updateError } = await locals.supabase
		.from('alerts')
		.update({
			status: 'actioned',
			linked_work_order_id: workOrderId,
			reaction_note: reactionText,
			updated_at: new Date().toISOString()
		})
		.eq('id', alertId);

	if (updateError) {
		return json({ error: updateError.message }, { status: 500 });
	}

	await locals.supabase.from('alert_reactions').insert({
		alert_id: alertId,
		reaction_type: existingWorkOrderId ? 'linked_existing_work_order' : 'work_order_created',
		note_text: reactionText,
		work_order_id: workOrderId,
		created_by: userId
	});

	await locals.supabase.from('work_order_events').insert({
		work_order_id: workOrderId,
		event_type: 'created_from_alert',
		note_text: reactionText,
		metadata: { alert_id: alertId },
		created_by: userId
	});

	return json({
		ok: true,
		workOrder: {
			id: workOrderId,
			woNo
		}
	});
};
