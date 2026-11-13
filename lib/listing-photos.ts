import type {Listing} from './catalog';
export const subjectPhotos={
  "machine-learning": {
    "src": "/images/subjects/machine-learning.jpg",
    "th": "โค้ดและการเขียนโปรแกรม Machine Learning",
    "en": "Machine learning code workspace"
  },
  "python": {
    "src": "/images/subjects/python.jpg",
    "th": "การเขียนโปรแกรม Python",
    "en": "Python programming"
  },
  "chinese": {
    "src": "/images/subjects/chinese.jpg",
    "th": "ตัวอักษรจีนและการเรียนภาษา",
    "en": "Chinese characters and language learning"
  },
  "production": {
    "src": "/images/subjects/production.jpg",
    "th": "สายการผลิตในโรงงาน",
    "en": "Factory production line"
  },
  "operations": {
    "src": "/images/subjects/operations.jpg",
    "th": "คลังสินค้าและการจัดการสินค้าคงคลัง",
    "en": "Warehouse and inventory operations"
  },
  "calculator": {
    "src": "/images/subjects/calculator.jpg",
    "th": "เครื่องคิดเลขบนโต๊ะ",
    "en": "Desktop calculator"
  },
  "calculus": {
    "src": "/images/subjects/calculus.jpg",
    "th": "สมการคณิตศาสตร์บนกระดาน",
    "en": "Mathematical equations on a chalkboard"
  },
  "japanese": {
    "src": "/images/subjects/japanese.jpg",
    "th": "หนังสือภาษาญี่ปุ่น",
    "en": "Japanese language book"
  },
  "organization": {
    "src": "/images/subjects/organization.jpg",
    "th": "การทำงานร่วมกันในองค์กร",
    "en": "Team collaboration in an organization"
  },
  "excel": {
    "src": "/images/subjects/excel.jpg",
    "th": "การวิเคราะห์ข้อมูลบนคอมพิวเตอร์",
    "en": "Data analysis on a laptop"
  },
  "statistics": {
    "src": "/images/subjects/statistics.jpg",
    "th": "กราฟและการวิเคราะห์เชิงปริมาณ",
    "en": "Charts and quantitative analysis"
  },
  "database": {
    "src": "/images/subjects/database.jpg",
    "th": "เซิร์ฟเวอร์และระบบฐานข้อมูล",
    "en": "Database servers"
  },
  "strategy": {
    "src": "/images/subjects/strategy.jpg",
    "th": "หมากรุกและการวางกลยุทธ์",
    "en": "Chess and strategic thinking"
  },
  "design": {
    "src": "/images/subjects/design.jpg",
    "th": "การออกแบบบนคอมพิวเตอร์",
    "en": "Digital design workspace"
  },
  "quantitative": {
    "src": "/images/subjects/quantitative.jpg",
    "th": "การวิเคราะห์และวางแผนทางธุรกิจ",
    "en": "Business analysis and planning"
  },
  "calculation": {
    "src": "/images/subjects/calculation.jpg",
    "th": "เครื่องคิดเลขสำหรับการคำนวณ",
    "en": "Calculator for numerical work"
  },
  "notes": {
    "src": "/images/subjects/notes.jpg",
    "th": "การเขียนและจดบันทึก",
    "en": "Writing and taking notes"
  },
  "learning": {
    "src": "/images/subjects/learning.jpg",
    "th": "การอ่านและทบทวนบทเรียน",
    "en": "Studying and reviewing notes"
  }
};
const listingCovers:Record<string,keyof typeof subjectPhotos>={
  "318f3bba-799b-4af9-a992-e0b6fbc6943d": "calculus",
  "cfa0f01e-1774-4aa2-b6e4-0f20395b3d69": "organization",
  "672ce166-a188-4f78-85ee-aae722e1cbd8": "calculator",
  "f2fc856c-3d69-4a39-8342-ec95aaa85b1c": "quantitative",
  "5411486d-02ad-481f-8334-04825e3329d5": "japanese",
  "20c51217-0948-44f5-998b-c449cec3b75e": "calculation",
  "3d8058ee-4047-4a07-8d04-63f74127c0b9": "machine-learning",
  "d34c1f66-981f-414f-a629-2dd719a653ef": "chinese",
  "690a21f5-d204-47aa-a121-a26eaa80ce7e": "database",
  "b9e1939b-562d-4aee-b5b3-062f85b23a50": "statistics",
  "f9fc8f17-b5bd-4da5-95e4-3f9b8933b9e9": "production",
  "5d871ea9-2716-466b-9f5e-2665698e72b9": "operations",
  "397f99b0-240c-41b7-94be-7018def16f2e": "excel",
  "5b95743e-49fd-4153-a822-cba28bf6e732": "strategy",
  "calculus-foundations": "calculus",
  "python-first": "python",
  "hsk-conversation": "chinese",
  "figma-intro": "design",
  "english-talk": "organization",
  "calculus-notes": "calculation",
  "python-notes": "machine-learning",
  "chinese-book": "chinese",
  "design-notes": "notes"
};
export function listingPhoto(item:Listing){
 const chosen=listingCovers[item.id];
 if(chosen)return subjectPhotos[chosen];
 const text=[item.title,item.titleEn,item.subject,item.description].join(' ').toLowerCase();
 const rules:[RegExp,keyof typeof subjectPhotos][]=[[/machine.?learning|เรียนรู้ของเครื่อง/,'machine-learning'],[/database|ฐานข้อมูล|\bsql\b/,'database'],[/excel|spreadsheet/,'excel'],[/chin|ภาษาจีน|hsk/,'chinese'],[/japan|nihongo|ญี่ปุ่น/,'japanese'],[/final.*(prod|oper)|inventory|logistic|คลังสินค้า/,'operations'],[/prod|oper.*mgt|การผลิต/,'production'],[/strategy|กลยุทธ์/,'strategy'],[/organi|พฤติกรรมองค์/,'organization'],[/\bqa\b|quantitative|สถิติ/ ,item.kind==='class'?'quantitative':'statistics'],[/เครื่องคิดเลข|calculator/,'calculator'],[/calculus|\bcal\b|แคลคูลัส/ ,item.kind==='class'?'calculus':'calculation'],[/python|code|program|เขียนโปรแกรม/ ,item.kind==='class'?'python':'machine-learning'],[/design|figma|ออกแบบ/,'design'],[/english|ภาษาอังกฤษ/,'organization']];
 return subjectPhotos[rules.find(([pattern])=>pattern.test(text))?.[1]||(item.kind==='class'?'learning':'notes')];
}
