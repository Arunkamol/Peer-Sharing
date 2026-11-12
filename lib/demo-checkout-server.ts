import {z} from 'zod';
import {db,getListing,parse,rows} from './server';
import {makeDemoOrder,type DemoOrder} from './demo-checkout';
import {timeSlots} from './tutoring';

const kind='demo_purchase';
const inputSchema=z.object({requestId:z.string().uuid(),item:z.string().min(1).max(120),quantity:z.number().int().min(1).max(10),quotedTotal:z.number().min(0).max(500000),slot:z.string().datetime({offset:true}).optional(),paymentMode:z.literal('demo_qr')}).strict();
export async function readDemoOrders(actor:string|null):Promise<DemoOrder[]> {
  if(!actor)return [];
  return (await rows('SELECT * FROM events WHERE owner=? AND kind=? ORDER BY created DESC LIMIT 200',actor,kind)).map(parse);
}
export async function demoCheckoutAction(action:string,data:unknown,actor:string) {
  if(action!=='demo_checkout'&&action!=='demo_cancel')return null;
  if(action==='demo_cancel'){
    const {id}=z.object({id:z.string().uuid()}).parse(data);
    const record=await db().prepare('SELECT * FROM events WHERE id=? AND owner=? AND kind=?').bind(id,actor,kind).first<any>();
    if(!record)return Response.json({error:'Order not found'},{status:404});
    const order={...JSON.parse(record.payload),status:'demo_cancelled'};
    await db().prepare('UPDATE events SET payload=? WHERE id=? AND owner=? AND kind=?').bind(JSON.stringify(order),id,actor,kind).run();
    return Response.json({ok:true,order});
  }
  const p=inputSchema.parse(data);
  const existing=await db().prepare('SELECT * FROM events WHERE id=? AND owner=? AND kind=?').bind(p.requestId,actor,kind).first<any>();
  if(existing){
    const order=parse(existing);
    if(order.item!==p.item||order.quantity!==p.quantity||order.total!==p.quotedTotal||order.slot!==(p.slot||''))return Response.json({error:'Reference already used. Please start a new checkout.'},{status:409});
    return Response.json({ok:true,order});
  }
  const item=await getListing(p.item,actor);
  if(!item)return Response.json({error:'Listing unavailable'},{status:404});
  try{
    if(item.kind==='class'&&!timeSlots(item,[]).some(s=>s.date===p.slot&&s.remaining>=p.quantity))throw new Error('เวลานี้ไม่พร้อมให้เลือก / Time slot unavailable.');
    const order=makeDemoOrder(item,actor,p);
    // Separate demo records: do not reserve stock, send seller orders, or grant file access.
    const saved=await db().prepare('INSERT INTO events(id,owner,kind,target,payload,created) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING RETURNING id').bind(order.id,actor,kind,item.id,JSON.stringify(order),order.created).first();
    if(!saved){
      const winner=await db().prepare('SELECT * FROM events WHERE id=? AND owner=? AND kind=?').bind(order.id,actor,kind).first<any>();
      if(winner){const prior=parse(winner);if(prior.item===p.item&&prior.quantity===p.quantity&&prior.total===p.quotedTotal&&prior.slot===(p.slot||''))return Response.json({ok:true,order:prior});}
      return Response.json({error:'Reference already used. Please start a new checkout.'},{status:409});
    }
    return Response.json({ok:true,order});
  }catch(e){return Response.json({error:e instanceof Error?e.message:'Checkout unavailable'},{status:400});}
}
