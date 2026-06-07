export type AlertRow = {
	id: string;
	building_name: string;
	alert_type: string;
	alert_title: string;
	alert_window: string | null;
	alert_score: number | null;
	status: 'new' | 'dismissed' | 'actioned' | 'resolved';
	reaction_note: string | null;
	linked_work_order_id: string | null;
	dismissed_at: string | null;
	created_at: string;
};

export type AlertWithLinked = AlertRow & {
	linkedWorkOrder: { id: string; wo_no: string; is_open: boolean } | null;
};

type SupabaseLike = {
	from: (table: string) => any;
};

function buildSeedAlerts(buildingCandidates: string[]): Array<{
	building_name: string;
	alert_type: string;
	alert_title: string;
	alert_window: string;
	alert_score: number;
	status: 'new';
	metadata: Record<string, unknown>;
}> {
	const buildings = buildingCandidates.length > 0 ? buildingCandidates : ['Valmet Lentokentankatu 11'];
	const buildingA = buildings[0];
	const buildingB = buildings[1] ?? buildingA;
	const buildingC = buildings[2] ?? buildingA;

	return [
		{
			building_name: buildingA,
			alert_type: 'hvac_anomaly',
			alert_title: 'HVAC alarms spiking above normal level',
			alert_window: 'Last 24h',
			alert_score: 92,
			status: 'new',
			metadata: { source: 'demo-seed', recommended_action: 'Inspect AHU filters and reset alarm state.' }
		},
		{
			building_name: buildingB,
			alert_type: 'cleaning_demand',
			alert_title: 'Cleaning demand anomaly detected on floor 2',
			alert_window: 'Today 06:00-12:00',
			alert_score: 86,
			status: 'new',
			metadata: {
				source: 'demo-seed',
				recommended_action: 'Validate occupancy sensor and dispatch extra cleaning pass.'
			}
		},
		{
			building_name: buildingC,
			alert_type: 'maintenance_plan',
			alert_title: 'Planned maintenance completion rate dropping',
			alert_window: 'Current week',
			alert_score: 79,
			status: 'new',
			metadata: {
				source: 'demo-seed',
				recommended_action: 'Review pending tasks and assign missing technician slots.'
			}
		}
	];
}

async function fetchAlertRows(supabase: SupabaseLike): Promise<AlertRow[]> {
	const { data, error } = await supabase
		.from('alerts')
		.select(
			'id, building_name, alert_type, alert_title, alert_window, alert_score, status, reaction_note, linked_work_order_id, dismissed_at, created_at'
		)
		.order('created_at', { ascending: false })
		.limit(100);

	if (error) {
		return [];
	}

	return (data ?? []) as AlertRow[];
}

export async function seedDemoAlerts(input: {
	supabase: SupabaseLike;
	buildingCandidates?: string[];
	minimumCount?: number;
}): Promise<{ insertedCount: number; alerts: AlertRow[] }> {
	const { supabase, buildingCandidates = [], minimumCount = 3 } = input;

	const current = await fetchAlertRows(supabase);
	if (current.length >= minimumCount) {
		return { insertedCount: 0, alerts: current };
	}

	const existingTitles = new Set(current.map((row) => row.alert_title));
	const seedCandidates = buildSeedAlerts(buildingCandidates);
	const missing = seedCandidates.filter((item) => !existingTitles.has(item.alert_title));

	if (missing.length === 0) {
		return { insertedCount: 0, alerts: current };
	}

	const toInsert = missing.slice(0, Math.max(0, minimumCount - current.length));
	if (toInsert.length > 0) {
		await supabase.from('alerts').insert(toInsert);
	}

	const updated = await fetchAlertRows(supabase);
	return { insertedCount: toInsert.length, alerts: updated };
}

export async function getAlertsWithLinkedWorkOrders(input: {
	supabase: SupabaseLike;
	buildingCandidates?: string[];
	seedIfEmpty?: boolean;
}): Promise<AlertWithLinked[]> {
	const { supabase, buildingCandidates = [], seedIfEmpty = false } = input;

	let rows = await fetchAlertRows(supabase);

	if (seedIfEmpty && rows.length === 0) {
		const seeded = await seedDemoAlerts({ supabase, buildingCandidates, minimumCount: 3 });
		rows = seeded.alerts;
	}

	const linkedIds = [...new Set(rows.map((row) => row.linked_work_order_id).filter(Boolean))] as string[];
	let linkedMap: Record<string, { id: string; wo_no: string; is_open: boolean }> = {};

	if (linkedIds.length > 0) {
		const { data: linkedRows, error: linkedError } = await supabase
			.from('work_orders')
			.select('id, wo_no, is_open')
			.in('id', linkedIds);

		if (!linkedError && linkedRows) {
			linkedMap = Object.fromEntries(
				linkedRows.map((row: { id: string; wo_no: string; is_open: boolean }) => [
					row.id,
					{ id: row.id, wo_no: row.wo_no, is_open: !!row.is_open }
				])
			);
		}
	}

	return rows.map((row) => ({
		...row,
		linkedWorkOrder: row.linked_work_order_id ? linkedMap[row.linked_work_order_id] ?? null : null
	}));
}
