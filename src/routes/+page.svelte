<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let query = $state('');
	let typeFilterOpen = $state(false);
	let selectedTypes = $state<string[]>([]);
	type WorkOrder = PageData['workOrders'][number];

	const availableTypes = $derived(
		[...new Set(data.workOrders.map((order) => order.work_order_type_eng).filter(Boolean) as string[])].sort()
	);

	const hasTypeFilter = $derived(selectedTypes.length > 0);

	function toggleType(type: string) {
		if (selectedTypes.includes(type)) {
			selectedTypes = selectedTypes.filter((item) => item !== type);
			return;
		}

		selectedTypes = [...selectedTypes, type];
	}

	function clearTypeFilter() {
		selectedTypes = [];
	}

	function openBuildingSheet() {
		window.dispatchEvent(new CustomEvent('open-building-sheet'));
	}

	const filtered = $derived(
		data.workOrders.filter((order: WorkOrder) => {
			const typeMatch =
				selectedTypes.length === 0 ||
				(order.work_order_type_eng ? selectedTypes.includes(order.work_order_type_eng) : false);

			if (!typeMatch) {
				return false;
			}

			const haystack = [
				order.wo_no,
				order.customer_site_name,
				order.site_address,
				order.work_order_type_eng
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();

			return haystack.includes(query.trim().toLowerCase());
		})
	);
</script>

<main class="container">
	<section class="card building-filter-card">
		<p class="field-title">Building</p>
		<button type="button" class="building-picker" onclick={openBuildingSheet}>
			<span>{data.selectedBuilding || 'All buildings'}</span>
			<span class="building-picker-action">Change</span>
		</button>
	</section>

	<section class="card header-card">
		<div class="search-row">
			<input type="search" bind:value={query} placeholder="Search..." aria-label="Search work orders" />
			<button
				type="button"
				class="filter-button"
				class:active={hasTypeFilter}
				onclick={() => (typeFilterOpen = !typeFilterOpen)}
				aria-label="Filter by type"
				aria-expanded={typeFilterOpen}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M3 5h18v2H3V5zm4 6h10v2H7v-2zm3 6h4v2h-4v-2z" />
				</svg>
			</button>
		</div>

		{#if typeFilterOpen}
			<div class="type-filter" role="group" aria-label="Work order types">
				<div class="type-filter-head">
					<strong>Filter by type</strong>
					{#if hasTypeFilter}
						<button type="button" class="clear-btn" onclick={clearTypeFilter}>Clear</button>
					{/if}
				</div>
				<div class="type-chips">
					{#each availableTypes as type}
						<button
							type="button"
							class="type-chip"
							class:selected={selectedTypes.includes(type)}
							onclick={() => toggleType(type)}
						>
							{type}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</section>

	{#if filtered.length === 0}
		<section class="card">
			<p>No open work orders found.</p>
		</section>
	{:else}
		<section class="work-order-list">
			{#each filtered as order}
				<a class="card work-order" href={`/work-orders/${order.id}`}>
					<div class="row">
						<strong>#{order.wo_no}</strong>
						<span class="priority">Priority {order.priority_id ?? '-'}</span>
					</div>
					<div class="title">{order.work_order_type_eng || 'Work order'}</div>
					<div class="meta">{order.customer_site_name || 'Unknown site'}</div>
				</a>
			{/each}
		</section>
	{/if}
</main>

<style>
	.container {
		max-width: 980px;
		margin: 0 auto;
		display: grid;
		gap: 0.9rem;
	}

	.card {
		background: #fff;
		border: 1px solid #d8deea;
		border-radius: 1rem;
		padding: 1rem;
		box-shadow: 0 10px 26px rgb(27 66 125 / 10%);
	}

	.header-card {
		display: grid;
		gap: 0.7rem;
	}

	.building-filter-card {
		display: grid;
		gap: 0.45rem;
	}

	.field-title {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 800;
		opacity: 0.85;
	}

	.building-picker {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.65rem 0.8rem;
		border-radius: 0.8rem;
		border: 1px solid #d8deea;
		font: inherit;
		background: #fff;
		cursor: pointer;
	}

	.building-picker-action {
		font-size: 0.8rem;
		font-weight: 800;
		color: #185abc;
	}

	.search-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.6rem;
		align-items: center;
	}

	input {
		width: 100%;
		padding: 0.7rem 0.85rem;
		border-radius: 0.8rem;
		border: 1px solid #d8deea;
		font: inherit;
	}

	.filter-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.8rem;
		border: 1px solid #d8deea;
		background: #fff;
		color: #185abc;
		cursor: pointer;
	}

	.filter-button.active {
		background: #e8f0fe;
		border-color: #b8cdf7;
	}

	.filter-button svg {
		width: 1.2rem;
		height: 1.2rem;
		fill: currentColor;
	}

	.type-filter {
		display: grid;
		gap: 0.5rem;
		padding-top: 0.1rem;
	}

	.type-filter-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.6rem;
	}

	.type-filter-head strong {
		font-size: 0.88rem;
	}

	.clear-btn {
		border: 0;
		background: transparent;
		font: inherit;
		font-size: 0.82rem;
		font-weight: 800;
		color: #185abc;
		cursor: pointer;
	}

	.type-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.type-chip {
		border: 1px solid #d8deea;
		border-radius: 999px;
		padding: 0.35rem 0.65rem;
		background: #fff;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
	}

	.type-chip.selected {
		background: #e8f0fe;
		border-color: #b8cdf7;
		color: #185abc;
	}

	.work-order-list {
		display: grid;
		gap: 0.7rem;
	}

	.work-order {
		text-decoration: none;
		color: inherit;
		display: grid;
		gap: 0.5rem;
	}

	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.6rem;
	}

	.priority {
		font-size: 0.8rem;
		font-weight: 700;
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		background: #e8f0fe;
		color: #185abc;
	}

	.title {
		font-size: 1.02rem;
		font-weight: 800;
	}

	.meta {
		font-size: 0.85rem;
		opacity: 0.8;
	}

	@media (max-width: 700px) {
		.container {
			gap: 0.7rem;
		}

		.card {
			padding: 0.85rem;
		}
	}
</style>
