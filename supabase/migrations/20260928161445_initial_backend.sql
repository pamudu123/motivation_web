create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Spark Explorer' check (length(trim(display_name)) between 1 and 40),
  themes text[] not null default '{}' check (themes <@ array['Discipline','Focus','Confidence','Resilience','Growth','Courage','Ambition','Patience','Calm','New Beginnings']),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=120),
  title text not null check (length(title) between 1 and 160),
  quote text not null check (length(quote) between 1 and 1000),
  attribution text check (length(attribution)<=200),
  description text not null check (length(description)<=3000),
  themes text[] not null check (cardinality(themes)>0 and themes <@ array['Discipline','Focus','Confidence','Resilience','Growth','Courage','Ambition','Patience','Calm','New Beginnings']),
  styles text[] not null check (cardinality(styles)>0 and styles <@ array['Cinematic','Nature','Minimal','Urban','Abstract']),
  editorial_date date not null,
  status text not null default 'draft' check (status in ('draft','published','withdrawn')),
  editorial_approved boolean not null default false, rights_approved boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index posts_publication_idx on public.posts(status,editorial_date desc,id);
create index posts_themes_idx on public.posts using gin(themes);
create table public.post_assets (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts on delete cascade,
  role text not null check(role in ('thumbnail','hero','mobileHero','mobile','desktop','whatsapp','status')),
  bucket text not null check(bucket in ('wallpapers-drafts','wallpapers-public')),
  object_path text not null, mime text not null check(mime='image/jpeg'),
  width integer not null check(width>0), height integer not null check(height>0),
  alt text not null check(length(alt) between 1 and 1000), checksum text not null,
  unique(post_id,role)
);
create table public.collections (
  id uuid primary key default gen_random_uuid(), editorial_date date unique not null,
  status text not null default 'draft' check(status in ('draft','published','withdrawn')),
  published_at timestamptz
);
create table public.collection_posts (
  collection_id uuid not null references public.collections on delete cascade,
  post_id uuid not null references public.posts, position integer not null check(position between 1 and 5),
  primary key(collection_id,post_id), unique(collection_id,position)
);
create index collection_posts_post_idx on public.collection_posts(post_id);
create table public.likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,post_id)
);
create table public.saves (like public.likes including defaults including constraints including indexes);
alter table public.saves add foreign key(user_id) references auth.users(id) on delete cascade;
alter table public.saves add foreign key(post_id) references public.posts on delete cascade;
create index likes_post_idx on public.likes(post_id);
create index saves_post_idx on public.saves(post_id);
create index likes_user_date_idx on public.likes(user_id,created_at desc,post_id);
create index saves_user_date_idx on public.saves(user_id,created_at desc,post_id);
create table public.post_stats (
  post_id uuid primary key references public.posts on delete cascade,
  like_count bigint not null default 0 check(like_count>=0)
);
create table private.publishing_audit (
  id bigint generated always as identity primary key, operator text not null,
  action text not null, target text not null, details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table private.account_deletion_jobs (
  id uuid primary key default gen_random_uuid(), user_id uuid unique not null,
  status text not null default 'pending' check(status in ('pending','complete')),
  attempts integer not null default 0, created_at timestamptz not null default now(), completed_at timestamptz
);
alter table private.publishing_audit enable row level security;
alter table private.account_deletion_jobs enable row level security;
grant all on all tables in schema private to service_role;
grant usage on all sequences in schema private to service_role;

create function private.account_active() returns boolean language sql stable security definer
set search_path='' as $$
 select auth.uid() is not null
 and exists(select 1 from auth.users where id=(select auth.uid()))
 and not exists(select 1 from private.account_deletion_jobs where user_id=(select auth.uid()))
$$;
revoke all on function private.account_active() from public,anon;
grant execute on function private.account_active() to authenticated;

do $$ declare t text; begin
 foreach t in array array['profiles','posts','post_assets','collections','collection_posts','likes','saves','post_stats'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant select on public.posts,public.post_assets,public.collections,public.collection_posts,public.post_stats to anon,authenticated;
-- Anonymous joins see no reaction rows because there is no anonymous RLS policy.
grant select on public.likes,public.saves to anon;
create policy published_posts on public.posts for select to anon,authenticated
 using(status='published' and editorial_date <= (now() at time zone 'utc')::date);
create policy published_assets on public.post_assets for select to anon,authenticated
 using(bucket='wallpapers-public' and exists(select 1 from public.posts where id=post_id));
create policy published_collections on public.collections for select to anon,authenticated
 using(status='published' and editorial_date <= (now() at time zone 'utc')::date);
create policy published_members on public.collection_posts for select to anon,authenticated
 using(exists(select 1 from public.collections where id=collection_id) and exists(select 1 from public.posts where id=post_id));
create policy published_stats on public.post_stats for select to anon,authenticated
 using(exists(select 1 from public.posts where id=post_id));
grant select,insert on public.profiles to authenticated;
grant update(display_name,themes) on public.profiles to authenticated;
create policy own_profile_read on public.profiles for select to authenticated using(id=(select auth.uid()) and (select private.account_active()));
create policy own_profile_insert on public.profiles for insert to authenticated with check(id=(select auth.uid()) and (select private.account_active()));
create policy own_profile_update on public.profiles for update to authenticated using(id=(select auth.uid()) and (select private.account_active())) with check(id=(select auth.uid()) and (select private.account_active()));
do $$ declare t text; begin
 foreach t in array array['likes','saves'] loop
 execute format('grant select,insert,delete on public.%I to authenticated',t);
 execute format('create policy own_read on public.%I for select to authenticated using(user_id=(select auth.uid()) and (select private.account_active()))',t);
 execute format('create policy own_insert on public.%I for insert to authenticated with check(user_id=(select auth.uid()) and (select private.account_active()) and exists(select 1 from public.posts where id=post_id))',t);
 execute format('create policy own_delete on public.%I for delete to authenticated using(user_id=(select auth.uid()) and (select private.account_active()))',t);
 end loop;
end $$;

create function private.update_like_count() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
  insert into public.post_stats(post_id,like_count) values(new.post_id,1)
  on conflict(post_id) do update set like_count=public.post_stats.like_count+1;
  return new;
 else
  update public.post_stats set like_count=like_count-1 where post_id=old.post_id;
  return old;
 end if;
end $$;
revoke all on function private.update_like_count() from public,anon,authenticated;
create trigger likes_count after insert or delete on public.likes for each row execute function private.update_like_count();

-- JSON assembly uses invoker rights: nested records remain subject to RLS.
create function public.post_document(p public.posts) returns jsonb language sql stable set search_path='' as $$
 select to_jsonb(p) || jsonb_build_object('assets',coalesce((select jsonb_agg(a) from public.post_assets a where a.post_id=p.id),'[]'::jsonb),
 'like_count',coalesce((select s.like_count from public.post_stats s where s.post_id=p.id),0))
$$;
create function public.catalogue(q text default '', selected_themes text[] default '{}', selected_style text default null,
 on_date date default null, ordering text default 'newest', skip integer default 0, take integer default 24,
 selected_ids uuid[] default null, excluded uuid default null, collection uuid default null, reaction_kind text default null)
returns jsonb language sql stable set search_path='' as $$
 with matching as (
 select p.*,coalesce(s.like_count,0) likes_total, cp.position,
 case when reaction_kind='liked' then l.created_at else v.created_at end reaction_date
 from public.posts p left join public.post_stats s on s.post_id=p.id
 left join public.collection_posts cp on cp.post_id=p.id and cp.collection_id=collection
 left join public.likes l on l.post_id=p.id and l.user_id=(select auth.uid())
 left join public.saves v on v.post_id=p.id and v.user_id=(select auth.uid())
 where p.status='published' and p.editorial_date <= (now() at time zone 'utc')::date
 and (q='' or strpos(lower(p.title||' '||p.quote||' '||array_to_string(p.themes,' ')),lower(q))>0)
 and (cardinality(selected_themes)=0 or p.themes && selected_themes)
 and (selected_style is null or selected_style=any(p.styles))
 and (on_date is null or p.editorial_date=on_date)
 and (selected_ids is null or p.id=any(selected_ids)) and (excluded is null or p.id<>excluded)
 and (collection is null or cp.post_id is not null)
 and (reaction_kind is null or (reaction_kind='liked' and l.post_id is not null) or (reaction_kind='saved' and v.post_id is not null))
 ), page as (
 select m.*,row_number() over(order by
 case when collection is not null then position end,
 case when reaction_kind is not null then reaction_date end desc,
 case when ordering='liked' then likes_total end desc,editorial_date desc,id) ordinal
 from matching m order by ordinal offset greatest(skip,0) limit least(greatest(take,1),100)
 )
 select jsonb_build_object('posts',coalesce((select jsonb_agg(public.post_document(p) order by page.ordinal) from page join public.posts p on p.id=page.id),'[]'::jsonb),
 'total',(select count(*) from matching),'offset',greatest(skip,0),'limit',least(greatest(take,1),100))
$$;
create function public.reaction_counts() returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('likedCount',(select count(*) from public.likes l join public.posts p on p.id=l.post_id where l.user_id=(select auth.uid())),
 'savedCount',(select count(*) from public.saves s join public.posts p on p.id=s.post_id where s.user_id=(select auth.uid())))
$$;
create function public.set_reaction(kind text, target uuid, active boolean) returns jsonb language plpgsql set search_path='' as $$
begin
 if not private.account_active() then raise insufficient_privilege; end if;
 if kind not in ('liked','saved') then raise invalid_parameter_value; end if;
 -- Serialize mutations for this user, including opposite concurrent desired states.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if active and not exists(select 1 from public.posts where id=target) then raise exception 'Post unavailable' using errcode='P0002'; end if;
 if kind='liked' then
  if active then insert into public.likes(user_id,post_id) values(auth.uid(),target) on conflict do nothing;
  else delete from public.likes where user_id=auth.uid() and post_id=target; end if;
 else
  if active then insert into public.saves(user_id,post_id) values(auth.uid(),target) on conflict do nothing;
  else delete from public.saves where user_id=auth.uid() and post_id=target; end if;
 end if;
 return public.reaction_counts() || jsonb_build_object('postId',target,
 'liked',exists(select 1 from public.likes where user_id=auth.uid() and post_id=target),
 'saved',exists(select 1 from public.saves where user_id=auth.uid() and post_id=target),
 'likeCount',coalesce((select like_count from public.post_stats where post_id=target),0));
end $$;

-- Admin RPCs are invoker functions with EXECUTE granted only to service_role.
create function public.publish_collection(target uuid, operator_label text) returns void language plpgsql set search_path='' as $$
declare d date;
begin
 select editorial_date into d from public.collections where id=target for update;
 if d is null or d > (now() at time zone 'utc')::date then raise exception 'Invalid publication date'; end if;
 perform 1 from public.posts where id in (select post_id from public.collection_posts where collection_id=target) order by id for update;
 if (select count(*) from public.collection_posts where collection_id=target)<>5 then raise exception 'Five posts required'; end if;
 if exists(select 1 from public.collection_posts cp join public.posts p on p.id=cp.post_id where cp.collection_id=target and
 (p.editorial_date<>d or not p.editorial_approved or not p.rights_approved or
 (select count(*) from public.post_assets a where a.post_id=p.id and a.bucket='wallpapers-public' and a.role in ('thumbnail','hero','mobileHero','mobile','desktop'))<>5))
 then raise exception 'Posts need approval and all required assets'; end if;
 update public.posts set status='published' where id in (select post_id from public.collection_posts where collection_id=target);
 update public.collections set status='published',published_at=now() where id=target;
 insert into private.publishing_audit(operator,action,target) values(operator_label,'publish',target::text);
end $$;
create function public.assemble_collection(day date, members uuid[]) returns uuid language plpgsql set search_path='' as $$
declare cid uuid;
begin
 if cardinality(members)<>5 or (select count(distinct m) from unnest(members) m)<>5 then raise exception 'Five distinct members required'; end if;
 insert into public.collections(editorial_date) values(day) on conflict(editorial_date) do nothing;
 select id into cid from public.collections where editorial_date=day for update;
 if exists(select 1 from public.collections where id=cid and status='published') then raise exception 'Withdraw before changing membership'; end if;
 delete from public.collection_posts where collection_id=cid;
 insert into public.collection_posts select cid,m,ordinality from unnest(members) with ordinality as x(m,ordinality);
 return cid;
end $$;
create function public.withdraw_content(target uuid, is_post boolean, operator_label text) returns void language plpgsql set search_path='' as $$
begin
 update public.collections set status='withdrawn' where id=target or (is_post and id in(select collection_id from public.collection_posts where post_id=target));
 if is_post then update public.posts set status='withdrawn' where id=target; end if;
 insert into private.publishing_audit(operator,action,target) values(operator_label,'withdraw',target::text);
end $$;
create function public.reconcile_counts() returns void language plpgsql set search_path='' as $$
begin
 lock table public.likes in share mode;
 insert into public.post_stats(post_id,like_count) select p.id,count(l.post_id) from public.posts p left join public.likes l on l.post_id=p.id group by p.id
 on conflict(post_id) do update set like_count=excluded.like_count;
end $$;
create function public.deletion_job(target uuid) returns jsonb language plpgsql set search_path='' as $$
declare j private.account_deletion_jobs;
begin
 insert into private.account_deletion_jobs(user_id) values(target) on conflict(user_id) do nothing;
 select * into j from private.account_deletion_jobs where user_id=target;
 return to_jsonb(j);
end $$;
create function public.pending_deletions() returns setof private.account_deletion_jobs language sql set search_path='' as $$ select * from private.account_deletion_jobs where status='pending' order by created_at limit 100 $$;
create function public.finish_deletion(target uuid, completed boolean) returns void language sql set search_path='' as $$
 update private.account_deletion_jobs set attempts=attempts+1,status=case when completed then 'complete' else 'pending' end,
 completed_at=case when completed then now() else null end where user_id=target
$$;

revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.post_document(public.posts),public.catalogue(text,text[],text,date,text,integer,integer,uuid[],uuid,uuid,text) to anon,authenticated;
grant execute on function public.reaction_counts(),public.set_reaction(text,uuid,boolean) to authenticated;
grant execute on all functions in schema public to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('wallpapers-drafts','wallpapers-drafts',false,20971520,array['image/jpeg']),
 ('wallpapers-public','wallpapers-public',true,20971520,array['image/jpeg'])
on conflict(id) do nothing;
