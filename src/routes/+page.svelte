<script lang="ts">
	type LanguageOption = {
		code: 'en' | 'sv' | 'fi';
		label: string;
	};

	const languageOptions: LanguageOption[] = [
		{ code: 'en', label: 'English' },
		{ code: 'sv', label: 'Swedish' },
		{ code: 'fi', label: 'Finnish' }
	];

	let selectedLanguage = $state<LanguageOption['code']>('en');
	let isRecording = $state(false);
	let isTranscribing = $state(false);
	let error = $state('');
	let transcript = $state('');
    let status = $state('Tap Start recording to begin.');

	let mediaRecorder: MediaRecorder | null = null;
	let recordedChunks: Blob[] = [];
	let recordedMimeType = '';

	function pickSupportedMimeType(): string | undefined {
		const candidates = [
			'audio/webm;codecs=opus',
			'audio/webm',
			'audio/mp4',
			'audio/mpeg'
		];

		for (const type of candidates) {
			if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
				return type;
			}
		}

		return undefined;
	}

	function extensionForMimeType(type: string): string {
		if (type.includes('mp4')) return 'm4a';
		if (type.includes('mpeg')) return 'mp3';
		if (type.includes('ogg')) return 'ogg';
		return 'webm';
	}

	async function startRecording() {
		error = '';
		transcript = '';
		status = 'Preparing microphone...';

		if (!navigator.mediaDevices?.getUserMedia) {
			error = 'Microphone recording is not supported in this browser.';
			status = 'Microphone unavailable in this browser.';
			return;
		}

		if (!window.isSecureContext) {
			error = 'Microphone access requires HTTPS (or localhost during development).';
			status = 'Secure context required.';
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mimeType = pickSupportedMimeType();
			mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
			recordedMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
			recordedChunks = [];

			mediaRecorder.ondataavailable = (event: BlobEvent) => {
				if (event.data.size > 0) {
					recordedChunks.push(event.data);
				}
			};

			mediaRecorder.onstop = async () => {
				stream.getTracks().forEach((track) => track.stop());
				status = 'Uploading audio and transcribing...';
				await transcribeRecording();
			};

			mediaRecorder.start();
			isRecording = true;
			status = 'Recording... Tap Stop when finished.';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not access the microphone.';
			status = 'Could not start recording.';
		}
	}

	function stopRecording() {
		if (!mediaRecorder || mediaRecorder.state !== 'recording') {
			return;
		}
		mediaRecorder.stop();
		isRecording = false;
		status = 'Processing recording...';
	}

	async function transcribeRecording() {
		if (recordedChunks.length === 0) {
			error = 'No audio captured. Please try again.';
			status = 'No audio captured.';
			return;
		}

		isTranscribing = true;
		error = '';

		try {
			const audioBlob = new Blob(recordedChunks, { type: recordedMimeType || 'audio/webm' });
			const extension = extensionForMimeType(audioBlob.type || recordedMimeType);
			const form = new FormData();
			form.append('audio', audioBlob, `recording.${extension}`);
			form.append('language', selectedLanguage);

			const response = await fetch('/transcribe', {
				method: 'POST',
				body: form
			});

			const data = (await response.json()) as { text?: string; error?: string };
			if (!response.ok) {
				throw new Error(data.error ?? `Transcription failed with status ${response.status}`);
			}

			transcript = data.text?.trim() || '[No text returned]';
			status = 'Transcription complete.';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Transcription failed.';
			status = 'Transcription failed.';
		} finally {
			isTranscribing = false;
		}
	}
</script>

<main>
	<h1>Whisper Microphone Test</h1>

	<label for="language">Language</label>
	<select id="language" bind:value={selectedLanguage} disabled={isRecording || isTranscribing}>
		{#each languageOptions as option}
			<option value={option.code}>{option.label}</option>
		{/each}
	</select>

	<div>
		{#if !isRecording}
			<button onclick={startRecording} disabled={isTranscribing}>Start recording</button>
		{:else}
			<button onclick={stopRecording} disabled={isTranscribing}>Stop recording</button>
		{/if}
	</div>

	<p>{status}</p>

	{#if isTranscribing}
		<p>Transcribing...</p>
	{/if}

	{#if error}
		<p style="color: #b00020">Error: {error}</p>
	{/if}

	<h2>Transcript</h2>
	<textarea readonly rows="8" value={transcript} placeholder="Your transcript will appear here"></textarea>
</main>

<style>
	main {
		max-width: 720px;
		margin: 2rem auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		font-family: system-ui, sans-serif;
	}

	select,
	button,
	textarea {
		font: inherit;
		padding: 0.6rem 0.8rem;
	}

	button {
		cursor: pointer;
	}
</style>
