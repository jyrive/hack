import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type WorkOrderRow = {
	customer_site_name: string | null;
	priority_id: number | null;
	sla_end_at: string | null;
};

export const load: PageServerLoad = async ({ locals, url }) => {
	const selectedBuilding = url.searchParams.get('building');

	let query = locals.supabase
		.from('work_orders')
		.select('customer_site_name, priority_id, sla_end_at')
		.eq('is_open', true)
		.limit(500);

	if (selectedBuilding) {
		query = query.eq('customer_site_name', selectedBuilding);
	}

	const { data, error: queryError } = await query;

	if (queryError) {
		throw error(500, queryError.message);
	}

	const rows: WorkOrderRow[] = data ?? [];
	const now = Date.now();
	const withinDay = now + 24 * 60 * 60 * 1000;

	const totalOpen = rows.length;
	const criticalOpen = rows.filter((row) => row.priority_id === 1).length;
	const overdueOpen = rows.filter((row) => row.sla_end_at && new Date(row.sla_end_at).getTime() < now).length;
	const dueSoon = rows.filter((row) => {
		if (!row.sla_end_at) return false;
		const ts = new Date(row.sla_end_at).getTime();
		return ts >= now && ts <= withinDay;
	}).length;

	const buildingCounts = new Map<string, number>();
	for (const row of rows) {
		const key = row.customer_site_name || 'Unknown site';
		buildingCounts.set(key, (buildingCounts.get(key) ?? 0) + 1);
	}

	const topBuildings = [...buildingCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 4)
		.map(([name, openCount]) => ({
			name,
			openCount,
			completionToday: Math.max(55, 95 - openCount * 3),
			cleaningScore: Math.max(60, 96 - openCount * 2)
		}));

	const totalForShare = topBuildings.reduce((acc, item) => acc + item.openCount, 0) || 1;
	const workloadShare = topBuildings.map((item) => ({
		...item,
		sharePct: Math.round((item.openCount / totalForShare) * 100)
	}));

	return {
		selectedBuilding: selectedBuilding ?? '',
		kpis: {
			totalOpen,
			criticalOpen,
			overdueOpen,
			dueSoon
		},
		workloadShare
	};
};
