<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
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
	let closingWorkOrder = $state(false);
	let fabMenuOpen = $state(false);
	let speechSheetOpen = $state(false);
	let cameraSheetOpen = $state(false);
	let cameraReady = $state(false);

	let mediaRecorder: MediaRecorder | null = null;
	let recordedChunks: Blob[] = [];
	let recordedMimeType = '';
	let audioContext: AudioContext | null = null;
	let analyser: AnalyserNode | null = null;
	let levelAnimationId: number | null = null;
	let micLevels = $state<number[]>([0.2, 0.28, 0.24, 0.32, 0.22]);
	let isSpeaking = $state(false);
	let photoInput: HTMLInputElement | null = null;
	let cameraVideo = $state<HTMLVideoElement | null>(null);
	let cameraStream: MediaStream | null = null;

	const originalDescription = $derived.by(() => {
		const workOrder = data.workOrder as Record<string, unknown>;
		const candidates = [
			'description',
			'work_order_description',
			'work_description',
			'fault_description',
			'problem_description',
			'short_text',
			'note_text'
		];

		for (const key of candidates) {
			const value = workOrder[key];
			if (typeof value === 'string' && value.trim().length > 0) {
				return value.trim();
			}
		}

		return '';
	});

	function openFabMenu() {
		fabMenuOpen = true;
	}

	function closeSheets() {
		fabMenuOpen = false;
		speechSheetOpen = false;
		cameraSheetOpen = false;
		stopCameraPreview();
	}

	function openSpeechSheet() {
		fabMenuOpen = false;
		speechSheetOpen = true;
	}

	async function openCameraPicker() {
		fabMenuOpen = false;
		error = '';
		status = 'Opening camera...';

		if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
			status = 'Camera preview unavailable. Opening photo picker...';
			photoInput?.click();
			return;
		}

		cameraSheetOpen = true;
		await startCameraPreview();
	}

	function stopCameraPreview() {
		cameraStream?.getTracks().forEach((track) => track.stop());
		cameraStream = null;
		cameraReady = false;
		if (cameraVideo) {
			cameraVideo.srcObject = null;
		}
	}

	async function startCameraPreview() {
		stopCameraPreview();

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: { ideal: 'environment' } },
				audio: false
			});
			cameraStream = stream;
			if (cameraVideo) {
				cameraVideo.srcObject = stream;
				await cameraVideo.play();
			}
			cameraReady = true;
			status = 'Camera ready. Capture a photo.';
		} catch (err) {
			cameraSheetOpen = false;
			error = err instanceof Error ? err.message : 'Could not open camera.';
			status = 'Could not open camera. Opening photo picker...';
			photoInput?.click();
		}
	}

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

	function resetMicVisualizer() {
		micLevels = [0.2, 0.28, 0.24, 0.32, 0.22];
		isSpeaking = false;
	}

	function stopMicVisualizer() {
		if (levelAnimationId !== null) {
			cancelAnimationFrame(levelAnimationId);
			levelAnimationId = null;
		}

		analyser?.disconnect();
		analyser = null;

		if (audioContext) {
			void audioContext.close();
			audioContext = null;
		}

		resetMicVisualizer();
	}

	function startMicVisualizer(stream: MediaStream) {
		stopMicVisualizer();

		audioContext = new AudioContext();
		const source = audioContext.createMediaStreamSource(stream);
		analyser = audioContext.createAnalyser();
		analyser.fftSize = 256;
		source.connect(analyser);

		const samples = new Uint8Array(analyser.frequencyBinCount);
		const barCount = 5;

		const tick = () => {
			if (!analyser) {
				return;
			}

			analyser.getByteTimeDomainData(samples);

			let sum = 0;
			for (const value of samples) {
				const centered = (value - 128) / 128;
				sum += centered * centered;
			}

			const rms = Math.sqrt(sum / samples.length);
			const normalized = Math.min(1, rms * 5);
			isSpeaking = normalized > 0.06;

			micLevels = Array.from({ length: barCount }, (_unused, index) => {
				const wobble = ((index + 1) * 13 + Date.now() / 40) % 10;
				const wobbleFactor = 0.85 + wobble / 50;
				const value = 0.15 + normalized * wobbleFactor;
				return Math.max(0.15, Math.min(1, value));
			});

			levelAnimationId = requestAnimationFrame(tick);
		};

		levelAnimationId = requestAnimationFrame(tick);
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
			startMicVisualizer(stream);
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
				stopMicVisualizer();
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
		isSpeaking = false;
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
			speechSheetOpen = false;
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Speech note failed.';
			status = 'Speech note failed.';
		} finally {
			busy = false;
		}
	}

	async function uploadPhotoFile(file: File) {
		busy = true;
		error = '';
		status = 'Uploading photo...';

		try {
			const form = new FormData();
			form.append('photo', file);

			const response = await fetch(`/work-orders/${data.workOrder.id}/photos`, {
				method: 'POST',
				body: form
			});

			const payload = (await response.json()) as { error?: string };
			if (!response.ok) {
				throw new Error(payload.error ?? 'Photo upload failed.');
			}

			status = 'Photo added to timeline.';
			cameraSheetOpen = false;
			stopCameraPreview();
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Photo upload failed.';
			status = 'Photo upload failed.';
		} finally {
			busy = false;
		}
	}

	async function capturePhotoFromCamera() {
		if (!cameraVideo) {
			error = 'Camera preview is not available.';
			return;
		}

		const width = cameraVideo.videoWidth;
		const height = cameraVideo.videoHeight;
		if (!width || !height) {
			error = 'Camera frame not ready yet.';
			return;
		}

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			error = 'Could not process camera frame.';
			return;
		}

		ctx.drawImage(cameraVideo, 0, 0, width, height);

		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.9);
		});

		if (!blob) {
			error = 'Could not capture image.';
			return;
		}

		const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
		await uploadPhotoFile(file);
	}

	function onPhotoSelected(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const pickedFile = target.files?.[0] ?? null;
		if (pickedFile) {
			void uploadPhotoFile(pickedFile);
		}
		target.value = '';
	}

	async function closeWorkOrder() {
		const confirmed = window.confirm('Close this work order?');
		if (!confirmed) {
			return;
		}

		closingWorkOrder = true;
		error = '';
		status = 'Closing work order...';

		try {
			const response = await fetch(`/work-orders/${data.workOrder.id}/close`, {
				method: 'POST'
			});

			const payload = (await response.json()) as { error?: string };
			if (!response.ok) {
				throw new Error(payload.error ?? 'Could not close work order.');
			}

			status = 'Work order closed.';
			await invalidateAll();
			await goto('/');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not close work order.';
			status = 'Closing failed.';
		} finally {
			closingWorkOrder = false;
		}
	}

</script>

<main class="container">
	<a class="back" href="/">Back to open work orders</a>

	<section class="card">
		<div class="card-head">
			<h2>Timeline</h2>
			{#if data.workOrder.is_open}
				<button class="close-btn" onclick={closeWorkOrder} disabled={busy || closingWorkOrder}>
					{closingWorkOrder ? 'Closing...' : 'Close work order'}
				</button>
			{:else}
				<span class="closed-pill">Closed</span>
			{/if}
		</div>
		<p class="context">WO #{data.workOrder.wo_no} · {data.workOrder.customer_site_name || 'Unknown site'}</p>
		<p class="status">{status}</p>
		{#if error}
			<p class="error">Error: {error}</p>
		{/if}

		{#if data.events.length === 0}
			{#if originalDescription}
				<div class="timeline">
					<article class="event original-event">
						<div class="event-head">
							<strong>original_work_order</strong>
							<span>Initial description</span>
						</div>
						<p>{originalDescription}</p>
					</article>
				</div>
			{:else}
				<p>No timeline events yet.</p>
			{/if}
		{:else}
			<div class="timeline">
				{#if originalDescription}
					<article class="event original-event">
						<div class="event-head">
							<strong>original_work_order</strong>
							<span>Initial description</span>
						</div>
						<p>{originalDescription}</p>
					</article>
				{/if}

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

	<input
		bind:this={photoInput}
		type="file"
		class="hidden-input"
		accept="image/*"
		capture="environment"
		onchange={onPhotoSelected}
	/>

	<button class="fab" aria-label="Add update" onclick={openFabMenu} disabled={busy}>+</button>

	{#if fabMenuOpen}
		<button class="sheet-scrim" aria-label="Close actions" onclick={closeSheets}></button>
		<div class="sheet" role="dialog" aria-modal="true" aria-label="Quick actions">
			<h3>Add update</h3>
			<button class="sheet-action" onclick={openSpeechSheet} disabled={busy}>Record speech note</button>
			<button class="sheet-action" onclick={openCameraPicker} disabled={busy}>Take picture</button>
			<button class="sheet-close" onclick={closeSheets}>Close</button>
		</div>
	{/if}

	{#if speechSheetOpen}
		<button class="sheet-scrim" aria-label="Close speech note" onclick={closeSheets}></button>
		<div class="sheet" role="dialog" aria-modal="true" aria-label="Speech note">
			<h3>Speech note</h3>
			<label for="language">Language</label>
			<select id="language" bind:value={selectedLanguage} disabled={isRecording || busy}>
				{#each languageOptions as option}
					<option value={option.code}>{option.label}</option>
				{/each}
			</select>

			{#if isRecording}
				<div class="recording-indicator" aria-live="polite" aria-label="Recording in progress">
					<span class="recording-dot"></span>
					<span class="recording-text">{isSpeaking ? 'Speaking detected' : 'Listening for speech...'}</span>
					<div class="recording-bars" aria-hidden="true">
						{#each micLevels as level}
							<span style={`transform: scaleY(${level});`}></span>
						{/each}
					</div>
				</div>
			{/if}

			{#if !isRecording}
				<button class="sheet-action" onclick={startRecording} disabled={busy}>Start recording</button>
			{:else}
				<button class="sheet-action danger" onclick={stopRecording} disabled={busy}>Stop recording</button>
			{/if}

			<button class="sheet-close" onclick={closeSheets} disabled={busy}>Close</button>
		</div>
	{/if}

	{#if cameraSheetOpen}
		<button class="sheet-scrim" aria-label="Close camera" onclick={closeSheets}></button>
		<div class="sheet" role="dialog" aria-modal="true" aria-label="Take picture">
			<h3>Take picture</h3>
			<div class="camera-frame">
				<video bind:this={cameraVideo} class="camera-video" playsinline autoplay muted></video>
			</div>
			<button class="sheet-action" onclick={capturePhotoFromCamera} disabled={busy || !cameraReady}>
				Capture photo
			</button>
			<button class="sheet-close" onclick={closeSheets} disabled={busy}>Close</button>
		</div>
	{/if}
</main>

<style>
	.container {
		max-width: 980px;
		margin: 0 auto;
		display: grid;
		gap: 0.9rem;
		padding-bottom: 9rem;
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

	h2 {
		margin: 0;
		font-family: 'Space Grotesk', 'Nunito', sans-serif;
	}

	.card-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.7rem;
	}

	.close-btn {
		border-radius: 999px;
		padding: 0.4rem 0.8rem;
		font-size: 0.82rem;
		font-weight: 800;
		background: #fff1f0;
		border: 1px solid #f7c8c3;
		color: #9c2720;
	}

	.closed-pill {
		display: inline-flex;
		align-items: center;
		border-radius: 999px;
		padding: 0.3rem 0.7rem;
		font-size: 0.78rem;
		font-weight: 800;
		background: #e7f4ea;
		border: 1px solid #b8dfc1;
		color: #1d6a2f;
	}

	.context {
		margin: 0.35rem 0 0.2rem;
		font-weight: 700;
		color: #495c75;
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

	.danger {
		background: #ea4335;
		border-color: #ea4335;
		color: #fff;
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

	.original-event {
		border-color: #bfd4ff;
		background: #f6f9ff;
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

	.hidden-input {
		display: none;
	}

	.fab {
		position: fixed;
		right: 1rem;
		bottom: 6.5rem;
		width: 3.4rem;
		height: 3.4rem;
		border-radius: 999px;
		border: 0;
		background: #1967d2;
		color: #fff;
		font-size: 2rem;
		line-height: 1;
		box-shadow: 0 12px 30px rgb(25 103 210 / 40%);
		z-index: 30;
	}

	.sheet-scrim {
		position: fixed;
		inset: 0;
		background: rgb(22 28 36 / 35%);
		border: 0;
		z-index: 40;
	}

	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 1rem;
		display: grid;
		gap: 0.65rem;
		background: #fff;
		border-radius: 1.2rem 1.2rem 0 0;
		box-shadow: 0 -8px 22px rgb(0 0 0 / 14%);
		z-index: 50;
	}

	h3 {
		margin: 0;
		font-family: 'Space Grotesk', 'Nunito', sans-serif;
	}

	.sheet-action,
	.sheet-close {
		width: 100%;
		font-weight: 800;
	}

	.sheet-action {
		background: #1967d2;
		border-color: #1967d2;
		color: #fff;
	}

	.sheet-close {
		background: #f7f9fc;
		color: #1f4d7c;
	}

	.recording-indicator {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.6rem 0.75rem;
		border-radius: 0.85rem;
		background: #eef4ff;
		border: 1px solid #c6d8ff;
	}

	.recording-dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
		background: #ea4335;
		animation: pulse-dot 1s ease-in-out infinite;
	}

	.recording-text {
		font-size: 0.84rem;
		font-weight: 800;
		color: #244d91;
	}

	.recording-bars {
		display: inline-flex;
		align-items: flex-end;
		gap: 0.2rem;
		height: 1rem;
		margin-left: auto;
	}

	.recording-bars span {
		width: 0.16rem;
		height: 1rem;
		transform-origin: bottom center;
		border-radius: 999px;
		background: #2f67c8;
		transition: transform 90ms linear, opacity 90ms linear;
	}

	@keyframes pulse-dot {
		0%,
		100% {
			transform: scale(1);
			opacity: 1;
		}

		50% {
			transform: scale(1.28);
			opacity: 0.55;
		}
	}

	.camera-frame {
		width: 100%;
		border-radius: 1rem;
		overflow: hidden;
		background: #0f1724;
		min-height: 12rem;
	}

	.camera-video {
		width: 100%;
		height: auto;
		display: block;
	}

	@media (max-width: 700px) {
		.card {
			padding: 0.85rem;
		}

		.fab {
			right: 0.85rem;
			bottom: 6rem;
		}
	}
</style>
