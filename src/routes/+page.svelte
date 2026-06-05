<script lang="ts">
	let message = $state('Loading from server...');
	let error = $state('');

	async function loadMessage() {
		error = '';
		try {
			const response = await fetch('/hello');
			if (!response.ok) {
				throw new Error(`Request failed with status ${response.status}`);
			}
			const data = (await response.json()) as { message: string; now: string };
			message = `${data.message} (${data.now})`;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		}
	}

	loadMessage();
</script>

<main>
	<h1>SvelteKit + Azure Static Web Apps</h1>
	<p>This page calls a SvelteKit server endpoint at <code>/hello</code>.</p>
	<button onclick={loadMessage}>Call server again</button>
	<p>{message}</p>
	{#if error}
		<p style="color: #b00020">Error: {error}</p>
	{/if}
</main>
