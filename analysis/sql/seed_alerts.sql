-- Seed demo alerts for the app notification workflow.
-- Safe to run multiple times: it inserts only missing demo alert titles.

with candidate_sites as (
	select distinct customer_site_name as building_name
	from public.work_orders
	where customer_site_name is not null
	order by customer_site_name
	limit 3
),
resolved_sites as (
	select
		coalesce((select building_name from candidate_sites offset 0 limit 1), 'Valmet Lentokentankatu 11') as building_a,
		coalesce((select building_name from candidate_sites offset 1 limit 1), (select building_name from candidate_sites offset 0 limit 1), 'Valmet Lentokentankatu 11') as building_b,
		coalesce((select building_name from candidate_sites offset 2 limit 1), (select building_name from candidate_sites offset 0 limit 1), 'Valmet Lentokentankatu 11') as building_c
),
seed_rows as (
	select
		building_a as building_name,
		'hvac_anomaly'::text as alert_type,
		'HVAC alarms spiking above normal level'::text as alert_title,
		'Last 24h'::text as alert_window,
		92::int as alert_score,
		'new'::text as status,
		jsonb_build_object('source', 'demo-seed', 'recommended_action', 'Inspect AHU filters and reset alarm state.') as metadata
	from resolved_sites
	union all
	select
		building_b,
		'cleaning_demand',
		'Cleaning demand anomaly detected on floor 2',
		'Today 06:00-12:00',
		86,
		'new',
		jsonb_build_object('source', 'demo-seed', 'recommended_action', 'Validate occupancy sensor and dispatch extra cleaning pass.')
	from resolved_sites
	union all
	select
		building_c,
		'maintenance_plan',
		'Planned maintenance completion rate dropping',
		'Current week',
		79,
		'new',
		jsonb_build_object('source', 'demo-seed', 'recommended_action', 'Review pending tasks and assign missing technician slots.')
	from resolved_sites
)
insert into public.alerts (
	building_name,
	alert_type,
	alert_title,
	alert_window,
	alert_score,
	status,
	metadata
)
select
	s.building_name,
	s.alert_type,
	s.alert_title,
	s.alert_window,
	s.alert_score,
	s.status,
	s.metadata
from seed_rows s
where not exists (
	select 1
	from public.alerts a
	where a.alert_title = s.alert_title
	and a.metadata ->> 'source' = 'demo-seed'
);
