import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type PhotoRow = {
	id: string;
	event_id: string | null;
	storage_bucket: string;
	storage_path: string;
	caption_text: string | null;
	created_at: string;
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const workOrderId = params.id;

	const { data: workOrder, error: workOrderError } = await locals.supabase
		.from('work_orders')
		.select('*')
		.eq('id', workOrderId)
		.single();

	if (workOrderError || !workOrder) {
		throw error(404, 'Work order not found.');
	}

	const { data: events, error: eventsError } = await locals.supabase
		.from('work_order_events')
		.select('*')
		.eq('work_order_id', workOrderId)
		.order('created_at', { ascending: false })
		.limit(200);

	if (eventsError) {
		throw error(500, eventsError.message);
	}

	const { data: photos, error: photosError } = await locals.supabase
		.from('work_order_photos')
		.select('*')
		.eq('work_order_id', workOrderId)
		.order('created_at', { ascending: false })
		.limit(200);

	if (photosError) {
		throw error(500, photosError.message);
	}

	const photosWithUrls: Array<PhotoRow & { signedUrl: string | null }> = [];
	for (const photo of (photos ?? []) as PhotoRow[]) {
		const { data: signed } = await locals.supabase.storage
			.from(photo.storage_bucket)
			.createSignedUrl(photo.storage_path, 60 * 60);

		photosWithUrls.push({
			...photo,
			signedUrl: signed?.signedUrl ?? null
		});
	}

	const photoByEventId = new Map<string, PhotoRow & { signedUrl: string | null }>();
	for (const photo of photosWithUrls) {
		if (photo.event_id) {
			photoByEventId.set(photo.event_id, photo);
		}
	}

	return {
		workOrder,
		events: events ?? [],
		photos: photosWithUrls,
		photoByEventId: Object.fromEntries(photoByEventId)
	};
};
