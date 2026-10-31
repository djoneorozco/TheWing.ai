import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePcsTravelDays } from './official-pcs-travel-days.js';

// DTMO PCS/MALT guidance: total / 350 for distances >400, remainder >=51.
// https://www.travel.dod.mil/Travel-Transportation-Rates/Mileage-Rates/
for (const [miles, expected] of [[1,1],[350,1],[400,1],[401,2],[450,2],[451,2],[700,2],[750,2],[751,3],[800,3],[801,3],[1000,3],[1050,3],[1100,3],[1101,4],[1150,4],[1151,4],[2627,8]]) {
  test(`${miles} miles gives a maximum of ${expected} days`, () => {
    const r = calculatePcsTravelDays(miles);
    assert.equal(r.ok, true); assert.equal(r.days, expected);
    assert.equal(r.breakdown.firstSegmentDays + r.breakdown.additionalSegmentDays + Number(r.breakdown.remainderAddsDay), expected);
  });
}
test('missing, zero and invalid distances are unavailable', () => {
  for (const value of [null, undefined, '', 0, -1, NaN, Infinity, 'invalid']) {
    const r = calculatePcsTravelDays(value); assert.equal(r.ok, false); assert.equal(r.days, null);
  }
});
