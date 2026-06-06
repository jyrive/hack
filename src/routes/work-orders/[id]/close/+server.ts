import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	const workOrderId = params.id;

	const { data: workOrder, error: fetchError } = await locals.supabase
		.from('work_orders')
		.select('id, is_open')
		.eq('id', workOrderId)
		.single();

	if (fetchError || !workOrder) {
		return json({ error: fetchError?.message ?? 'Work order not found.' }, { status: 404 });
	}

	if (!workOrder.is_open) {
		return json({ ok: true, alreadyClosed: true });
	}

	const { error: updateError } = await locals.supabase
		.from('work_orders')
		.update({ is_open: false })
		.eq('id', workOrderId);

	if (updateError) {
		return json({ error: updateError.message }, { status: 500 });
	}

	await locals.supabase.from('work_order_events').insert({
		work_order_id: workOrderId,
		event_type: 'work_order_closed',
		note_text: 'Work order closed.',
		created_by: locals.user.id
	});

	return json({ ok: true });
};