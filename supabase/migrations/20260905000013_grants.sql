-- Baseline table-level GRANTs for the `anon` and `authenticated` Postgres
-- roles used by Supabase Auth/PostgREST.
--
-- RLS policies only decide WHICH ROWS a role may see/change once that role
-- already has the underlying table-level privilege. Without these GRANTs,
-- every query fails with "permission denied for table ..." regardless of
-- how correct the RLS policies are. A fresh Supabase project normally wires
-- this up automatically, but re-run this file if a project ever loses it
-- (e.g. after `drop schema public cascade`) or when restoring onto a new
-- project. GRANT/ALTER DEFAULT PRIVILEGES are idempotent — safe to re-run.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on all tables in schema public
  to authenticated;

grant select
  on all tables in schema public
  to anon;

grant usage, select on all sequences in schema public to authenticated;

-- Apply the same baseline to tables created by future migrations, so this
-- doesn't have to be repeated after every new `create table`.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant select on tables to anon;

alter default privileges in schema public
  grant usage, select on sequences to authenticated;
