<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	type LanguageOption = {
		code: 'en' | 'sv' | 'fi';
		label: string;
	};

	const languageOptions: LanguageOption[] = [
		{ code: 'en', label: 'English' },
		{ code: 'sv', label: 'Swedish' },
		{ code: 'fi', label: 'Finnish' }
	];

	let { data }: { data: PageData } = $props();
	let selectedLanguage = $state<LanguageOption['code']>('en');
	let isRecording = $state(false);
	let busy = $state(false);
	let status = $state('Use speech to add a new timeline note.');
	let error = $state('');
	let caption = $state('');

	let mediaRecorder: MediaRecorder | null = null;
	let recordedChunks: Blob[] = [];
	let recordedMimeType = '';
	let photoFile = $state<File | null>(null);

	function pickSupportedMimeType(): string | undefined {
		const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg'];
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
				status = 'Uploading audio and creating timeline note...';
				await submitSpeechNote();
			};

			mediaRecorder.start();
			isRecording = true;
			status = 'Recording... Tap Stop when finished.';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not access microphone.';
			status = 'Could not start recording.';
		}
	}

	function stopRecording() {
		if (!mediaRecorder || mediaRecorder.state !== 'recording') {
			return;
		}
		mediaRecorder.stop();
		isRecording = false;
	}

	async function submitSpeechNote() {
		if (recordedChunks.length === 0) {
			error = 'No audio captured. Please try again.';
			status = 'No audio captured.';
			return;
		}

		busy = true;
		error = '';
		try {
			const audioBlob = new Blob(recordedChunks, { type: recordedMimeType || 'audio/webm' });
			const extension = extensionForMimeType(audioBlob.type || recordedMimeType);
			const form = new FormData();
			form.append('audio', audioBlob, `recording.${extension}`);
			form.append('language', selectedLanguage);

			const response = await fetch(`/work-orders/${data.workOrder.id}/speech-note`, {
				method: 'POST',
				body: form
			});

			const payload = (await response.json()) as { error?: string };
			if (!response.ok) {
				throw new Error(payload.error ?? 'Could not create speech note.');
			}

			status = 'Speech note added to timeline.';
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Speech note failed.';
			status = 'Speech note failed.';
		} finally {
			busy = false;
		}
	}

	async function uploadPhoto() {
		if (!photoFile) {
			error = 'Choose a photo first.';
			return;
		}

		busy = true;
		error = '';
		status = 'Uploading photo...';

		try {
			const form = new FormData();
			form.append('photo', photoFile);
			if (caption.trim()) {
				form.append('caption', caption.trim());
			}

			const response = await fetch(`/work-orders/${data.workOrder.id}/photos`, {
				method: 'POST',
				body: form
			});

			const payload = (await response.json()) as { error?: string };
			if (!response.ok) {
				throw new Error(payload.error ?? 'Photo upload failed.');
			}

			photoFile = null;
			caption = '';
			status = 'Photo added to timeline.';
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Photo upload failed.';
			status = 'Photo upload failed.';
		} finally {
			busy = false;
		}
	}
</script>

<main class="container">
	<a class="back" href="/">Back to open work orders</a>

	<section class="card work-order-summary">
		<h1>WO #{data.workOrder.wo_no}</h1>
		<p class="site">{data.workOrder.customer_site_name || 'Unknown site'}</p>
		<p>{data.workOrder.site_address || 'No address'}</p>
		<div class="chips">
			<span>Type: {data.workOrder.work_order_type_eng || 'Work order'}</span>
			<span>Priority: {data.workOrder.priority_id ?? '-'}</span>
			<span>SLA: {data.workOrder.sla_end_at ? new Date(data.workOrder.sla_end_at).toLocaleString() : '-'}</span>
		</div>
	</section>

	<section class="card actions-card">
		<h2>Speech Note</h2>
		<p>Field update by voice only. Record and save directly to timeline.</p>
		<label for="language">Language</label>
		<select id="language" bind:value={selectedLanguage} disabled={isRecording || busy}>
			{#each languageOptions as option}
				<option value={option.code}>{option.label}</option>
			{/each}
		</select>

		<div class="actions">
			{#if !isRecording}
				<button class="primary" onclick={startRecording} disabled={busy}>Start recording</button>
			{:else}
				<button class="danger" onclick={stopRecording} disabled={busy}>Stop recording</button>
			{/if}
		</div>
	</section>

	<section class="card actions-card">
		<h2>Attach Photo</h2>
		<p>Add a photo proof to the timeline.</p>
		<input
			type="file"
			accept="image/*"
			onchange={(event) => {
				const target = event.currentTarget as HTMLInputElement;
				photoFile = target.files?.[0] ?? null;
			}}
		/>
		<input type="text" bind:value={caption} placeholder="Optional caption" />
		<button class="primary" onclick={uploadPhoto} disabled={busy}>Upload photo</button>
	</section>

	<section class="card">
		<h2>Timeline</h2>
		<p class="status">{status}</p>
		{#if error}
			<p class="error">Error: {error}</p>
		{/if}

		{#if data.events.length === 0}
			<p>No timeline events yet.</p>
		{:else}
			<div class="timeline">
				{#each data.events as event}
					<article class="event">
						<div class="event-head">
							<strong>{event.event_type}</strong>
							<span>{new Date(event.created_at).toLocaleString()}</span>
						</div>
						{#if event.transcript_text}
							<p>{event.transcript_text}</p>
						{:else if event.note_text}
							<p>{event.note_text}</p>
						{/if}

						{#if data.photoByEventId[event.id]?.signedUrl}
							<img src={data.photoByEventId[event.id].signedUrl} alt="Timeline attachment" loading="lazy" />
						{/if}
					</article>
				{/each}
			</div>
		{/if}
	</section>
</main>

<style>
	.container {
		max-width: 980px;
		margin: 0 auto;
		display: grid;
		gap: 0.9rem;
	}

	.back {
		text-decoration: none;
		font-weight: 800;
		color: #185abc;
	}

	.card {
		background: #fff;
		border: 1px solid #d8deea;
		border-radius: 1rem;
		padding: 1rem;
		box-shadow: 0 10px 26px rgb(27 66 125 / 10%);
	}

	h1,
	h2 {
		margin: 0;
		font-family: 'Space Grotesk', 'Nunito', sans-serif;
	}

	.site {
		font-weight: 800;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.7rem;
	}

	.chips span {
		font-size: 0.85rem;
		font-weight: 700;
		padding: 0.25rem 0.65rem;
		border-radius: 999px;
		background: #e8f0fe;
		color: #185abc;
	}

	.actions-card {
		display: grid;
		gap: 0.6rem;
	}

	select,
	input,
	button {
		font: inherit;
		padding: 0.65rem 0.85rem;
		border-radius: 0.8rem;
		border: 1px solid #d8deea;
	}

	button {
		font-weight: 800;
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

	.actions {
		display: flex;
		gap: 0.7rem;
	}

	.status {
		font-weight: 700;
		color: #1f4d7c;
	}

	.error {
		color: #b3261e;
		font-weight: 700;
	}

	.timeline {
		display: grid;
		gap: 0.7rem;
	}

	.event {
		border: 1px solid #d8deea;
		border-radius: 0.8rem;
		padding: 0.7rem;
		display: grid;
		gap: 0.5rem;
	}

	.event-head {
		display: flex;
		justify-content: space-between;
		gap: 0.7rem;
		font-size: 0.9rem;
	}

	img {
		width: 100%;
		max-width: 420px;
		border-radius: 0.7rem;
		border: 1px solid #d8deea;
	}

	@media (max-width: 700px) {
		.card {
			padding: 0.85rem;
		}

		.actions {
			flex-direction: column;
		}
	}
</style>
