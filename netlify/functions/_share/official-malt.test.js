import test from "node:test";
import assert from "node:assert/strict";
import { getMaltRate, calculateMalt } from "./official-malt.js";
import { calculatePcsMoveEstimate } from "./pcs-move-engine.js";
import { handler } from "../pcs-move.js";

for (const [date, rate] of [["2026-01-01", 0.205], ["2026-06-30", 0.205], ["2026-07-01", 0.235], ["2026-12-31", 0.235]]) {
  test(`official 2026 date boundary: ${date}`, () => {
    const result = getMaltRate({ year: 2026, travelDate: date });
    assert.equal(result.ok, true);
    assert.equal(result.ratePerMile, rate);
    assert.equal(result.travelDate, date);
  });
}

test("dated amounts use official miles and authorized POVs, rounded per POV", () => {
  for (const [date, onePov] of [["2026-06-30", 120.54], ["2026-07-01", 138.18]]) {
    for (const povs of [1, 2]) {
      const result = calculateMalt({ distanceMiles: 588, povs, year: 2026, travelDate: date });
      assert.equal(result.amountPerPov, onePov);
      assert.equal(result.totalAmount, onePov * povs);
    }
  }
  assert.equal(calculateMalt({ distanceMiles: 1, povs: 2, travelDate: "2026-07-01" }).totalAmount, 0.48);
});

test("year-only clients retain prior amounts with an explicit date assumption", () => {
  const result = calculateMalt({ distanceMiles: 588, povs: 2, year: 2026 });
  assert.equal(result.totalAmount, 241.08);
  assert.match(result.warning, /January-June 2026/);
  assert.equal(result.travelDate, null);
  assert.equal(getMaltRate({ year: 2025 }).ratePerMile, 0.21);
});

test("invalid or unsupported dates cannot produce guessed amounts", () => {
  for (const travelDate of ["", "07/01/2026", "2026-02-29", "2026-13-01", "2027-01-01", "2022-12-31", {}, 20260701]) {
    const result = calculateMalt({ distanceMiles: 1000, travelDate });
    assert.equal(result.ok, false);
    assert.equal(result.available, false);
    assert.equal(result.totalAmount, null);
  }
  assert.equal(getMaltRate({ year: 2025, travelDate: "2026-07-01" }).ok, false);
});

test("missing and nonpositive miles remain unavailable", () => {
  for (const distanceMiles of [undefined, null, "", 0, -1, "invalid", Infinity]) {
    assert.equal(calculateMalt({ distanceMiles, travelDate: "2026-07-01" }).ok, false);
  }
});

test("PCS engine forwards dates without changing DLA or HHG", () => {
  const input = { rank: "E-5", hasDependents: true, year: 2026, distanceMiles: 1000, povs: 2 };
  const legacy = calculatePcsMoveEstimate(input);
  const dated = calculatePcsMoveEstimate({ ...input, travelDate: "2026-07-01" });
  assert.equal(legacy.malt.totalAmount, 410);
  assert.equal(dated.malt.totalAmount, 470);
  assert.deepEqual(dated.dla, legacy.dla);
  assert.deepEqual(dated.hhg, legacy.hhg);
  assert.deepEqual(dated.perDiem, legacy.perDiem);
  assert.equal(dated.knownEntitlements.total - legacy.knownEntitlements.total, 60);
  assert.equal(dated.profile.travelDate, "2026-07-01");
  assert.equal(calculatePcsMoveEstimate({ ...input, travel_date: "2026-01-01" }).malt.totalAmount, 410);
});

test("public endpoint preserves CORS, transport errors, and dated MALT contract", async () => {
  const response = await handler({ httpMethod: "POST", body: JSON.stringify({ input: { year: 2026, distanceMiles: 1000, povs: 2, travelDate: "2026-07-01" } }) });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["Access-Control-Allow-Origin"], "*");
  const body = JSON.parse(response.body);
  assert.equal(body.result.malt.totalAmount, 470);
  assert.equal(body.result.malt.rateEffectiveFrom, "2026-07-01");
  assert.equal(body.result.malt.sourceVersion, "official-malt-2026.2");
  assert.equal((await handler({ httpMethod: "OPTIONS" })).statusCode, 204);
  assert.equal((await handler({ httpMethod: "GET" })).statusCode, 405);
  assert.equal((await handler({ httpMethod: "POST", body: "{" })).statusCode, 400);
});
