// Chulalongkorn University's faculty directory and registrar course list.
// Verified 2026-11-12: https://www.reg.chula.ac.th/th/staff/courselist/
// Agriculture renamed: https://www.chula.ac.th/news/284578/
// New categories use the existing `course` payload field, preserving stored records.
export const faculties = [
  { name: 'คณะเกษตรศาสตร์บูรณาการ', en: 'Faculty of Integrated Agriculture' },
  { name: 'คณะครุศาสตร์', en: 'Faculty of Education' },
  { name: 'คณะจิตวิทยา', en: 'Faculty of Psychology' },
  { name: 'คณะทันตแพทยศาสตร์', en: 'Faculty of Dentistry' },
  { name: 'คณะนิติศาสตร์', en: 'Faculty of Law' },
  { name: 'คณะนิเทศศาสตร์', en: 'Faculty of Communication Arts' },
  { name: 'คณะพยาบาลศาสตร์', en: 'Faculty of Nursing' },
  { name: 'คณะพาณิชยศาสตร์และการบัญชี', en: 'Faculty of Commerce and Accountancy' },
  { name: 'คณะแพทยศาสตร์', en: 'Faculty of Medicine' },
  { name: 'คณะเภสัชศาสตร์', en: 'Faculty of Pharmaceutical Sciences' },
  { name: 'คณะรัฐศาสตร์', en: 'Faculty of Political Science' },
  { name: 'คณะวิทยาศาสตร์', en: 'Faculty of Science' },
  { name: 'คณะวิทยาศาสตร์การกีฬา', en: 'Faculty of Sports Science' },
  { name: 'คณะวิศวกรรมศาสตร์', en: 'Faculty of Engineering' },
  { name: 'คณะศิลปกรรมศาสตร์', en: 'Faculty of Fine and Applied Arts' },
  { name: 'คณะเศรษฐศาสตร์', en: 'Faculty of Economics' },
  { name: 'คณะสถาปัตยกรรมศาสตร์', en: 'Faculty of Architecture' },
  { name: 'คณะสหเวชศาสตร์', en: 'Faculty of Allied Health Sciences' },
  { name: 'คณะสัตวแพทยศาสตร์', en: 'Faculty of Veterinary Science' },
  { name: 'คณะอักษรศาสตร์', en: 'Faculty of Arts' },
  { name: 'อื่นๆ', en: 'Other' },
] as const;

const byName = new Map<string, typeof faculties[number]>(faculties.map(f => [f.name, f]));
// Only classify known legacy course codes. General skills and institute courses
// remain Other; a tutor's own faculty is not the faculty offering the course.
const legacyFaculties: Record<string, string> = {
  '2301117': 'คณะวิทยาศาสตร์',
  '2110101': 'คณะวิศวกรรมศาสตร์',
};
export const isFacultyCategory = (value: string) => byName.has(value);
export const facultyForCourse = (value: string) => byName.has(value) ? value : legacyFaculties[value] || 'อื่นๆ';
export const facultyFilter = (value: string | null) => !value || value === 'all' ? 'all' : facultyForCourse(value);
export function categoryLabel(value: string, en = false) {
  const faculty = byName.get(value);
  return faculty ? en ? faculty.en : faculty.name : value;
}
export function courseSummary(course: string, subject: string, en = false) {
  const label = categoryLabel(course, en);
  return !subject || subject === course ? label : `${label} · ${subject}`;
}
