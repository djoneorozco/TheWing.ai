// official-pcs-travel-days.js
// ============================================================
// TheWing.ai • Official PCS Travel Days
// v1.0.0
//
// FILE
// - netlify/functions/_share/official-pcs-travel-days.js
//
// PURPOSE
// - Deterministic PCS authorized travel-day calculation from official distance
// - No UI logic
// - No localStorage
// - No per diem dollar math
//
// RULES (JTR-style PCS POV travel days)
// - 1 day for the first 400 miles
// - If distance is greater than 400 miles, divide the excess by 350
// - If the remainder is 51 miles or more, add one additional travel day
// - Return at least 1 day for valid PCS travel distance
//
// MODULE STYLE
// - ES Module exports for Netlify Functions with "type": "module"
// ============================================================

export const RULE_VERSION = "official-pcs-travel-days-2026.1";

const FIRST_SEGMENT_MILES = 400;
const ADDITIONAL_SEGMENT_MILES = 350;
const REMAINDER_THRESHOLD_MILES = 51;

// ============================================================
// //#1) HELPERS
// ============================================================

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === "") return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// ============================================================
// //#2) CALCULATION
// ============================================================

export function calculatePcsTravelDays(distanceMiles) {
  const distance = toFiniteNumber(distanceMiles);

  if (!Number.isFinite(distance) || distance <= 0) {
    return {
      ok: false,
      days: null,
      distanceMiles: null,
      ruleVersion: RULE_VERSION,
      warning: "Missing or invalid distanceMiles for PCS travel-day calculation."
    };
  }

  if (distance <= FIRST_SEGMENT_MILES) {
    return {
      ok: true,
      days: 1,
      distanceMiles: distance,
      ruleVersion: RULE_VERSION,
      breakdown: {
        firstSegmentDays: 1,
        additionalSegmentDays: 0,
        remainderMiles: 0,
        remainderAddsDay: false
      }
    };
  }

  const excessMiles = distance - FIRST_SEGMENT_MILES;
  const additionalSegmentDays = Math.floor(excessMiles / ADDITIONAL_SEGMENT_MILES);
  const remainderMiles = excessMiles % ADDITIONAL_SEGMENT_MILES;
  const remainderAddsDay = remainderMiles >= REMAINDER_THRESHOLD_MILES;
  const days = 1 + additionalSegmentDays + (remainderAddsDay ? 1 : 0);

  return {
    ok: true,
    days: Math.max(1, days),
    distanceMiles: distance,
    ruleVersion: RULE_VERSION,
    breakdown: {
      firstSegmentDays: 1,
      additionalSegmentDays,
      remainderMiles,
      remainderAddsDay
    }
  };
}

// ============================================================
// //#3) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  RULE_VERSION,
  calculatePcsTravelDays
});
