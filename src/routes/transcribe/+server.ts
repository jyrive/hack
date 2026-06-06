import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isSupportedLanguage, transcribeAudioFile } from '$lib/server/transcription';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	const incomingForm = await request.formData();
	const audio = incomingForm.get('audio');
	const language = incomingForm.get('language');

	if (!(audio instanceof File)) {
		return json({ error: 'Missing audio file.' }, { status: 400 });
	}

	if (typeof language !== 'string' || !isSupportedLanguage(language)) {
		return json({ error: 'Invalid language. Use en, sv, or fi.' }, { status: 400 });
	}

	try {
		const text = await transcribeAudioFile(audio, language);
		return json({ text });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Transcription request failed.' },
			{ status: 500 }
		);
	}
};