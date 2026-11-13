-- Weekly windows are local Bangkok times, ISO weekday 1 (Monday) to 7 (Sunday).
create or replace function peer.valid_weekly(p jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare w jsonb; duration integer:=(p->>'duration')::int;
begin
 if duration is null or duration not between 15 and 480 or jsonb_typeof(p->'weeklyAvailability') is distinct from 'array' then return false;end if;
 if jsonb_array_length(p->'weeklyAvailability') not between 1 and 28 then return false;end if;
 for w in select value from jsonb_array_elements(p->'weeklyAvailability') loop
  if jsonb_typeof(w->'day') is distinct from 'number' or (w->>'day')::numeric<>trunc((w->>'day')::numeric) or (w->>'day')::int not between 1 and 7 or coalesce(w->>'start','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(w->>'end','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' then return false;end if;
  if (w->>'end')::time-(w->>'start')::time<duration*interval '1 minute' then return false;end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p->'weeklyAvailability') as entries(value) group by entries.value->>'day' having count(*)>4) then return false;end if;
 if exists(select 1 from jsonb_array_elements(p->'weeklyAvailability') with ordinality a(w,i) cross join jsonb_array_elements(p->'weeklyAvailability') with ordinality b(w,i) where a.i<b.i and a.w->>'day'=b.w->>'day' and a.w->>'start'<b.w->>'end' and b.w->>'start'<a.w->>'end') then return false;end if;
 return true;
exception when others then return false;
end $$;

