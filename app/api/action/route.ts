import {liveEnabled,liveAction} from '@/lib/live-backend';
import {db,owner,safeRequest,getListing,emit,fail,rows,parse} from '@/lib/server';
import {z} from 'zod';
import {chatAction,getConversation,conversationStatus} from '@/lib/chat-server';
import {timeSlots} from '@/lib/tutoring';
const short=z.string().trim().min(1).max(200);
const long=z.string().trim().min(1).max(3000);
const validId=z.string().min(1).max(120);
export async function POST(req:Request){try{
 safeRequest(req);const user=owner(req);if(Number(req.headers.get('content-length'))>30000)return Response.json({error:'Too much data'},{status:413});
 const {action,data}=await req.json() as {action:string;data:any};const now=Date.now();
 if(liveEnabled())return await liveAction(action,data,user);
 const chat=await chatAction(action,data,user);if(chat)return chat;
 if(action==='profile'){
 const p=z.object({name:short,faculty:short,year:z.string().max(30),email:z.string().email().max(150).or(z.literal('')),bio:z.string().max(1000),subjects:z.array(z.string().max(60)).max(10),provider:z.boolean(),consent:z.literal(true)}).parse(data);
 await db().prepare('INSERT INTO profiles(id,payload) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').bind(user,JSON.stringify({...p,universityVerified:false})).run();return Response.json({ok:true});
 }
 if(action==='mark'){
 const p=z.object({target:validId,kind:z.enum(['saved','follow','course']),on:z.boolean()}).parse(data);
 if(p.on)await db().prepare('INSERT OR IGNORE INTO marks(id,owner,target,kind) VALUES(?,?,?,?)').bind(crypto.randomUUID(),user,p.target,p.kind).run();
 else await db().prepare('DELETE FROM marks WHERE owner=? AND target=? AND kind=?').bind(user,p.target,p.kind).run();return Response.json({ok:true});
 }
 if(action==='request'){
 const p=z.object({title:short,course:short,type:z.enum(['class','digital','physical']),description:long,budget:z.number().min(0).max(50000),neededBy:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),name:short}).parse(data);
 if(new Date(p.neededBy+'T23:59:59+07:00').getTime()<now)return Response.json({error:'กรุณาเลือกวันที่ในอนาคต / Choose a future date'},{status:400});
 const id=crypto.randomUUID();await db().prepare('INSERT INTO requests(id,owner,payload,status,created) VALUES(?,?,?,?,?)').bind(id,user,JSON.stringify({...p,followers:0,expires:Math.min(now+30*86400000,new Date(p.neededBy+'T23:59:59+07:00').getTime())}),'open',now).run();await emit(user,'notification',{text:'เผยแพร่คำขอบนบอร์ดตามหาแล้ว / Your request is on the board'},id);return Response.json({ok:true,id});
 }
 if(action==='close_request'){await db().prepare('UPDATE requests SET status=? WHERE id=? AND owner=?').bind('fulfilled',validId.parse(data.id),user).run();return Response.json({ok:true})}
 if(action==='listing'){
 const p=z.object({kind:z.enum(['class','digital','physical']),title:short,titleEn:z.string().max(200).optional(),course:short,description:long,price:z.number().min(0).max(50000),mode:z.enum(['online','onsite','digital']),date:z.string().max(50),duration:z.number().min(0).max(480),seats:z.number().int().min(1).max(100),minSeats:z.number().int().min(1).max(100),objectives:z.array(short).max(10),prep:z.string().max(1000),location:z.string().max(500),condition:z.string().max(100),fileKey:z.string().max(200).optional(),pages:z.number().int().min(0).max(1000).optional(),originality:z.literal(true),tutor:short}).parse(data);
 if(p.kind==='class'&&(p.objectives.length<3||!p.date||new Date(p.date).getTime()<now||p.duration<15||p.minSeats>p.seats))return Response.json({error:'กรอกเป้าหมายอย่างน้อย 3 ข้อ วันเวลาในอนาคต และจำนวนที่นั่งที่ถูกต้อง'},{status:400});
 if(p.kind==='digital'&&!p.fileKey)return Response.json({error:'กรุณาแนบไฟล์ PDF / Please attach a PDF'},{status:400});
 if(p.fileKey){const f=await db().prepare('SELECT id FROM files WHERE id=? AND owner=?').bind(p.fileKey,user).first();if(!f)return Response.json({error:'File not found'},{status:400})}
 const id=crypto.randomUUID();await db().prepare('INSERT INTO listings(id,owner,payload,status,created) VALUES(?,?,?,?,?)').bind(id,user,JSON.stringify({...p,id,titleEn:p.titleEn||p.title,subject:p.course,tag:p.kind==='class'?'คลาสใหม่':'รายการใหม่',tutorEn:p.tutor,faculty:'ผู้ให้บริการในรุ่นทดลอง',rating:0,reviews:0,filled:0,color:'rose',cover:p.course,certified:false,owner:user}),'pending_review',now).run();await emit(user,'notification',{text:'รายการใหม่อยู่ในคิวตรวจสอบ / New listing submitted for review'},id);return Response.json({ok:true,id});
 }
 if(action==='book'){
 const p=z.object({item:validId,seats:z.number().int().min(1).max(10),requestId:z.string().uuid(),slot:z.string().datetime({offset:true}).max(40).optional(),conversation:z.string().max(120).optional()}).parse(data);const exists=await db().prepare('SELECT id FROM orders WHERE id=? AND owner=?').bind(p.requestId,user).first();if(exists)return Response.json({ok:true,id:p.requestId});
 const item=await getListing(p.item,user);if(!item||item.status&&item.status!=='published')return Response.json({error:'รายการนี้ยังไม่เปิดรับ / Listing unavailable'},{status:400});
 const slot=item.kind==='class'?new Date(p.slot||item.date).toISOString():item.date;
 if(item.kind==='class'&&!timeSlots(item,[],now).some(s=>s.date===new Date(slot).toISOString()))return Response.json({error:'เวลานี้ไม่เปิดรับแล้ว / Time slot unavailable'},{status:400});
 if(p.conversation){const c=await getConversation(p.conversation,user);if(!c||c.item!==item.id)return Response.json({error:'Conversation not found'},{status:404})}

 const seats=item.kind==='class'?p.seats:1;const unit=item.price*(item.kind==='class'&&seats>=3?.85:1);const total=Math.round(unit*seats);const handover=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');
 const payload={item:item.id,title:item.title,titleEn:item.titleEn,kind:item.kind,price:total,seats,date:item.kind==='class'?slot:item.date,conversation:p.conversation||null,location:item.location,mode:item.mode,tutor:item.tutor,course:item.course,duration:item.duration,handover,checkin:handover,demo:true};
 const capacity=item.kind==='digital'?1000000:item.seats-item.filled;
 const result=await db().prepare("INSERT INTO orders(id,owner,item,seats,payload,status,created) SELECT ?,?,?,?,?,?,? WHERE (SELECT COALESCE(SUM(seats),0) FROM orders WHERE owner=? AND item=? AND status NOT IN ('cancelled','refunded') AND (? != 'class' OR json_extract(payload,'$.date')=?)) + ? <= ?").bind(p.requestId,user,item.id,seats,JSON.stringify(payload),'paid_held',now,user,item.id,item.kind,slot,seats,capacity).run();
 if(!result.meta.changes)return Response.json({error:'ที่นั่งเต็มแล้ว / No spaces remaining'},{status:409});await emit(user,'notification',{text:'บันทึกรายการทดลองแล้ว ไม่มีการหักเงินจริง / Demo order confirmed, no charge'},p.requestId);if(p.conversation)await conversationStatus(user,p.conversation,'ยืนยันการจองแล้ว / Booking confirmed · '+slot+' · '+seats+' คน / seat(s) · ฿'+total+' · ไม่มีการชำระเงินจริง / No real payment');return Response.json({ok:true,id:p.requestId});
 }
 if(['cancel','checkin','handover','review','dispute','message','simulate_attendance'].includes(action)){
 const order=await db().prepare('SELECT * FROM orders WHERE id=? AND owner=?').bind(validId.parse(data.id),user).first<any>();if(!order)return Response.json({error:'Order not found'},{status:404});const o=parse(order);
 if(action==='cancel'){
 if(order.status!=='paid_held')return Response.json({error:'รายการนี้ยกเลิกไม่ได้ / Cannot cancel this order'},{status:400});const refund=o.kind==='class'&&new Date(o.date).getTime()-now<86400000?Math.round(o.price*.5):o.price;
 await db().prepare('UPDATE orders SET status=?,payload=? WHERE id=? AND owner=?').bind('cancelled',JSON.stringify({...o,refund}),order.id,user).run();await emit(user,'notification',{text:`ยกเลิกรายการทดลอง คืนเครดิตจำลอง ฿${refund} / Demo order cancelled`},order.id);
 }
 if(action==='checkin'||action==='simulate_attendance'){
 if(o.kind!=='class'||order.status!=='paid_held')return Response.json({error:'Cannot check in'},{status:400});
 if(action==='checkin'&&(new Date(o.date).getTime()-now>1800000||now>new Date(o.date).getTime()+o.duration*60000))return Response.json({error:'เช็คอินได้ก่อนคลาส 30 นาทีและระหว่างคลาส / Check-in opens 30 minutes before class'},{status:400});
 if(action==='checkin'&&data.code!==o.checkin)return Response.json({error:'รหัสไม่ถูกต้อง / Incorrect code'},{status:400});
 await db().prepare('UPDATE orders SET status=?,completed=?,payload=? WHERE id=? AND owner=?').bind('attended',now,JSON.stringify({...o,simulatedCompletion:action==='simulate_attendance'}),order.id,user).run();
 }
 if(action==='handover'){
 if(o.kind!=='physical'||order.status!=='paid_held'||data.code!==o.handover)return Response.json({error:'รหัสส่งมอบไม่ถูกต้อง / Incorrect handover code'},{status:400});await db().prepare('UPDATE orders SET status=?,completed=? WHERE id=? AND owner=?').bind('received',now,order.id,user).run();
 }
 if(action==='review'){
 if(!['attended','downloaded','received'].includes(order.status))return Response.json({error:'รีวิวได้หลังรับบริการแล้ว / Complete your order first'},{status:400});
 if(o.kind==='class'&&!o.simulatedCompletion&&now<new Date(o.date).getTime()+o.duration*60000)return Response.json({error:'รีวิวได้หลังจบคลาส / Reviews open after the session ends'},{status:400});
 const p=z.object({clarity:z.number().int().min(1).max(5),usefulness:z.number().int().min(1).max(5),recommend:z.number().int().min(1).max(5),comment:z.string().max(1500)}).parse(data);await db().prepare('INSERT INTO reviews(id,owner,order_id,item,payload,created) VALUES(?,?,?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET payload=excluded.payload').bind(crypto.randomUUID(),user,order.id,order.item,JSON.stringify(p),now).run();
 }
 if(action==='dispute'){
 if(!['paid_held','attended','downloaded','received'].includes(order.status)||order.completed&&now-order.completed>72*3600000)return Response.json({error:'พ้นระยะเวลาเปิดข้อพิพาท / Dispute window has closed'},{status:400});const reason=long.parse(data.reason);await db().batch([db().prepare('UPDATE orders SET status=? WHERE id=? AND owner=?').bind('disputed',order.id,user),db().prepare('INSERT INTO events(id,owner,kind,target,payload,created) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),user,'dispute',order.id,JSON.stringify({reason,status:'pending',title:o.title}),now)]);
 }
 if(['cancel','checkin','simulate_attendance','handover'].includes(action)){await emit(user,'notification',{text:action==='cancel'?'ยกเลิกการจองแล้ว / Booking cancelled':'สถานะรายการอัปเดตแล้ว / Order status updated',conversation:o.conversation||null,order:order.id},order.id);if(o.conversation)await conversationStatus(user,o.conversation,action==='cancel'?'ยกเลิกการจองแล้ว / Booking cancelled':'เรียนเสร็จแล้ว สามารถให้คะแนนและรีวิวได้ / Session completed. You can now leave a review.')}
 if(action==='message')await emit(user,'message',{text:long.parse(data.text),author:'คุณ / You',demo:true},order.id);
 return Response.json({ok:true});
 }
 if(action==='report'){const p=z.object({target:validId,reason:long,title:short}).parse(data);await emit(user,'report',{...p,status:'pending'},p.target);return Response.json({ok:true})}
 if(action==='offer'){const p=z.object({requestId:validId,listingId:validId}).parse(data);const item=await getListing(p.listingId,user);if(!item||item.owner!==user||item.status!=='published')return Response.json({error:'เลือกจากรายการที่เผยแพร่ของคุณ / Select your published listing'},{status:400});await emit(user,'offer',{listingId:item.id,title:item.title,requestId:p.requestId},p.requestId);return Response.json({ok:true})}
 if(action==='certificate'){
 const p=z.object({level:z.enum(['peer','faculty','professor']),summary:z.string().max(1500)}).parse(data);const own=await rows('SELECT * FROM listings WHERE owner=?',user);const active=own.map(parse);const teachingOrders=await rows("SELECT * FROM orders WHERE owner=? AND status='attended'",user);const valid=teachingOrders.map(parse).filter(x=>active.some(a=>a.id===x.item));const hours=Array.from(new Map(valid.map(o=>[o.item,o])).values()).reduce((s:number,o:any)=>s+Number(o.duration||0)/60,0);
 if(hours<(p.level==='faculty'?20:p.level==='professor'?6:5))return Response.json({error:'ชั่วโมงสอนยังไม่ถึงเกณฑ์ / Teaching hours below the required threshold'},{status:400});await emit(user,'certificate',{...p,hours,status:'pending',code:'PS-DEMO-'+crypto.randomUUID().slice(0,8).toUpperCase(),demo:true});return Response.json({ok:true});
 }
 if(action==='moderate'){
 const p=z.object({type:z.enum(['listing','report','dispute','certificate']),id:validId,decision:z.enum(['approve','reject','refund','resolve','more']),reason:long}).parse(data);
 if(p.type==='listing'){await db().prepare('UPDATE listings SET status=? WHERE id=? AND owner=?').bind(p.decision==='approve'?'published':'rejected',p.id,user).run()}
 else {const event=await db().prepare('SELECT * FROM events WHERE id=? AND owner=? AND kind=?').bind(p.id,user,p.type).first<any>();if(!event)return Response.json({error:'Not found'},{status:404});const payload=JSON.parse(event.payload);await db().prepare('UPDATE events SET payload=? WHERE id=? AND owner=?').bind(JSON.stringify({...payload,status:p.decision==='approve'?'approved':p.decision==='more'?'more_info':p.decision==='reject'?'rejected':'resolved',reason:p.reason}),p.id,user).run();if(p.type==='dispute')await db().prepare('UPDATE orders SET status=? WHERE id=? AND owner=?').bind(p.decision==='refund'?'refunded':'received',event.target,user).run();}
 await emit(user,'audit',{...p,demo:true});return Response.json({ok:true});
 }
 return Response.json({error:'Unknown action'},{status:400});
 }catch(e){if(e instanceof z.ZodError)return Response.json({error:'ข้อมูลไม่ครบหรือไม่ถูกต้อง / Please check your entries',fields:e.flatten()},{status:400});return fail(e)}}
