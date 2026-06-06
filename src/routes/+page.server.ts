import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const selectedBuilding = url.searchParams.get('building');

	let query = locals.supabase
		.from('work_orders')
		.select(
			'id, wo_no, customer_site_name, site_address, work_order_type_eng, priority_id, sla_end_at, started_at'
		)
		.eq('is_open', true);

	if (selectedBuilding) {
		query = query.eq('customer_site_name', selectedBuilding);
	}

	const { data, error: queryError } = await query
		.order('priority_id', { ascending: false })
		.order('sla_end_at', { ascending: true, nullsFirst: false })
		.limit(100);

	if (queryError) {
		throw error(500, queryError.message);
	}

	return {
		workOrders: data ?? []
	};
};
