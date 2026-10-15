// Read-only GA4 adapter. No calculator inputs, identities, or credentials are returned.
const { createSign } = require('node:crypto');
const API = 'https://analyticsdata.googleapis.com/v1beta';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALCULATORS = [
  { id: 'pt', name: 'PT Calculator', path: '/air-force/pt-calculator.html' },
  { id: 'disability', name: 'Disability Rating', path: '/air-force/disability-calculator.html' }
];
const EVENTS = ['calculator_start', 'calculator_result', 'calculator_activity', 'calculator_error'];
const CUSTOM = ['customEvent:activity_count', 'customEvent:active_msec'];
const PERIODS = {
  yesterday: ['yesterday', 'yesterday'],
  today: ['today', 'today'],
  last7: ['7daysAgo', 'yesterday'],
  last30: ['30daysAgo', 'yesterday']
};
class ReportError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const exact = (fieldName, value) => ({ filter: { fieldName, stringFilter: { matchType: 'EXACT', value, caseSensitive: true } } });
const oneOf = (fieldName, values) => ({ filter: { fieldName, inListFilter: { values, caseSensitive: true } } });
const all = expressions => ({ andGroup: { expressions } });

function queryOptions(period, traffic) {
  if (!Object.hasOwn(PERIODS, period) || !['all', 'google-paid'].includes(traffic)) throw new ReportError('INVALID_FILTER');
  const [startDate, endDate] = PERIODS[period];
  return { period, traffic, dateRanges: [{ startDate, endDate }] };
}

function buildQueries(options) {
  const common = [oneOf('hostName', ['thewing.ai', 'www.thewing.ai'])];
  if (options.traffic === 'google-paid') common.push(exact('sessionSource', 'google'), exact('sessionMedium', 'cpc'));
  const request = (dimensions, metrics, filters) => ({
    dateRanges: options.dateRanges,
    dimensions: dimensions.map(name => ({ name })), metrics: metrics.map(name => ({ name })),
    dimensionFilter: all([...common, ...filters]), limit: '100', keepEmptyRows: false
  });
  return CALCULATORS.flatMap(c => [
    request([], ['totalUsers', 'eventCount'], [exact('pagePath', c.path), exact('eventName', 'page_view')]),
    request(['eventName'], ['totalUsers', 'eventCount', ...CUSTOM], [
      exact('pagePath', c.path), exact('customEvent:calculator_id', c.id), oneOf('eventName', EVENTS)
    ])
  ]);
}

function rows(report, expectedMetrics, expectedDimensions) {
  if (!report || !Array.isArray(report.metricHeaders) || !Array.isArray(report.dimensionHeaders || [])) throw new ReportError('REPORT_INVALID');
  if (report.metricHeaders.map(x => x.name).join('|') !== expectedMetrics.join('|') ||
      (report.dimensionHeaders || []).map(x => x.name).join('|') !== expectedDimensions.join('|')) throw new ReportError('REPORT_INVALID');
  const raw = report.rows || [];
  if (!Array.isArray(raw) || (report.rowCount || 0) !== raw.length) throw new ReportError('REPORT_INCOMPLETE');
  return raw.map(row => {
    if (!Array.isArray(row.metricValues) || row.metricValues.length !== expectedMetrics.length ||
        (row.dimensionValues || []).length !== expectedDimensions.length) throw new ReportError('REPORT_INVALID');
    const numbers = row.metricValues.map(x => {
      if (typeof x.value !== 'string' || !/^\d+(?:\.\d+)?$/.test(x.value)) throw new ReportError('REPORT_INVALID');
      const n = Number(x.value);
      if (!Number.isFinite(n) || n > Number.MAX_SAFE_INTEGER) throw new ReportError('REPORT_INVALID');
      return n;
    });
    return { dimensions: (row.dimensionValues || []).map(x => x.value), numbers };
  });
}

function assemble(reports, options, now = new Date()) {
  if (!Array.isArray(reports) || reports.length !== 4) throw new ReportError('REPORT_INVALID');
  const warnings = new Set(['Recent data can take 24–48 hours to finish processing. Missing events do not prove that people left without using the calculator.']);
  let timeZone = null;
  for (const r of reports) {
    const m = r.metadata || {};
    if (m.timeZone) {
      if (timeZone && timeZone !== m.timeZone) throw new ReportError('REPORT_INVALID');
      timeZone = m.timeZone;
    }
    if (m.subjectToThresholding || m.dataLossFromOtherRow || m.samplingMetadatas?.length || m.schemaRestrictionResponse) {
      warnings.add('Google flagged a reporting limitation. These totals may be incomplete or sampled.');
    }
  }
  const calculators = CALCULATORS.map((c, index) => {
    const viewRows = rows(reports[index * 2], ['totalUsers', 'eventCount'], []);
    if (viewRows.length > 1) throw new ReportError('REPORT_INVALID');
    const usageReport = reports[index * 2 + 1];
    const eventRows = rows(usageReport, ['totalUsers', 'eventCount', ...CUSTOM], ['eventName']);
    const timeType = usageReport.metricHeaders[3].type;
    if (!['TYPE_MILLISECONDS', 'TYPE_STANDARD', 'TYPE_INTEGER', 'TYPE_FLOAT'].includes(timeType)) throw new ReportError('TIME_UNIT_INVALID');
    const byEvent = new Map();
    for (const row of eventRows) {
      const name = row.dimensions[0];
      if (!EVENTS.includes(name) || byEvent.has(name)) throw new ReportError('REPORT_INVALID');
      byEvent.set(name, row.numbers);
    }
    const start = byEvent.get('calculator_start');
    const result = byEvent.get('calculator_result');
    const activity = byEvent.get('calculator_activity');
    const error = byEvent.get('calculator_error');
    const hasEvents = eventRows.some(row => row.numbers[1] > 0);
    // These zeros mean no matching rows in a successful report, not verified non-use.
    const startedUsers = start?.[0] || 0;
    const activeMs = activity?.[3] || 0;
    return {
      ...c, status: hasEvents ? 'recorded' : 'no_recorded_usage',
      pageUsers: viewRows[0]?.numbers[0] || 0, pageViews: viewRows[0]?.numbers[1] || 0,
      startedUsers, resultUsers: result?.[0] || 0,
      starts: start?.[1] || 0, results: result?.[1] || 0,
      adjustments: activity?.[2] || 0, activeSeconds: activeMs / 1000,
      averageActiveSeconds: startedUsers > 0 ? activeMs / 1000 / startedUsers : null,
      validationEvents: error?.[1] || 0,
      hasTimeEvents: Boolean(activity && activity[1] > 0)
    };
  });
  return { fetchedAt: now.toISOString(), timeZone, period: options.period, traffic: options.traffic,
    dateRanges: options.dateRanges, warnings: [...warnings], calculators };
}

function createReader({ fetchImpl = fetch, now = () => Date.now() } = {}) {
  let cachedToken = null;
  async function json(url, init, stage) {
    let response;
    try { response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(12000) }); }
    catch (_) { throw new ReportError('GOOGLE_UNAVAILABLE'); }
    if (!response.ok) {
      if (stage === 'token') throw new ReportError('GOOGLE_AUTH_FAILED');
      if ([401, 403].includes(response.status)) throw new ReportError('GOOGLE_ACCESS_DENIED');
      if (response.status === 400) throw new ReportError('QUERY_REJECTED');
      throw new ReportError('GOOGLE_UNAVAILABLE');
    }
    try { return await response.json(); } catch (_) { throw new ReportError('REPORT_INVALID'); }
  }
  async function token(credentialsText) {
    if (cachedToken?.credentialsText === credentialsText && cachedToken.expires > now() + 60000) return cachedToken.value;
    let credentials;
    try { credentials = JSON.parse(credentialsText); } catch (_) { throw new ReportError('SERVER_SETUP_REQUIRED'); }
    if (!credentials || credentials.type !== 'service_account' || !credentials.client_email?.endsWith('.gserviceaccount.com') ||
        typeof credentials.private_key !== 'string') throw new ReportError('SERVER_SETUP_REQUIRED');
    const base64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const issued = Math.floor(now() / 1000);
    const input = `${base64({ alg: 'RS256', typ: 'JWT' })}.${base64({ iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: TOKEN_URL, iat: issued, exp: issued + 3600 })}`;
    let signature;
    try { signature = createSign('RSA-SHA256').update(input).sign(credentials.private_key, 'base64url'); }
    catch (_) { throw new ReportError('SERVER_SETUP_REQUIRED'); }
    const data = await json(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${input}.${signature}` }).toString() }, 'token');
    if (typeof data.access_token !== 'string' || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new ReportError('GOOGLE_AUTH_FAILED');
    cachedToken = { credentialsText, value: data.access_token, expires: now() + data.expires_in * 1000 };
    return data.access_token;
  }
  return async function read({ propertyId, credentialsText, period, traffic }) {
    const options = queryOptions(period, traffic);
    if (!/^\d+$/.test(propertyId) || !credentialsText) throw new ReportError('SERVER_SETUP_REQUIRED');
    const accessToken = await token(credentialsText);
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
    const metadata = await json(`${API}/properties/${propertyId}/metadata`, { headers });
    if (!Array.isArray(metadata.dimensions) || !Array.isArray(metadata.metrics)) throw new ReportError('REPORT_INVALID');
    if (!metadata.dimensions.some(d => d.apiName === 'customEvent:calculator_id') ||
        !CUSTOM.every(name => metadata.metrics.some(m => m.apiName === name))) throw new ReportError('DEFINITIONS_REQUIRED');
    const data = await json(`${API}/properties/${propertyId}:batchRunReports`, {
      method: 'POST', headers, body: JSON.stringify({ requests: buildQueries(options) })
    });
    return assemble(data.reports, options, new Date(now()));
  };
}

module.exports = { createReader, queryOptions, buildQueries, assemble, ReportError };
