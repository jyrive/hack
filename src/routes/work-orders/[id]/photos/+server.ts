import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	const workOrderId = params.id;
	const form = await request.formData();
	const photo = form.get('photo');
	const caption = form.get('caption');

	if (!(photo instanceof File)) {
		return json({ error: 'Missing image file.' }, { status: 400 });
	}

	if (!photo.type.startsWith('image/')) {
		return json({ error: 'Only image files are supported.' }, { status: 400 });
	}

	if (photo.size > MAX_FILE_SIZE_BYTES) {
		return json({ error: 'Image is too large. Max 10MB.' }, { status: 400 });
	}

	const bucket = 'work-order-photos';
	const extension = photo.name.includes('.') ? photo.name.split('.').pop() : 'jpg';
	const fileId = crypto.randomUUID();
	const filePath = `work-orders/${workOrderId}/${fileId}.${extension}`;

	const { error: uploadError } = await locals.supabase.storage.from(bucket).upload(filePath, photo, {
		contentType: photo.type,
		upsert: false
	});

	if (uploadError) {
		return json({ error: uploadError.message }, { status: 500 });
	}

	const { data: event, error: eventError } = await locals.supabase
		.from('work_order_events')
		.insert({
			work_order_id: workOrderId,
			event_type: 'photo_added',
			note_text: typeof caption === 'string' ? caption : null,
			created_by: locals.user.id
		})
		.select('id, created_at')
		.single();

	if (eventError || !event) {
		return json({ error: eventError?.message ?? 'Could not create timeline event.' }, { status: 500 });
	}

	const { data: photoRow, error: photoError } = await locals.supabase
		.from('work_order_photos')
		.insert({
			work_order_id: workOrderId,
			event_id: event.id,
			storage_bucket: bucket,
			storage_path: filePath,
			mime_type: photo.type,
			file_size_bytes: photo.size,
			caption_text: typeof caption === 'string' ? caption : null,
			created_by: locals.user.id
		})
		.select('id, event_id, storage_bucket, storage_path, caption_text, created_at')
		.single();

	if (photoError) {
		return json({ error: photoError.message }, { status: 500 });
	}

	const { data: signed } = await locals.supabase.storage
		.from(bucket)
		.createSignedUrl(filePath, 60 * 60);

	return json({
		event,
		photo: {
			...photoRow,
			signedUrl: signed?.signedUrl ?? null
		}
	});
};
