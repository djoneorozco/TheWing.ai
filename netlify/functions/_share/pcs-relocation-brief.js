// Selected-allowance composition for the public Relocation Brief.
// Reuses official PCS modules; no UI, storage, network, or entitlement tables here.
// The opt-in API mode preserves the existing PCS Calculator/Snapshot contract.
import { calculatePcsMoveEstimate } from './pcs-move-engine.js';
import { normalizeRank, DLA_RATES, DLA_SOURCE_URL } from './official-dla.js';
import { calculatePcsPerDiem, PCS_PER_DIEM_RATES, PCS_PER_DIEM_SOURCE_URLS } from './official-pcs-per-diem.js';

export const RELOCATION_BRIEF_SCHEMA = 'pcs-relocation-brief.v1';
export class RelocationInputError extends Error {}
const fail = message => { throw new RelocationInputError(message); };
const money = n => Math.round((n + Number.EPSILON) * 100) / 100;
function numeric(value, name, min, max, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(`Enter a valid ${name} from ${min} to ${max}.`);
  return value;
}
function flag(value, name) {
  if (typeof value !== 'boolean') fail(`Choose ${name}.`);
  return value;
}

export function normalizeRelocationInput(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('Provide your relocation inputs.');
  const rank = typeof raw.rank === 'string' ? normalizeRank(raw.rank) : '';
  if (!Object.hasOwn(DLA_RATES[2026].withDependents, rank)) fail('Choose a supported pay grade.');
  const hasDependents = flag(raw.hasDependents, 'your dependency status');
  const includeDla = flag(raw.includeDla, 'whether to include primary DLA');
  const includePerDiem = flag(raw.includePerDiem, 'whether to include en-route per diem');
  if (raw.travelMode !== 'conus-pov') fail('This brief supports driving within the contiguous U.S. only.');
  const travelDate = raw.travelDate;
  if (typeof travelDate !== 'string' || !/^2026-\d{2}-\d{2}$/.test(travelDate)) fail('Choose a travel date in 2026. Later calendar-year DLA and mileage rates are not loaded.');
  const parsed = new Date(travelDate + 'T00:00:00.000Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== travelDate) fail('Choose a valid calendar date.');
  const dependents12Plus = includePerDiem ? numeric(raw.dependents12Plus, 'number of dependents age 12+', 0, 20, true) : 0;
  const dependentsUnder12 = includePerDiem ? numeric(raw.dependentsUnder12, 'number of dependents under 12', 0, 20, true) : 0;
  if (!hasDependents && (dependents12Plus || dependentsUnder12)) fail('Accompanying dependents require with-dependents status.');
  return {
    estimateMode: 'relocation-brief', rank, hasDependents, includeDla, includePerDiem,
    travelMode: 'conus-pov', travelDate,
    distanceMiles: numeric(raw.distanceMiles, 'authorized mileage', 1, 20000, true),
    povs: numeric(raw.povs, 'number of authorized vehicles', 1, 2, true),
    estimatedExpenses: money(numeric(raw.estimatedExpenses, 'projected total expense amount', 0, 1000000)),
    dependents12Plus, dependentsUnder12,
    plannedDrivingDays: raw.plannedDrivingDays == null ? null : numeric(raw.plannedDrivingDays, 'number of planned driving days', 1, 60, true)
  };
}

export function calculateRelocationBrief(raw) {
  const input = normalizeRelocationInput(raw);
  const calendarYear = Number(input.travelDate.slice(0,4));
  const fiscalYear = calendarYear + (Number(input.travelDate.slice(5,7)) >= 10 ? 1 : 0);
  const base = calculatePcsMoveEstimate({ ...input, year: calendarYear });
  if (!base.malt.ok || !base.travelDays.ok || (input.includeDla && !base.dla.available)) fail('A selected allowance is unavailable for this profile or date.');
  const usedTravelDays = Math.min(input.plannedDrivingDays ?? base.travelDays.days, base.travelDays.days);
  const end = new Date(input.travelDate + 'T00:00:00.000Z');
  end.setUTCDate(end.getUTCDate() + (input.plannedDrivingDays ?? base.travelDays.days) - 1);
  const endDate = end.toISOString().slice(0,10);
  // This compact single-period form cannot allocate mileage across rate periods.
  // Require review rather than quietly applying one rate to a mixed-period trip.
  if (endDate > base.malt.rateEffectiveTo || (input.includePerDiem && endDate > `${fiscalYear}-09-30`)) fail('This trip crosses a rate change. Confirm a split-period estimate with your finance office.');
  if (input.includePerDiem && !Object.hasOwn(PCS_PER_DIEM_RATES, fiscalYear)) fail('Per diem rates are unavailable for this travel date.');
  const perDiem = input.includePerDiem ? calculatePcsPerDiem({
    travelDays: usedTravelDays, hasDependents: input.hasDependents,
    dependents12Plus: input.dependents12Plus, dependentsUnder12: input.dependentsUnder12,
    year: fiscalYear, assumeDependentsFromFamily: false
  }) : null;
  if (input.includePerDiem && !perDiem?.available) fail('The selected per diem estimate is unavailable.');
  const allowances = {
    dla: input.includeDla ? base.dla.amount : 0,
    malt: base.malt.totalAmount,
    perDiem: perDiem?.amount ?? 0
  };
  allowances.total = money(allowances.dla + allowances.malt + allowances.perDiem);
  const net = money(allowances.total - input.estimatedExpenses);
  return {
    schema: RELOCATION_BRIEF_SCHEMA, input, allowances, estimatedExpenses: input.estimatedExpenses,
    net, outcome: net < 0 ? 'gap' : net > 0 ? 'surplus' : 'break-even',
    mileageBasedTravelDays: base.travelDays.days, usedTravelDays,
    daysCapped: input.plannedDrivingDays !== null && input.plannedDrivingDays > base.travelDays.days,
    travelers: perDiem?.travelers ?? null,
    perDiem: perDiem ? { fiscalYear, rates: perDiem.rates, breakdown: perDiem.breakdown } : null,
    malt: { ratePerMile: base.malt.ratePerMile, effectiveFrom: base.malt.rateEffectiveFrom, effectiveTo: base.malt.rateEffectiveTo },
    sources: {
      calendarYear, perDiemFiscalYear: input.includePerDiem ? fiscalYear : null,
      versions: base.version, dla: DLA_SOURCE_URL, malt: base.malt.sourceUrl,
      perDiem: input.includePerDiem ? PCS_PER_DIEM_SOURCE_URLS[fiscalYear] : null,
      rules: 'https://www.dfas.mil/militarymembers/travelpay/armypcs/En-Route-Travel/'
    },
    exclusions: ['TLE', 'PPM', 'other reimbursements'],
    assumptions: ['One service member driving within the contiguous U.S.', 'Entered mileage must match the authorized route.', 'Only accompanying authorized dependents are counted.', 'Primary DLA is included only when selected; dependency status does not establish eligibility.', 'Payment timing and eligibility may differ from this planning estimate.']
  };
}
