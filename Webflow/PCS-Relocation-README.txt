PCSUnited PCS starter estimates

Install PCS-Relocation-input.html and PCS-Relocation-outcome.html in the two
existing HtmlEmbeds inside #pcs1-calculator-host on /pcs-resources.
Both files must be updated together after the backend supports starter-plan.

The user supplies only Current base to start, after selecting a destination
and household in PCS Snapshot. Travel date starts at today, one car, all
Snapshot household members together with one service member. These assumptions
are visible and editable. No account, localStorage or sessionStorage is used.

The new opt-in /api/pcs-move mode is estimateMode: starter-plan.
Existing legacy PCS Calculator and relocation-brief request modes are preserved.
The new result schema is pcs-starter-plan.v1. Existing relocation request/reset/
status event names are preserved; these two revised embeds use the new mode.

Source of truth:
- _share/pcs-starter-plan.js owns route approximation, spending and composition.
- Existing relocation-brief and official modules own date-aware allowance rules.
- pcs-base-coordinates.js derives all 44 names from cities/index.byBase.json,
  with existing Base-Map coordinates and three legacy PCS-Calculator fallbacks.
  Unit tests detect changes in the canonical index and coordinate inventories.
- Alaska is explicitly unsupported. All 1,806 distinct directed pairs among
  the other 43 bases are tested. Same-base moves require a local-move estimate.

Automatic mileage uses the existing heuristic: great-circle miles x 1.18.
This is a rough geographic estimate, not road routing, gate routing or DTOD.
No unlicensed map service or production dependency on a public demo router is
introduced. A licensed route provider is a future precision upgrade.
Users may replace automatic mileage with their route-planner or orders miles.
Changing either endpoint resets old mileage and DLA confirmation. Other manual
spending assumptions remain under user control.

Travel days default to the corrected mileage rule. Planned days can override
trip duration; budget hotel nights = planned days - 1. Allowance days are capped
by the mileage maximum. Changing dates uses existing MALT/FY per diem rules;
unsupported 2027 travel and rate-boundary trips retain the budget but clearly
withhold unavailable allowance calculations.

Budget = fuel + lodging + meals + extras + cushion.
Fuel = miles / MPG x price per gallon x cars.
Lodging = hotel nights x rooms x tax-inclusive room price.
Meals = planned days x travelers x daily food budget.
Cushion = selected percentage of fuel, lodging, meals and extras.
Defaults are planning assumptions, not market quotes: 25 MPG, $4.50/gallon,
$150/room/night, $45/person/day, 15% cushion, one room per four travelers.
Every input can be changed, including a manual total (zero allowed).
Moving trucks, pet fees, tolls, shipments, arrival lodging and housing deposits
are excluded until added. This is not presented as the full cost of a PCS.

Age mix is unknown initially. The per diem range spans all accompanying
dependents under 12 to all age 12+. One optional under-12 count narrows the range;
the other age group is derived from the selected travel party. No spouse/child
age or dependent eligibility is inferred as fact. Separate itineraries retain
only route/budget support.

DLA defaults to unknown and is excluded from the allowance total. A possible
primary-DLA rate is shown separately using Snapshot grade/household assumptions.
To include DLA, users confirm eligibility and the order-effective date, grade
and dependency status. This preserves the prior accuracy safeguards.

Validation:
node --test netlify/functions/_share/pcs-starter-plan.test.js netlify/functions/_share/pcs-relocation-brief.test.js netlify/functions/_share/official-pcs-travel-days.test.js netlify/functions/_share/official-malt.test.js netlify/functions/_share/pcs-move-engine.samples.test.js PCS-Calculator/pcs-distance.test.cjs

Browser checks must cover one-selection generation, optional age refinement,
manual mileage preservation, destination/household changes, DLA confirmation,
partial results for unsupported dates and a phone viewport.

Outcome graph revision 2:
- Uses the net estimate from the API as the main result, with surplus, shortfall,
  break-even, or a range crossing zero. Shortfalls use a positive amount and an
  explicit label; mixed ranges retain negative signs.
- DLA, MALT, and per diem form one stacked bar, compared with the expense bar
  on the same zero-based scale. Unknown-age variation is a striped extension.
- Possible, unconfirmed DLA remains outside both totals and graph. Unavailable
  allowances hide the comparison while retaining route and budget results.
- Amounts display cents so the displayed components reconcile with totals.
- The chart has a screen-reader description, labeled legend, no animation,
  and wraps on small screens. Financial calculations remain on the backend.
- This is an outcome-only upgrade; the revision-1 starter INPUT is compatible.

Graph regression checks:
node --test Webflow/PCS-Relocation-outcome.test.cjs
Covers unknown and known ages, confirmed and excluded DLA, zero/high expenses,
shortfall, break-even, mixed-sign ranges, excluded per diem, unsupported dates,
invalid response components, and stale-result reset.
