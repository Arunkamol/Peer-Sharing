'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import QRCode from 'qrcode';
import {ArrowLeft,Check,CheckCircle2,FileText,GraduationCap,ShoppingBag} from 'lucide-react';
import {money,type Listing} from '@/lib/catalog';
import {categoryLabel} from '@/lib/faculties';
import {demoTotal,demoQrPayload,type DemoOrder} from '@/lib/demo-checkout';
import {timeSlots} from '@/lib/tutoring';
import {signInPath} from '@/lib/auth-paths';

type Action=(action:string,data:any,notice?:boolean)=>Promise<any>;
export function DemoOrderDetails({order,en,busy,onCancel,onShop}:{order:DemoOrder;en:boolean;busy:boolean;onCancel?:()=>void;onShop:()=>void}) {
  const t=(th:string,eng:string)=>en?eng:th;
  return <div className="purchase-receipt">
    <span className="purchase-success-icon"><CheckCircle2 size={32}/></span>
    <span className="pill">{order.status==='demo_cancelled'?t('ยกเลิกคำสั่งซื้อทดลองแล้ว','Demo order cancelled'):t('ชำระเงินจำลองสำเร็จ','Demo payment complete')}</span>
    <h3>{en?order.titleEn:order.title}</h3>
    <p className="purchase-reference">PS-DEMO-{order.id.slice(0,8).toUpperCase()}</p>
    <dl className="purchase-totals"><div><dt>{t('จำนวน','Quantity')}</dt><dd>{order.quantity}</dd></div><div><dt>{t('ยอดรวมจำลอง','Demo total')}</dt><dd>{money(order.total)}</dd></div></dl>
    {order.slot&&<p>{new Date(order.slot).toLocaleString(en?'en-GB':'th-TH',{timeZone:'Asia/Bangkok'})} (GMT+7)</p>}
    <p className="notice">{t('บันทึกคำสั่งซื้อทดลองไว้ในบัญชีแล้ว ไม่มีการหักเงินจริง จองที่นั่ง จัดส่งสินค้า หรือปลดล็อกไฟล์ที่มีราคา','Saved to your account as a demo order. No money is charged, seats reserved, items shipped, or paid files unlocked.')}</p>
    <div className="purchase-actions"><button className="btn btn-primary" onClick={onShop}>{t('เลือกซื้อต่อ','Continue shopping')}</button>{onCancel&&order.status==='demo_paid'&&<button className="btn btn-outline" disabled={busy} onClick={onCancel}>{t('ยกเลิกคำสั่งซื้อทดลอง','Cancel demo order')}</button>}</div>
  </div>;
}
export function PurchaseCheckout({item,en,signedIn,busy,orders,initialSlot='',act,onOrders,onBack}:{item:Listing;en:boolean;signedIn:boolean;busy:boolean;orders:any[];initialSlot?:string;act:Action;onOrders:()=>void;onBack:()=>void}) {
  const t=(th:string,eng:string)=>en?eng:th;
  const [step,setStep]=useState<'review'|'payment'|'success'>('review');
  const [quantity,setQuantity]=useState(1),[slot,setSlot]=useState(initialSlot),[qr,setQr]=useState(''),[qrError,setQrError]=useState(false),[result,setResult]=useState<DemoOrder|null>(null);
  const requestId=useRef(crypto.randomUUID()),submitting=useRef(false);
  const slots=useMemo(()=>item.kind==='class'?timeSlots(item,orders):[],[item,orders]);
  const remaining=item.kind==='digital'?1:item.kind==='class'?(slots.find(s=>s.date===slot)?.remaining||0):Math.max(0,item.seats-item.filled);
  const total=demoTotal(item.price,quantity);
  const ready=remaining>=quantity&&(item.kind!=='class'||!!slot);
  useEffect(()=>{
    if(step!=='payment')return;
    let active=true;setQr('');setQrError(false);
    QRCode.toDataURL(demoQrPayload(requestId.current,total),{width:256,margin:2,errorCorrectionLevel:'M',color:{dark:'#242029',light:'#ffffff'}}).then(url=>{if(active)setQr(url)}).catch(()=>{if(active)setQrError(true)});
    return()=>{active=false};
  },[step,total]);
  async function confirm(){
    if(submitting.current||busy||!ready)return;
    submitting.current=true;
    try{const r=await act('demo_checkout',{requestId:requestId.current,item:item.id,quantity,quotedTotal:total,paymentMode:'demo_qr',...(item.kind==='class'?{slot}:{})},false);if(r?.order){setResult(r.order);setStep('success')}}finally{submitting.current=false}
  }
  if(step==='success'&&result)return <><DemoOrderDetails order={result} en={en} busy={busy} onShop={onBack}/><button className="btn btn-soft full" onClick={onOrders}>{t('ดูคำสั่งซื้อของฉัน','View my orders')}</button></>;
  return <div className="purchase-checkout">
    <ol className="purchase-steps" aria-label={t('ขั้นตอนการสั่งซื้อ','Checkout steps')}>{[t('ตรวจสอบรายการ','Review'),t('ชำระเงินจำลอง','Demo payment'),t('เสร็จสิ้น','Complete')].map((label,i)=><li key={label} className={i===(step==='review'?0:1)?'current':i===0&&step==='payment'?'done':''} aria-current={i===(step==='review'?0:1)?'step':undefined}><span>{i===0&&step==='payment'?<Check size={13}/>:i+1}</span>{label}</li>)}</ol>
    <div className="purchase-item"><span className={'purchase-item-icon cover-'+item.color}>{item.kind==='class'?<GraduationCap/>:item.kind==='digital'?<FileText/>:<ShoppingBag/>}</span><div><h3>{en?item.titleEn:item.title}</h3><p>{categoryLabel(item.course,en)} · {en?item.tutorEn:item.tutor}</p></div></div>
    {step==='review'?<>
      {item.kind==='class'&&<label className="purchase-field">{t('วันและเวลา (กรุงเทพฯ)','Date & time (Bangkok)')}<select className="input" value={slot} onChange={e=>{setSlot(e.target.value);setQuantity(1)}}><option value="">{t('เลือกเวลาคลาส','Choose a time')}</option>{slots.map(s=><option key={s.date} value={s.date} disabled={!s.remaining}>{new Date(s.date).toLocaleString(en?'en-GB':'th-TH',{timeZone:'Asia/Bangkok'})}</option>)}</select></label>}
      <div className="purchase-quantity"><label htmlFor="purchase-quantity">{item.kind==='class'?t('จำนวนผู้เรียน','Learners'):t('จำนวน','Quantity')}</label><select id="purchase-quantity" className="input" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}>{Array.from({length:Math.max(1,Math.min(10,remaining))},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></div>
      <dl className="purchase-totals"><div><dt>{t('ราคาต่อรายการ','Unit price')}</dt><dd>{money(item.price)}</dd></div><div><dt>{t('ค่าธรรมเนียม','Fees')}</dt><dd>฿0</dd></div><div className="purchase-grand-total"><dt>{t('ยอดรวม','Total')}</dt><dd>{money(total)}</dd></div></dl>
      <p className="notice">{t('ทดลองขั้นตอนการสั่งซื้อและชำระเงิน ไม่มีการหักเงินจริงหรือส่งมอบสินค้า','Try the ordering and payment flow. No real charge or fulfillment.')}</p>
      {!signedIn?<a className="btn btn-primary full" href={signInPath('/?view=resources&checkout='+encodeURIComponent(item.id))} target="_top">{t('เข้าสู่ระบบเพื่อสั่งซื้อ','Sign in to order')}</a>:<button className="btn btn-primary full" disabled={!ready||busy} onClick={()=>setStep('payment')}>{t('ไปชำระเงิน','Proceed to payment')} · {money(total)}</button>}
      {!remaining&&<p className="fine">{item.kind==='class'?t('เลือกเวลาที่มีที่นั่งว่าง','Choose an available time.'):t('สินค้าหมดแล้ว','This item is sold out.')}</p>}
    </>:<>
      <div className="purchase-payment"><span className="pill">{t('QR จำลอง · ใช้ทดสอบเท่านั้น','DEMO QR · TEST ONLY')}</span><h3>{t('ชำระเงินด้วย QR','Pay by QR')}</h3><strong className="purchase-amount">{money(total)}</strong><div className="purchase-qr">{qr?<img src={qr} width={256} height={256} alt={t('QR จำลอง ไม่มีข้อมูลบัญชีธนาคาร','Demo QR with no bank account or payment details')}/>:<p role="status">{qrError?t('ไม่สามารถแสดง QR ได้ กรุณากลับไปลองใหม่','Could not show QR. Please go back and retry.'):t('กำลังสร้าง QR จำลอง…','Creating demo QR…')}</p>}</div><p>{t('QR นี้แสดงข้อความทดสอบเท่านั้น ใช้แอปธนาคารโอนไม่ได้','This QR contains test text only. It cannot transfer money in a banking app.')}</p><span className="purchase-reference">PS-DEMO-{requestId.current.slice(0,8).toUpperCase()}</span></div>
      <button className="btn btn-primary full" disabled={busy||!qr} onClick={confirm}>{busy?t('กำลังบันทึก…','Saving…'):t('ยืนยันชำระเงินจำลอง','Confirm demo payment')}</button><button className="btn btn-plain full" disabled={busy} onClick={()=>setStep('review')}><ArrowLeft size={15}/>{t('กลับไปแก้ไขรายการ','Back to review')}</button>
    </>}
  </div>;
}
