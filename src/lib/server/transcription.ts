import { env } from '$env/dynamic/private';

const SUPPORTED_LANGUAGES = new Set(['en', 'sv', 'fi']);

export type SupportedLanguage = 'en' | 'sv' | 'fi';

export function isSupportedLanguage(language: string): language is SupportedLanguage {
	return SUPPORTED_LANGUAGES.has(language);
}

export async function transcribeAudioFile(audio: File, language: SupportedLanguage): Promise<string> {
	const apiKey = env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new Error('OPENAI_API_KEY is not configured on the server.');
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
		throw new Error(payload?.error?.message ?? 'Transcription request failed.');
	}

	return payload.text?.trim() ?? '';
}
