import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	let buildings: string[] = [];

	const { data, error } = await locals.supabase
		.from('work_orders')
		.select('customer_site_name')
		.not('customer_site_name', 'is', null)
		.limit(500);

	if (!error && data) {
		buildings = [...new Set(data.map((row) => row.customer_site_name).filter(Boolean))].sort();
	}

	return {
		user: locals.user,
		buildings,
		selectedBuilding: url.searchParams.get('building') ?? ''
	};
};