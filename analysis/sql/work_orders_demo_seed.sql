-- Generated demo seed: diverse work orders per building from source CSV
-- Run in Supabase SQL Editor.

begin;

insert into public.work_orders (
    wo_no,
    customer_site_name,
    site_address,
    work_order_type_eng,
    priority_id,
    sla_end_at,
    started_at,
    finished_at,
    is_open,
    source_payload
) values
    ('DEMO-998389833-01', 'Lentokentänkatu 11', 'Lentokentänkatu 11 33900 Tampere FINLAND', 'On-demand work - Technical services', 1, '2026-06-06T15:48:19.125102+00:00', '2026-06-06T09:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Manually assigned", "service_line_eng": "Technical services", "source_building": "Lentokent\u00e4nkatu 11"}'),
    ('DEMO-998389833-02', 'Lentokentänkatu 11', 'Lentokentänkatu 11 33900 Tampere FINLAND', 'Scheduled work - Technical services', 2, '2026-06-06T15:48:19.125102+00:00', '2026-06-06T08:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Manually assigned", "service_line_eng": "Technical services", "source_building": "Lentokent\u00e4nkatu 11"}'),
    ('DEMO-998389833-03', 'Lentokentänkatu 11', 'Lentokentänkatu 11 33900 Tampere FINLAND', 'On-demand work - Property maintenance', 2, '2026-06-06T15:48:19.125102+00:00', '2026-06-06T07:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Manually assigned", "service_line_eng": "Property maintenance", "source_building": "Lentokent\u00e4nkatu 11"}'),
    ('DEMO-998389833-04', 'Lentokentänkatu 11', 'Lentokentänkatu 11 33900 Tampere FINLAND', 'Scheduled work - Cleaning services', 4, '2026-06-06T15:48:19.125102+00:00', '2026-06-06T06:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Dynamically scheduled", "service_line_eng": "Cleaning services", "source_building": "Lentokent\u00e4nkatu 11"}'),
    ('DEMO-999530754-01', 'STD tehdas', 'Vanha Porvoontie 229 01380 Vantaa FINLAND', 'On-demand work - Technical services', 1, '2026-06-06T12:48:19.125102+00:00', '2026-06-06T06:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Manually assigned", "service_line_eng": "Technical services", "source_building": "STD tehdas"}'),
    ('DEMO-999530754-02', 'STD tehdas', 'Vanha Porvoontie 229 01380 Vantaa FINLAND', 'Scheduled work - Technical services', 2, '2026-06-06T12:48:19.125102+00:00', '2026-06-06T05:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Dynamically scheduled", "service_line_eng": "Technical services", "source_building": "STD tehdas"}'),
    ('DEMO-999530754-03', 'STD tehdas', 'Vanha Porvoontie 229 01380 Vantaa FINLAND', 'On-demand work - Property maintenance', 2, '2026-06-06T12:48:19.125102+00:00', '2026-06-06T04:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Manually assigned", "service_line_eng": "Property maintenance", "source_building": "STD tehdas"}'),
    ('DEMO-999530754-04', 'STD tehdas', 'Vanha Porvoontie 229 01380 Vantaa FINLAND', 'Scheduled work - Cleaning services', 4, '2026-06-06T12:48:19.125102+00:00', '2026-06-06T03:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Manually assigned", "service_line_eng": "Cleaning services", "source_building": "STD tehdas"}'),
    ('DEMO-999488386-01', 'Toimistotalo', 'Vanha Porvoontie 229 01380 Vantaa FINLAND', 'On-demand work - Property maintenance', 2, '2026-06-06T09:48:19.125102+00:00', '2026-06-06T03:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Dynamically scheduled", "service_line_eng": "Property maintenance", "source_building": "Toimistotalo"}'),
    ('DEMO-999488386-02', 'Toimistotalo', 'Vanha Porvoontie 229 01380 Vantaa FINLAND', 'Scheduled work - Technical services', 2, '2026-06-06T09:48:19.125102+00:00', '2026-06-06T02:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Manually assigned", "service_line_eng": "Technical services", "source_building": "Toimistotalo"}'),
    ('DEMO-999488386-03', 'Toimistotalo', 'Vanha Porvoontie 229 01380 Vantaa FINLAND', 'On-demand work - Property maintenance', 2, '2026-06-06T09:48:19.125102+00:00', '2026-06-06T01:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Dynamically scheduled", "service_line_eng": "Property maintenance", "source_building": "Toimistotalo"}'),
    ('DEMO-999488386-04', 'Toimistotalo', 'Vanha Porvoontie 229 01380 Vantaa FINLAND', 'Scheduled work - Cleaning services', 4, '2026-06-06T09:48:19.125102+00:00', '2026-06-06T00:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Manually assigned", "service_line_eng": "Cleaning services", "source_building": "Toimistotalo"}'),
    ('DEMO-999154922-01', 'Venttiilitehdas', 'Vanha Porvoontie 229 01380 Vantaa FINLAND/Honkanummentie 11', 'On-demand work - Facility services', 2, '2026-06-06T06:48:19.125102+00:00', '2026-06-06T00:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Manually assigned", "service_line_eng": "Facility services", "source_building": "Venttiilitehdas"}'),
    ('DEMO-999154922-02', 'Venttiilitehdas', 'Vanha Porvoontie 229 01380 Vantaa FINLAND/Honkanummentie 11', 'Scheduled work - Technical services', 2, '2026-06-06T06:48:19.125102+00:00', '2026-06-05T23:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Manually assigned", "service_line_eng": "Technical services", "source_building": "Venttiilitehdas"}'),
    ('DEMO-999154922-03', 'Venttiilitehdas', 'Vanha Porvoontie 229 01380 Vantaa FINLAND/Honkanummentie 11', 'Scheduled work - Property maintenance', 2, '2026-06-06T06:48:19.125102+00:00', '2026-06-05T22:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Dynamically scheduled", "service_line_eng": "Property maintenance", "source_building": "Venttiilitehdas"}'),
    ('DEMO-999154922-04', 'Venttiilitehdas', 'Vanha Porvoontie 229 01380 Vantaa FINLAND/Honkanummentie 11', 'Scheduled work - Cleaning services', 4, '2026-06-06T06:48:19.125102+00:00', '2026-06-05T21:48:19.125102+00:00', NULL, true, '{"seed": "demo_per_building", "assignment_type_eng": "Manually assigned", "service_line_eng": "Cleaning services", "source_building": "Venttiilitehdas"}')
on conflict (wo_no) do update set
    customer_site_name = excluded.customer_site_name,
    site_address = excluded.site_address,
    work_order_type_eng = excluded.work_order_type_eng,
    priority_id = excluded.priority_id,
    sla_end_at = excluded.sla_end_at,
    started_at = excluded.started_at,
    finished_at = excluded.finished_at,
    is_open = excluded.is_open,
    source_payload = excluded.source_payload,
    updated_at = now();

commit;
