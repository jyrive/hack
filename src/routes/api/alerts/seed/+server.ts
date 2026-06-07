import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { seedDemoAlerts } from '$lib/server/alerts';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	const payload = (await request.json().catch(() => ({}))) as { minimumCount?: number };
	const requestedMinimum = Number(payload.minimumCount);
	const minimumCount = Number.isFinite(requestedMinimum)
		? Math.max(1, Math.min(Math.trunc(requestedMinimum), 12))
		: 3;

	const { data: sites } = await locals.supabase
		.from('work_orders')
		.select('customer_site_name')
		.not('customer_site_name', 'is', null)
		.limit(100);

	const buildingCandidates = Array.from(
		new Set((sites ?? []).map((row) => row.customer_site_name).filter((name): name is string => !!name))
	).sort();

	const result = await seedDemoAlerts({
		supabase: locals.supabase,
		buildingCandidates,
		minimumCount
	});

	return json({
		insertedCount: result.insertedCount,
		alerts: result.alerts
	});
};
