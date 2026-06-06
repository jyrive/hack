<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let query = $state('');
	type WorkOrder = PageData['workOrders'][number];

	const filtered = $derived(
		data.workOrders.filter((order: WorkOrder) => {
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
	<section class="card header-card">
		<h1>Open Work Orders</h1>
		<p>Tap a work order to open details, add speech updates, and attach timeline photos.</p>
		<input
			type="search"
			bind:value={query}
			placeholder="Search by WO number, site, address, or type"
		/>
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
					<div class="title">{order.customer_site_name || 'Unknown site'}</div>
					<p>{order.site_address || 'No address'}</p>
					<div class="meta">{order.work_order_type_eng || 'Work order'}</div>
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

	h1 {
		margin: 0;
		font-family: 'Space Grotesk', 'Nunito', sans-serif;
	}

	.header-card p {
		margin: 0.3rem 0 0.8rem;
		font-weight: 700;
	}

	input {
		width: 100%;
		padding: 0.7rem 0.85rem;
		border-radius: 0.8rem;
		border: 1px solid #d8deea;
		font: inherit;
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

	p {
		margin: 0;
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
