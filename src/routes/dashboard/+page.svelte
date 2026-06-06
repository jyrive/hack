<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<main class="dashboard">
	<section class="hero card">
		<div>
			<h1>Building Dashboard</h1>
			<p>Live operations snapshot for open work orders and service pressure.</p>
		</div>
		{#if data.selectedBuilding}
			<span class="filter-pill">Filtered: {data.selectedBuilding}</span>
		{/if}
	</section>

	<section class="kpi-grid">
		<article class="card kpi total">
			<p>Open work orders</p>
			<strong>{data.kpis.totalOpen}</strong>
		</article>
		<article class="card kpi critical">
			<p>Critical (P1)</p>
			<strong>{data.kpis.criticalOpen}</strong>
		</article>
		<article class="card kpi overdue">
			<p>Overdue SLA</p>
			<strong>{data.kpis.overdueOpen}</strong>
		</article>
		<article class="card kpi soon">
			<p>Due in 24h</p>
			<strong>{data.kpis.dueSoon}</strong>
		</article>
	</section>

	<section class="card">
		<h2>Workload by Building</h2>
		{#if data.workloadShare.length === 0}
			<p class="empty">No open work orders for this view.</p>
		{:else}
			<div class="building-list">
				{#each data.workloadShare as building}
					<div class="building-row">
						<div class="building-head">
							<strong>{building.name}</strong>
							<span>{building.openCount} open ({building.sharePct}%)</span>
						</div>
						<div class="bar-track">
							<div class="bar-fill" style={`width: ${building.sharePct}%`}></div>
						</div>
						<div class="mini-metrics">
							<span>Completion today {building.completionToday}%</span>
							<span>Cleaning score {building.cleaningScore}%</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</main>

<style>
	.dashboard {
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

	.hero {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.8rem;
	}

	h1,
	h2 {
		margin: 0;
		font-family: 'Space Grotesk', 'Nunito', sans-serif;
	}

	.hero p {
		margin: 0.25rem 0 0;
		font-weight: 700;
	}

	.filter-pill {
		display: inline-flex;
		align-items: center;
		border-radius: 999px;
		background: #e8f0fe;
		color: #185abc;
		padding: 0.35rem 0.75rem;
		font-size: 0.82rem;
		font-weight: 800;
	}

	.kpi-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.kpi p {
		margin: 0;
		font-size: 0.82rem;
		font-weight: 800;
		opacity: 0.82;
	}

	.kpi strong {
		display: block;
		margin-top: 0.3rem;
		font-size: 1.8rem;
		line-height: 1;
	}

	.kpi.total {
		background: linear-gradient(135deg, #f8fbff, #eef4ff);
	}

	.kpi.critical {
		background: linear-gradient(135deg, #fff6f6, #ffe6e4);
	}

	.kpi.overdue {
		background: linear-gradient(135deg, #fff8f0, #ffe9d0);
	}

	.kpi.soon {
		background: linear-gradient(135deg, #f4fff6, #e2f8e8);
	}

	.building-list {
		display: grid;
		gap: 0.7rem;
		margin-top: 0.7rem;
	}

	.building-row {
		display: grid;
		gap: 0.35rem;
	}

	.building-head {
		display: flex;
		justify-content: space-between;
		gap: 0.8rem;
		align-items: baseline;
	}

	.building-head span {
		font-size: 0.82rem;
		font-weight: 700;
		opacity: 0.82;
	}

	.bar-track {
		height: 0.58rem;
		border-radius: 999px;
		background: #e9edf5;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, #1a73e8, #34a853);
	}

	.mini-metrics {
		display: flex;
		justify-content: space-between;
		gap: 0.8rem;
		font-size: 0.78rem;
		font-weight: 700;
		opacity: 0.82;
	}

	.empty {
		margin: 0.6rem 0 0;
	}

	@media (max-width: 700px) {
		.dashboard {
			gap: 0.7rem;
		}

		.card {
			padding: 0.85rem;
		}

		.hero {
			flex-direction: column;
			align-items: flex-start;
		}

		.kpi-grid {
			grid-template-columns: 1fr 1fr;
		}

		.kpi strong {
			font-size: 1.55rem;
		}

		.mini-metrics {
			flex-direction: column;
			gap: 0.2rem;
		}
	}
</style>
