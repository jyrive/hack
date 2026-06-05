import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const SUPPORTED_LANGUAGES = new Set(['en', 'sv', 'fi']);

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = env.OPENAI_API_KEY;
	if (!apiKey) {
		return json({ error: 'OPENAI_API_KEY is not configured on the server.' }, { status: 500 });
	}

	const incomingForm = await request.formData();
	const audio = incomingForm.get('audio');
	const language = incomingForm.get('language');

	if (!(audio instanceof File)) {
		return json({ error: 'Missing audio file.' }, { status: 400 });
	}

	if (typeof language !== 'string' || !SUPPORTED_LANGUAGES.has(language)) {
		return json({ error: 'Invalid language. Use en, sv, or fi.' }, { status: 400 });
	}

	const formData = new FormData();
	formData.append('model', 'whisper-1');
	formData.append('language', language);
	formData.append('response_format', 'json');
	formData.append('file', audio, audio.name || 'recording.webm');

	const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`
		},
		body: formData
	});

	const payload = (await response.json()) as { text?: string; error?: { message?: string } };

	if (!response.ok) {
		return json(
			{ error: payload?.error?.message ?? 'Transcription request failed.' },
			{ status: response.status }
		);
	}

	return json({ text: payload.text ?? '' });
};