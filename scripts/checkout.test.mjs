import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDemoOrder,demoTotal,demoQrPayload} from '../lib/demo-checkout.ts';

const item={id:'resource-1',owner:'seller',title:'ชีทสรุป',titleEn:'Notes',kind:'digital',course:'คณะวิทยาศาสตร์',tutor:'Peer',price:59.5,seats:999,filled:0,status:'published'};
const input={requestId:'demo-ref',quantity:1,quotedTotal:59.5};
test('mock checkout snapshots authoritative prices and never creates a real payment status',()=>{
 const order=makeDemoOrder(item,'buyer',input,1000);
 assert.equal(order.total,59.5);assert.equal(order.status,'demo_paid');assert.equal(order.paymentMode,'demo_qr');assert.equal(order.demo,true);
 assert.equal(order.fileKey,undefined);assert.equal(order.provider,undefined);assert.equal(item.filled,0);
 assert.match(demoQrPayload(order.id,order.total),/DEMO ONLY — NO PAYMENT/);
 assert.doesNotMatch(demoQrPayload(order.id,order.total),/https?:|000201|promptpay/i);
});
test('rejects anonymous, self-purchase, stale quotes, unavailable listings and invalid quantities',()=>{
 for(const [listing,actor,data] of [[item,'',input],[item,'seller',input],[item,'buyer',{...input,quotedTotal:0}],[{...item,status:'draft'},'buyer',input],[item,'buyer',{...input,quantity:2,quotedTotal:119}],[{...item,kind:'physical',seats:1,filled:1},'buyer',input]])assert.throws(()=>makeDemoOrder(listing,actor,data));
 for(const quantity of [0,-1,11,1.5,NaN])assert.throws(()=>demoTotal(59.5,quantity));
 assert.equal(demoTotal(0.1,3),0.3);
});
test('classes require a future time and never reserve seats in the demo',()=>{
 const listing={...item,kind:'class',seats:5,filled:2};
 assert.throws(()=>makeDemoOrder(listing,'buyer',input,1000));
 assert.throws(()=>makeDemoOrder(listing,'buyer',{...input,slot:'1970-01-01T00:00:00Z'},1000));
 const order=makeDemoOrder(listing,'buyer',{...input,quantity:2,quotedTotal:119,slot:'2030-01-01T09:00:00Z'},1000);
 assert.equal(order.quantity,2);assert.equal(order.total,119);assert.equal(listing.filled,2);
});
