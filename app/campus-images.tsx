"use client";
import {useState} from 'react';
import type {Listing} from '@/lib/catalog';
const source='https://www.arts.chula.ac.th/eng/index.php/facilities/';
export const campusPhotos={
 park:{src:'/images/chula/park.jpg',th:'อุทยาน 100 ปี จุฬาฯ',en:'Chula Centenary Park'},
 books:{src:'/images/chula/books.jpg',th:'ห้องสมุดคณะอักษรศาสตร์',en:'Faculty of Arts Library'},
 commons:{src:'/images/chula/commons.jpg',th:'Learning Commons · คณะอักษรศาสตร์',en:'Faculty of Arts Learning Commons'},
 library:{src:'/images/chula/library.jpg',th:'หอสมุดกลาง จุฬาฯ',en:'Chula Central Library'},
 plearn:{src:'/images/chula/plearn.jpg',th:'พื้นที่เรียนรู้ Plearn Space',en:'Plearn Space'},
 classroom:{src:'/images/chula/classroom.jpg',th:'ห้องเรียนคณะอักษรศาสตร์',en:'Faculty of Arts classroom'},
 computer:{src:'/images/chula/computer.jpg',th:'ห้องคอมพิวเตอร์คณะอักษรศาสตร์',en:'Faculty of Arts computer lab'}
};
export function listingPhoto(item:Listing){
 const text=(item.subject+' '+item.title+' '+item.course).toLowerCase();
 if(/python|program|computer|เขียนโปรแกรม|คอมพิวเตอร์/.test(text))return campusPhotos.computer;
 if(/figma|design|ออกแบบ|สถาปัตย/.test(text))return item.kind==='class'?campusPhotos.plearn:campusPhotos.commons;
 if(item.kind!=='class')return /ภาษา|hsk|chinese|english/.test(text)?campusPhotos.books:campusPhotos.library;
 if(/ภาษา|hsk|chinese|english/.test(text))return campusPhotos.classroom;
 return campusPhotos.commons;
}
export function CampusImage({photo,en=false,eager=false,className=''}:{photo:typeof campusPhotos.park;en?:boolean;eager?:boolean;className?:string}){
 const [failed,setFailed]=useState(false);
 return failed?<span className={'campus-image-fallback '+className}>{en?photo.en:photo.th}</span>:<img className={className} src={photo.src} alt={en?photo.en:photo.th} loading={eager?'eager':'lazy'} decoding="async" width={1024} height={683} onError={()=>setFailed(true)}/>;
}
export function ListingPhoto({item,en=false,detail=false}:{item:Listing;en?:boolean;detail?:boolean}){const photo=listingPhoto(item);return <figure className={'listing-photo'+(detail?' listing-photo-detail':'')}><CampusImage photo={photo} en={en}/><figcaption>{en?'Illustrative campus photo':'ภาพบรรยากาศประกอบ'}</figcaption></figure>}
export function CampusRibbon({en=false}:{en?:boolean}){return <section className="campus-ribbon" aria-label={en?'Around Chula':'บรรยากาศรอบจุฬาฯ'}><div className="campus-ribbon-title"><span>AROUND CHULA</span><h2>{en?'A campus full of possibilities':'ทุกมุมจุฬาฯ มีเรื่องให้เรียนรู้'}</h2><p>{en?'Find a quiet corner. Meet a friend. Share what you know.':'มุมอ่านหนังสือ พื้นที่นัดติว และความรู้ที่ส่งต่อกันได้'}</p></div><div className="campus-ribbon-photos">{[campusPhotos.park,campusPhotos.commons,campusPhotos.books].map((p,i)=><figure key={p.src}><CampusImage photo={p} en={en} eager={i===0}/><figcaption>{en?p.en:p.th}</figcaption></figure>)}</div></section>}
export function PhotoCredits({en=false}:{en?:boolean}){return <p className="photo-credits">{en?'Campus photographs: ':'ภาพบรรยากาศ: '}<a href={source} target="_blank" rel="noreferrer">{en?'Faculty of Arts, Chulalongkorn University':'เว็บไซต์คณะอักษรศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย'}</a>{en?' · Illustrative photos, not actual classes or product previews. Peer Sharing is an independent project.':' · ใช้ประกอบบรรยากาศ ไม่ใช่ภาพคลาสหรือเนื้อหาชีทจริง · Peer Sharing เป็นโครงการอิสระ'}</p>}
