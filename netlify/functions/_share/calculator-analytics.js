// First-party usage: immutable cumulative snapshots, not incrementing shared counters.
// Retried and out-of-order deliveries are deduplicated when the report is read.
const APPS = [{id:'pt',name:'PT Calculator'}, {id:'disability',name:'Disability Rating'}, {id:'va',name:'VA & Retirement'}];
const DAY = 86400000;
const PREFIXES = ['usage-v1/', 'usage-v2/'];
class UsageError extends Error { constructor(code) { super(code); this.code = code; } }
function day(value) { return new Date(value).toISOString().slice(0,10); }
function validateSnapshot(data, now = Date.now()) {
  const fields = ['calculator','visit','startDay','revision','activities','activeMs','result','started'];
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(k => !fields.includes(k)) ||
      !APPS.some(a => a.id === data.calculator) || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(data.visit || '') ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.startDay || '') || typeof data.result !== 'boolean') throw new UsageError('INVALID_USAGE');
  const modern = Object.hasOwn(data,'started');
  if (modern && (typeof data.started !== 'boolean' || (!data.started && (data.result || data.activities || data.activeMs)))) throw new UsageError('INVALID_USAGE');
  const timestamp = Date.parse(data.startDay + 'T00:00:00Z');
  if (!Number.isFinite(timestamp) || day(timestamp) !== data.startDay || timestamp > Date.parse(day(now)) || timestamp < Date.parse(day(now)) - 30*DAY) throw new UsageError('INVALID_USAGE');
  for (const [name,max] of [['revision',1000000],['activities',100000],['activeMs',DAY]]) {
    if (!Number.isSafeInteger(data[name]) || data[name] < (name === 'revision' && !modern ? 1 : 0) || data[name] > max) throw new UsageError('INVALID_USAGE');
  }
  return {calculator:data.calculator,visit:data.visit.toLowerCase(),startDay:data.startDay,
    revision:data.revision,activities:data.activities,activeMs:data.activeMs,result:data.result,...(modern?{started:data.started}:{})};
}
function snapshotKey(d) {
  const modern=Object.hasOwn(d,'started');
  return `usage-v${modern?2:1}/${d.startDay}/${d.calculator}/${d.visit}/${d.revision}-${d.activities}-${d.activeMs}-${d.result ? 1 : 0}${modern?'-'+(d.started?1:0):''}`;
}
async function recordUsage(store, input, now = Date.now()) {
  const d = validateSnapshot(input, now);
  const key = snapshotKey(d);
  const result = await store.setJSON(key, d);
  if (!result || typeof result.modified !== 'boolean') throw new UsageError('STORAGE_UNAVAILABLE');
  return {accepted:true,revision:d.revision};
}
function dateRange(period, now = Date.now()) {
  const end = Date.parse(day(now));
  const ranges = {today:[end,end],yesterday:[end-DAY,end-DAY],last7:[end-6*DAY,end],last30:[end-29*DAY,end]};
  if (!Object.hasOwn(ranges,period)) throw new UsageError('INVALID_FILTER');
  const [from,to] = ranges[period];
  const dates=[]; for(let t=from;t<=to;t+=DAY) dates.push(day(t));
  return dates;
}
function parseKey(key) {
  const match = /^usage-v([12])\/(\d{4}-\d{2}-\d{2})\/(pt|disability|va)\/([a-f0-9-]{36})\/(\d+)-(\d+)-(\d+)-([01])(?:-([01]))?$/.exec(key);
  if (!match) throw new UsageError('STORAGE_INVALID');
  const [,version,startDay,calculator,visit,revision,activities,activeMs,result,started] = match;
  if ((version==='2') !== (started!==undefined)) throw new UsageError('STORAGE_INVALID');
  return {startDay,calculator,visit,revision:Number(revision),activities:Number(activities),activeMs:Number(activeMs),
    result:result==='1',started:version==='1'||started==='1',modern:version==='2'};
}
async function readUsage(store, period = 'today', now = Date.now()) {
  const dates = dateRange(period,now), latest = new Map();
  let entries=0;
  // Listing keys is enough: no per-snapshot network reads or shared counter updates.
  for (const date of dates) for (const prefix of PREFIXES) {
    for await (const page of store.list({prefix:prefix+date+'/',paginate:true})) {
      if (!Array.isArray(page.blobs)) throw new UsageError('STORAGE_INVALID');
      for (const blob of page.blobs) {
        if (++entries>50000) throw new UsageError('REPORT_TOO_LARGE');
        const data = parseKey(blob.key);
        if (data.startDay !== date) throw new UsageError('STORAGE_INVALID');
        const identity = `${data.startDay}/${data.calculator}/${data.visit}`;
        const previous = latest.get(identity);
        if (!previous || (data.modern && !previous.modern) || (data.modern===previous.modern && data.revision>previous.revision)) latest.set(identity,data);
      }
    }
  }
  const calculators = APPS.map(app => {
    const visits=[...latest.values()].filter(v=>v.calculator===app.id);
    const used=visits.filter(v=>v.started), tracked=visits.filter(v=>v.modern), trackedUsed=tracked.filter(v=>v.started);
    const activeSeconds=used.reduce((sum,v)=>sum+v.activeMs,0)/1000;
    const trackedSeconds=trackedUsed.reduce((sum,v)=>sum+v.activeMs,0)/1000;
    return {...app,status:used.length?'recorded':tracked.length?'loaded_only':'no_recorded_usage',sessions:used.length,
      loads:tracked.length,trackedSessions:trackedUsed.length,loadOnly:tracked.length-trackedUsed.length,
      legacySessions:used.filter(v=>!v.modern).length,
      legacyActiveSeconds:activeSeconds-trackedSeconds,
      trackedResults:trackedUsed.filter(v=>v.result).length,
      trackedAdjustments:trackedUsed.reduce((sum,v)=>sum+v.activities,0),
      trackedActiveSeconds:trackedSeconds,trackedAverageActiveSeconds:trackedUsed.length?trackedSeconds/trackedUsed.length:null,
      usageRate:tracked.length?trackedUsed.length/tracked.length:null,
      adjustments:used.reduce((sum,v)=>sum+v.activities,0),results:used.filter(v=>v.result).length,
      activeSeconds,averageActiveSeconds:used.length?activeSeconds/used.length:null};
  });
  return {source:'thewing',schemaVersion:2,storageConnected:true,fetchedAt:new Date(now).toISOString(),timeZone:'UTC',period,
    startDate:dates[0],endDate:dates.at(-1),calculators};
}
module.exports={recordUsage,readUsage,validateSnapshot,dateRange,UsageError};
