<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();
	let buildingSheetOpen = $state(false);
	let accountSheetOpen = $state(false);
	let selectedLanguage = $state<'en' | 'sv' | 'fi'>('en');
	let languageMenuOpen = $state(false);

	const userEmail = $derived(data.user?.email ?? 'User');
	const userInitial = $derived(userEmail.charAt(0).toUpperCase() || 'U');
	const activePath = $derived(page.url.pathname);
	const navSearch = $derived(page.url.search);
	const workOrdersHref = $derived(`/${navSearch}`);
	const dashboardHref = $derived(`/dashboard${navSearch}`);
	const dashboardActive = $derived(activePath === '/dashboard');
	const workOrdersActive = $derived(activePath === '/' || activePath.startsWith('/work-orders'));

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const fromQuery = params.get('lang');
		const fromStorage = localStorage.getItem('app_lang');
		const candidate = (fromQuery || fromStorage || 'en').toLowerCase();

		if (candidate === 'sv' || candidate === 'fi' || candidate === 'en') {
			selectedLanguage = candidate;
		}

		document.documentElement.lang = selectedLanguage;
	});

	function applyBuilding(selected: string) {
		const nextUrl = new URL(window.location.href);

		if (selected) {
			nextUrl.searchParams.set('building', selected);
		} else {
			nextUrl.searchParams.delete('building');
		}

		buildingSheetOpen = false;
		window.location.href = nextUrl.toString();
	}

	function applyLanguage(lang: 'en' | 'sv' | 'fi') {
		selectedLanguage = lang;
		localStorage.setItem('app_lang', lang);
		document.documentElement.lang = lang;

		const nextUrl = new URL(window.location.href);
		nextUrl.searchParams.set('lang', lang);
		history.replaceState({}, '', nextUrl.toString());
	}

	function openBuildingSheet() {
		accountSheetOpen = false;
		buildingSheetOpen = true;
	}

	function openAccountSheet() {
		buildingSheetOpen = false;
		accountSheetOpen = true;
		languageMenuOpen = false;
	}

	function closeSheets() {
		buildingSheetOpen = false;
		accountSheetOpen = false;
		languageMenuOpen = false;
	}

	function languageLabel(lang: 'en' | 'sv' | 'fi'): string {
		if (lang === 'sv') return 'Svenska';
		if (lang === 'fi') return 'Suomi';
		return 'English';
	}
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
		<div class="brand-row">
			<button
				type="button"
				class="icon-button"
				onclick={openBuildingSheet}
				aria-label="Select building"
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M3 21h18v-2H3v2zm2-4h4V3H5v14zm6 0h4V7h-4v10zm6 0h2V11h-2v6zM7 5h2v2H7V5zm0 4h2v2H7V9zm0 4h2v2H7v-2zm6-4h2v2h-2V9zm0 4h2v2h-2v-2z"
					/>
				</svg>
			</button>
		</div>

		<div class="center-logo" aria-hidden="true">
			<img src="/icons/Luotea-logo.png" alt="" />
		</div>

		<button type="button" class="user-chip" onclick={openAccountSheet} aria-label="Open account options">
			<span class="avatar">{userInitial}</span>
			<span class="user-chip-text">{userEmail}</span>
		</button>
	</header>

	{#if buildingSheetOpen || accountSheetOpen}
		<button
			type="button"
			class="sheet-backdrop"
			onclick={closeSheets}
			aria-label="Close panel"
		></button>
	{/if}

	{#if buildingSheetOpen}
		<div class="building-sheet" role="dialog" aria-modal="true" aria-label="Choose building">
			<div class="sheet-handle"></div>
			<h2>Select Building</h2>
			<div class="sheet-list">
				<button
					type="button"
					class:selected={data.selectedBuilding === ''}
					onclick={() => applyBuilding('')}
				>
					All buildings
				</button>
				{#each data.buildings as building}
					<button
						type="button"
						class:selected={data.selectedBuilding === building}
						onclick={() => applyBuilding(building)}
					>
						{building}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if accountSheetOpen}
		<div class="account-sheet" role="dialog" aria-modal="true" aria-label="Account options">
			<div class="sheet-handle"></div>
			<h2>Account</h2>
			<p class="account-email">{userEmail}</p>

			<section class="lang-section">
				<h3>Language</h3>
				<button
					type="button"
					class="lang-trigger"
					onclick={() => (languageMenuOpen = !languageMenuOpen)}
					aria-expanded={languageMenuOpen}
				>
					<span>{languageLabel(selectedLanguage)}</span>
					<span class="chevron" class:open={languageMenuOpen}>▾</span>
				</button>
				{#if languageMenuOpen}
					<div class="lang-row">
						<button
							type="button"
							class="lang-btn"
							class:selected={selectedLanguage === 'en'}
							onclick={() => applyLanguage('en')}
						>
							English
						</button>
						<button
							type="button"
							class="lang-btn"
							class:selected={selectedLanguage === 'sv'}
							onclick={() => applyLanguage('sv')}
						>
							Svenska
						</button>
						<button
							type="button"
							class="lang-btn"
							class:selected={selectedLanguage === 'fi'}
							onclick={() => applyLanguage('fi')}
						>
							Suomi
						</button>
					</div>
				{/if}
			</section>

			<form method="POST" action="/auth/signout" class="logout-form">
				<button type="submit" class="logout-btn">Log out</button>
			</form>
		</div>
	{/if}

	<div class="page-content">
		{@render children()}
	</div>

	<nav class="bottom-nav" aria-label="Primary">
		<a href={dashboardHref} class="nav-item" class:active={dashboardActive}>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M3 13h8V3H3v10zm10 8h8V11h-8v10zm0-18v6h8V3h-8zM3 21h8v-6H3v6z" />
			</svg>
			<span>Dashboard</span>
		</a>
		<a href={workOrdersHref} class="nav-item" class:active={workOrdersActive}>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M19 3H5c-1.1 0-2 .9-2 2v14h2V5h14V3zm3 4H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h13c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 14H9V9h13v12zM11 11h9v2h-9zm0 4h9v2h-9zm0 4h6v2h-6z" />
			</svg>
			<span>Work Orders</span>
		</a>
	</nav>
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

	:global(*),
	:global(*::before),
	:global(*::after) {
		box-sizing: border-box;
	}

	.app-shell {
		min-height: 100dvh;
		padding: 0;
	}

	.top-bar {
		position: sticky;
		top: 0;
		z-index: 50;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		align-items: center;
		gap: 1rem;
		margin: 0 0 1.2rem;
		padding: 0.85rem 1rem;
		background: rgb(255 255 255 / 90%);
		backdrop-filter: blur(8px);
		border-bottom: 1px solid var(--md3-outline);
		box-shadow: var(--md3-shadow);
	}

	.center-logo {
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		justify-self: center;
	}

	.center-logo img {
		height: 1.8rem;
		width: auto;
		object-fit: contain;
	}

	.page-content {
		padding: 1rem;
		padding-bottom: calc(5.6rem + env(safe-area-inset-bottom));
		overflow-x: clip;
	}

	.bottom-nav {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 70;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.5rem;
		padding: 0.55rem 0.85rem calc(0.55rem + env(safe-area-inset-bottom));
		background: rgb(255 255 255 / 94%);
		backdrop-filter: blur(10px);
		border-top: 1px solid var(--md3-outline);
		box-shadow: 0 -8px 22px rgb(8 25 54 / 10%);
	}

	.nav-item {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		border-radius: 999px;
		border: 1px solid transparent;
		padding: 0.55rem 0.7rem;
		color: var(--md3-text);
		text-decoration: none;
		font-weight: 800;
		font-size: 0.88rem;
	}

	.nav-item svg {
		width: 1.05rem;
		height: 1.05rem;
		fill: currentColor;
	}

	.nav-item.active {
		background: #e8f0fe;
		border-color: #b8cdf7;
		color: #184ea6;
	}

	.brand-row {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		min-width: 0;
		justify-self: start;
		max-width: 100%;
	}


	.icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 999px;
		border: 1px solid var(--md3-outline);
		background: #fff;
		padding: 0;
		cursor: pointer;
	}

	.icon-button svg {
		width: 1.35rem;
		height: 1.35rem;
		fill: var(--md3-primary);
	}

	.user-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		justify-self: end;
		border: 1px solid var(--md3-outline);
		border-radius: 999px;
		background: #fff;
		padding: 0.35rem 0.65rem 0.35rem 0.35rem;
		cursor: pointer;
	}

	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.95rem;
		height: 1.95rem;
		border-radius: 999px;
		font-weight: 800;
		background: #dfe9ff;
		color: #1a4ea2;
	}

	.user-chip-text {
		font-size: 0.84rem;
		font-weight: 700;
		max-width: min(32vw, 14rem);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sheet-backdrop {
		position: fixed;
		inset: 0;
		z-index: 90;
		display: block;
		margin: 0;
		border: 0;
		border-radius: 0;
		padding: 0;
		background: rgb(5 17 39 / 35%);
	}

	.building-sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 100;
		max-width: 100vw;
		background: #fff;
		border-radius: 1.25rem 1.25rem 0 0;
		padding: 0.6rem 1rem 1rem;
		box-shadow: 0 -12px 36px rgb(7 20 47 / 20%);
		animation: sheet-in 180ms ease-out;
	}

	.account-sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 100;
		max-width: 100vw;
		background: #fff;
		border-radius: 1.25rem 1.25rem 0 0;
		padding: 0.6rem 1rem 1rem;
		box-shadow: 0 -12px 36px rgb(7 20 47 / 20%);
		animation: sheet-in 180ms ease-out;
	}

	.sheet-handle {
		width: 2.8rem;
		height: 0.28rem;
		margin: 0.2rem auto 0.7rem;
		border-radius: 999px;
		background: #c4cbdb;
	}

	h2 {
		margin: 0 0 0.7rem;
		font-family: 'Space Grotesk', 'Nunito', sans-serif;
	}

	.account-email {
		margin: 0 0 0.8rem;
		font-weight: 700;
		opacity: 0.82;
	}

	.lang-section h3 {
		margin: 0 0 0.55rem;
		font-size: 0.95rem;
	}

	.lang-row {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.45rem;
		margin-top: 0.5rem;
	}

	.lang-trigger {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		border: 1px solid var(--md3-outline);
		border-radius: 0.8rem;
		padding: 0.65rem 0.75rem;
		background: #fff;
		color: var(--md3-text);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.chevron {
		transition: transform 140ms ease;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.lang-btn {
		border: 1px solid var(--md3-outline);
		border-radius: 0.8rem;
		padding: 0.6rem 0.65rem;
		background: #fff;
		color: var(--md3-text);
		font: inherit;
		font-weight: 700;
		text-align: center;
		cursor: pointer;
	}

	.lang-btn.selected {
		background: #e8f0fe;
		border-color: #b8cdf7;
		color: #184ea6;
	}

	.logout-form {
		margin-top: 0.9rem;
	}

	.logout-btn {
		width: 100%;
		border: 0;
		border-radius: 0.85rem;
		padding: 0.75rem 0.9rem;
		background: #b3261e;
		color: #fff;
		font: inherit;
		font-weight: 800;
		cursor: pointer;
	}

	.sheet-list {
		display: grid;
		gap: 0.45rem;
		max-height: min(55dvh, 24rem);
		overflow: auto;
	}

	.sheet-list button {
		border: 1px solid var(--md3-outline);
		border-radius: 0.8rem;
		padding: 0.7rem 0.85rem;
		background: #fff;
		color: var(--md3-text);
		font: inherit;
		font-weight: 700;
		text-align: left;
		cursor: pointer;
	}

	.sheet-list button.selected {
		background: #e8f0fe;
		border-color: #b8cdf7;
		color: #184ea6;
	}

	@media (max-width: 700px) {
		.top-bar {
			align-items: center;
			top: 0;
		}

		.center-logo img {
			height: 1.5rem;
		}

		.user-chip-text {
			display: none;
		}

		.building-sheet {
			padding-bottom: 1.25rem;
		}

		.account-sheet {
			padding-bottom: 1.25rem;
		}

		.lang-row {
			grid-template-columns: 1fr;
		}

		.nav-item {
			font-size: 0.82rem;
		}
	}

	@keyframes sheet-in {
		from {
			transform: translateY(22px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
</style>
