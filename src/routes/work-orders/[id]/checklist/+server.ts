import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type ChecklistRequest =
	| { action: 'add'; itemText: string }
	| { action: 'addMany'; items: string[]; source?: 'manual' | 'ai' | 'template' }
	| { action: 'toggle'; itemId: string; isDone: boolean };

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	const { data, error } = await locals.supabase
		.from('work_order_checklist_items')
		.select('id, item_text, is_done, sort_order, source, created_at')
		.eq('work_order_id', params.id)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true });

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ items: data ?? [] });
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	const userId = locals.user.id;
	const payload = (await request.json().catch(() => ({}))) as Partial<ChecklistRequest>;

	if (payload.action === 'add') {
		const itemText = typeof payload.itemText === 'string' ? payload.itemText.trim() : '';
		if (!itemText) {
			return json({ error: 'Checklist item text is required.' }, { status: 400 });
		}

		const { data: latest } = await locals.supabase
			.from('work_order_checklist_items')
			.select('sort_order')
			.eq('work_order_id', params.id)
			.order('sort_order', { ascending: false })
			.limit(1)
			.maybeSingle();

		const sortOrder = (latest?.sort_order ?? 0) + 10;

		const { data: created, error: createError } = await locals.supabase
			.from('work_order_checklist_items')
			.insert({
				work_order_id: params.id,
				item_text: itemText,
				is_done: false,
				sort_order: sortOrder,
				source: 'manual',
				created_by: userId
			})
			.select('id, item_text, is_done, sort_order, source, created_at')
			.single();

		if (createError) {
			return json({ error: createError.message }, { status: 500 });
		}

		return json({ item: created });
	}

	if (payload.action === 'addMany') {
		const source = payload.source === 'ai' || payload.source === 'template' ? payload.source : 'manual';
		const rawItems = Array.isArray(payload.items) ? payload.items : [];
		const items = rawItems
			.map((item) => (typeof item === 'string' ? item.trim() : ''))
			.filter((item, index, all) => item.length > 0 && all.indexOf(item) === index)
			.slice(0, 12);

		if (items.length === 0) {
			return json({ error: 'At least one checklist item is required.' }, { status: 400 });
		}

		const { data: latest } = await locals.supabase
			.from('work_order_checklist_items')
			.select('sort_order')
			.eq('work_order_id', params.id)
			.order('sort_order', { ascending: false })
			.limit(1)
			.maybeSingle();

		let sortOrder = (latest?.sort_order ?? 0) + 10;

		const rows = items.map((itemText) => {
			const row = {
				work_order_id: params.id,
				item_text: itemText,
				is_done: false,
				sort_order: sortOrder,
				source,
				created_by: userId
			};
			sortOrder += 10;
			return row;
		});

		const { data: createdItems, error: createManyError } = await locals.supabase
			.from('work_order_checklist_items')
			.insert(rows)
			.select('id, item_text, is_done, sort_order, source, created_at')
			.order('sort_order', { ascending: true });

		if (createManyError) {
			return json({ error: createManyError.message }, { status: 500 });
		}

		return json({ items: createdItems ?? [] });
	}

	if (payload.action === 'toggle') {
		const itemId = typeof payload.itemId === 'string' ? payload.itemId : '';
		const isDone = !!payload.isDone;
		if (!itemId) {
			return json({ error: 'Checklist item id is required.' }, { status: 400 });
		}

		const { data: updated, error: updateError } = await locals.supabase
			.from('work_order_checklist_items')
			.update({ is_done: isDone })
			.eq('id', itemId)
			.eq('work_order_id', params.id)
			.select('id, item_text, is_done, sort_order, source, created_at')
			.single();

		if (updateError) {
			return json({ error: updateError.message }, { status: 500 });
		}

		return json({ item: updated });
	}

	return json({ error: 'Invalid checklist action.' }, { status: 400 });
};
