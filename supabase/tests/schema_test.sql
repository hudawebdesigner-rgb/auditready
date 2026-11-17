-- Behaviour tests for the initial schema. Each block must PASS.
\set ON_ERROR_STOP on
\set QUIET on

-- users
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'Boss@Example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'stranger@example.com');
-- allowlist after the user exists -> backfill trigger
insert into public.team_allowed_emails (email, role) values ('boss@example.com', 'admin');
-- user created after allowlist -> signup trigger
insert into public.team_allowed_emails (email, role) values ('me@example.com', 'member');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000c', 'me@example.com');

do $$ begin
  assert (select count(*) from public.team_members) = 2, 'expected 2 team members';
  assert (select role from public.team_members where email='boss@example.com') = 'admin', 'boss should be admin';
  raise notice 'PASS team allowlist triggers';
end $$;

-- sample data (as service role / owner)
insert into public.sellers (marketplace, seller_id, store_name, business_name_displayed,
  business_address_displayed, address_state, address_country, source, collect_status)
values ('amazon', 'A1B2C3', 'Acme Store', 'Acme Widgets, L.L.C.', '1 Main St, Austin, TX 78701, US', 'TX', 'US', 'rainforest', 'success'),
       ('walmart', '12345', 'Acme Widgets', 'ACME WIDGETS LLC', '1 Main Street, Austin TX 78701', 'TX', 'US', 'bluecart', 'success'),
       ('amazon', 'ZZZ999', 'Far Away Co', 'Shenzhen Example Ltd', 'Shenzhen, CN', null, 'CN', 'rainforest', 'success');

do $$ begin
  assert (select name_normalized from public.sellers where seller_id='A1B2C3') = 'acme widgets', 'normalized name';
  assert (select is_us from public.sellers where seller_id='A1B2C3'), 'is_us true';
  assert not (select is_us from public.sellers where seller_id='ZZZ999'), 'is_us false';
  assert extensions.similarity(
    (select name_normalized from public.sellers where seller_id='A1B2C3'),
    (select name_normalized from public.sellers where seller_id='12345')) = 1, 'fuzzy names equal';
  raise notice 'PASS generated columns + fuzzy name';
end $$;

-- exact duplicate is rejected
do $$ begin
  begin
    insert into public.sellers (marketplace, seller_id) values ('amazon', 'A1B2C3');
    raise exception 'FAIL duplicate allowed';
  exception when unique_violation then raise notice 'PASS exact duplicate blocked';
  end;
end $$;

-- owner_direct_phone must come from Apollo
do $$ declare s uuid := (select id from public.sellers where seller_id='A1B2C3'); begin
  begin
    insert into public.contacts (seller_id, contact_type, full_name, value, source, confidence)
    values (s, 'owner_direct_phone', 'Jane Doe', '+15125550100', 'rainforest', 90);
    raise exception 'FAIL non-apollo owner phone allowed';
  exception when check_violation then raise notice 'PASS owner phone must be Apollo';
  end;
  insert into public.contacts (seller_id, contact_type, full_name, title, value, source, confidence)
  values (s, 'owner_direct_phone', 'Jane Doe', 'CEO', '+15125550100', 'apollo', 85);
  insert into public.contacts (seller_id, contact_type, value, source, confidence)
  values (s, 'business_phone', '+15125550199', 'apollo', 80);
  begin
    insert into public.contacts (seller_id, contact_type, value, source, confidence)
    values (s, 'business_phone', '+15125550199', 'apollo', 80);
    raise exception 'FAIL duplicate contact allowed';
  exception when unique_violation then raise notice 'PASS duplicate contact blocked';
  end;
  begin
    insert into public.contacts (seller_id, contact_type, value, source, confidence)
    values (s, 'business_email', 'x@y.com', 'apollo', 140);
    raise exception 'FAIL confidence > 100 allowed';
  exception when check_violation then raise notice 'PASS confidence range enforced';
  end;
  insert into public.legal_entities (seller_id, legal_name, jurisdiction_state, registration_number,
    registered_agent_name, match_confidence, source, is_primary)
  values (s, 'ACME WIDGETS LLC', 'TX', '0801234567', 'Registered Agents Inc', 92, 'cobalt', true);
  begin
    insert into public.legal_entities (seller_id, legal_name, match_confidence, source)
    values (s, 'Guess LLC', 50, 'apollo');
    raise exception 'FAIL legal entity from apollo allowed';
  exception when check_violation then raise notice 'PASS legal entity source restricted';
  end;
  insert into public.enrichment_runs (seller_id, step, provider, status, credits_used)
  values (s, 'enrich', 'apollo', 'success', 2), (s, 'enrich', 'apollo', 'success', 3);
  assert (select credits_used from public.daily_credit_usage where provider='apollo') = 5, 'daily usage view';
  raise notice 'PASS daily credit usage view';
end $$;

-- RLS: logged-out visitor
set role anon;
do $$ begin
  begin
    perform 1 from public.sellers;
    raise exception 'FAIL anon can read sellers';
  exception when insufficient_privilege then raise notice 'PASS anon blocked';
  end;
end $$;
reset role;

-- RLS: logged-in stranger (not on allowlist) sees nothing
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.sellers) = 0, 'stranger sees sellers';
  assert (select count(*) from public.contacts) = 0, 'stranger sees contacts';
  assert (select count(*) from public.settings) = 0, 'stranger sees settings';
  raise notice 'PASS stranger sees nothing';
end $$;

-- RLS: member can read, add sellers, but not change settings or delete
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ declare n int; begin
  assert (select count(*) from public.sellers) = 3, 'member reads sellers';
  assert (select count(*) from public.contacts) = 2, 'member reads contacts';
  insert into public.sellers (marketplace, seller_id) values ('amazon', 'NEW001');
  update public.settings set apollo_daily_credit_limit = 999;
  assert (select apollo_daily_credit_limit from public.settings) = 50, 'member changed settings';
  delete from public.sellers where seller_id = 'NEW001';
  assert (select count(*) from public.sellers where seller_id='NEW001') = 1, 'member deleted seller';
  begin
    insert into public.contacts (seller_id, contact_type, value, source, confidence)
    select id, 'business_email', 'fake@x.com', 'manual', 50 from public.sellers limit 1;
    raise exception 'FAIL member inserted contact';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS member permissions';
end $$;

-- RLS: admin can change settings and delete
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  update public.settings set apollo_daily_credit_limit = 100;
  assert (select apollo_daily_credit_limit from public.settings) = 100, 'admin settings';
  delete from public.sellers where seller_id = 'NEW001';
  assert (select count(*) from public.sellers where seller_id='NEW001') = 0, 'admin delete';
  raise notice 'PASS admin permissions';
end $$;
reset role;
\echo 'ALL SCHEMA TESTS PASSED'
