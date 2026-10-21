create table if not exists sway_rooms (
  code text primary key,
  status text not null default 'lobby',
  amber_name text not null default 'Amber',
  tide_name text not null default 'Tide',
  cycles int not null default 1,
  cycle int not null default 1,
  half int not null default 0,
  secret_id text,
  scores jsonb not null default '{}'::jsonb,
  memory jsonb not null default '{}'::jsonb,
  used jsonb not null default '{}'::jsonb,
  deadline bigint,
  version int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists sway_players (
  id text primary key,
  room_code text not null references sway_rooms (code) on delete cascade,
  handle text not null,
  team text not null,
  joined_at timestamptz not null default now()
);

create index if not exists sway_players_room_idx on sway_players (room_code);

create table if not exists sway_prompts (
  id serial primary key,
  room_code text not null references sway_rooms (code) on delete cascade,
  cycle int not null,
  half int not null,
  player_id text not null,
  body text not null,
  shrug boolean not null default false,
  resisted boolean not null default false,
  rank int not null,
  created_at timestamptz not null default now()
);

create index if not exists sway_prompts_room_idx on sway_prompts (room_code, cycle, half);

create table if not exists sway_results (
  id serial primary key,
  room_code text not null references sway_rooms (code) on delete cascade,
  cycle int not null,
  half int not null,
  setter text not null,
  swayer text not null,
  secret_id text not null,
  secret_name text not null,
  guess_id text not null,
  guess_name text not null,
  rank int not null,
  distance real not null,
  points int not null
);
