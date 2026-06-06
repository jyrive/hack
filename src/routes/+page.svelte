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
	<h1>Google Speech Playground</h1>
	<p class="subtitle">Record your voice, pick a language, and transcribe instantly.</p>

	<section class="card controls">
		<label for="language">Language</label>
		<select id="language" bind:value={selectedLanguage} disabled={isRecording || isTranscribing}>
			{#each languageOptions as option}
				<option value={option.code}>{option.label}</option>
			{/each}
		</select>

		<div class="actions">
			{#if !isRecording}
				<button class="primary" onclick={startRecording} disabled={isTranscribing}>Start recording</button>
			{:else}
				<button class="danger" onclick={stopRecording} disabled={isTranscribing}>Stop recording</button>
			{/if}
		</div>

		<p class="status">{status}</p>

		{#if isTranscribing}
			<p class="hint">Transcribing...</p>
		{/if}

		{#if error}
			<p class="error">Error: {error}</p>
		{/if}
	</section>

	<section class="card transcript">
		<h2>Transcript</h2>
		<textarea readonly rows="8" value={transcript} placeholder="Your transcript will appear here"></textarea>
	</section>
</main>

<style>
	main {
		max-width: 980px;
		margin: 2rem auto;
		padding: 0.4rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	h1,
	h2 {
		margin: 0;
		font-family: 'Space Grotesk', 'Nunito', sans-serif;
	}

	.subtitle {
		margin: 0;
		font-weight: 700;
		color: #2d4863;
	}

	.card {
		background: #ffffff;
		border-radius: 1rem;
		border: 1px solid #d8deea;
		padding: 1rem;
		box-shadow: 0 12px 34px rgb(27 66 125 / 10%);
	}

	.controls {
		display: grid;
		gap: 0.8rem;
	}

	.actions {
		display: flex;
		gap: 0.7rem;
	}

	select,
	button,
	textarea {
		font: inherit;
		padding: 0.65rem 0.85rem;
		border-radius: 0.8rem;
		border: 1px solid #d8deea;
	}

	button {
		font-weight: 800;
	}

	button:disabled {
		opacity: 0.6;
		cursor: pointer;
	}

	.primary {
		background: #1967d2;
		border-color: #1967d2;
		color: #fff;
	}

	.danger {
		background: #ea4335;
		border-color: #ea4335;
		color: #fff;
	}

	.status {
		font-weight: 700;
		color: #1f4d7c;
	}

	.hint {
		margin: 0;
		font-weight: 700;
		color: #1967d2;
	}

	.error {
		margin: 0;
		color: #b3261e;
		font-weight: 700;
	}

	textarea {
		resize: vertical;
		min-height: 11rem;
		background: #fbfdff;
	}

	@media (max-width: 700px) {
		main {
			margin-top: 1rem;
		}

		.actions {
			flex-direction: column;
		}
	}
</style>
