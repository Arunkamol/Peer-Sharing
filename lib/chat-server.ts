import {z} from 'zod';
import {db,getListing,rows,parse} from './server';
import {timeSlots} from './tutoring';
const id=z.string().min(1).max(120);
const jsonError=(error:string,status=400)=>Response.json({error},{status});
export async function getConversation(conversation:string,user:string){
  return db().prepare('SELECT * FROM conversations WHERE id=? AND owner=?').bind(conversation,user).first<any>();
}
export async function chatAction(action:string,data:any,user:string):Promise<Response|null>{
  if(!['start_chat','chat_message','chat_slot','notifications_read'].includes(action))return null;
  const now=Date.now();
  if(action==='notifications_read'){
    const p=z.object({conversation:z.string().max(120).optional()}).parse(data);
    if(p.conversation)await db().prepare("UPDATE events SET payload=json_set(payload,'$.read',1) WHERE owner=? AND kind='notification' AND json_extract(payload,'$.conversation')=?").bind(user,p.conversation).run();
    else await db().prepare("UPDATE events SET payload=json_set(payload,'$.read',1) WHERE owner=? AND kind='notification'").bind(user).run();
    return Response.json({ok:true});
  }
  if(action==='start_chat'){
    const p=z.object({item:id,slot:z.string().max(40).optional()}).parse(data);
    const item=await getListing(p.item,user);
    if(!item||item.kind!=='class'||item.status&&item.status!=='published')return jsonError('คลาสนี้ยังไม่เปิดรับ / Class unavailable');
    if(p.slot&&!timeSlots(item).some(s=>s.date===p.slot))return jsonError('เวลานี้ไม่เปิดรับแล้ว / Time slot unavailable');
    const conversation=crypto.randomUUID();
    const added=await db().prepare('INSERT OR IGNORE INTO conversations(id,owner,item,slot_date,updated) VALUES(?,?,?,?,?)').bind(conversation,user,item.id,p.slot||'',now).run();
    const current=await db().prepare('SELECT * FROM conversations WHERE owner=? AND item=?').bind(user,item.id).first<any>();
    if(added.meta.changes){
      await db().batch([
        db().prepare('INSERT INTO chat_messages(id,owner,conversation,role,body,created) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),user,current.id,'system','ห้องแชททดลอง · ข้อความถูกบันทึกในบัญชีนี้ คำตอบจากผู้สอนเป็นตัวอย่าง ไม่ได้ส่งถึงบุคคลจริง / Preview chat: saved to your account. Tutor replies are simulated; no real recipient.',now),
        db().prepare('INSERT INTO chat_messages(id,owner,conversation,role,body,created) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),user,current.id,'sample_tutor','สวัสดีค่ะ อยากทบทวนหัวข้อไหนเป็นพิเศษบอกได้เลยนะคะ เลือกวันเวลาที่สะดวก แล้วกดยืนยันการจองได้เลยค่ะ / Hi! What would you like to focus on? Choose an available time, then confirm your booking.',now+1),
      ]);
    }else if(p.slot)await db().prepare('UPDATE conversations SET slot_date=?,updated=? WHERE id=? AND owner=?').bind(p.slot,now,current.id,user).run();
    return Response.json({ok:true,id:current.id});
  }
  const p=z.object({id,requestId:z.string().uuid().optional(),text:z.string().trim().min(1).max(2000).optional(),slot:z.string().max(40).optional()}).parse(data);
  const conversation=await getConversation(p.id,user);
  if(!conversation)return jsonError('ไม่พบแชท / Conversation not found',404);
  if(action==='chat_slot'){
    const item=await getListing(conversation.item,user);
    const orders=(await rows('SELECT * FROM orders WHERE owner=? AND item=?',user,conversation.item)).map(parse);
    if(!item||!p.slot||!timeSlots(item,orders).some(s=>s.date===p.slot&&s.remaining>0))return jsonError('เวลานี้เต็มหรือไม่เปิดรับแล้ว / Time slot unavailable',409);
    await db().prepare('UPDATE conversations SET slot_date=?,updated=? WHERE id=? AND owner=?').bind(p.slot,now,p.id,user).run();
    return Response.json({ok:true});
  }
  if(!p.text||!p.requestId)return jsonError('กรุณาพิมพ์ข้อความ / Enter a message');
  const previous=await db().prepare('SELECT id FROM chat_messages WHERE id=? AND owner=? AND conversation=?').bind(p.requestId,user,p.id).first();
  if(previous)return Response.json({ok:true});
  const reply='ขอบคุณที่แจ้งหัวข้อค่ะ เตรียมคำถามหรือโจทย์ที่อยากทบทวนมาได้เลย หากพร้อมแล้วเลือกเวลาทางด้านข้างและยืนยันการจองนะคะ / Thanks for sharing! Bring your questions or exercises. Choose a time and confirm when you’re ready.';
  await db().batch([
    db().prepare('INSERT OR IGNORE INTO chat_messages(id,owner,conversation,role,body,created) VALUES(?,?,?,?,?,?)').bind(p.requestId,user,p.id,'learner',p.text,now),
    db().prepare('INSERT OR IGNORE INTO chat_messages(id,owner,conversation,role,body,created) VALUES(?,?,?,?,?,?)').bind('reply-'+p.requestId,user,p.id,'sample_tutor',reply,now+1),
    db().prepare('UPDATE conversations SET updated=? WHERE id=? AND owner=?').bind(now+1,p.id,user),
    db().prepare('INSERT OR IGNORE INTO events(id,owner,kind,target,payload,created) VALUES(?,?,?,?,?,?)').bind('notice-'+p.requestId,user,'notification',p.id,JSON.stringify({text:'มีคำตอบตัวอย่างใหม่ในแชท / New sample tutor reply',conversation:p.id,read:false}),now+1),
  ]);
  return Response.json({ok:true});
}
export async function conversationStatus(user:string,conversation:string,text:string){
  if(!conversation)return;
  const now=Date.now();
  await db().batch([
    db().prepare('INSERT INTO chat_messages(id,owner,conversation,role,body,created) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),user,conversation,'system',text,now),
    db().prepare('UPDATE conversations SET updated=? WHERE id=? AND owner=?').bind(now,conversation,user),
  ]);
}
