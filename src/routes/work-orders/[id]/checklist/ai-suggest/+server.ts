import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { suggestChecklistItems } from '$lib/server/checklist_ai';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	const payload = (await request.json().catch(() => ({}))) as {
		contextText?: string;
	};

	const contextText = typeof payload.contextText === 'string' ? payload.contextText.trim() : '';
	if (!contextText) {
		return json({ error: 'Context text is required.' }, { status: 400 });
	}

	const { data: workOrder, error: workOrderError } = await locals.supabase
		.from('work_orders')
		.select('id, work_order_type_eng')
		.eq('id', params.id)
		.single();

	if (workOrderError || !workOrder) {
		return json({ error: workOrderError?.message ?? 'Work order not found.' }, { status: 404 });
	}

	try {
		const items = await suggestChecklistItems({
			workOrderType: (workOrder.work_order_type_eng as string) || 'General service',
			contextText
		});

		return json({ items });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Could not generate checklist suggestions.' },
			{ status: 500 }
		);
	}
};
