<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/site.webmanifest" />
	<link rel="apple-touch-icon" href="/icons/app-icon.svg" />
	<meta name="theme-color" content="#0b3d91" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="mobile-web-app-capable" content="yes" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;700;800&family=Space+Grotesk:wght@600;700&display=swap"
	/>
</svelte:head>

<div class="app-shell">
	<header class="top-bar">
		<div class="brand">
			<span class="dot blue"></span>
			<span class="dot red"></span>
			<span class="dot yellow"></span>
			<span class="dot green"></span>
			<strong>Speech Sprint</strong>
		</div>
		<div class="user-area">
			<span class="email">{data.user?.email}</span>
			<form method="POST" action="/auth/signout">
				<button type="submit">Sign out</button>
			</form>
		</div>
	</header>

	{@render children()}
</div>

<style>
	:global(:root) {
		--md3-primary: #1967d2;
		--md3-on-primary: #ffffff;
		--md3-surface: #f9fbff;
		--md3-surface-container: #ffffff;
		--md3-outline: #d8deea;
		--md3-text: #12304a;
		--md3-shadow: 0 18px 50px rgb(13 38 76 / 12%);
	}

	:global(body) {
		margin: 0;
		font-family: 'Nunito', 'Avenir Next', 'Segoe UI', sans-serif;
		background:
			radial-gradient(circle at 8% 10%, rgb(66 133 244 / 20%), transparent 35%),
			radial-gradient(circle at 92% 8%, rgb(234 67 53 / 14%), transparent 30%),
			radial-gradient(circle at 88% 88%, rgb(251 188 5 / 20%), transparent 38%),
			radial-gradient(circle at 18% 92%, rgb(52 168 83 / 18%), transparent 32%),
			var(--md3-surface);
		color: var(--md3-text);
	}

	.app-shell {
		min-height: 100dvh;
		padding: 1rem;
	}

	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		max-width: 980px;
		margin: 0 auto 1.2rem;
		padding: 0.85rem 1rem;
		background: var(--md3-surface-container);
		border: 1px solid var(--md3-outline);
		border-radius: 1rem;
		box-shadow: var(--md3-shadow);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: 'Space Grotesk', 'Nunito', sans-serif;
	}

	.dot {
		display: inline-block;
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
	}

	.blue {
		background: #4285f4;
	}

	.red {
		background: #ea4335;
	}

	.yellow {
		background: #fbbc05;
	}

	.green {
		background: #34a853;
	}

	.user-area {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.email {
		font-size: 0.9rem;
		font-weight: 700;
	}

	button {
		border: 0;
		border-radius: 999px;
		padding: 0.6rem 1rem;
		background: var(--md3-primary);
		color: var(--md3-on-primary);
		font: inherit;
		font-weight: 800;
		cursor: pointer;
	}

	@media (max-width: 700px) {
		.top-bar {
			flex-direction: column;
			align-items: stretch;
		}

		.user-area {
			justify-content: space-between;
		}
	}
</style>
