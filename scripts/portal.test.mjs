import test from 'node:test';
import assert from 'node:assert/strict';
import { portalModeForView, portalModeFromParams } from '../lib/portal-mode.ts';
import { faculties, facultyForCourse, facultyFilter, categoryLabel } from '../lib/faculties.ts';

test('a normal login landing opens user mode; provider links retain their context', () => {
  assert.equal(portalModeFromParams(new URLSearchParams()), 'user');
  assert.equal(portalModeFromParams(new URLSearchParams('view=profile')), 'user');
  assert.equal(portalModeFromParams(new URLSearchParams('view=teaching')), 'provider');
  assert.equal(portalModeFromParams(new URLSearchParams('view=chat&mode=provider')), 'provider');
  assert.equal(portalModeFromParams(new URLSearchParams('view=learning&mode=provider')), 'user');
});

test('shared pages preserve mode while buyer and studio pages select the appropriate menu', () => {
  for (const view of ['chat', 'profile', 'notifications', 'requests']) {
    assert.equal(portalModeForView(view, 'provider'), 'provider');
    assert.equal(portalModeForView(view, 'user'), 'user');
  }
  assert.equal(portalModeForView('teaching', 'user'), 'provider');
  assert.equal(portalModeForView('discover', 'provider'), 'user');
});

test('faculty filtering supports existing course records without guessing from tutor affiliation', () => {
  assert.equal(facultyForCourse('2301117'), 'คณะวิทยาศาสตร์');
  assert.equal(facultyForCourse('2110101'), 'คณะวิศวกรรมศาสตร์');
  for (const value of ['HSK', 'FIGMA', '5500111', 'unknown course']) {
    assert.equal(facultyForCourse(value), 'อื่นๆ');
  }
  assert.equal(facultyFilter(null), 'all');
  assert.equal(facultyFilter('all'), 'all');
  assert.equal(facultyFilter('2301117'), 'คณะวิทยาศาสตร์');
});

test('all faculty selections survive JSON storage and localize without changing saved keys', () => {
  for (const faculty of faculties) {
    const stored = JSON.parse(JSON.stringify({ course: faculty.name }));
    assert.equal(facultyForCourse(stored.course), faculty.name);
    assert.equal(categoryLabel(stored.course, true), faculty.en);
    assert.equal(categoryLabel(stored.course, false), faculty.name);
  }
  assert.equal(categoryLabel('2301117', true), '2301117');
});
