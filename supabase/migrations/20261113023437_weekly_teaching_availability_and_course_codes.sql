-- Weekly windows are local Bangkok times, ISO weekday 1 (Monday) to 7 (Sunday).
create or replace function peer.valid_weekly(p jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare w jsonb; a jsonb; duration integer:=(p->>'duration')::int;
begin
 if duration is null or duration not between 15 and 480 or jsonb_typeof(p->'weeklyAvailability') is distinct from 'array' then return false;end if;
 if jsonb_array_length(p->'weeklyAvailability') not between 1 and 28 then return false;end if;
 for w in select value from jsonb_array_elements(p->'weeklyAvailability') loop
  if jsonb_typeof(w->'day') is distinct from 'number' or (w->>'day')::numeric<>trunc((w->>'day')::numeric) or (w->>'day')::int not between 1 and 7 or coalesce(w->>'start','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(w->>'end','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' then return false;end if;
  if (w->>'end')::time-(w->>'start')::time<duration*interval '1 minute' then return false;end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p->'weeklyAvailability') w group by w->>'day' having count(*)>4) then return false;end if;
 if exists(select 1 from jsonb_array_elements(p->'weeklyAvailability') with ordinality a(w,i) cross join jsonb_array_elements(p->'weeklyAvailability') with ordinality b(w,i) where a.i<b.i and a.w->>'day'=b.w->>'day' and a.w->>'start'<b.w->>'end' and b.w->>'start'<a.w->>'end') then return false;end if;
 return true;
exception when others then return false;
end $$;
create or replace function peer.slot_allowed(p jsonb, ts timestamptz) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare local_ts timestamp:=ts at time zone 'Asia/Bangkok'; start_min integer; from_min integer; until_min integer; duration integer:=(p->>'duration')::int; w jsonb;
begin
 if ts is null or ts<=now()+interval '30 minutes' then return false;end if;
 if not (p ? 'weeklyAvailability') then return ts=(p->>'date')::timestamptz;end if;
 if not peer.valid_weekly(p) or local_ts::date>=(now() at time zone 'Asia/Bangkok')::date+28 or extract(second from local_ts)<>0 then return false;end if;
 start_min:=extract(hour from local_ts)::int*60+extract(minute from local_ts)::int;
 for w in select value from jsonb_array_elements(p->'weeklyAvailability') loop
  from_min:=extract(hour from (w->>'start')::time)::int*60+extract(minute from (w->>'start')::time)::int;
  until_min:=extract(hour from (w->>'end')::time)::int*60+extract(minute from (w->>'end')::time)::int;
  if (w->>'day')::int=extract(isodow from local_ts)::int and start_min>=from_min and start_min+duration<=until_min and (start_min-from_min)%duration=0 then return true;end if;
 end loop;
 return false;
exception when others then return false;
end $$;
create or replace function peer.listing_json(l peer.listings, actor text) returns jsonb language sql stable security invoker set search_path='' as $$
 select (l.payload - case when l.owner=actor then '__none' else 'fileKey' end) || jsonb_build_object('id',l.id,'owner',l.owner,'status',l.status,'live',true,'created',extract(epoch from l.created)*1000,'rating',0,'reviews',0,
 'filled',case when l.payload ? 'weeklyAvailability' then 0 else coalesce((select sum(b.seats) from peer.bookings b where b.item=l.id and b.status<>'cancelled'),0) end,
 'slotBookings',coalesce((select jsonb_agg(jsonb_build_object('date',x.date,'seats',x.seats)) from (select payload->>'date' as date,sum(seats) as seats from peer.bookings where item=l.id and status<>'cancelled' group by payload->>'date')x),'[]'::jsonb));
$$;
revoke all on function peer.valid_weekly(jsonb),peer.slot_allowed(jsonb,timestamptz),peer.listing_json(peer.listings,text) from public,anon,authenticated;
grant execute on function peer.valid_weekly(jsonb),peer.slot_allowed(jsonb,timestamptz),peer.listing_json(peer.listings,text) to service_role;

CREATE OR REPLACE FUNCTION public.peer_gateway(request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 op text:=request->>'op'; actor text:=nullif(request->>'actor',''); d jsonb:=coalesce(request->'data','{}');
 l peer.listings; b peer.bookings; c peer.conversations; p jsonb; rid uuid; mid uuid; total numeric; n integer; used integer; target_actor text; res jsonb; ts timestamptz;
begin
 if length(coalesce(actor,''))>200 or octet_length(request::text)>64000 then return jsonb_build_object('error','Invalid request'); end if;
 if op='state' then
  return jsonb_build_object('backend','supabase','signedIn',actor is not null,'userId',actor,
  'profile',coalesce((select payload from peer.profiles where id=actor),'{}'::jsonb),
  'listings',coalesce((select jsonb_agg(peer.listing_json(x,actor)) from (select * from peer.listings where status='published' or owner=actor or id in(select item from peer.bookings where owner=actor or provider=actor) or id in(select item from peer.conversations where learner=actor or provider=actor) order by created desc limit 300)x),'[]'::jsonb),
  'orders',coalesce((select jsonb_agg(peer.booking_json(x)) from (select * from peer.bookings where owner=actor order by created desc limit 300)x),'[]'::jsonb),
  'providerOrders',coalesce((select jsonb_agg(peer.booking_json(x)) from (select * from peer.bookings where provider=actor order by created desc limit 300)x),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(x.payload||jsonb_build_object('id',x.id,'kind',x.kind,'target',x.target,'created',extract(epoch from x.created)*1000)) from(select * from peer.events where owner=actor order by created desc limit 200)x),'[]'::jsonb),
  'marks',coalesce((select jsonb_agg(jsonb_build_object('id',id,'target',target,'kind',kind)) from peer.marks where owner=actor),'[]'::jsonb),
  'reviews',coalesce((select jsonb_agg(x.payload||jsonb_build_object('id',x.id,'item',x.item,'name',coalesce(pr.payload->>'name','Learner'))) from peer.reviews x left join peer.profiles pr on pr.id=x.owner),'[]'::jsonb),
  'requests',coalesce((select jsonb_agg(x.payload||jsonb_build_object('id',x.id,'owner',x.owner,'status',x.status,'followers',(select count(*) from peer.marks m where m.target=x.id::text and m.kind='follow'))) from(select * from peer.requests order by created desc limit 200)x),'[]'::jsonb),
  'conversations',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'item',x.item,'slotDate',x.slot_date,'updated',extract(epoch from x.updated)*1000,'providerView',x.provider=actor,'peerName',coalesce(pr.payload->>'name','Peer'),'preview',(select body from peer.messages m where m.conversation=x.id order by created desc,id desc limit 1))) from(select * from peer.conversations where learner=actor or provider=actor order by updated desc limit 200)x left join peer.profiles pr on pr.id=case when x.provider=actor then x.learner else x.provider end),'[]'::jsonb));
 end if;
 if op='listing_get' then
  select * into l from peer.listings where id=(d->>'id')::uuid and (status='published' or owner=actor);
  return case when l.id is null then 'null'::jsonb else peer.listing_json(l,actor) end;
 end if;
 if op='file_access' and coalesce(d->>'preview','')<>'' then
  select * into l from peer.listings where id=(d->>'preview')::uuid and (status='published' or owner=actor);
  if l.id is null or l.payload->>'kind'<>'digital' then return jsonb_build_object('error','File not found','status',404);end if;
  return jsonb_build_object('item',l.payload||jsonb_build_object('id',l.id));
 end if;
 if actor is null then return jsonb_build_object('error','Please sign in to continue.','status',403);end if;
 if op='profile' then
  insert into peer.profiles(id,payload) values(actor,d||'{"universityVerified":false}'::jsonb) on conflict(id) do update set payload=excluded.payload,updated=now();
 elsif op='mark' then
  if (d->>'on')::boolean then insert into peer.marks(owner,target,kind) values(actor,d->>'target',d->>'kind') on conflict do nothing;
  else delete from peer.marks where owner=actor and target=d->>'target' and kind=d->>'kind';end if;
 elsif op='listing_schedule' then
  select * into l from peer.listings where id=(d->>'id')::uuid and owner=actor for update;
  if l.id is null or l.payload->>'kind'<>'class' then return jsonb_build_object('error','Class not found','status',404);end if;
  p:=l.payload||jsonb_build_object('weeklyAvailability',d->'weeklyAvailability','courseCode',coalesce(d->>'courseCode',l.payload->>'courseCode',''));
  if not peer.valid_weekly(p) or coalesce(p->>'courseCode','')!~'^([0-9]{7})?$' then return jsonb_build_object('error','กรุณาตรวจสอบช่วงเวลาสอนและรหัสวิชา / Check teaching windows and course code');end if;
  update peer.listings set payload=p where id=l.id;
 elsif op='listing' then
  if coalesce(d->>'courseCode','')!~'^([0-9]{7})?$' then return jsonb_build_object('error','Invalid course code');end if;
  select payload into p from peer.profiles where id=actor;
  if coalesce(p->>'name','')='' then return jsonb_build_object('error','กรุณาบันทึกโปรไฟล์ก่อนเผยแพร่ / Save your profile before publishing.');end if;
  if d->>'kind'='class' then
   ts:=(d->>'date')::timestamptz;
   if d ? 'weeklyAvailability' and not peer.valid_weekly(d) then return jsonb_build_object('error','Invalid teaching windows');end if;
   if ts<now()+interval '30 minutes' or jsonb_array_length(d->'objectives')<3 or (d->>'duration')::int<15 or (d->>'minSeats')::int>(d->>'seats')::int then return jsonb_build_object('error','กรุณาตรวจสอบเป้าหมาย วันเวลา และจำนวนที่นั่ง / Check learning goals, future time, and seats.');end if;
  end if;
  if d->>'kind'='digital' and not exists(select 1 from peer.files where id=d->>'fileKey' and owner=actor) then return jsonb_build_object('error','Upload your own PDF first.');end if;
  insert into peer.listings(owner,payload,status) values(actor,d||jsonb_build_object('titleEn',coalesce(nullif(d->>'titleEn',''),d->>'title'),'tutor',p->>'name','tutorEn',p->>'name','faculty',p->>'faculty','subject',d->>'course','tag',case when d->>'kind'='class' then 'คลาสใหม่' else 'รายการใหม่' end,'rating',0,'reviews',0,'filled',0,'color','rose','cover',d->>'course','certified',false),'published') returning id into rid;
  perform peer.notice(actor,'เผยแพร่รายการแล้ว / Your listing is published',rid::text);
  return jsonb_build_object('ok',true,'id',rid);
 elsif op='listing_visibility' then
  update peer.listings set status=case when (d->>'published')::boolean then 'published' else 'draft' end where id=(d->>'id')::uuid and owner=actor;
  if not found then return jsonb_build_object('error','Listing not found','status',404);end if;
 elsif op='register_file' then
  insert into peer.files(id,owner,payload) values(d->>'key',actor,d) on conflict(id) do nothing;
 elsif op='request' then
  if (d->>'neededBy')::date<current_date then return jsonb_build_object('error','Choose a future date.');end if;
  insert into peer.requests(owner,payload) values(actor,d||jsonb_build_object('name',coalesce((select payload->>'name' from peer.profiles where id=actor),'Peer'),'expires',extract(epoch from ((d->>'neededBy')::date+interval '1 day'))*1000)) returning id into rid;
  return jsonb_build_object('ok',true,'id',rid);
 elsif op='close_request' then
  update peer.requests set status='fulfilled' where id=(d->>'id')::uuid and owner=actor;
  if not found then return jsonb_build_object('error','Request not found','status',404);end if;
 elsif op='start_chat' then
  select * into l from peer.listings where id=(d->>'item')::uuid and status='published';
  if l.id is null or l.payload->>'kind'<>'class' or l.owner=actor then return jsonb_build_object('error','เลือกคลาสของผู้สอนคนอื่น / Choose another tutor’s class.');end if;
  if coalesce(d->>'slot','')<>'' and not peer.slot_allowed(l.payload,(d->>'slot')::timestamptz) then return jsonb_build_object('error','Time unavailable');end if;
  insert into peer.conversations(item,learner,provider,slot_date) values(l.id,actor,l.owner,coalesce(d->>'slot','')) on conflict(item,learner) do update set updated=now() returning id into rid;
  return jsonb_build_object('ok',true,'id',rid);
 elsif op in('chat_get','chat_message','chat_slot') then
  select * into c from peer.conversations where id=(d->>'id')::uuid and (learner=actor or provider=actor);
  if c.id is null then return jsonb_build_object('error','Conversation not found','status',404);end if;
  if op='chat_get' then
   return jsonb_build_object('conversation',jsonb_build_object('id',c.id,'item',c.item,'slotDate',c.slot_date,'providerView',c.provider=actor),'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'role',case when sender is null then 'system' when sender=c.learner then 'learner' else 'tutor' end,'mine',sender=actor,'body',body,'created',extract(epoch from created)*1000) order by created,id) from(select * from peer.messages where conversation=c.id order by created desc,id desc limit 200)m),'[]'::jsonb));
  elsif op='chat_slot' then
   select * into l from peer.listings where id=c.item;
   if c.learner<>actor or l.status<>'published' or not peer.slot_allowed(l.payload,(d->>'slot')::timestamptz) then return jsonb_build_object('error','Time unavailable');end if;
   update peer.conversations set slot_date=d->>'slot',updated=now() where id=c.id;
  else
   insert into peer.messages(id,conversation,sender,body) values((d->>'requestId')::uuid,c.id,actor,d->>'text') on conflict(id) do nothing returning id into mid;
   if mid is not null then
    update peer.conversations set updated=now() where id=c.id;
    perform peer.notice(case when actor=c.learner then c.provider else c.learner end,'มีข้อความใหม่ / New message',c.id::text,c.id);
   elsif not exists(select 1 from peer.messages where id=(d->>'requestId')::uuid and conversation=c.id and sender=actor) then return jsonb_build_object('error','Request ID already used','status',409);end if;
  end if;
 elsif op='notifications_read' then
  update peer.events set payload=payload||'{"read":true}'::jsonb where owner=actor and kind='notification' and (coalesce(d->>'conversation','')='' or payload->>'conversation'=d->>'conversation');
 elsif op='book' then
  rid:=(d->>'requestId')::uuid;
  perform pg_advisory_xact_lock(hashtextextended(rid::text,0));
  select * into b from peer.bookings where id=rid;
  if b.id is not null then
   if b.owner=actor and b.item=(d->>'item')::uuid then return jsonb_build_object('ok',true,'id',b.id);end if;
   return jsonb_build_object('error','Request ID already used','status',409);
  end if;
  select * into l from peer.listings where id=(d->>'item')::uuid and status='published' for update;
  if l.id is null or l.owner=actor then return jsonb_build_object('error','Listing unavailable');end if;
  if l.payload->>'kind'='digital' and (l.payload->>'price')::numeric>0 then return jsonb_build_object('error','ยังไม่เปิดชำระเงินสำหรับไฟล์ / Paid downloads are not available until payments are connected.');end if;
  n:=case when l.payload->>'kind'='class' then (d->>'seats')::int else 1 end;
  if n<1 or n>10 then return jsonb_build_object('error','Invalid seats');end if;
  if l.payload->>'kind'='class' then
   ts:=coalesce(d->>'slot',l.payload->>'date')::timestamptz;
   if not peer.slot_allowed(l.payload,ts) then return jsonb_build_object('error','Time unavailable');end if;
   perform pg_advisory_xact_lock(hashtextextended('provider:'||l.owner,0));
   if exists(select 1 from peer.bookings other where other.provider=l.owner and other.status<>'cancelled' and other.payload->>'kind'='class' and not(other.item=l.id and (other.payload->>'date')::timestamptz=ts) and (other.payload->>'date')::timestamptz<ts+(l.payload->>'duration')::int*interval '1 minute' and (other.payload->>'date')::timestamptz+(other.payload->>'duration')::int*interval '1 minute'>ts) then return jsonb_build_object('error','ผู้สอนมีคลาสในช่วงนี้แล้ว / Tutor is already booked at this time','status',409);end if;
   insert into peer.conversations(item,learner,provider,slot_date) values(l.id,actor,l.owner,to_char(ts at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) on conflict(item,learner) do update set updated=now() returning * into c;
   if coalesce(d->>'conversation','')<>'' and (d->>'conversation')::uuid<>c.id then return jsonb_build_object('error','Conversation not found','status',404);end if;
  end if;
  select coalesce(sum(seats),0) into used from peer.bookings where item=l.id and status<>'cancelled' and (l.payload->>'kind'<>'class' or (payload->>'date')::timestamptz=ts);
  if l.payload->>'kind'<>'digital' and used+n>(l.payload->>'seats')::int then return jsonb_build_object('error','ที่นั่งเต็มแล้ว / No spaces remaining','status',409);end if;
  total:=round((l.payload->>'price')::numeric*n);
  p:=jsonb_build_object('title',l.payload->>'title','titleEn',l.payload->>'titleEn','kind',l.payload->>'kind','price',total,'seats',n,'courseCode',l.payload->>'courseCode','date',case when l.payload->>'kind'='class' then to_char(ts at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') else l.payload->>'date' end,'location',l.payload->>'location','mode',l.payload->>'mode','tutor',l.payload->>'tutor','course',l.payload->>'course','duration',l.payload->'duration');
  insert into peer.bookings(id,owner,provider,item,conversation,seats,payload,status) values(rid,actor,l.owner,l.id,c.id,n,p,'reserved');
  perform peer.notice(actor,'บันทึกการจองแล้ว ยังไม่มีการเรียกเก็บเงิน / Reservation saved; no payment collected',rid::text,c.id);
  perform peer.notice(l.owner,'มีผู้เรียนจองรายการของคุณ / New reservation for your listing',rid::text,c.id);
  if c.id is not null then insert into peer.messages(conversation,body) values(c.id,'ยืนยันการจองแล้ว / Reservation confirmed');end if;
  return jsonb_build_object('ok',true,'id',rid);
 elsif op in('cancel','checkin','complete','handover','review','message','dispute','file_access','download_complete') then
  select * into b from peer.bookings where id=coalesce(d->>'id',d->>'order')::uuid and (owner=actor or provider=actor) for update;
  if b.id is null then return jsonb_build_object('error','Booking not found','status',404);end if;
  if op='cancel' then
   if b.status not in('reserved','checked_in') then return jsonb_build_object('error','This booking cannot be cancelled');end if;
   update peer.bookings set status='cancelled' where id=b.id;
  elsif op='checkin' then
   if b.owner<>actor or b.payload->>'kind'<>'class' or b.status<>'reserved' or now()<(b.payload->>'date')::timestamptz-interval '30 minutes' or now()>(b.payload->>'date')::timestamptz+((b.payload->>'duration')::int*interval '1 minute') then return jsonb_build_object('error','เช็คอินได้ก่อนคลาส 30 นาทีและระหว่างคลาส / Check-in opens 30 minutes before class.');end if;
   update peer.bookings set status='checked_in' where id=b.id;
  elsif op='complete' then
   if b.provider<>actor or b.payload->>'kind'<>'class' or b.status not in('reserved','checked_in') or now()<(b.payload->>'date')::timestamptz+((b.payload->>'duration')::int*interval '1 minute') then return jsonb_build_object('error','ผู้สอนยืนยันได้หลังจบคลาส / Only the tutor can confirm completion after the session ends.');end if;
   update peer.bookings set status='attended',completed=now() where id=b.id;
  elsif op='handover' then
   if b.owner<>actor or b.payload->>'kind'<>'physical' or b.status<>'reserved' then return jsonb_build_object('error','Cannot confirm receipt');end if;
   update peer.bookings set status='received',completed=now() where id=b.id;
  elsif op='review' then
   if b.owner<>actor or b.status not in('attended','downloaded','received') then return jsonb_build_object('error','Complete your booking before reviewing.');end if;
   if (d->>'clarity')::int not between 1 and 5 or (d->>'usefulness')::int not between 1 and 5 or (d->>'recommend')::int not between 1 and 5 then return jsonb_build_object('error','Invalid rating');end if;
   insert into peer.reviews(owner,order_id,item,payload) values(actor,b.id,b.item,d-'id') on conflict(order_id) do update set payload=excluded.payload;
  elsif op='message' then
   if b.conversation is not null then insert into peer.messages(conversation,sender,body) values(b.conversation,actor,d->>'text');end if;
   insert into peer.events(owner,kind,target,payload) values(b.owner,'message',b.id::text,jsonb_build_object('text',d->>'text')),(b.provider,'message',b.id::text,jsonb_build_object('text',d->>'text'));
  elsif op='dispute' then
   insert into peer.events(owner,kind,target,payload) values(actor,'dispute',b.id::text,jsonb_build_object('reason',d->>'reason','status','pending'));
  elsif op in('file_access','download_complete') then
   if b.owner<>actor or b.payload->>'kind'<>'digital' or (b.payload->>'price')::numeric<>0 or b.status not in('reserved','downloaded') then return jsonb_build_object('error','File access denied','status',403);end if;
   if op='file_access' then select * into l from peer.listings where id=b.item;return jsonb_build_object('item',l.payload||jsonb_build_object('id',l.id),'order',peer.booking_json(b));end if;
   update peer.bookings set status='downloaded',completed=coalesce(completed,now()) where id=b.id;
  end if;
  if op not in('review','file_access','download_complete') then
   perform peer.notice(case when actor=b.owner then b.provider else b.owner end,case when op='cancel' then 'การจองถูกยกเลิก / Booking cancelled' when op='complete' then 'ผู้สอนยืนยันจบคลาสแล้ว สามารถรีวิวได้ / Tutor confirmed completion; you can leave a review' else 'มีการอัปเดตรายการ / Booking updated' end,b.id::text,b.conversation);
   if b.conversation is not null and op in('cancel','complete','checkin','handover') then insert into peer.messages(conversation,body) values(b.conversation,case when op='cancel' then 'ยกเลิกการจองแล้ว / Booking cancelled' when op='complete' then 'จบคลาสแล้ว / Session completed' else 'อัปเดตสถานะรายการแล้ว / Booking status updated' end);end if;
  end if;
 elsif op='report' then
  insert into peer.events(owner,kind,target,payload) values(actor,'report',d->>'target',d||'{"status":"pending"}'::jsonb);
 elsif op='offer' then
  select * into l from peer.listings where id=(d->>'listingId')::uuid and owner=actor and status='published';
  select owner into target_actor from peer.requests where id=(d->>'requestId')::uuid and status='open';
  if l.id is null or target_actor is null then return jsonb_build_object('error','Listing or request unavailable');end if;
  p:=jsonb_build_object('listingId',l.id,'title',l.payload->>'title','requestId',d->>'requestId');
  insert into peer.events(owner,kind,target,payload) values(actor,'offer',d->>'requestId',p),(target_actor,'offer',d->>'requestId',p);
  perform peer.notice(target_actor,'มีข้อเสนอช่วยเหลือใหม่ / New offer to help',d->>'requestId');
 else return jsonb_build_object('error','Unsupported action');
 end if;
 return jsonb_build_object('ok',true);
end $function$;
revoke all on function public.peer_gateway(jsonb) from public,anon,authenticated;
grant execute on function public.peer_gateway(jsonb) to service_role;

