PCSUnited PCS Resources — Allotment accuracy revision 2

Webflow page: 6ad306fe2c010258981aa38a
Host: pcs1-calculator-host (style pcs1-tool-host)
Input HtmlEmbed: b2b7d6b4-665a-a9c2-228d-25c722228984
Outcome HtmlEmbed: 2a3f2de2-afd0-d7c2-cf38-99080c575eb9

Replace the two existing embeds with the matching HTML files. Preserve their
container and surrounding layout. Deploy the backend first; the result card
rejects an older backend response that lacks the revision-2 accuracy metadata.

API: POST /api/pcs-move, {input:{estimateMode:'relocation-brief', ...}}
Schema pcs-relocation-brief.v1 is preserved. New callers send accuracyVersion:2.
Legacy callers keep their existing field semantics with corrected travel days.

Revision-2 request additions:
- distanceSource: entered_authorized | estimated_driving
- travelersTogether: true (one member, contiguous-U.S. POV travel; dependents
  counted in this estimate must accompany the member)
- dlaEligibility: unknown | confirmed | excluded
- includeDla must be true exactly when dlaEligibility is confirmed
- dlaEffectiveDate, dlaRank, dlaHasDependents are required when DLA is included;
  otherwise send null. These describe the PCS order effective-date profile.

The response adds accuracyVersion, distance provenance, and DLA inclusion,
eligibility and rate-profile metadata. An entered authorized distance is NOT
independently verified through DTOD. Unknown DLA is excluded from the subtotal,
not presented as a finding of no entitlement. A user confirmation is not an
eligibility adjudication by the application.

Travel dates, member/age-12+/under-12 per diem factors, actual-day caps, dated
MALT rates, CORS, timeouts, request IDs and stale-result resets are retained.
Changing destination clears mileage/source and DLA confirmation. Switching
mileage source clears the number so an estimate cannot be relabeled as official.
Alaska, air, mixed-mode and separate-dependent travel are outside this form.
Dates outside 2026 and trips crossing rate periods remain guarded pending
validated extensions. No official-routing service has been added.

Official travel-day reference:
https://www.travel.dod.mil/Travel-Transportation-Rates/Mileage-Rates/
For distance <=400 use one day; otherwise floor(total miles / 350), plus one
when the remainder is >=51. 401 -> 2; 751 -> 3; 1101 -> 4.

DLA profile/date reference:
https://www.travel.dod.mil/Travel-Transportation-Rates/Dislocation-Allowance/

Validation command:
node --test PCS-Calculator/pcs-distance.test.cjs netlify/functions/_share/official-pcs-travel-days.test.js netlify/functions/_share/pcs-relocation-brief.test.js netlify/functions/_share/official-malt.test.js netlify/functions/_share/pcs-move-engine.samples.test.js

Synthetic control: E-7, confirmed primary DLA with dependents on 2026-11-05,
751 entered miles, one POV, member + one age-12+ + two under-12 dependents,
three mileage-based days: MALT $176.49; DLA $3551.31; per diem $1493.25;
selected allowances $5221.05. With DLA unconfirmed: subtotal $1669.74.
These are test inputs, not a claim about an actual base-to-base official route.
