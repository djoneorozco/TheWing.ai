// Selected-allowance composition for the public Relocation Brief.
// Reuses official PCS modules; no UI, storage, network, or entitlement tables here.
// The opt-in API mode preserves the existing PCS Calculator/Snapshot contract.
import { calculatePcsMoveEstimate } from './pcs-move-engine.js';
import { normalizeRank, getDlaAmount, DLA_RATES, DLA_SOURCE_URL } from './official-dla.js';
import { calculatePcsPerDiem, PCS_PER_DIEM_RATES, PCS_PER_DIEM_SOURCE_URLS } from './official-pcs-per-diem.js';

export const RELOCATION_BRIEF_SCHEMA = 'pcs-relocation-brief.v1';
export class RelocationInputError extends Error {}
const fail = message => { throw new RelocationInputError(message); };
const money = n => Math.round((n + Number.EPSILON) * 100) / 100;
export const RELOCATION_ACCURACY_VERSION = 2;
function numeric(value, name, min, max, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(`Enter a valid ${name} from ${min} to ${max}.`);
  return value;
}
function flag(value, name) {
  if (typeof value !== 'boolean') fail(`Choose ${name}.`);
  return value;
}
function dateInLoadedYear(value, name) {
  if (typeof value !== 'string' || !/^2026-\d{2}-\d{2}$/.test(value)) fail(`Choose a ${name} in 2026. Later calendar-year DLA and mileage rates are not loaded.`);
  const parsed = new Date(value + 'T00:00:00.000Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail(`Choose a valid ${name}.`);
  return value;
}
function payGrade(value, name) {
  const rank = typeof value === 'string' ? normalizeRank(value) : '';
  if (!Object.hasOwn(DLA_RATES[2026].withDependents, rank)) fail(`Choose a supported ${name}.`);
  return rank;
}

// Version 2 is opt-in so existing Snapshot/API consumers keep their contract.
// Neither an entered mileage value nor a DLA confirmation is an official adjudication.
function accuracyInputs(raw, includeDla) {
  if (raw.accuracyVersion === undefined) return {};
  if (raw.accuracyVersion !== RELOCATION_ACCURACY_VERSION) fail('This estimate version is not supported. Reload the calculator.');
  if (!['entered_authorized', 'estimated_driving'].includes(raw.distanceSource)) fail('Choose whether mileage is authorized or an estimated driving distance.');
  if (!['unknown', 'confirmed', 'excluded'].includes(raw.dlaEligibility)) fail('Choose your primary DLA eligibility status.');
  if (includeDla !== (raw.dlaEligibility === 'confirmed')) fail('Primary DLA can only be included after you confirm eligibility.');
  if (raw.travelersTogether !== true) fail('This estimate supports authorized dependents traveling with the member only. Separate or mixed-mode travel needs a separate estimate.');
  return {
    accuracyVersion: RELOCATION_ACCURACY_VERSION,
    distanceSource: raw.distanceSource,
    travelersTogether: true,
    dlaEligibility: raw.dlaEligibility,
    dlaEffectiveDate: includeDla ? dateInLoadedYear(raw.dlaEffectiveDate, 'PCS order effective date') : null,
    dlaRank: includeDla ? payGrade(raw.dlaRank, 'pay grade on the PCS order effective date') : null,
    dlaHasDependents: includeDla ? flag(raw.dlaHasDependents, 'dependency status on the PCS order effective date') : null
  };
}

export function normalizeRelocationInput(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('Provide your relocation inputs.');
  const rank = payGrade(raw.rank, 'pay grade');
  const hasDependents = flag(raw.hasDependents, 'your dependency status');
  const includeDla = flag(raw.includeDla, 'whether to include primary DLA');
  const includePerDiem = flag(raw.includePerDiem, 'whether to include en-route per diem');
  if (raw.travelMode !== 'conus-pov') fail('This brief supports driving within the contiguous U.S. only.');
  const travelDate = dateInLoadedYear(raw.travelDate, 'travel date');
  const accuracy = accuracyInputs(raw, includeDla);
  const dependents12Plus = includePerDiem ? numeric(raw.dependents12Plus, 'number of dependents age 12+', 0, 20, true) : 0;
  const dependentsUnder12 = includePerDiem ? numeric(raw.dependentsUnder12, 'number of dependents under 12', 0, 20, true) : 0;
  if (!hasDependents && (dependents12Plus || dependentsUnder12)) fail('Accompanying dependents require with-dependents status.');
  return {
    estimateMode: 'relocation-brief', rank, hasDependents, includeDla, includePerDiem,
    travelMode: 'conus-pov', travelDate,
    ...accuracy,
    distanceMiles: numeric(raw.distanceMiles, 'mileage', 1, 20000, true),
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
  const isV2 = input.accuracyVersion === RELOCATION_ACCURACY_VERSION;
  const dlaYear = input.includeDla && isV2 ? Number(input.dlaEffectiveDate.slice(0,4)) : calendarYear;
  const dla = input.includeDla && isV2 ? getDlaAmount({ rank: input.dlaRank, hasDependents: input.dlaHasDependents, year: dlaYear }) : base.dla;
  if (!base.malt.ok || !base.travelDays.ok || (input.includeDla && !dla.available)) fail('A selected allowance is unavailable for this profile or date.');
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
    dla: input.includeDla ? dla.amount : 0,
    malt: base.malt.totalAmount,
    perDiem: perDiem?.amount ?? 0
  };
  allowances.total = money(allowances.dla + allowances.malt + allowances.perDiem);
  const net = money(allowances.total - input.estimatedExpenses);
  const estimatedDistance = isV2 && input.distanceSource === 'estimated_driving';
  return {
    schema: RELOCATION_BRIEF_SCHEMA, input, allowances, estimatedExpenses: input.estimatedExpenses,
    accuracyVersion: isV2 ? RELOCATION_ACCURACY_VERSION : 1,
    distance: {
      miles: input.distanceMiles,
      source: isV2 ? input.distanceSource : 'entered_authorized',
      label: estimatedDistance ? 'Estimated driving distance' : 'Entered authorized mileage',
      verification: estimatedDistance ? 'planning_only' : 'user_entered_not_independently_verified'
    },
    dla: {
      eligibility: isV2 ? input.dlaEligibility : input.includeDla ? 'assumed' : 'excluded',
      included: input.includeDla,
      effectiveDate: isV2 ? input.dlaEffectiveDate : null,
      rank: input.includeDla ? dla.rank : null,
      hasDependents: input.includeDla ? dla.hasDependents : null,
      rateYear: input.includeDla ? dlaYear : null
    },
    net, outcome: net < 0 ? 'gap' : net > 0 ? 'surplus' : 'break-even',
    mileageBasedTravelDays: base.travelDays.days, usedTravelDays,
    daysCapped: input.plannedDrivingDays !== null && input.plannedDrivingDays > base.travelDays.days,
    travelers: perDiem?.travelers ?? null,
    perDiem: perDiem ? { fiscalYear, rates: perDiem.rates, breakdown: perDiem.breakdown } : null,
    malt: { ratePerMile: base.malt.ratePerMile, effectiveFrom: base.malt.rateEffectiveFrom, effectiveTo: base.malt.rateEffectiveTo },
    sources: {
      calendarYear, dlaCalendarYear: input.includeDla ? dlaYear : null, perDiemFiscalYear: input.includePerDiem ? fiscalYear : null,
      versions: base.version, dla: DLA_SOURCE_URL, malt: base.malt.sourceUrl,
      perDiem: input.includePerDiem ? PCS_PER_DIEM_SOURCE_URLS[fiscalYear] : null,
      rules: 'https://www.dfas.mil/militarymembers/travelpay/armypcs/En-Route-Travel/'
    },
    exclusions: ['TLE', 'PPM', 'other reimbursements'],
    assumptions: [
      'One service member driving within the contiguous U.S.',
      estimatedDistance ? 'Distance is a planning estimate. Mileage-based days and MALT must be recalculated using authorized mileage before claiming.' : 'Mileage was entered by the user from orders or a transportation office; this tool has not independently verified it through DTOD.',
      'Mileage-based travel days are a maximum, not an approval. Only accompanying authorized dependents are counted.',
      isV2 ? (input.dlaEligibility === 'confirmed' ? 'Primary DLA eligibility is confirmed by the user, not determined by this tool. The rate uses grade and dependency status on the entered PCS order effective date.' : input.dlaEligibility === 'unknown' ? 'Primary DLA eligibility is unconfirmed. DLA is excluded from the total, not assumed to be a zero entitlement.' : 'Primary DLA is excluded by the user.') : 'Primary DLA is included only when selected; dependency status does not establish eligibility.',
      'Payment timing and eligibility may differ from this planning estimate.'
    ]
  };
}
