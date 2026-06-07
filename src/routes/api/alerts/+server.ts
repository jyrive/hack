import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAlertsWithLinkedWorkOrders } from '$lib/server/alerts';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	const alerts = await getAlertsWithLinkedWorkOrders({
		supabase: locals.supabase,
		seedIfEmpty: true
	});

	return json({
		alerts
	});
};
