import type {Listing} from './catalog';

export type DemoOrder = {
  id:string; item:string; title:string; titleEn:string; kind:Listing['kind'];
  tutor:string; course:string; quantity:number; unitPrice:number; total:number;
  slot:string; created:number; status:'demo_paid'|'demo_cancelled';
  paymentMode:'demo_qr'; demo:true;
};
export function demoTotal(price:number, quantity:number) {
  if(!Number.isFinite(price)||price<0||price>50000||!Number.isInteger(quantity)||quantity<1||quantity>10)throw new Error('Invalid price or quantity');
  return Math.round(price*100)*quantity/100;
}
export function demoQrPayload(id:string,total:number) {
  // Plain text only. Never a PromptPay/EMV payload, bank account, or payment URL.
  return `PEER SHARING — DEMO ONLY — NO PAYMENT\nReference: ${id}\nDemo total: THB ${total.toFixed(2)}`;
}
export function makeDemoOrder(item:Listing,actor:string,input:{requestId:string;quantity:number;quotedTotal:number;slot?:string},now=Date.now()):DemoOrder {
  if(!actor)throw new Error('Please sign in.');
  if(item.owner===actor)throw new Error('ไม่สามารถซื้อรายการของตัวเอง / You cannot buy your own listing.');
  if(item.status&&item.status!=='published')throw new Error('รายการนี้ไม่พร้อมขาย / Listing unavailable.');
  if(item.kind==='digital'&&input.quantity!==1)throw new Error('ไฟล์ดิจิทัลเลือกได้ 1 รายการ / Digital quantity must be one.');
  if((item.kind==='physical'||item.kind==='class'&&!item.weeklyAvailability)&&input.quantity>Math.max(0,item.seats-item.filled))throw new Error('จำนวนไม่เพียงพอ / Not enough availability.');
  const total=demoTotal(item.price,input.quantity);
  if(total!==input.quotedTotal)throw new Error('ราคาเปลี่ยนแล้ว กรุณาเปิดรายการใหม่ / Price changed. Please reopen this listing.');
  if(item.kind==='class'&&(!input.slot||!Number.isFinite(Date.parse(input.slot))||Date.parse(input.slot)<=now))throw new Error('กรุณาเลือกเวลาคลาสในอนาคต / Select a future class time.');
  return {id:input.requestId,item:item.id,title:item.title,titleEn:item.titleEn,kind:item.kind,tutor:item.tutor,course:item.course,quantity:input.quantity,unitPrice:item.price,total,slot:item.kind==='class'?input.slot!:'',created:now,status:'demo_paid',paymentMode:'demo_qr',demo:true};
}
