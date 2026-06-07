import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	const alertId = params.id;
	const body = await request.json().catch(() => ({}));	
	const note = typeof body?.note === 'string' ? body.note : 'No action required';

	const { data: alert, error: fetchError } = await locals.supabase
		.from('alerts')
		.select('id, status')
		.eq('id', alertId)
		.single();

	if (fetchError || !alert) {
		return json({ error: fetchError?.message ?? 'Alert not found.' }, { status: 404 });
	}

	const { error: updateError } = await locals.supabase
		.from('alerts')
		.update({
			status: 'dismissed',
			reaction_note: note,
			dismissed_by: locals.user.id,
			dismissed_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		})
		.eq('id', alertId);

	if (updateError) {
		return json({ error: updateError.message }, { status: 500 });
	}

	await locals.supabase.from('alert_reactions').insert({
		alert_id: alertId,
		reaction_type: 'dismissed',
		note_text: note,
		created_by: locals.user.id
	});

	return json({ ok: true });
};
