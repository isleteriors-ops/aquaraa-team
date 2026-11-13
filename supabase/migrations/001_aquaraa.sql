begin;
create table if not exists public.aquaraa_workspaces (
 owner_id text primary key,
 data jsonb not null,
 revision integer not null default 0 check(revision>=0)
);
create table if not exists public.aquaraa_admin (
 id text primary key check(id='aquaraa'),
 owner_id text not null references public.aquaraa_workspaces(owner_id),
 login_user_id uuid unique,
 login_email text
);
create table if not exists public.aquaraa_members (
 id text primary key,
 owner_id text not null references public.aquaraa_workspaces(owner_id),
 employee_id text not null,
 email text not null check(email=lower(trim(email))),
 user_id uuid,
 role text not null check(role in ('staff','manager')),
 created_at timestamptz not null default now(),
 unique(owner_id,employee_id),unique(owner_id,email),unique(owner_id,user_id)
);
create table if not exists public.aquaraa_auth_limits (
 key text primary key,
 hits integer not null,
 expires_at timestamptz not null
);
-- Hotel data is available only to the server, after its per-request role check.
-- No anonymous or signed-in browser can bypass the staff projection via REST.
alter table public.aquaraa_workspaces enable row level security;
alter table public.aquaraa_admin enable row level security;
alter table public.aquaraa_members enable row level security;
alter table public.aquaraa_auth_limits enable row level security;
revoke all on public.aquaraa_workspaces,public.aquaraa_admin,public.aquaraa_members,public.aquaraa_auth_limits from public,anon,authenticated;
grant all on public.aquaraa_workspaces,public.aquaraa_admin,public.aquaraa_members,public.aquaraa_auth_limits to service_role;

create or replace function public.aquaraa_resolve_access(p_user_id uuid,p_email text,p_admin_email text)
returns table(role text,owner_id text,employee_id text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.aquaraa_admin%rowtype; m public.aquaraa_members%rowtype; workspace_key text;
begin
 if p_user_id is null or nullif(trim(p_admin_email),'') is null then return; end if;
 -- Serializes the one-time bootstrap, including the initial workspace creation.
 perform pg_advisory_xact_lock(817236451);
 select * into a from public.aquaraa_admin where id='aquaraa' for update;
 if not found then
  if lower(trim(p_email))<>lower(trim(p_admin_email)) then return; end if;
  workspace_key=gen_random_uuid()::text;
  insert into public.aquaraa_workspaces(owner_id,data) values(workspace_key,'{"employees":[],"shifts":[],"attendance":[],"leave":[],"adjustments":[],"pools":[],"payroll":[],"activity":[]}');
  insert into public.aquaraa_admin(id,owner_id,login_user_id,login_email) values('aquaraa',workspace_key,p_user_id,lower(trim(p_admin_email))) returning * into a;
 end if;
 if lower(trim(p_email))=lower(trim(p_admin_email)) and (a.login_user_id is null or a.login_email is distinct from lower(trim(p_admin_email))) then
  update public.aquaraa_admin set login_user_id=p_user_id,login_email=lower(trim(p_admin_email)) where id='aquaraa' returning * into a;
 end if;
 if a.login_user_id=p_user_id and a.login_email=lower(trim(p_admin_email)) then
  return query select 'owner'::text,a.owner_id,null::text; return;
 end if;
 select * into m from public.aquaraa_members x where x.owner_id=a.owner_id and
  (x.user_id=p_user_id or (x.user_id is null and x.email=lower(trim(p_email)))) limit 1 for update;
 if not found then return; end if;
 if not exists(select 1 from public.aquaraa_workspaces w,jsonb_array_elements(w.data->'employees') e
  where w.owner_id=a.owner_id and e->>'id'=m.employee_id and e->>'status'='Active') then return; end if;
 if m.user_id is null then update public.aquaraa_members set user_id=p_user_id where id=m.id; end if;
 return query select m.role,m.owner_id,m.employee_id;
end $$;

create or replace function public.aquaraa_rate_limit(p_key text,p_max integer,p_seconds integer)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
 delete from public.aquaraa_auth_limits where expires_at<now()-interval '1 day';
 insert into public.aquaraa_auth_limits as l(key,hits,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set hits=case when l.expires_at<=now() then 1 else l.hits+1 end,
 expires_at=case when l.expires_at<=now() then now()+make_interval(secs=>p_seconds) else l.expires_at end returning hits into n;
 return n<=p_max;
end $$;

-- Import runs before the new app opens to users. It refuses to overwrite a
-- previously initialized destination and intentionally clears old ChatGPT IDs.
create or replace function public.aquaraa_import(p_owner_id text,p_data jsonb,p_revision integer,p_members jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(817236451);
 if exists(select 1 from public.aquaraa_workspaces) or exists(select 1 from public.aquaraa_admin) then raise exception 'Destination already initialized; import refused'; end if;
 insert into public.aquaraa_workspaces(owner_id,data,revision) values(p_owner_id,p_data,p_revision);
 insert into public.aquaraa_admin(id,owner_id) values('aquaraa',p_owner_id);
 insert into public.aquaraa_members(id,owner_id,employee_id,email,user_id,role,created_at)
 select m->>'id',p_owner_id,m->>'employee_id',lower(trim(m->>'email')),null,m->>'role',(m->>'created_at')::timestamptz from jsonb_array_elements(p_members) m;
end $$;

revoke all on function public.aquaraa_resolve_access(uuid,text,text),public.aquaraa_rate_limit(text,integer,integer),public.aquaraa_import(text,jsonb,integer,jsonb) from public,anon,authenticated;
grant execute on function public.aquaraa_resolve_access(uuid,text,text),public.aquaraa_rate_limit(text,integer,integer),public.aquaraa_import(text,jsonb,integer,jsonb) to service_role;
commit;
