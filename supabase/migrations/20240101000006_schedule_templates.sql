-- Schedule templates (weekly recurring availability)
create table schedule_templates (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references tenants(id) not null,
  specialist_id uuid references specialists(id) not null,
  day_of_week   int not null,      -- 0=Mon, 6=Sun
  start_time    time not null,     -- 09:00
  end_time      time not null,     -- 17:00
  break_start   time,              -- 13:00
  break_end     time,              -- 13:30
  constraint chk_day_of_week check (day_of_week between 0 and 6),
  constraint chk_times check (start_time < end_time),
  constraint chk_break check (
    (break_start is null and break_end is null) or
    (break_start is not null and break_end is not null and break_start < break_end)
  )
);

create index idx_schedule_templates_specialist
  on schedule_templates (specialist_id, day_of_week);
