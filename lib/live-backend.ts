import {env} from 'cloudflare:workers';
import {z} from 'zod';

type Config={PEER_BACKEND_URL?:string;PEER_BACKEND_SIGNING_KEY?:string};
export const liveEnabled=()=>Boolean((env as Config).PEER_BACKEND_URL);
let signingKey:Promise<CryptoKey>|undefined;
export async function liveCall(op:string,user:string|null,data:unknown={}){
  const cfg=env as Config;
  if(!cfg.PEER_BACKEND_URL||!cfg.PEER_BACKEND_SIGNING_KEY)throw new Error('Backend configuration unavailable');
  signingKey??=crypto.subtle.importKey('jwk',JSON.parse(cfg.PEER_BACKEND_SIGNING_KEY),{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const body=JSON.stringify({op,actor:user,data}),timestamp=String(Date.now());
  const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},await signingKey,new TextEncoder().encode(timestamp+'.'+body));
  const response=await fetch(cfg.PEER_BACKEND_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Peer-Timestamp':timestamp,'X-Peer-Signature':btoa(String.fromCharCode(...new Uint8Array(signature)))},body,signal:AbortSignal.timeout(15000)});
  const result:any=await response.json();
  if(!response.ok)throw new Error('Backend unavailable');
  return result;
}

const short=z.string().trim().min(1).max(200),long=z.string().trim().min(1).max(3000),id=z.string().min(1).max(120),uuid=z.string().uuid();
const schemas:Record<string,z.ZodTypeAny>={
  profile:z.object({name:short,faculty:short,year:z.string().max(30),email:z.string().email().max(150).or(z.literal('')),bio:z.string().max(1000),subjects:z.array(z.string().max(60)).max(10),provider:z.boolean(),consent:z.literal(true)}),
  mark:z.object({target:id,kind:z.enum(['saved','follow','course']),on:z.boolean()}),
  request:z.object({title:short,course:short,type:z.enum(['class','digital','physical']),description:long,budget:z.number().min(0).max(50000),neededBy:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),name:short}),
  close_request:z.object({id:uuid}),
  listing:z.object({kind:z.enum(['class','digital','physical']),title:short,titleEn:z.string().max(200).optional(),course:short,description:long,price:z.number().min(0).max(50000),mode:z.enum(['online','onsite','digital']),date:z.string().max(50),duration:z.number().int().min(0).max(480),seats:z.number().int().min(1).max(100),minSeats:z.number().int().min(1).max(100),objectives:z.array(short).max(10),prep:z.string().max(1000),location:z.string().max(500),condition:z.string().max(100),fileKey:z.string().max(200).optional(),pages:z.number().int().min(0).max(1000).optional(),originality:z.literal(true),tutor:short}),
  listing_visibility:z.object({id:uuid,published:z.boolean()}),
  start_chat:z.object({item:uuid,slot:z.string().max(40).optional()}),
  chat_message:z.object({id:uuid,requestId:uuid,text:z.string().trim().min(1).max(2000)}),
  chat_slot:z.object({id:uuid,slot:z.string().datetime({offset:true})}),
  notifications_read:z.object({conversation:uuid.optional()}),
  book:z.object({item:uuid,seats:z.number().int().min(1).max(10),requestId:uuid,slot:z.string().datetime({offset:true}).optional(),conversation:uuid.optional()}),
  cancel:z.object({id:uuid}),checkin:z.object({id:uuid,code:z.string().max(20).optional()}),complete:z.object({id:uuid}),handover:z.object({id:uuid,code:z.string().max(20).optional()}),
  review:z.object({id:uuid,clarity:z.number().int().min(1).max(5),usefulness:z.number().int().min(1).max(5),recommend:z.number().int().min(1).max(5),comment:z.string().max(1500)}),
  message:z.object({id:uuid,text:long}),
  report:z.object({target:id,reason:long,title:short}),dispute:z.object({id:uuid,reason:long}),
  offer:z.object({requestId:uuid,listingId:uuid})
};
export async function liveAction(action:string,data:unknown,user:string){
  const schema=schemas[action];
  if(!schema)return Response.json({error:'ฟังก์ชันนี้ยังไม่เปิดใช้งาน / This feature is not available for live accounts.'},{status:400});
  const payload=schema.parse(data);
  const result=await liveCall(action,user,payload);
  return Response.json(result,{status:result.error?Number(result.status||400):200,headers:{'Cache-Control':'private, no-store'}});
}
