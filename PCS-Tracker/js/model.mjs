import { CATEGORIES, MILESTONES, TASKS } from './data.mjs';
export const VERSION = 1;
export const STORAGE_KEY = 'pcsunited.pcs-tracker.plan.v1';
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const y = Number(value.slice(0, 4));
  const date = new Date(`${value}T12:00:00Z`);
  return y >= 1900 && y <= 2100 && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dayDifference(start, end) {
  return validDate(start) && validDate(end) ? Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000) : null;
}
export function formatDate(value, options = {}) {
  return validDate(value) ? new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...options, timeZone: 'UTC' }) : 'Not entered';
}
export function newPlan() {
  return { version: VERSION, example: false, dates: Object.fromEntries(MILESTONES.map(m => [m.key, ''])), tasks: TASKS.map(({ id, title, category }) => ({ id, title, category, due: '', reviewed: false, notes: '' })) };
}
export function dateError(dates) {
  for (const { key, label } of MILESTONES) if (dates[key] && !validDate(dates[key])) return `Enter a valid ${label.toLowerCase()} date between 1900 and 2100.`;
  if (dates.departure && dates.arrival && dates.arrival < dates.departure) return 'Planned arrival must be on or after planned departure.';
  return '';
}
// Import only the documented planning fields; never trust downloaded or stored JSON.
export function validatePlan(value) {
  if (!value || value.version !== VERSION || typeof value.example !== 'boolean' || !value.dates || !Array.isArray(value.tasks) || value.tasks.length > 200) throw new Error('Choose a PCS Tracker plan file (version 1, up to 200 tasks).');
  const dates = {};
  for (const { key } of MILESTONES) {
    if (typeof value.dates[key] !== 'string' || (value.dates[key] && !validDate(value.dates[key]))) throw new Error('The plan contains an invalid date.');
    dates[key] = value.dates[key];
  }
  if (dateError(dates)) throw new Error(dateError(dates));
  const ids = new Set();
  const tasks = value.tasks.map(t => {
    if (!t || typeof t.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(t.id) || ids.has(t.id) || typeof t.title !== 'string' || !t.title.trim() || t.title.length > 160 || !CATEGORIES.includes(t.category) || typeof t.reviewed !== 'boolean' || typeof t.due !== 'string' || (t.due && !validDate(t.due)) || typeof t.notes !== 'string' || t.notes.length > 1000) throw new Error('The plan contains an invalid or duplicate task.');
    ids.add(t.id);
    return { id: t.id, title: t.title.trim(), category: t.category, reviewed: t.reviewed, due: t.due, notes: t.notes };
  });
  return { version: VERSION, example: value.example, dates, tasks };
}
export function eventsFor(plan) {
  const milestones = MILESTONES.filter(m => plan.dates[m.key]).map(m => ({ id: m.key, title: m.label, date: plan.dates[m.key], kind: 'milestone', reviewed: false }));
  const tasks = plan.tasks.filter(t => t.due).map(t => ({ id: t.id, title: t.title, date: t.due, kind: 'task', category: t.category, reviewed: t.reviewed }));
  return [...milestones, ...tasks].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? a.title.localeCompare(b.title) : a.kind === 'milestone' ? -1 : 1));
}
export function calendarCells(year, month) {
  const leading = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [...Array(leading).fill(null), ...Array.from({ length: days }, (_, i) => `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)];
}
export function examplePlan() {
  const p = newPlan(); p.example = true;
  p.dates = { pickup: '2027-06-10', departure: '2027-06-15', arrival: '2027-06-19', report: '2027-06-22' };
  const due = ['2027-06-01', '2027-06-02', '2027-06-03', '2027-06-04', '2027-06-08', '2027-06-14', '2027-06-05', '2027-06-09', '2027-06-11', '2027-06-18', '2027-06-19', '2027-06-23'];
  p.tasks.forEach((t, i) => { t.due = due[i]; t.reviewed = i < 6; });
  return p;
}
export function summaryText(plan) {
  return ['PCSUNITED · MY PCS PLAN', plan.example ? 'EXAMPLE PLAN — illustrative dates and tasks.' : 'Personal planning entries — verify with the responsible offices.', '', ...MILESTONES.map(m => `${m.label}: ${plan.dates[m.key] || 'Not entered'}`), '', `${plan.tasks.filter(t => t.reviewed).length} of ${plan.tasks.length} preparation items reviewed`, ...CATEGORIES.flatMap(c => ['', c.toUpperCase(), ...plan.tasks.filter(t => t.category === c).flatMap(t => [`[${t.reviewed ? 'x' : ' '}] ${t.title} | Date: ${t.due || 'Not entered'}`, ...(t.notes ? [`  Questions: ${t.notes}`] : [])])]), '', 'Task checks track preparation, not official approval or completion of all PCS requirements.', 'Dates are entered by you, not authorized travel days or generated military deadlines.', 'Confirm current instructions, authorizations, and claim requirements with your unit, TMO, passenger travel, and finance.'].join('\n');
}
