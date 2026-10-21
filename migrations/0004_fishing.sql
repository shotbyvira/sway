alter table sway_rooms add column if not exists meta jsonb not null default '{}'::jsonb;

alter table sway_results add column if not exists fisheries_points int not null default 0;
alter table sway_results add column if not exists school_points int not null default 0;
