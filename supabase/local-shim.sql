-- HANYA untuk menguji schema.sql di PostgreSQL biasa (pgAdmin lokal). JANGAN dijalankan di Supabase: sudah ada di sana.
-- Urutan: jalankan file ini dulu, baru schema.sql.
-- Meniru bagian Supabase yang dipakai schema: skema auth, auth.users, auth.uid(), role anon & authenticated.
-- ponytail: tiruan minimal; aplikasi React tetap butuh Supabase asli (supabase-js bicara ke API Supabase, bukan langsung ke Postgres).

create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), raw_user_meta_data jsonb);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
