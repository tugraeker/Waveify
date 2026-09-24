-- Waveify v10 fresh schema.
create extension if not exists "pgcrypto";
create table users (id uuid primary key default auth.uid(), username text not null, email text, avatar_url text, created_at timestamptz default now(), display_settings jsonb default '{}');
create table songs (id uuid primary key default gen_random_uuid(), user_id uuid references users(id) on delete cascade, title text not null, artist text, duration int, audio_url text not null, cover_url text, lyrics text, likes_count int default 0, created_at timestamptz default now());
create table playlists (id uuid primary key default gen_random_uuid(), user_id uuid references users(id) on delete cascade, title text not null, cover_url text, is_auto boolean default false, created_at timestamptz default now());
create table playlist_songs (playlist_id uuid references playlists(id) on delete cascade, song_id uuid references songs(id) on delete cascade, added_at timestamptz default now(), primary key (playlist_id, song_id));
create table friends (user_id uuid references users(id) on delete cascade, friend_id uuid references users(id) on delete cascade, status text check (status in ('pending','accepted')) not null, created_at timestamptz default now(), primary key (user_id, friend_id));
insert into storage.buckets (id, name, public) values ('songs','songs', true), ('covers','covers', true) on conflict (id) do nothing;
alter table users enable row level security; alter table songs enable row level security; alter table playlists enable row level security; alter table playlist_songs enable row level security; alter table friends enable row level security;
create policy "read all" on users for select using (true); create policy "owner write" on users for all using (auth.uid() = id);
create policy "read all" on songs for select using (true); create policy "owner write" on songs for all using (auth.uid() = user_id);
create policy "read all" on playlists for select using (true); create policy "owner write" on playlists for all using (auth.uid() = user_id);
create policy "read all" on playlist_songs for select using (true); create policy "owner write" on playlist_songs for all using (true);
create policy "involved read" on friends for select using (auth.uid() = user_id or auth.uid() = friend_id); create policy "owner write" on friends for all using (auth.uid() = user_id);
