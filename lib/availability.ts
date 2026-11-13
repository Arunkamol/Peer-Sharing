export type AvailabilityWindow={day:number;start:string;end:string};
export const weekdays=[{day:1,th:'จันทร์',en:'Monday'},{day:2,th:'อังคาร',en:'Tuesday'},{day:3,th:'พุธ',en:'Wednesday'},{day:4,th:'พฤหัสบดี',en:'Thursday'},{day:5,th:'ศุกร์',en:'Friday'},{day:6,th:'เสาร์',en:'Saturday'},{day:7,th:'อาทิตย์',en:'Sunday'}];
const clock=/^([01]\d|2[0-3]):[0-5]\d$/;
export const minutes=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3));
export function availabilityError(windows:AvailabilityWindow[],duration:number):string {
  if(!Number.isInteger(duration)||duration<15||duration>480)return 'เลือกระยะเวลาคลาส 15–480 นาที / Choose a duration of 15–480 minutes.';
  if(!Array.isArray(windows)||!windows.length||windows.length>28)return 'เลือกเวลาสอนอย่างน้อย 1 ช่วง / Select at least one teaching window.';
  for(const w of windows){
    if(!Number.isInteger(w.day)||w.day<1||w.day>7||!clock.test(w.start)||!clock.test(w.end)||minutes(w.end)-minutes(w.start)<duration)return 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มและยาวพอสำหรับคลาส / Each window must fit a full class on the same day.';
  }
  for(const {day} of weekdays){const ws=windows.filter(w=>w.day===day).sort((a,b)=>a.start.localeCompare(b.start));if(ws.length>4)return 'เลือกได้ไม่เกิน 4 ช่วงต่อวัน / Maximum four windows per day.';for(let i=1;i<ws.length;i++)if(ws[i].start<ws[i-1].end)return 'ช่วงเวลาสอนในวันเดียวกันต้องไม่ซ้อนกัน / Teaching windows must not overlap.';}
  return '';
}
export function weeklyDates(windows:AvailabilityWindow[],duration:number,now=Date.now()):string[]{
  if(availabilityError(windows,duration))return [];
  const today=new Date(now+7*3600000).toISOString().slice(0,10),base=Date.parse(today+'T00:00:00+07:00');
  const dates:string[]=[];
  for(let i=0;i<28;i++){const midnight=base+i*86400000,day=new Date(midnight+7*3600000).getUTCDay()||7;
    for(const w of windows.filter(w=>w.day===day))for(let m=minutes(w.start);m+duration<=minutes(w.end);m+=duration){const start=midnight+m*60000;if(start>now+30*60000)dates.push(new Date(start).toISOString());}
  }
  return [...new Set(dates)].sort();
}
export const normalizeCourseCode=(value:string)=>value.replace(/\s/g,'').trim();
export const validCourseCode=(value:string)=>value===''||/^\d{7}$/.test(normalizeCourseCode(value));
export function listingCourseCode(item:{courseCode?:string;course:string}){return item.courseCode||(/^\d{7}$/.test(item.course)?item.course:'');}
