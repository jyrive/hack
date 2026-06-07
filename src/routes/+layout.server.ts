import type { LayoutServerLoad } from './$types';
import { getAlertsWithLinkedWorkOrders, type AlertWithLinked } from '$lib/server/alerts';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	let buildings: string[] = [];
	let buildingAddresses: Record<string, string> = {};
	let alerts: AlertWithLinked[] = [];

	const { data, error } = await locals.supabase
		.from('work_orders')
		.select('customer_site_name, site_address')
		.not('customer_site_name', 'is', null)
		.limit(500);

	if (!error && data) {
		const names = new Set<string>();

		for (const row of data) {
			const name = row.customer_site_name;
			if (!name) continue;

			names.add(name);

			const address = row.site_address?.trim();
			if (address && !buildingAddresses[name]) {
				buildingAddresses[name] = address;
			}
		}

		buildings = [...names].sort();
	}

	if (locals.user) {
		alerts = await getAlertsWithLinkedWorkOrders({
			supabase: locals.supabase,
			buildingCandidates: buildings,
			seedIfEmpty: true
		});
	}

	return {
		user: locals.user,
		buildings,
		buildingAddresses,
		selectedBuilding: url.searchParams.get('building') ?? '',
		alerts
	};
};