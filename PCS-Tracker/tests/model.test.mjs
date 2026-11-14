import test from 'node:test';
import assert from 'node:assert/strict';
import { newPlan, examplePlan, validatePlan, validDate, dateError, dayDifference, eventsFor, calendarCells, summaryText } from '../js/model.mjs';

test('unknown dates stay unknown and task checks are preparation only', () => {
  const plan = newPlan();
  assert.equal(plan.tasks.length, 12);
  assert.ok(plan.tasks.every(t => !t.due && !t.reviewed));
  assert.deepEqual(eventsFor(plan), []);
  assert.match(summaryText(plan), /Planned departure: Not entered/);
  assert.match(summaryText(plan), /not official approval/);
});
test('date validation rejects rollover, malformed, and out-of-range dates', () => {
  for (const v of ['2027-02-29', '2027-13-01', '2027-99-99', '2027-04-31', '2101-01-01', '1899-12-31', '', null]) assert.equal(validDate(v), false, String(v));
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(dayDifference('2027-03-13', '2027-03-15'), 2);
  assert.equal(dayDifference('', '2027-03-15'), null);
  assert.match(dateError({ departure: '2027-06-19', arrival: '2027-06-15' }), /on or after/);
});
test('tasks and explicit milestones appear together without guessing from task names', () => {
  const p = newPlan(); p.dates.arrival = '2027-06-19';
  p.tasks[0].title = 'Arrival question'; p.tasks[0].due = '2027-06-17';
  const events = eventsFor(p);
  assert.equal(events[0].kind, 'task'); assert.equal(events[1].id, 'arrival');
  assert.deepEqual(events.map(e => e.date), ['2027-06-17', '2027-06-19']);
});
test('JSON round trip preserves notes, dates, review flags and example label', () => {
  const p = examplePlan(); p.tasks[0].notes = 'Ask TMO about delivery.';
  assert.deepEqual(validatePlan(JSON.parse(JSON.stringify(p))), p);
  assert.match(summaryText(p), /EXAMPLE PLAN/);
  assert.match(summaryText(p), /6 of 12/);
});
test('untrusted imports reject duplicate IDs, oversized text and invalid field types', () => {
  const p = examplePlan();
  const bad = mutate => { const copy = structuredClone(p); mutate(copy); assert.throws(() => validatePlan(copy)); };
  bad(p => p.tasks.push(p.tasks[0]));
  bad(p => p.tasks[0].id = '<script>');
  bad(p => p.tasks[0].category = 'Unknown');
  bad(p => p.tasks[0].notes = 'a'.repeat(1001));
  bad(p => p.tasks[0].reviewed = 'false');
  bad(p => p.dates.arrival = '2027-01-01');
  bad(p => p.version = 2);
  const copy = structuredClone(p); copy.secret = 'discard';
  assert.equal(validatePlan(copy).secret, undefined);
});
test('calendar handles leap years and Sunday starts without shifting dates', () => {
  const cells = calendarCells(2028, 1);
  assert.equal(cells.filter(Boolean).length, 29);
  assert.equal(cells[2], '2028-02-01');
  assert.equal(calendarCells(2027, 7)[0], '2027-08-01');
});
