import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isSupportedLanguage, transcribeAudioFile } from '$lib/server/transcription';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	const workOrderId = params.id;
	const form = await request.formData();
	const audio = form.get('audio');
	const language = form.get('language');

	if (!(audio instanceof File)) {
		return json({ error: 'Missing audio file.' }, { status: 400 });
	}

	if (typeof language !== 'string' || !isSupportedLanguage(language)) {
		return json({ error: 'Invalid language. Use en, sv, or fi.' }, { status: 400 });
	}

	try {
		const transcript = await transcribeAudioFile(audio, language);

		const { data, error } = await locals.supabase
			.from('work_order_events')
			.insert({
				work_order_id: workOrderId,
				event_type: 'speech_note',
				transcript_text: transcript,
				note_text: transcript,
				created_by: locals.user.id,
				metadata: { language }
			})
			.select('id, transcript_text, created_at')
			.single();

		if (error) {
			return json({ error: error.message }, { status: 500 });
		}

		return json({ event: data });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Speech note creation failed.' },
			{ status: 500 }
		);
	}
};
