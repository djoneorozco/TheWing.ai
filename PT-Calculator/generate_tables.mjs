import fs from "fs";

const data = JSON.parse(fs.readFileSync("/tmp/pfra.json", "utf8"));

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

function getRows(gender, ageNorm, eventKey) {
  return data.standards[genderGroup(gender)][AGE_MAP[ageNorm]][eventKey];
}

function rowValue(row) {
  return row.length >= 3 && typeof row[1] === "number" && typeof row[2] === "number"
    ? row[1]
    : row[0];
}

function rowPoints(row) {
  return row.length >= 3 && typeof row[1] === "number" && typeof row[2] === "number"
    ? row[2]
    : row[1];
}

function buildMap(arr) {
  const out = {};
  ORDER.forEach((key, i) => {
    out[key] = arr[i];
  });
  return out;
}

function getBounds(eventKey) {
  const max = [];
  const min = [];
  for (const pairKey of ORDER) {
    const [ageNorm, gender] = parsePair(pairKey);
    const rows = getRows(gender, ageNorm, eventKey);
    max.push(rowValue(rows[0]));
    const minRow = rows.find((row) => row.includes("min")) || rows[rows.length - 1];
    min.push(rowValue(minRow));
  }
  return { max: buildMap(max), min: buildMap(min) };
}

function getPointRows(eventKey) {
  const pointSet = new Set();
  for (const pairKey of ORDER) {
    const [ageNorm, gender] = parsePair(pairKey);
    for (const row of getRows(gender, ageNorm, eventKey)) {
      pointSet.add(rowPoints(row));
    }
  }
  return [...pointSet].sort((a, b) => b - a).map((points) => {
    const vals = ORDER.map((pairKey) => {
      const [ageNorm, gender] = parsePair(pairKey);
      const rows = getRows(gender, ageNorm, eventKey);
      return rowValue(rows.find((row) => Math.abs(rowPoints(row) - points) < 0.001));
    });
    return [points, buildMap(vals)];
  });
}

function genRepTable(name, page, label, eventKey) {
  const bounds = getBounds(eventKey);
  const rows = getPointRows(eventKey);
  let out = `\n    // PFRA Scoring Charts p.${page} — ${label}\n`;
  out += `    ${name}: {\n`;
  out += `      max: buildMap(${JSON.stringify(ORDER.map((k) => bounds.max[k]))}),\n`;
  out += `      min: buildMap(${JSON.stringify(ORDER.map((k) => bounds.min[k]))}),\n`;
  out += `      rows: [\n`;
  for (const [points, map] of rows) {
    out += `        [${points}, buildMap(${JSON.stringify(ORDER.map((k) => map[k]))})],\n`;
  }
  out += `      ]\n    },`;
  return out;
}

function genCardio(name, page, label, eventKey) {
  const rows = getPointRows(eventKey);
  let out = `\n    // PFRA Scoring Charts p.${page} — ${label}\n    ${name}: [\n`;
  for (const [points, map] of rows) {
    out += `      [${points}, buildMap(${JSON.stringify(ORDER.map((k) => map[k]))})],\n`;
  }
  out += `    ],`;
  return out;
}

let snippet = "";
snippet += genRepTable("push", 2, "Push-Up Scoring Standards (reps)", "push_up");
snippet += genRepTable("hrpu", 3, "Hand Release Push-Up Scoring Standards (reps)", "hr_push_up");
snippet += genRepTable("situp", 4, "Sit-Up Scoring Standards (reps)", "sit_up");
snippet += genRepTable("crunch", 5, "Cross-Leg Reverse Crunch Scoring Standards (reps)", "rev_crunch");
snippet += genRepTable("plank", 6, "Forearm Plank Scoring Standards (seconds)", "plank");
snippet += genCardio("run", 7, "2 Mile Run Scoring Standards (seconds)", "run_2mi");
snippet += genCardio("hamr", 8, "20-Meter HAMR Scoring Standards (shuttles)", "hamr");

fs.writeFileSync("/tmp/tables_snippet.js", snippet);
console.log("Wrote tables snippet:", snippet.length, "bytes");
