# AGENTS.md
# TheWing.ai Engineering Constitution
#
# Purpose:
# This file defines the canonical engineering, architectural, testing,
# security, and implementation rules for any AI coding agent working
# inside TheWing.ai.
#
# Applies to:
# - OpenAI Codex
# - Cursor Agents
# - Cursor Cloud Agents
# - Other autonomous coding agents
# - Human contributors
#
# PRIORITY:
# These instructions are authoritative for this repository unless a
# more-specific AGENTS.md exists deeper in the directory tree.
#
# Last architectural principle:
#
#               THEWING CALCULATES.
#                  AMY EXPLAINS.
#
# Never violate this separation without explicit human approval.


# =====================================================================
# 1. PROJECT IDENTITY
# =====================================================================

TheWing.ai is the backend intelligence and deterministic decision layer
for applications including:

- PCSUnited
- TheOrozcoRealty / TOR
- Ask Amy
- military compensation tools
- PCS intelligence
- mortgage and affordability tools
- VA-related tools
- EPB / OPB writing intelligence
- future decision-support applications

TheWing is NOT primarily a frontend application.

TheWing is the intelligence layer responsible for:

1. deterministic calculations
2. canonical data
3. domain rules
4. normalization
5. decision logic
6. structured Truth Packets
7. AI orchestration
8. API contracts
9. safety boundaries
10. explainable outputs


# =====================================================================
# 2. CORE ARCHITECTURAL PHILOSOPHY
# =====================================================================

## Canonical rule

THEWING CALCULATES.
AMY EXPLAINS.

This rule takes priority over implementation convenience.


## Deterministic-first architecture

Whenever a value can be calculated or retrieved deterministically,
do NOT ask an LLM to invent, estimate, or infer it.

Examples include:

- military base pay
- BAH
- BAS
- monthly military compensation
- mortgage principal and interest
- property tax calculations
- homeowners insurance calculations
- PMI
- affordability calculations
- debt ratios
- VA calculations
- retirement calculations
- rank mappings
- years-of-service mappings
- PCS location mappings
- structured EPB rules
- character limits
- known evaluation criteria


## LLM responsibilities

LLMs may:

- explain deterministic outputs
- summarize information
- translate structured facts into natural language
- classify intent
- rewrite text
- improve supported language
- synthesize approved facts
- generate recommendations supported by available data
- identify missing information
- organize information
- compare scenarios using provided deterministic facts


## LLMs must NOT independently invent authoritative values

LLMs must NOT fabricate:

- pay
- BAH
- BAS
- mortgage values
- interest rates when an authoritative value is expected
- affordability values
- VA entitlement
- retirement benefits
- military policy
- military rank responsibilities
- EPB metrics
- award results
- readiness improvements
- manpower savings
- dollar savings
- time savings
- scope
- mission impact
- leadership impact
- promotion recommendations
- user financial data
- user military data


# =====================================================================
# 3. SYSTEM LAYERS
# =====================================================================

TheWing should be understood as layered architecture.

Preferred flow:

User / UI
    ↓
Input normalization
    ↓
Intent / tool routing
    ↓
Deterministic engines
    ↓
Rules / policy modules
    ↓
Canonical structured result
    ↓
Truth Packet
    ↓
LLM explanation layer
    ↓
API response
    ↓
UI rendering


## Separation of concerns

Do not combine all responsibilities inside one large endpoint.

Preferred:

Endpoint
    ↓
Normalizer
    ↓
Engine(s)
    ↓
Rules
    ↓
Truth Packet builder
    ↓
LLM adapter
    ↓
Response formatter


# =====================================================================
# 4. FRONTEND / BACKEND BOUNDARY
# =====================================================================

The browser should remain intentionally thin.

Frontend/Webflow code SHOULD:

- collect user input
- validate basic field shape
- render results
- dispatch events
- listen for events
- manage temporary UI state
- call TheWing APIs


Frontend/Webflow code SHOULD NOT:

- contain authoritative pay tables
- calculate official BAH
- calculate official military compensation
- calculate authoritative mortgage results
- implement core affordability logic
- contain VA eligibility rules
- duplicate backend domain logic
- contain secret API keys
- call OpenAI directly when TheWing provides the gateway
- become a second source of truth


## Rule

If business logic is important enough that inconsistent results would
damage trust, move that logic into TheWing.


# =====================================================================
# 5. PUBLIC VS AUTHENTICATED MODES
# =====================================================================

TheWing supports two major application modes.


## PUBLIC MODE

Public/open-source experiences must prefer temporary memory-only state.

Public mode rules:

- no Supabase dependency unless explicitly required
- no account requirement
- no persistent profile requirement
- no localStorage for canonical user data
- no sessionStorage for canonical user data
- no browser-side authoritative calculations
- no exposed secrets
- no direct browser → OpenAI calls

Public UI state should normally exist:

- in component memory
- in page memory
- in event payloads
- during the active interaction only


## AUTHENTICATED MODE

Authenticated experiences may use:

- Supabase
- saved profile state
- saved financial intake
- saved scenarios
- account sessions
- persisted preferences
- user history

Authenticated code must still preserve deterministic-first architecture.


# =====================================================================
# 6. CANONICAL PUBLIC AI GATEWAY
# =====================================================================

Current public AI architecture should treat:

netlify/functions/agent-amy-public.js

as the primary public AI gateway unless repository inspection proves
that the architecture has intentionally changed.


## Browser rule

Public browser code should normally call TheWing.

It should NOT directly call OpenAI.


## Gateway responsibilities

The public Amy gateway should:

1. validate input
2. normalize the profile
3. identify intent
4. invoke deterministic modules where appropriate
5. construct structured truth
6. identify missing inputs
7. call the language model only when useful
8. enforce response structure
9. preserve CORS behavior
10. fail gracefully


# =====================================================================
# 7. FAIL-OPEN PRINCIPLE
# =====================================================================

TheWing should fail open whenever a safe, useful partial response can
still be produced.

Example:

If mortgage intelligence succeeds but neighborhood intelligence fails,
the entire Amy request should not necessarily crash.

Preferred behavior:

{
  "ok": true,
  "partial": true,
  "available": {...},
  "unavailable": [...],
  "message": "..."
}


## Do not hide failures

Fail-open does NOT mean silently invent missing data.

If a module fails:

- mark the data unavailable
- omit unsupported conclusions
- disclose limitations when relevant
- continue with valid information


# =====================================================================
# 8. TRUTH PACKET ARCHITECTURE
# =====================================================================

The Truth Packet is the structured bridge between deterministic systems
and language-model explanation.

Preferred conceptual structure:

{
  "profile_summary": {},
  "compensation": {},
  "housing_inputs": {},
  "mortgage": {},
  "affordability": {},
  "location": {},
  "decision_context": {},
  "verdict": {},
  "va_loan": {},
  "next_action": {},
  "missing_inputs": [],
  "warnings": [],
  "sources": []
}


## Rules

Truth Packets must:

- contain deterministic values where available
- clearly distinguish known vs unknown
- avoid fabricated defaults
- use predictable field names
- remain machine-readable
- support future auditing
- preserve backward compatibility when practical


# =====================================================================
# 9. PROFILE NORMALIZATION
# =====================================================================

All major tools should prefer a canonical profile shape.

Potential canonical profile fields include:

{
  "mode": null,
  "rank": null,
  "rank_paygrade": null,
  "yos": null,
  "dependents_count": null,
  "family": null,
  "has_dependents": null,
  "base": null,
  "selected_base": null,
  "pcs_base": null,
  "monthly_expenses": null,
  "projected_home_price": null,
  "downpayment": null,
  "credit_score": null
}


## Normalization rules

Before adding duplicate aliases:

1. inspect existing normalizer modules
2. inspect endpoint consumers
3. identify canonical names
4. preserve compatibility
5. normalize aliases centrally

Avoid having every endpoint independently normalize the same profile.


# =====================================================================
# 10. BASICBRAIN / PCS SNAPSHOT
# =====================================================================

BasicBrain is a lightweight PCS intelligence initializer.

It is NOT:

- a dashboard
- a large onboarding wizard
- a standalone SaaS product
- a manual calculator


## Core inputs

BasicBrain commonly uses:

- Rank
- Years of Service
- Dependents
- Gaining Base


## Expected behavior

Changes should automatically update relevant outputs.

No unnecessary:

- submit buttons
- calculate buttons
- page refreshes


## Expected deterministic flow

Rank + Years of Service
    ↓
Base Pay

Dependents
    ↓
Dependent logic

Base
    ↓
BAH
BAS
Total Compensation
Local intelligence
Housing pressure
Initial affordability context


## Canonical public wrapper

Preferred pattern:

{
  "tool": "PCS_SNAPSHOT",
  "input": {
    ...
  }
}


# =====================================================================
# 11. PUBLIC EVENT CONTRACTS
# =====================================================================

Important events may include:

- pcsunited:basicbrain-updated
- pcsunited:profile-ready
- pcsunited:bridge-ready
- pcsu:base-selected
- pcsunited:compensation-ready
- pcsunited:compensation-preview-ready


## Event payload considerations

Typical fields may include:

- source
- mode
- rank
- rank_paygrade
- yos
- dependents_count
- family
- has_dependents
- base
- selected_base
- pcs_base
- stored


## Compatibility rule

Before renaming or removing an event:

SEARCH THE ENTIRE REPOSITORY.

Also consider external Webflow consumers that may not live in this repo.

Do not casually break public event contracts.


# =====================================================================
# 12. MILITARY COMPENSATION
# =====================================================================

Military compensation must remain deterministic.

Potential modules include:

- official-pay
- pay-engine
- official-bah
- compensation-context
- official-retirement
- official-va


## Never use LLM guesses for:

- base pay
- pay-grade mapping
- BAH
- BAS
- retirement amounts
- disability compensation amounts
- official entitlement values


## Rank greeting behavior

Where user-facing rank names are required, use a canonical rank mapping.

Avoid duplicating rank maps in multiple unrelated files.


# =====================================================================
# 13. MORTGAGE ENGINE
# =====================================================================

Mortgage calculations belong in deterministic backend modules.

Expected concepts may include:

- loan amount
- principal
- interest
- taxes
- insurance
- PMI
- total monthly housing cost


## Existing API compatibility

A mortgage response may currently expose fields such as:

{
  "loan_amount": ...,
  "principal_interest": ...,
  "taxes_monthly": ...,
  "insurance_monthly": ...,
  "pmi_monthly": ...,
  "totalMonthly": ...
}

Before changing these fields:

1. search all consumers
2. preserve backwards compatibility where possible
3. add new canonical fields in parallel if necessary
4. document migration


# =====================================================================
# 14. AFFORDABILITY ENGINE
# =====================================================================

Affordability should be driven by deterministic financial inputs.

The LLM may explain affordability.

The LLM should NOT independently determine authoritative affordability.


## Prefer explicit assumptions

If affordability depends on assumptions:

- expose them
- structure them
- return them
- do not bury them inside prose


# =====================================================================
# 15. VA MODULES
# =====================================================================

VA logic should live in deterministic/shared backend modules.

Do NOT place canonical VA logic inside:

- Webflow
- prompt text
- browser JavaScript
- Amy prose logic


## Amy's role

Amy may explain:

- what deterministic VA results mean
- implications
- options
- missing information
- next steps


# =====================================================================
# 16. BASE / LOCATION INTELLIGENCE
# =====================================================================

Base and location data should use structured canonical records.

Potential base fields include:

- slug
- name
- city
- state
- market_label
- avg_home_value
- mortgage_assumptions
- rental_metrics
- financial_brief
- market_bluf
- scorecard
- neighborhoods
- by_bedroom
- base_profile


Potential base_profile fields include:

- display_name
- branch
- primary_mission_summary
- base_bluf
- base_map_image
- official_links
- visitor_control_center
- gates
- major_services
- on_base_housing
- recommended_neighborhoods
- commute_intelligence
- bah_market_reality
- family_readiness
- arrival_checklist
- pcs_watchouts
- realtor_intelligence


## Data integrity

Do not invent:

- gate names
- gate hours
- commute times
- neighborhood statistics
- base services
- official links
- housing information

Use authoritative or explicitly approved sources/data.


# =====================================================================
# 17. MAP DATA
# =====================================================================

Map-related information has higher-than-normal accuracy requirements.

Do not assume:

- gate hours
- gate status
- road names
- neighborhood boundaries
- drive times
- installation access points

Dynamic information must be treated as dynamic.

Prefer structured source data over model memory.


# =====================================================================
# 18. AMY INTELLIGENCE
# =====================================================================

Amy is the explanatory and conversational intelligence layer.

Amy should:

- understand user intent
- use deterministic tools
- explain results
- identify uncertainty
- ask for missing information only when necessary
- provide useful next actions


## Amy should NOT become the source of truth

Do not bury business logic inside prompts.

Do not implement authoritative calculations by asking Amy to reason them out.

Prompt logic should orchestrate truth, not replace deterministic engines.


# =====================================================================
# 19. EPB / OPB GENERATOR
# =====================================================================

TheWing may contain military performance-statement generation systems.

These systems require especially strict factual discipline.


## Canonical writing model

ACTION → SCOPE → RESULT → IMPACT


## Core rule

NEVER FABRICATE SUPPORTING FACTS.


Do NOT invent:

- metrics
- percentages
- money saved
- hours saved
- manpower saved
- people led
- readiness gains
- awards
- rankings
- mission outcomes
- scope
- leadership effects
- organizational impact


## Modes

### STRICT

Stay closest to the user's supplied facts.

Allowed:

- grammar improvement
- clarity improvement
- structure improvement
- concise military writing

Not allowed:

- unsupported inference
- added metrics
- inflated scope


### BALANCED

Improve:

- structure
- military tone
- impact connection
- clarity
- competitiveness

Everything must remain supported by user-provided facts.


### COMPETITIVE

Use the strongest defensible framing.

Allowed:

- stronger verbs
- stronger supported mission connection
- stronger supported leadership framing

Not allowed:

- exaggeration
- fabrication
- invented mission effects
- invented scope


## Generation quality

When generating multiple options, they should be materially different.

Do not merely swap adjectives.


# =====================================================================
# 20. EPB RANK TIER ARCHITECTURE
# =====================================================================

Rank-aware performance writing should rely on explicit deterministic
rank responsibility modules when available.

Potential modules include:

- rank-tier.js
- impact-engine.js
- universal.js


## Rank-tier purpose

Rank tier should inform EXPECTED RESPONSIBILITY LEVEL.

It must NOT invent what the member actually did.


Example:

A senior NCO may be expected to demonstrate organizational leadership,
but the system cannot claim organizational leadership unless supported
by the input.


## Impact engine purpose

Connect:

ACTION
    ↓
RESULT
    ↓
SUPPORTED MISSION IMPACT

Never manufacture the impact.


## universal.js purpose

Shared writing logic should live in reusable modules rather than being
duplicated across endpoints.


# =====================================================================
# 21. MODULE DESIGN RULES
# =====================================================================

Prefer:

small modules
+
clear interfaces
+
predictable inputs
+
predictable outputs


Avoid giant files that handle:

- routing
- calculations
- prompting
- formatting
- database access
- policy
- logging

all in one function.


## A module should ideally answer one question.

Examples:

normalizeProfile()

calculateCompensation()

calculateMortgage()

evaluateAffordability()

resolveRankTier()

buildTruthPacket()

generateAmyExplanation()

formatPublicResponse()


# =====================================================================
# 22. SHARED MODULES
# =====================================================================

Before creating a new helper:

SEARCH FIRST.

Look for shared modules under locations such as:

netlify/functions/_share/
netlify/functions/shared/
lib/
utils/
engines/


Do not create:

calculateBah2.js

when an authoritative BAH module already exists.


## Reuse before duplication.

Duplicate business logic is considered technical debt and a potential
source-of-truth violation.


# =====================================================================
# 23. API DESIGN
# =====================================================================

API responses should be:

- predictable
- versionable
- structured
- machine-readable
- backward compatible where practical


Preferred response pattern:

{
  "ok": true,
  "data": {},
  "meta": {},
  "warnings": [],
  "errors": []
}


Existing endpoints may use other structures.

Do NOT force a repository-wide migration unless explicitly tasked.


# =====================================================================
# 24. API CONTRACT PRESERVATION
# =====================================================================

Before modifying an endpoint:

1. identify endpoint file
2. search repository for all callers
3. inspect Webflow/browser consumers if represented in repo
4. inspect tests
5. inspect shared modules
6. inspect response structure
7. identify compatibility risks


Do not rename/remove response keys merely for style.


# =====================================================================
# 25. ENDPOINT DISCOVERY
# =====================================================================

Known or historically used endpoints/functions may include:

- opensource-brain
- agent-amy-public
- agent-amy
- ask-amy
- login
- register
- send-code
- verify-code
- financial-intake
- mortgage
- profile
- decision-brief
- voice-base-brief
- health


This list may not be exhaustive.

Repository state is authoritative.

Always inspect current files before assuming an endpoint still exists.


# =====================================================================
# 26. CORS
# =====================================================================

Public APIs may be consumed by Webflow or external frontend origins.

Do not accidentally remove existing CORS behavior.


When editing public endpoints:

- inspect existing CORS headers
- inspect OPTIONS behavior
- preserve allowed methods
- preserve allowed headers
- avoid unnecessary wildcard expansion when credentials are involved


# =====================================================================
# 27. SUPABASE
# =====================================================================

Supabase may be used for authenticated workflows.

Rules:

- service-role keys must remain server-side
- never expose privileged keys to browser code
- use least privilege
- never log secrets
- never commit secrets
- distinguish public anon access from privileged backend access


## Public mode

Do not introduce Supabase persistence into public tools unless explicitly
requested.


# =====================================================================
# 28. SECURITY
# =====================================================================

Never commit:

- API keys
- service-role keys
- passwords
- tokens
- private certificates
- secrets
- production credentials


## Secret handling

Use environment variables.

Before adding a variable:

1. search for existing naming conventions
2. reuse existing names when appropriate
3. document new required variables
4. never hardcode them


# =====================================================================
# 29. AGENT PERMISSIONS
# =====================================================================

Coding agents should assume:

ALLOWED:

- repository inspection
- local code changes
- test execution
- lint execution
- build execution
- creating branches
- creating commits when instructed
- preparing pull requests


NOT AUTOMATICALLY ALLOWED:

- deleting production data
- changing production credentials
- rotating secrets
- modifying production Supabase schema
- deploying directly to production
- changing DNS
- changing billing
- deleting cloud resources
- force pushing protected branches
- bypassing tests
- disabling security controls


Human approval is required for high-impact production actions.


# =====================================================================
# 30. DEPENDENCY POLICY
# =====================================================================

Do not add dependencies unnecessarily.

Before installing a package:

1. determine whether native/runtime functionality already solves it
2. inspect existing dependencies
3. prefer established packages
4. consider bundle/deployment impact
5. consider security
6. consider maintenance


Do not introduce a major framework to solve a minor problem.


# =====================================================================
# 31. REFACTORING POLICY
# =====================================================================

Refactoring is encouraged when it reduces:

- duplicated logic
- giant endpoints
- inconsistent normalization
- inconsistent error handling
- duplicated prompts
- duplicated calculations


But:

DO NOT REFACTOR THE ENTIRE REPOSITORY
while implementing a narrowly scoped feature.


Prefer:

feature
+
small necessary refactor


over:

feature
+
unrelated architecture rewrite


# =====================================================================
# 32. LEGACY CODE
# =====================================================================

Do not assume old code is wrong merely because it is old.

Before removing legacy behavior:

- identify why it exists
- search consumers
- inspect commit/context if available
- preserve compatibility when practical


# =====================================================================
# 33. COMMENTING
# =====================================================================

Comments should explain WHY.

Avoid comments that simply repeat code.


Good:

// Preserve legacy key because Webflow production still consumes it.

Bad:

// Set totalMonthly variable.


# =====================================================================
# 34. LOGGING
# =====================================================================

Logs should support debugging without leaking sensitive information.

Do not log:

- passwords
- tokens
- authorization headers
- service-role keys
- full sensitive user profiles
- private financial data unnecessarily


Prefer structured logs where practical.


# =====================================================================
# 35. ERROR HANDLING
# =====================================================================

Errors should be:

- actionable
- structured
- non-secret
- distinguishable


Avoid returning raw stack traces to public clients.


Internal logs may contain deeper technical detail when safe.


# =====================================================================
# 36. INPUT VALIDATION
# =====================================================================

Validate external input.

Do not assume:

- rank exists
- YoS is numeric
- dependents are valid
- base exists
- price is positive
- credit score is valid
- mortgage inputs are complete


Normalization should occur before business logic.


# =====================================================================
# 37. NULL / UNKNOWN DATA
# =====================================================================

Unknown does NOT equal zero.

Unknown does NOT equal false.

Unknown does NOT equal a fabricated default.


Use:

null

or explicit unknown state when appropriate.


# =====================================================================
# 38. DEFAULT VALUES
# =====================================================================

Defaults are allowed for:

- demo UI state
- test fixtures
- examples


Defaults must NOT silently become authoritative user data.


Clearly distinguish:

demo defaults
vs
real profile values


# =====================================================================
# 39. TESTING PHILOSOPHY
# =====================================================================

A coding task is not complete when code is written.

It is complete when behavior is verified.


Testing priorities:

1. deterministic engines
2. public API contracts
3. profile normalization
4. critical routing
5. financial calculations
6. military compensation
7. EPB factual constraints
8. regression behavior


# =====================================================================
# 40. TEST TYPES
# =====================================================================

Use appropriate combinations of:

- unit tests
- integration tests
- contract tests
- regression tests
- fixture-based tests
- endpoint tests


Do not rely entirely on snapshot tests for critical calculations.


# =====================================================================
# 41. FINANCIAL TESTS
# =====================================================================

Financial calculations should test:

- normal values
- zero values
- missing values
- boundary values
- invalid input
- decimal precision
- rounding behavior


Expected outputs should come from deterministic math, not LLM output.


# =====================================================================
# 42. MILITARY PAY TESTS
# =====================================================================

Where practical test:

- multiple ranks
- multiple years-of-service values
- dependent/no-dependent logic
- base selection
- invalid rank
- invalid YoS
- missing base


# =====================================================================
# 43. EPB TESTS
# =====================================================================

EPB tests should verify:

- unsupported metrics are not introduced
- user facts are preserved
- Strict remains factual and conservative
- Balanced improves presentation without invention
- Competitive strengthens framing without fabrication
- rank-tier logic affects framing expectations but does not invent facts


Test across representative ranks:

- junior enlisted
- NCO
- SNCO
- CGO
- FGO

If rank-tier supports every paygrade, cover the entire supported range
where practical.


# =====================================================================
# 44. API CONTRACT TESTS
# =====================================================================

Critical endpoints should have tests protecting:

- expected keys
- expected types
- error shape
- HTTP status behavior
- CORS behavior where relevant


This helps prevent agent-driven refactors from silently breaking Webflow.


# =====================================================================
# 45. REGRESSION TESTING
# =====================================================================

Every fixed bug should ideally gain a regression test.

Pattern:

bug discovered
    ↓
write failing test
    ↓
fix bug
    ↓
test passes
    ↓
future agents cannot reintroduce bug


# =====================================================================
# 46. BUILD VALIDATION
# =====================================================================

Before declaring a task complete:

discover available repository scripts.

Inspect:

package.json
project config
CI config


Run the strongest appropriate existing verification commands.

Examples MAY include:

npm test
npm run test
npm run lint
npm run typecheck
npm run build

Do not invent scripts that do not exist.


# =====================================================================
# 47. IDEAL VERIFY COMMAND
# =====================================================================

If the repository already contains or later adds:

npm run verify

prefer it as the final local validation command.


Ideal verify chain:

lint
    ↓
unit tests
    ↓
integration tests
    ↓
contract tests
    ↓
build


Do not create this command unless requested or clearly beneficial to the
assigned task.


# =====================================================================
# 48. DEFINITION OF DONE
# =====================================================================

A feature is DONE only when:

- requirements are implemented
- architecture is respected
- no known source-of-truth duplication was introduced
- affected tests pass
- new behavior has appropriate tests
- build passes where available
- lint/type checks pass where available
- API compatibility has been considered
- secrets were not introduced
- dead debug code was removed
- changed behavior is documented
- unresolved risks are explicitly reported


"Code written" is NOT done.


# =====================================================================
# 49. BEFORE CODING
# =====================================================================

For non-trivial work, agents must first inspect the repository.

Minimum discovery:

1. relevant files
2. imports
3. callers
4. tests
5. shared modules
6. API contracts
7. nearby architecture


Do not immediately create new files before understanding existing code.


# =====================================================================
# 50. IMPLEMENTATION WORKFLOW
# =====================================================================

Preferred autonomous workflow:

UNDERSTAND
    ↓
SEARCH
    ↓
PLAN
    ↓
IMPLEMENT
    ↓
TEST
    ↓
DEBUG
    ↓
RETEST
    ↓
REVIEW DIFF
    ↓
REPORT


Do not stop after IMPLEMENT.


# =====================================================================
# 51. CHANGE SCOPE
# =====================================================================

Before editing, determine:

- what MUST change
- what MAY change
- what MUST NOT change


Prefer the smallest coherent implementation that fully solves the task.


# =====================================================================
# 52. FILE CREATION
# =====================================================================

Before creating a new module:

search for:

- similar module
- duplicate engine
- shared helper
- existing utility
- existing naming convention


New files should have a clear architectural home.


# =====================================================================
# 53. FILE NAMING
# =====================================================================

Follow existing repository conventions.

Do not introduce inconsistent styles such as:

rankTier.js
rank-tier.js
rank_tier.js

for equivalent modules.

Repository convention wins.


# =====================================================================
# 54. GIT WORKFLOW
# =====================================================================

Agents should prefer isolated branches/worktrees.

Never have multiple autonomous agents casually modify the same working
tree simultaneously.


Suggested branch prefixes:

codex/
cursor/
feature/
fix/
refactor/
test/


Examples:

codex/epb-rank-tier
cursor/mortgage-regression
fix/public-amy-cors


# =====================================================================
# 55. MAIN BRANCH
# =====================================================================

Do not force push main.

Do not rewrite production branch history.

Prefer:

branch
    ↓
tests
    ↓
PR
    ↓
review
    ↓
merge


# =====================================================================
# 56. PARALLEL AGENT WORK
# =====================================================================

Multiple agents may work simultaneously when tasks are separable.

Good parallelization:

Agent A:
deterministic engine

Agent B:
tests

Agent C:
API integration


Bad parallelization:

Agent A and Agent B both rewriting the same endpoint simultaneously.


# =====================================================================
# 57. AGENT HANDOFF
# =====================================================================

Git is the canonical handoff layer between agents.

Preferred:

Codex
    ↓
branch / commit / PR
    ↓
Cursor reviews
    ↓
Codex fixes
    ↓
human approves


Avoid copying large uncommitted changes manually between agents.


# =====================================================================
# 58. CODE REVIEW
# =====================================================================

When reviewing another agent's work, inspect specifically for:

- architecture violations
- duplicated business logic
- hallucinated APIs
- fabricated values
- insecure secret handling
- broken compatibility
- missing error handling
- missing tests
- weak validation
- oversized refactors
- dead code
- hidden behavior changes


# =====================================================================
# 59. REVIEW AGAINST THIS FILE
# =====================================================================

Every substantial PR should be auditable against AGENTS.md.

A reviewer should be able to ask:

"Does this change preserve TheWing calculates / Amy explains?"

If the answer is unclear, the architecture needs review.


# =====================================================================
# 60. PR REQUIREMENTS
# =====================================================================

A good PR summary should include:

## What changed

Short description.


## Why

Reason for the change.


## Architecture

Relevant design decisions.


## Files changed

Key files only.


## Validation

Exact commands/tests run.


## Compatibility

Any API/UI compatibility considerations.


## Risks

Remaining known issues.


# =====================================================================
# 61. DO NOT HIDE FAILURES
# =====================================================================

If tests fail and cannot be fixed within task scope:

DO NOT claim success.

Report:

- failing command
- failing test
- likely cause
- whether failure existed before changes
- recommended next step


# =====================================================================
# 62. NO FAKE TESTING
# =====================================================================

Never state:

"All tests pass"

unless tests were actually executed.

Never state:

"Build successful"

unless the build actually ran successfully.


# =====================================================================
# 63. NO FAKE REPOSITORY KNOWLEDGE
# =====================================================================

If a file, endpoint, dependency, or API cannot be found:

search.

If still not found:

say it does not appear to exist.

Do not hallucinate repository contents.


# =====================================================================
# 64. DOCUMENTATION
# =====================================================================

Update documentation when changing:

- API contracts
- required environment variables
- architecture
- major module behavior
- setup procedures


Avoid documentation-only churn for trivial internal changes.


# =====================================================================
# 65. PERFORMANCE
# =====================================================================

Avoid unnecessary LLM calls.

Prefer:

deterministic calculation
before
LLM generation


Cache stable deterministic data when appropriate.

Avoid recomputing expensive operations unnecessarily.


# =====================================================================
# 66. COST CONTROL
# =====================================================================

AI usage should be intentional.

Do not send massive irrelevant context to LLM APIs.

Prefer structured compact Truth Packets.

Use deterministic filtering before LLM calls where practical.


# =====================================================================
# 67. MODEL INDEPENDENCE
# =====================================================================

Avoid coupling core business logic to one specific language model.

Model adapters should be replaceable where practical.

Business truth must survive a model-provider change.


# =====================================================================
# 68. PROMPT MANAGEMENT
# =====================================================================

Prompts are application logic and should be treated carefully.

Prefer:

- centralized prompt modules
- clear versions
- structured context
- explicit factual boundaries


Avoid giant duplicated prompt strings across endpoints.


# =====================================================================
# 69. PROMPT INJECTION
# =====================================================================

Treat external/user-provided text as untrusted data.

Never allow user content to redefine:

- system rules
- security boundaries
- source-of-truth rules
- secret handling
- tool permissions


Separate instructions from data.


# =====================================================================
# 70. USER DATA
# =====================================================================

Use minimum necessary user data.

Do not unnecessarily persist:

- financial information
- military profile information
- personal identifiers


Respect public vs authenticated boundaries.


# =====================================================================
# 71. SOURCE QUALITY
# =====================================================================

For official military/financial data, prefer authoritative sources.

Examples include:

- official DoD sources
- DFAS
- official BAH sources
- VA
- official installation sources
- authoritative financial inputs


Do not replace authoritative data with random web values.


# =====================================================================
# 72. STALE DATA
# =====================================================================

Date-sensitive values must have explicit update strategies.

Examples:

- military pay tables
- BAH
- interest rates
- policy
- gate hours
- housing market data


Do not assume static values remain correct indefinitely.


# =====================================================================
# 73. VERSIONING
# =====================================================================

When data schemas or engines have versions, preserve them.

Do not silently alter a versioned schema without considering migration.


# =====================================================================
# 74. BASE JSON COMPATIBILITY
# =====================================================================

Base/location JSON may have a canonical structure used across many
installation files.

Do not remove expected fields merely because a specific base lacks data.

Prefer:

null
[]
{}

as structurally appropriate.


# =====================================================================
# 75. WEBFLOW COMPATIBILITY
# =====================================================================

Remember that some important consumers may exist outside this repository
inside Webflow embeds.

Therefore:

DO NOT assume "no references in repo" automatically means an API field
or event is unused.


For public API or event changes, preserve compatibility unless the task
explicitly authorizes breaking changes.


# =====================================================================
# 76. UI DESIGN RESPONSIBILITY
# =====================================================================

Backend agents should not redesign frontend experiences without explicit
scope.

TheWing's job is primarily:

logic
data
intelligence
APIs

not arbitrary frontend redesign.


# =====================================================================
# 77. ASK AMY UI
# =====================================================================

Ask Amy frontend shells should remain presentation layers.

Do not move authoritative reasoning/calculation into UI JavaScript.


# =====================================================================
# 78. VOICE
# =====================================================================

Voice experiences should consume authoritative structured context.

Do not create a separate conflicting business-logic stack solely for
voice.

Voice is another presentation/output channel.


# =====================================================================
# 79. DECISION ENGINES
# =====================================================================

Decision rules should be:

- inspectable
- deterministic where practical
- separated from prose
- testable


Preferred:

decision-rules.js

rather than embedding every rule inside a prompt.


# =====================================================================
# 80. EXPLAINABILITY
# =====================================================================

Where TheWing produces consequential recommendations, return enough
structured information to understand WHY.

Avoid unexplained:

score: 73

Prefer:

{
  "score": 73,
  "factors": [...],
  "assumptions": [...],
  "warnings": [...]
}


# =====================================================================
# 81. CONFIDENCE
# =====================================================================

Do not manufacture numerical confidence scores unless a real calibrated
method exists.

Use qualitative uncertainty when necessary.


# =====================================================================
# 82. PARTIAL DATA
# =====================================================================

TheWing should degrade gracefully.

Example:

Known:
- rank
- YoS
- base

Unknown:
- expenses
- credit score

Then calculate what is supported and clearly mark what requires more
information.


# =====================================================================
# 83. HUMAN APPROVAL BOUNDARIES
# =====================================================================

Require human approval before:

- production deployment
- destructive database migration
- deleting production data
- changing authentication architecture
- changing billing logic
- rotating secrets
- changing domain configuration
- large irreversible migrations


unless explicitly authorized otherwise.


# =====================================================================
# 84. ARCHITECTURE CHANGES
# =====================================================================

Do not casually change these foundations:

- deterministic-first
- TheWing calculates / Amy explains
- public vs authenticated separation
- Truth Packet concept
- backend source of truth
- thin browser
- fail-open where safe


Major changes require explicit architectural justification.


# =====================================================================
# 85. WHEN REQUIREMENTS ARE AMBIGUOUS
# =====================================================================

Prefer:

1. inspect repository
2. inspect existing pattern
3. preserve architecture
4. make the smallest reasonable assumption


Do not invent elaborate architecture to resolve minor ambiguity.


# =====================================================================
# 86. AUTONOMOUS AGENT BEHAVIOR
# =====================================================================

Agents are expected to continue through normal implementation problems.

Do not stop at the first:

- lint error
- failing test
- missing import
- minor integration issue


Investigate.
Fix.
Retest.


Escalate only when a real product or architectural decision is required.


# =====================================================================
# 87. RESEARCH BEFORE REWRITE
# =====================================================================

For an existing module:

READ IT FULLY BEFORE REPLACING IT.

Do not rewrite a working system based solely on filename assumptions.


# =====================================================================
# 88. PRESERVE WORKING LOGIC
# =====================================================================

If a task affects one feature, do not remove unrelated working behavior.

Regression prevention has priority over code aesthetic preferences.


# =====================================================================
# 89. IMPLEMENTATION PRIORITY
# =====================================================================

Prioritize:

1. correctness
2. data integrity
3. security
4. compatibility
5. testability
6. maintainability
7. performance
8. elegance


Elegance never justifies incorrect output.


# =====================================================================
# 90. CRITICAL INVARIANTS
# =====================================================================

The following are repository invariants unless explicitly changed:

INVARIANT 1
TheWing calculates. Amy explains.

INVARIANT 2
Authoritative calculations are deterministic.

INVARIANT 3
The public browser does not hold authoritative business logic.

INVARIANT 4
The public browser never receives private backend secrets.

INVARIANT 5
LLMs do not fabricate deterministic facts.

INVARIANT 6
Public mode and authenticated mode remain distinct.

INVARIANT 7
Breaking API/event changes require deliberate migration.

INVARIANT 8
A task is not complete until validated.

INVARIANT 9
Unknown data remains unknown.

INVARIANT 10
Human approval remains the production control point.


# =====================================================================
# 91. MODULE MAP
# =====================================================================

When starting a task, classify it into one or more modules.

MODULE: PROFILE
Purpose:
Canonical user/profile normalization.

MODULE: COMPENSATION
Purpose:
Military pay, BAH, BAS, total compensation.

MODULE: PCS
Purpose:
PCS Snapshot, gaining-base intelligence, readiness.

MODULE: BASE DATA
Purpose:
Installation/location structured intelligence.

MODULE: MORTGAGE
Purpose:
Mortgage calculations.

MODULE: AFFORDABILITY
Purpose:
Housing affordability and financial analysis.

MODULE: VA
Purpose:
VA-related deterministic intelligence.

MODULE: AMY
Purpose:
Natural-language intelligence and explanation.

MODULE: PUBLIC GATEWAY
Purpose:
Public AI/API orchestration.

MODULE: AUTH
Purpose:
Authentication and account handling.

MODULE: FINANCIAL INTAKE
Purpose:
Authenticated financial profile persistence.

MODULE: EPB
Purpose:
Enlisted Performance Brief writing intelligence.

MODULE: OPB
Purpose:
Officer Performance Brief writing intelligence.

MODULE: VOICE
Purpose:
Voice presentation of structured intelligence.

MODULE: DECISION
Purpose:
Deterministic decision rules and briefs.

MODULE: DATA
Purpose:
Static/versioned structured source data.

MODULE: TESTS
Purpose:
Verification and regression prevention.


# =====================================================================
# 92. MODULE INTERACTION RULE
# =====================================================================

Preferred:

module
    ↓
well-defined interface
    ↓
module


Avoid:

module reaches into random implementation details of another module.


# =====================================================================
# 93. NEW FEATURE CHECKLIST
# =====================================================================

Before implementing a new feature, answer internally:

- What module owns this?
- What is the source of truth?
- Is the result deterministic?
- Does an engine already exist?
- Does the frontend need this logic?
- What API contract is affected?
- What tests prove correctness?
- What existing consumers can break?
- Does Amy explain or calculate this?


# =====================================================================
# 94. BUG FIX CHECKLIST
# =====================================================================

For bugs:

1. reproduce
2. identify root cause
3. identify scope
4. add regression test when practical
5. fix root cause
6. rerun tests
7. inspect nearby behavior
8. document result


Do not patch symptoms repeatedly when root cause is known.


# =====================================================================
# 95. REFACTOR CHECKLIST
# =====================================================================

Before refactoring:

- confirm tests exist or add coverage
- identify external consumers
- preserve API behavior
- isolate logic
- avoid unrelated changes
- compare outputs before/after


# =====================================================================
# 96. AGENT OUTPUT FORMAT
# =====================================================================

At the end of substantial work, report:

## Completed

What was implemented.


## Architecture

How the implementation fits TheWing.


## Files changed

Important files only.


## Verification

Commands actually executed and their results.


## Compatibility

Any preserved/changed contracts.


## Risks / Follow-up

Only real unresolved issues.


# =====================================================================
# 97. FORBIDDEN COMPLETION LANGUAGE
# =====================================================================

Do not say:

"Everything is perfect."

"Fully production ready."

"All tests pass."

unless the evidence supports the statement.


Prefer precise reporting.


# =====================================================================
# 98. PRODUCT PRINCIPLE
# =====================================================================

TheWing should feel intelligent because it has strong architecture,
not because it hides uncertainty behind confident prose.


# =====================================================================
# 99. ENGINEERING PRINCIPLE
# =====================================================================

Prefer systems that are:

DETERMINISTIC WHERE POSSIBLE
AI-ASSISTED WHERE USEFUL
AUDITABLE BY DESIGN
MODULAR BY DEFAULT
SAFE BY BOUNDARY
TESTABLE BY CONSTRUCTION


# =====================================================================
# 100. FINAL AGENT DIRECTIVE
# =====================================================================

When working in TheWing.ai:

DO NOT merely generate code.

Understand the architecture.
Find the existing source of truth.
Preserve compatibility.
Implement the requested behavior.
Test it.
Fix failures.
Review your own diff.
Report exactly what changed.

Most importantly:

THEWING CALCULATES.
AMY EXPLAINS.
