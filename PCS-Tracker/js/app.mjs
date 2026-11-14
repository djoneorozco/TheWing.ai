import { CATEGORIES, MILESTONES, TASKS } from './data.mjs';
import { STORAGE_KEY, newPlan, validatePlan, dateError, validDate, todayKey, dayDifference, formatDate, eventsFor, calendarCells, examplePlan, summaryText } from './model.mjs';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const params = new URLSearchParams(location.search);
const embedded = params.get('embed') === '1';
document.documentElement.classList.toggle('embedded', embedded);
let parentOrigin = '';
try { const u = new URL(params.get('parentOrigin')); if (['https:', 'http:'].includes(u.protocol)) parentOrigin = u.origin; } catch { /* Standalone view has no parent. */ }
let plan = newPlan();
let saved = false;
let view = 'overview';
let category = 'All';
let selectedDay = todayKey();
let month = new Date().getMonth();
let year = new Date().getFullYear();
let dialogAction = null;
let returnFocus = null;

function status(message) { $('#status').textContent = message; }
function storageNote() {
  $('#save-device').checked = saved;
  $('#storage-note').textContent = saved ? 'Saved in this browser only. Turning this off removes the saved copy; current entries stay open.' : 'Optional. Entries reset on reload unless you save or download a copy.';
}
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { plan = validatePlan(JSON.parse(raw)); saved = true; }
} catch { status('A saved plan could not be loaded. You can still plan here or import a downloaded copy.'); }
function persist() {
  if (!saved) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)); }
  catch { saved = false; storageNote(); status('This browser could not save the latest change. Download your plan before leaving.'); }
}
function commit(message = '') { persist(); render(); if (message) status(message); }
function progress() { return plan.tasks.filter(t => t.reviewed).length; }
function filters(target) {
  $(target).innerHTML = ['All', ...CATEGORIES].map(c => `<button type="button" data-category="${c}" aria-pressed="${category === c}">${c}</button>`).join('');
}
function taskHTML(t, prefix) {
  const reference = TASKS.find(s => s.id === t.id);
  return `<article class="task ${t.reviewed ? 'checked' : ''}"><div class="task-main"><input type="checkbox" id="${prefix}-${t.id}" data-check="${t.id}" ${t.reviewed ? 'checked' : ''}><label class="task-label" for="${prefix}-${t.id}">${escape(t.title)}</label></div><div class="task-meta"><span>${escape(t.category)}</span><span>${t.due ? `By ${formatDate(t.due, { year: 'numeric' })}` : 'No date set'}</span><button type="button" class="text-button" data-edit="${t.id}" aria-label="Edit ${escape(t.title)}">Edit</button></div><details><summary>Why this matters</summary><div class="explanation"><p>${reference ? escape(reference.why) : 'A task you added to your personal plan. Confirm any required action, date, or authorization with the responsible office.'}</p>${reference ? `<a href="${reference.source}" target="_blank" rel="noopener noreferrer">Official planning resource ↗</a>` : ''}${t.notes ? `<p class="notes"><strong>Your questions:</strong> ${escape(t.notes)}</p>` : ''}</div></details></article>`;
}
function milestoneHTML(m) {
  const date = plan.dates[m.key];
  return `<div class="milestone"><div><strong>${date ? formatDate(date, { year: 'numeric' }) : 'Not entered'}</strong><span>${m.label}</span></div></div>`;
}
function eventHTML(e) {
  return `<div class="event-row"><span class="event-type">${e.kind === 'milestone' ? 'Move date' : escape(e.category)}</span><span class="event-name">${escape(e.title)}</span>${e.kind === 'task' ? `<small>${e.reviewed ? 'Reviewed' : 'To review'}</small><button type="button" class="text-button" data-edit="${e.id}" aria-label="Edit ${escape(e.title)}">Edit</button>` : ''}</div>`;
}
function render() {
  $('#plan-mode').textContent = plan.example ? 'Example plan' : 'Your plan';
  $('#example-note').hidden = !plan.example;
  $('#departure-value').textContent = plan.dates.departure ? formatDate(plan.dates.departure) : 'Add a date';
  const days = dayDifference(todayKey(), plan.dates.departure);
  $('#departure-note').textContent = days === null ? 'Your planning date' : days === 0 ? 'Today · your planning date' : days > 0 ? `${days} calendar days from today` : `${Math.abs(days)} calendar days ago`;
  $('#arrival-value').textContent = plan.dates.arrival ? formatDate(plan.dates.arrival) : 'Add a date';
  const span = dayDifference(plan.dates.departure, plan.dates.arrival);
  $('#arrival-note').textContent = span === null ? 'Your planning date' : `${span}-day calendar difference · not authorized days`;
  $('#progress-label').textContent = `${progress()} of ${plan.tasks.length} reviewed`;
  $('#progress').max = Math.max(1, plan.tasks.length); $('#progress').value = progress();
  filters('#overview-filters'); filters('#task-filters');
  const matching = plan.tasks.filter(t => category === 'All' || t.category === category);
  const byDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999');
  const next = [...matching.filter(t => !t.reviewed).sort(byDue), ...matching.filter(t => t.reviewed).sort(byDue)].slice(0, 3);
  $('#overview-tasks').innerHTML = next.length ? next.map(t => taskHTML(t, 'next')).join('') : '<p class="empty">No tasks in this category. Add a task to start.</p>';
  $('#all-tasks').innerHTML = matching.length ? matching.map(t => taskHTML(t, 'all')).join('') : '<p class="empty">No tasks in this category. Add what your move needs.</p>';
  $('#overview-timeline').innerHTML = MILESTONES.map(milestoneHTML).join('');
  const events = eventsFor(plan);
  let last = '';
  $('#full-timeline').innerHTML = events.length ? events.map(e => {
    const heading = e.date !== last ? `<h4>${formatDate(e.date, { weekday: 'long', year: 'numeric' })}</h4>` : '';
    last = e.date;
    return `<div class="timeline-group">${heading}${eventHTML(e)}</div>`;
  }).join('') : '<p class="empty">Add move dates or give a task a date to build your timeline. Undated tasks stay in My Tasks.</p>';
  renderCalendar(); storageNote();
}
function renderCalendar() {
  const events = eventsFor(plan);
  $('#calendar-month').textContent = new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  $('#prev-month').disabled = year === 1900 && month === 0;
  $('#next-month').disabled = year === 2100 && month === 11;
  $('#calendar-days').innerHTML = calendarCells(year, month).map(date => {
    if (!date) return '<span aria-hidden="true"></span>';
    const count = events.filter(e => e.date === date).length;
    return `<button type="button" data-day="${date}" aria-label="${formatDate(date, { weekday: 'long', year: 'numeric' })}${count ? `, ${count} planned item${count === 1 ? '' : 's'}` : ', no planned items'}" aria-pressed="${date === selectedDay}" ${date === todayKey() ? 'aria-current="date"' : ''}><span class="day-num">${Number(date.slice(8))}</span>${count ? `<span class="day-count">${count} item${count === 1 ? '' : 's'}</span>` : ''}</button>`;
  }).join('');
  const dayEvents = events.filter(e => e.date === selectedDay);
  $('#calendar-detail').innerHTML = `<h4>${formatDate(selectedDay, { weekday: 'long', year: 'numeric' })}</h4>${dayEvents.length ? dayEvents.map(eventHTML).join('') : '<p class="empty">No planned items on this day. Give a task this date or edit your move dates.</p>'}`;
}
function activate(tab, focus = false) {
  view = tab;
  $$('[data-tab]').forEach(b => { b.setAttribute('aria-selected', String(b.dataset.tab === tab)); b.tabIndex = b.dataset.tab === tab ? 0 : -1; });
  $$('[role=tabpanel]').forEach(p => { p.hidden = p.id !== `view-${tab}`; });
  if (focus) $(`#tab-${tab}`).focus();
}
function showDialog(title, html, action, label = 'Save') {
  returnFocus = document.activeElement;
  $('#dialog-title').textContent = title; $('#dialog-body').innerHTML = html;
  $('#dialog-error').textContent = ''; $('#confirm-dialog').textContent = label;
  $('#confirm-dialog').hidden = !action; dialogAction = action;
  $('#editor').showModal();
  // Focus the first editable field, otherwise the close button; avoid auto-selecting a destructive action.
  const first = $('#dialog-body').querySelector('input,select,textarea');
  (first || $('#close-dialog')).focus();
}
function closeDialog() { $('#editor').close(); if (returnFocus?.isConnected) returnFocus.focus(); else $(`#tab-${view}`).focus(); }
$('#close-dialog').addEventListener('click', closeDialog);
$('#cancel-dialog').addEventListener('click', closeDialog);
$('#editor').addEventListener('cancel', () => { if (returnFocus?.isConnected) returnFocus.focus(); });
$('#editor-form').addEventListener('submit', e => {
  e.preventDefault(); if (!dialogAction) return;
  try { dialogAction(new FormData(e.currentTarget)); } catch (err) { $('#dialog-error').textContent = err.message; }
});
function editDates() {
  showDialog('Your move dates', `<p class="dialog-copy">Enter your own dates. A requested arrangement may still need confirmation. These dates do not establish authorizations or military deadlines.</p><div class="field-grid">${MILESTONES.map(m => `<label class="field">${m.label}<input type="date" name="${m.key}" value="${plan.dates[m.key]}" min="1900-01-01" max="2100-12-31"></label>`).join('')}</div><p class="dialog-copy">Blank means unknown. Confirm the report date with your unit.</p>`, data => {
    const dates = Object.fromEntries(MILESTONES.map(m => [m.key, data.get(m.key)]));
    const error = dateError(dates); if (error) throw new Error(error);
    plan.dates = dates; commit('Move dates updated across your plan.'); closeDialog();
  });
}
function editTask(id = '') {
  const t = plan.tasks.find(t => t.id === id);
  if (!t && plan.tasks.length >= 200) { status('This plan supports up to 200 tasks. Remove a task before adding another.'); return; }
  showDialog(t ? 'Edit your task' : 'Add a task', `<label class="field">Task<input name="title" maxlength="160" required value="${escape(t?.title || '')}" placeholder="What is your next step?"></label><div class="field-grid"><label class="field">Category<select name="category">${CATEGORIES.map(c => `<option ${c === (t?.category || (category === 'All' ? 'Orders' : category)) ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label class="field">Your target date · optional<input name="due" type="date" min="1900-01-01" max="2100-12-31" value="${t?.due || ''}"></label></div><label class="field">Questions or notes · optional<textarea name="notes" maxlength="1000" placeholder="Brief questions for your next conversation">${escape(t?.notes || '')}</textarea></label><p class="dialog-copy">Keep account numbers and personal documents in your own records.</p>${t ? '<button type="button" class="text-button danger" id="delete-task">Remove this task</button>' : ''}`, data => {
    const title = String(data.get('title')).trim(); if (!title) throw new Error('Enter a task title.');
    const updated = { id: t?.id || `custom-${crypto.randomUUID()}`, title, category: data.get('category'), due: data.get('due'), reviewed: t?.reviewed || false, notes: String(data.get('notes')).trim() };
    const candidate = { ...plan, tasks: t ? plan.tasks.map(item => item.id === t.id ? updated : item) : [...plan.tasks, updated] };
    plan = validatePlan(candidate); commit(t ? 'Task updated across your plan.' : 'Task added to your plan.'); closeDialog();
  });
  if (t) $('#delete-task').addEventListener('click', () => {
    // A second explicit step avoids deleting a task while the user is editing it.
    $('#editor').close();
    showDialog('Remove this task?', `<p class="dialog-copy">Remove “${escape(t.title)}” and its date and notes from this plan? Download a copy first if you need to keep them.</p>`, () => {
      plan.tasks = plan.tasks.filter(item => item.id !== t.id); commit('Task removed.'); closeDialog();
    }, 'Remove task');
  });
}
function replacePlan(next, title, text) {
  showDialog(title, `<p class="dialog-copy">${text} This replaces the plan currently open${saved ? ' and updates its saved copy on this browser' : ''}. Download it first if you need to keep it.</p>`, () => {
    plan = next; category = 'All'; selectedDay = next.dates.departure || todayKey();
    year = Number(selectedDay.slice(0, 4)); month = Number(selectedDay.slice(5, 7)) - 1;
    commit(next.example ? 'Example loaded. All dates and task checks are illustrative.' : 'Your plan is ready.'); closeDialog(); activate('overview');
  }, 'Continue');
}
function downloadFile(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  status('Download requested. Check your browser’s downloads.');
}
$('#download').addEventListener('click', () => {
  showDialog('Take your plan with you', '<p class="dialog-copy">Keep a readable summary or a plan file you can import later. Downloads may include your notes.</p><div class="download-options"><button type="button" class="outline" id="download-text">↓ Readable summary (.txt)<small>Dates, tasks, review status, and questions.</small></button><button type="button" class="outline" id="download-json">↓ Editable plan (.json)<small>Import this file to continue your plan in another browser.</small></button><button type="button" class="outline" id="print">Print / save as PDF<small>Use your browser’s print destination to create a PDF.</small></button></div>', null);
  $('#download-text').addEventListener('click', () => downloadFile(summaryText(plan), 'PCSUnited-my-PCS-plan.txt', 'text/plain;charset=utf-8'));
  $('#download-json').addEventListener('click', () => downloadFile(JSON.stringify(plan, null, 2), 'PCSUnited-my-PCS-plan.json', 'application/json'));
  $('#print').addEventListener('click', () => {
    $('#print-plan').replaceChildren();
    const title = document.createElement('h1'); title.textContent = 'PCSUnited · My PCS Plan';
    const pre = document.createElement('pre'); pre.textContent = summaryText(plan);
    $('#print-plan').append(title, pre); closeDialog(); window.print();
  });
});
$('#import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  try {
    if (file.size > 512000) throw new Error('Choose a plan file smaller than 500 KB.');
    let data; try { data = JSON.parse(await file.text()); } catch { throw new Error('Choose a valid PCS Tracker JSON plan file.'); }
    const next = validatePlan(data);
    replacePlan(next, 'Import this plan?', 'Only import a plan file you recognize.');
  } catch (err) { status(err.message); }
});
$('#example').addEventListener('click', () => replacePlan(examplePlan(), 'Explore an example?', 'Load an illustrative June 2027 plan to see how the tools connect.'));
$('#start-own').addEventListener('click', () => replacePlan(newPlan(), 'Start your own plan?', 'Clear the illustrative dates and task checks.'));
$('#reset').addEventListener('click', () => {
  showDialog('Reset this plan?', '<p class="dialog-copy">Clear your dates, task changes, notes, and any saved copy of this planner. The 12 sample tasks will return. Download your plan first if you need to keep it.</p>', () => {
    let removed = true; try { localStorage.removeItem(STORAGE_KEY); } catch { removed = false; }
    saved = false; plan = newPlan(); category = 'All'; selectedDay = todayKey();
    year = Number(selectedDay.slice(0, 4)); month = Number(selectedDay.slice(5, 7)) - 1;
    render(); activate('overview'); closeDialog();
    status(removed ? 'Plan reset. Device saving is off.' : 'The open plan was reset, but this browser could not remove its saved copy. Clear this site’s browser data to remove it.');
  }, 'Reset plan');
});
$('#save-device').addEventListener('change', e => {
  if (e.target.checked) {
    saved = true; persist(); storageNote();
    if (saved) status('Plan saved on this browser and device. Nothing was sent to a server.');
  } else {
    saved = false; let removed = true;
    try { localStorage.removeItem(STORAGE_KEY); } catch { removed = false; }
    storageNote(); status(removed ? 'Saved copy removed. Current entries remain open until reload.' : 'Saving is off, but the stored copy could not be removed. Clear this site’s browser data to remove it.');
  }
});
document.addEventListener('click', e => {
  const button = e.target.closest('button'); if (!button) return;
  if (button.dataset.tab) activate(button.dataset.tab);
  if (button.hasAttribute('data-go-tasks')) activate('tasks', true);
  if (button.hasAttribute('data-open-dates')) editDates();
  if (button.hasAttribute('data-add-task')) editTask();
  if (button.dataset.edit) editTask(button.dataset.edit);
  if (button.dataset.category) { category = button.dataset.category; const container = button.parentElement.id; render(); $(`#${container} [data-category="${category}"]`).focus(); }
  if (button.dataset.day) { selectedDay = button.dataset.day; renderCalendar(); $(`[data-day="${selectedDay}"]`).focus(); }
});
document.addEventListener('change', e => {
  if (e.target.dataset.check) {
    const t = plan.tasks.find(t => t.id === e.target.dataset.check); if (!t) return;
    const id = e.target.id; t.reviewed = e.target.checked; commit(`${t.title}: ${t.reviewed ? 'reviewed' : 'to review'}.`);
    // The overview can reorder tasks; keep keyboard focus on the same task when present.
    const fallback = view === 'overview' ? $('#overview-tasks input') : $(`#tab-${view}`);
    (document.getElementById(id) || fallback)?.focus();
  }
});
$('.tabs').addEventListener('keydown', e => {
  const tabs = $$('[data-tab]'); const index = tabs.indexOf(e.target); if (index < 0) return;
  const next = e.key === 'ArrowRight' ? (index + 1) % tabs.length : e.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
  if (next >= 0) { e.preventDefault(); activate(tabs[next].dataset.tab, true); }
});
function setMonth(offset) {
  const d = new Date(Date.UTC(year, month + offset, 1));
  if (d.getUTCFullYear() < 1900 || d.getUTCFullYear() > 2100) return;
  year = d.getUTCFullYear(); month = d.getUTCMonth();
  selectedDay = `${year}-${String(month + 1).padStart(2, '0')}-01`; renderCalendar();
}
$('#prev-month').addEventListener('click', () => setMonth(-1));
$('#next-month').addEventListener('click', () => setMonth(1));
$('#today').addEventListener('click', () => { selectedDay = todayKey(); year = Number(selectedDay.slice(0, 4)); month = Number(selectedDay.slice(5, 7)) - 1; renderCalendar(); });
$('#calendar-days').addEventListener('keydown', e => {
  const date = e.target.dataset.day; if (!date) return;
  const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
  if (!offset) return;
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset);
  const key = d.toISOString().slice(0, 10); if (!validDate(key)) return;
  e.preventDefault(); selectedDay = key; year = d.getUTCFullYear(); month = d.getUTCMonth();
  renderCalendar(); $(`[data-day="${key}"]`).focus();
});

// Only frame dimensions cross the embedding boundary; plan data never does.
let lastHeight = 0;
window.addEventListener('message', event => {
  if (!embedded || !parentOrigin || event.source !== window.parent || event.origin !== parentOrigin) return;
  const data = event.data;
  if (!data || data.type !== 'pcsunited:pcs-tracker:viewport' || data.version !== 1 || !Number.isFinite(data.top) || !Number.isFinite(data.height)) return;
  document.documentElement.style.setProperty('--dialog-top', `${Math.max(16, Math.min(200000, data.top))}px`);
  document.documentElement.style.setProperty('--dialog-height', `${Math.max(180, Math.min(2000, data.height))}px`);
});
function reportHeight() {
  if (!embedded || !parentOrigin || window.parent === window) return;
  const height = Math.ceil(document.body.getBoundingClientRect().height);
  if (height !== lastHeight) { lastHeight = height; window.parent.postMessage({ type: 'pcsunited:pcs-tracker:resize', version: 1, height }, parentOrigin); }
}
render(); activate(view);
if (saved) {
  selectedDay = plan.dates.departure || todayKey(); year = Number(selectedDay.slice(0, 4)); month = Number(selectedDay.slice(5, 7)) - 1; renderCalendar();
}
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(reportHeight).observe(document.body);
window.addEventListener('resize', reportHeight);
reportHeight();
