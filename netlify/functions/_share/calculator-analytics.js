// Owner-only, read-only report endpoint. The access key must never be embedded in a page.
const { createHash, timingSafeEqual } = require('node:crypto');
const { createReader, queryOptions } = require('./_share/calculator-analytics');
const ORIGINS = new Set(['https://thewing.ai', 'https://www.thewing.ai', 'https://thewing.netlify.app']);
const MESSAGES = {
  SERVER_SETUP_REQUIRED: 'The server connection has not been configured. Follow the dashboard setup guide.',
  UNAUTHORIZED: 'Enter the owner access key to load analytics.',
  INVALID_FILTER: 'Choose one of the available date and traffic filters.',
  DEFINITIONS_REQUIRED: 'GA4 needs the calculator_id dimension and activity_count / active_msec metrics. Data is unavailable until setup and processing finish.',
  GOOGLE_AUTH_FAILED: 'Google could not authenticate the server. Check its service account settings.',
  GOOGLE_ACCESS_DENIED: 'Google denied report access. Enable the Analytics Data API and grant the service account Viewer access to this property.',
  GOOGLE_UNAVAILABLE: 'Google reporting is temporarily unavailable. Try again later.',
  QUERY_REJECTED: 'Google rejected this report. Check the custom definitions and metric compatibility before using these numbers.',
  REPORT_INVALID: 'Google returned an unexpected report. No totals are being shown.',
  REPORT_INCOMPLETE: 'The report was incomplete. No totals are being shown.',
  TIME_UNIT_INVALID: 'The active_msec metric must use milliseconds (or a standard raw number). Check its GA4 definition.',
  METHOD_NOT_ALLOWED: 'Use GET to read a report.',
  ORIGIN_DENIED: 'This page is not an allowed dashboard location.'
};
const digest = value => createHash('sha256').update(value).digest();
function createHandler({ env = process.env, read = createReader() } = {}) {
  return async event => {
    const requestHeaders = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const origin = requestHeaders.origin;
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', Vary: 'Origin',
      'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' };
    if (ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
    const fail = (status, code) => reply(status, { error: code, message: MESSAGES[code] });
    if (origin && !ORIGINS.has(origin)) return fail(403, 'ORIGIN_DENIED');
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
    if (event.httpMethod !== 'GET') return fail(405, 'METHOD_NOT_ALLOWED');
    const secret = env.THEWING_ANALYTICS_ADMIN_TOKEN;
    if (typeof secret !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/.test(secret)) return fail(503, 'SERVER_SETUP_REQUIRED');
    const auth = requestHeaders.authorization || '';
    if (typeof auth !== 'string' || !auth.startsWith('Bearer ') || auth.length > 140 ||
        !timingSafeEqual(digest(auth.slice(7)), digest(secret))) return fail(401, 'UNAUTHORIZED');
    const { period = 'last7', traffic = 'google-paid', ...extra } = event.queryStringParameters || {};
    try {
      if (Object.keys(extra).length) return fail(400, 'INVALID_FILTER');
      queryOptions(period, traffic);
      const report = await read({ period, traffic, propertyId: env.GA4_PROPERTY_ID || '549188579',
        credentialsText: env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON });
      return reply(200, report);
    } catch (error) {
      const code = Object.hasOwn(MESSAGES, error.code) ? error.code : 'REPORT_INVALID';
      return fail(code === 'INVALID_FILTER' ? 400 : 503, code);
    }
  };
}
exports.handler = createHandler();
exports.createHandler = createHandler;
