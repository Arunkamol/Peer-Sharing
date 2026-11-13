import {z} from 'zod';
import {normalizeCourseCode} from './availability';
const clock=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const availabilitySchema=z.array(z.object({day:z.number().int().min(1).max(7),start:clock,end:clock})).min(1).max(28);
export const courseCodeSchema=z.string().max(30).transform(normalizeCourseCode).refine(v=>v===''||/^\d{7}$/.test(v),'รหัสวิชาต้องมี 7 หลัก / Course code must contain seven digits.');
