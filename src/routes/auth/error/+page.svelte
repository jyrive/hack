<script lang="ts">
	import { page } from '$app/state';

	const reason = $derived(page.url.searchParams.get('reason'));
	const isConfigIssue = $derived(reason === 'config_missing');
	const detail = $derived(page.url.searchParams.get('detail'));
</script>

<main>
	<h1>Sign-in failed</h1>
	{#if isConfigIssue}
		<p>Authentication is not configured in the server runtime environment.</p>
	{:else}
		<p>Please try again.</p>
	{/if}
	{#if detail}
		<p class="detail">{detail}</p>
	{/if}
	<a href="/auth/signin" data-sveltekit-reload>Continue with Google</a>
</main>

<style>
	main {
		min-height: 100dvh;
		display: grid;
		place-content: center;
		gap: 0.8rem;
		text-align: center;
		font-family: 'Nunito', 'Avenir Next', 'Segoe UI', sans-serif;
		padding: 1rem;
	}

	a {
		display: inline-block;
		padding: 0.7rem 1rem;
		border-radius: 999px;
		background: #1967d2;
		color: #fff;
		text-decoration: none;
		font-weight: 700;
	}

	.detail {
		max-width: 48rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
			'Courier New', monospace;
		font-size: 0.8rem;
		opacity: 0.8;
		word-break: break-word;
	}
</style>