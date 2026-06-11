/**
 * Validates PFRA scoring against official master data (PFRA Scoring Charts effective 1 MAR 26).
 * Run: node PT-Calculator/test_scoring.mjs
 */
import fs from "fs";

const pfra = JSON.parse(fs.readFileSync("/tmp/pfra.json", "utf8"));
const jsSource = fs.readFileSync("/workspace/PT-Calculator/ptcalculator.js", "utf8");

const ORDER = [
  "under25_male", "under25_female",
  "25-29_male", "25-29_female",
  "30-34_male", "30-34_female",
  "35-39_male", "35-39_female",
  "40-44_male", "40-44_female",
  "45-49_male", "45-49_female",
  "50-54_male", "50-54_female",
  "55-59_male", "55-59_female",
  "60plus_male", "60plus_female"
];

const AGE_MAP = {
  under25: "under_25",
  "25-29": "25_29",
  "30-34": "30_34",
  "35-39": "35_39",
  "40-44": "40_44",
  "45-49": "45_49",
  "50-54": "50_54",
  "55-59": "55_59",
  "60plus": "60_and_over"
};

function parsePair(pairKey) {
  const idx = pairKey.lastIndexOf("_");
  return [pairKey.slice(0, idx), pairKey.slice(idx + 1)];
}

function genderGroup(gender) {
  return gender === "male" ? "male_afspecwar_eod" : "female";
}

function rowValue(row) {
  return row.length >= 3 && typeof row[1] === "number" && typeof row[2] === "number" ? row[1] : row[0];
}

function rowPoints(row) {
  return row.length >= 3 && typeof row[1] === "number" && typeof row[2] === "number" ? row[2] : row[1];
}

function officialScore(eventKey, pairKey, value, direction = "higher") {
  const [ageNorm, gender] = parsePair(pairKey);
  const rows = pfra.standards[genderGroup(gender)][AGE_MAP[ageNorm]][eventKey];
  for (const row of rows) {
    const threshold = rowValue(row);
    const points = rowPoints(row);
    if (direction === "lower" ? value <= threshold : value >= threshold) return points;
  }
  return 0;
}

function roundWHtR(ratio) {
  return Math.round(Number(ratio) * 100) / 100;
}

function officialWHtR(waist, height) {
  const ratio = roundWHtR(waist / height);
  if (ratio >= 0.60) return 0;
  for (const row of pfra.whtr_scoring) {
    if (row.op === "<=" && ratio <= row.threshold) return row.points;
    if (row.op === "=" && ratio === row.threshold) return row.points;
  }
  return 0;
}

const cases = [
  {
    label: "Male Under 25 — max push/sit/run + best WHtR",
    pair: "under25_male",
    body: { waist: 31, height: 72 },
    strength: { event: "push_up", value: 67 },
    core: { event: "sit_up", value: 58 },
    cardio: { event: "run_2mi", value: 805 },
    expect: { total: 100, body: 20, strength: 15, core: 15, cardio: 50, pass: true }
  },
  {
    label: "Female Under 25 — minimum passing reps/run",
    pair: "under25_female",
    body: { waist: 42, height: 71 },
    strength: { event: "push_up", value: 15 },
    core: { event: "sit_up", value: 29 },
    cardio: { event: "run_2mi", value: 1523 },
    expect: { body: 2.5, strength: 2.5, core: 2.5, cardio: 35, componentsPass: true, pass: false }
  },
  {
    label: "Male 40–44 — below strength minimum",
    pair: "40-44_male",
    body: { waist: 32, height: 72 },
    strength: { event: "push_up", value: 20 },
    core: { event: "sit_up", value: 50 },
    cardio: { event: "run_2mi", value: 845 },
    expect: { strength: 0, pass: false }
  },
  {
    label: "Female 40–44 — HAMR max",
    pair: "40-44_female",
    body: { waist: 30, height: 68 },
    strength: { event: "hr_push_up", value: 34 },
    core: { event: "rev_crunch", value: 50 },
    cardio: { event: "hamr", value: 59 },
    expect: { strength: 15, core: 15, cardio: 50, pass: true }
  },
  {
    label: "Male 60+ — plank minimum passing",
    pair: "60plus_male",
    body: { waist: 34, height: 72 },
    strength: { event: "push_up", value: 12 },
    core: { event: "plank", value: 55 },
    cardio: { event: "run_2mi", value: 1440 },
    expect: { strength: 2.5, core: 2.5, cardio: 35, componentsPass: true, pass: false }
  },
  {
    label: "Female 60+ — WHtR fail (≥ 0.60)",
    pair: "60plus_female",
    body: { waist: 44, height: 70 },
    strength: { event: "push_up", value: 28 },
    core: { event: "sit_up", value: 42 },
    cardio: { event: "run_2mi", value: 1780 },
    expect: { body: 0, bodyPass: false, pass: false }
  },
  {
    label: "Male Under 25 — HRPU between-tier score (51 reps = 14.5)",
    pair: "under25_male",
    body: { waist: 32, height: 72 },
    strength: { event: "hr_push_up", value: 51 },
    core: { event: "rev_crunch", value: 60 },
    cardio: { event: "hamr", value: 87 },
    expect: { strength: 14.5, core: 15, cardio: 50 }
  },
  {
    label: "Female Under 25 — above-max reps still cap at 15",
    pair: "under25_female",
    body: { waist: 32, height: 72 },
    strength: { event: "push_up", value: 55 },
    core: { event: "rev_crunch", value: 65 },
    cardio: { event: "hamr", value: 75 },
    expect: { strength: 15, core: 15 }
  }
];

let passed = 0;

for (const test of cases) {
  const body = officialWHtR(test.body.waist, test.body.height);
  const strength = officialScore(test.strength.event, test.pair, test.strength.value);
  const core = officialScore(test.core.event, test.pair, test.core.value, test.core.event === "plank" ? "higher" : "higher");
  const cardio = officialScore(
    test.cardio.event,
    test.pair,
    test.cardio.value,
    test.cardio.event === "run_2mi" ? "lower" : "higher"
  );
  const total = body + strength + core + cardio;
  const bodyPass = roundWHtR(test.body.waist / test.body.height) <= 0.59;
  const componentsPass = bodyPass && strength >= 2.5 && core >= 2.5 && cardio >= 35;
  const pass = componentsPass && total >= 75;

  const e = test.expect;
  const ok =
    (e.total === undefined || total === e.total) &&
    (e.body === undefined || body === e.body) &&
    (e.strength === undefined || strength === e.strength) &&
    (e.core === undefined || core === e.core) &&
    (e.cardio === undefined || cardio === e.cardio) &&
    (e.bodyPass === undefined || bodyPass === e.bodyPass) &&
    (e.componentsPass === undefined || componentsPass === e.componentsPass) &&
    (e.pass === undefined || pass === e.pass);

  // Verify key bounds in built file match official max/min for sampled cells
  let calcOk = true;
  if (test.pair === "under25_male" && test.strength.event === "push_up") {
    calcOk = jsSource.includes("max: buildMap([67,50,63,47,60,44,56,42,52,39,49,36,45,34,42,31,38,28])");
  }
  if (test.core.event === "rev_crunch" && test.pair === "under25_male") {
    calcOk = calcOk && jsSource.includes("max: buildMap([60,58,58,56,56,54,54,52,52,50,50,48,48,46,46,44,44,42])");
  }

  const finalOk = ok && calcOk;
  console.log(finalOk ? "PASS" : "FAIL", test.label, {
    total: total.toFixed(1),
    body,
    strength,
    core,
    cardio,
    pass,
    calcOk
  });
  if (finalOk) passed += 1;
}

console.log(`\n${passed}/${cases.length} tests passed`);
process.exit(passed === cases.length ? 0 : 1);
