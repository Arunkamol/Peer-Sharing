import test from 'node:test';
import assert from 'node:assert/strict';
import {availabilityError,weeklyDates,normalizeCourseCode,validCourseCode,listingCourseCode} from '../lib/availability.ts';
const now=Date.parse('2026-11-15T16:00:00Z'); // Sunday 23:00 Bangkok
test('Monday through Sunday windows create complete Bangkok sessions across UTC day boundaries',()=>{
 const dates=weeklyDates([{day:1,start:'00:00',end:'02:00'},{day:7,start:'10:00',end:'11:30'}],60,now);
 assert.equal(dates[0],'2026-11-15T17:00:00.000Z');
 assert.equal(dates[1],'2026-11-15T18:00:00.000Z');
 assert.ok(dates.includes('2026-11-22T03:00:00.000Z'));
 assert.ok(!dates.includes('2026-11-22T04:00:00.000Z')); // incomplete trailing session
 assert.equal(new Set(dates).size,dates.length);
 assert.ok(dates.every(d=>Date.parse(d)>now+1800000));
 assert.ok(dates.every(d=>Date.parse(d)<Date.parse('2026-12-13T00:00:00+07:00')));
});
test('invalid, overnight, overlapping and too-short windows cannot publish',()=>{
 for(const windows of [[],[{day:0,start:'09:00',end:'10:00'}],[{day:1,start:'23:00',end:'01:00'}],[{day:1,start:'09:00',end:'09:30'}],[{day:1,start:'09:00',end:'11:00'},{day:1,start:'10:00',end:'12:00'}]])assert.notEqual(availabilityError(windows,60),'');
 assert.equal(availabilityError([{day:1,start:'09:00',end:'10:00'},{day:1,start:'10:00',end:'11:00'}],60),'');
});
test('course codes normalize spaced input without altering faculty or guessing codes',()=>{
 assert.equal(normalizeCourseCode(' 5500 415 '),'5500415');
 assert.equal(validCourseCode('5500 415'),true);assert.equal(validCourseCode('550041'),false);assert.equal(validCourseCode(''),true);
 assert.equal(listingCourseCode({course:'คณะอักษรศาสตร์',courseCode:'5500415'}),'5500415');
 assert.equal(listingCourseCode({course:'2301117'}),'2301117');assert.equal(listingCourseCode({course:'อื่นๆ'}),'');
});
