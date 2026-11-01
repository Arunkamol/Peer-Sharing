import {catalog, type Listing} from './catalog';

export type TimeSlot = {date:string; remaining:number};
export type Conversation = {id:string; item:string; slotDate:string; updated:number; unread?:number; preview?:string};
export type ChatMessage = {id:string; role:'learner'|'sample_tutor'|'system'; body:string; created:number};
export const isSampleTutor = (item:Listing) => catalog.some(c => c.id===item.id);

// Sample tutors repeat on these Bangkok weekdays. User-created classes retain their scheduled date.
const schedules:Record<string, {days:number[]; hour:number}> = {
  'calculus-group':{days:[2,4,6],hour:13},
  'python-start':{days:[1,3,0],hour:10},
  'hsk-conversation':{days:[1,4,6],hour:18},
  'figma-intro':{days:[2,3,6],hour:17},
  'english-talk':{days:[2,4,0],hour:15},
};
export function timeSlots(item:Listing, orders:any[]=[], now=Date.now()):TimeSlot[] {
  if(item.kind!=='class')return [];
  const schedule=schedules[item.id];
  let dates:string[]=[];
  if(schedule){
    const today=new Date(now+7*3600000).toISOString().slice(0,10);
    const base=new Date(today+'T00:00:00+07:00').getTime();
    for(let i=0;i<28;i++){
      const date=new Date(base+i*86400000+schedule.hour*3600000);
      const day=new Date(date.getTime()+7*3600000).getUTCDay();
      if(schedule.days.includes(day)&&date.getTime()>now+30*60000)dates.push(date.toISOString());
    }
  }else if(new Date(item.date).getTime()>now+30*60000)dates=[new Date(item.date).toISOString()];
  return dates.map(date=>({date,remaining:Math.max(0,item.seats-item.filled-orders.filter(o=>o.item===item.id&&new Date(o.date).getTime()===new Date(date).getTime()&&!['cancelled','refunded'].includes(o.status)).reduce((sum,o)=>sum+Number(o.seats),0))}));
}
export function tutorReviews(item:Listing, reviews:any[]){
  const actual=reviews.filter(r=>r.item===item.id).map(r=>({...r,score:(r.clarity+r.usefulness+r.recommend)/3,sample:false}));
  const examples=isSampleTutor(item)?[
    {id:'sample-1',name:'มายด์',nameEn:'Mind',score:5,comment:'อธิบายเป็นขั้นตอนดีมาก ถามซ้ำได้จนเข้าใจ มีโจทย์ให้ลองทำเองด้วย',commentEn:'Clear, step-by-step explanations, with plenty of time for questions and practice.',sample:true},
    {id:'sample-2',name:'วิน',nameEn:'Win',score:5,comment:'บรรยากาศสบาย ๆ เนื้อหาตรงกับที่อยากทบทวน เรียนแล้วมั่นใจขึ้น',commentEn:'A relaxed session that covered exactly what I needed to review.',sample:true},
  ]:[];
  return [...actual,...examples];
}
export function tutorRating(item:Listing,reviews:any[]){
  const actual=reviews.filter(r=>r.item===item.id);
  const count=item.reviews+actual.length;
  return {count,score:count?((item.rating*item.reviews+actual.reduce((sum,r)=>sum+(r.clarity+r.usefulness+r.recommend)/3,0))/count).toFixed(1):'—'};
}
