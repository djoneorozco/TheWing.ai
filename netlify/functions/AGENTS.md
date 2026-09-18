# netlify/functions/AGENTS.md
# TheWing.ai Netlify Functions Engineering Rules
#
# Scope:
# Applies to all code under:
#
#   netlify/functions/**
#
# This file supplements the repository-root AGENTS.md.
#
# If instructions conflict:
#
#   1. More specific nested AGENTS.md rules win for their directory.
#   2. This file governs Netlify Functions implementation details.
#   3. Root AGENTS.md remains the architectural constitution.
#
# Core invariant:
#
#               THEWING CALCULATES.
#                  AMY EXPLAINS.
#
# Netlify Functions are the primary trusted backend execution boundary
# for TheWing.ai public and authenticated server-side logic.


# =====================================================================
# 1. PURPOSE OF THIS DIRECTORY
# =====================================================================

The netlify/functions directory contains server-side functionality for
TheWing.ai.

Typical responsibilities include:

- public API endpoints
- authenticated API endpoints
- deterministic engines
- AI orchestration
- profile normalization
- military compensation calculations
- mortgage calculations
- affordability logic
- VA-related logic
- PCS intelligence
- EPB / OPB generation orchestration
- voice orchestration
- authentication workflows
- Supabase-backed workflows
- decision engines
- structured data access
- Truth Packet construction
- health/debug endpoints
- shared backend utilities


# =====================================================================
# 2. TRUST BOUNDARY
# =====================================================================

Everything in this directory runs in a trusted server-side environment.

However:

TRUSTED SERVER-SIDE does NOT mean TRUST ALL INPUT.

Treat all incoming request data as untrusted.


Never trust:

- request body
- query parameters
- headers
- cookies
- user-supplied JSON
- uploaded text
- LLM output
- browser-provided identity claims
- browser-provided calculated values


Validate and normalize before use.


# =====================================================================
# 3. BACKEND SOURCE OF TRUTH
# =====================================================================

Authoritative calculations should live here or in shared backend modules
called from here.

Examples:

- military compensation
- BAH
- BAS
- mortgage calculations
- affordability calculations
- VA calculations
- rank mappings
- decision rules
- profile normalization
- structured PCS outputs
- EPB deterministic constraints


Do not move authoritative logic into frontend code merely to simplify an
endpoint.


# =====================================================================
# 4. ENDPOINT RESPONSIBILITY
# =====================================================================

A Netlify Function should primarily orchestrate.

Preferred endpoint flow:

REQUEST
    ↓
METHOD / CORS VALIDATION
    ↓
INPUT PARSING
    ↓
INPUT VALIDATION
    ↓
NORMALIZATION
    ↓
AUTHORIZATION IF REQUIRED
    ↓
DETERMINISTIC MODULES
    ↓
TRUTH / DOMAIN OBJECT
    ↓
OPTIONAL LLM
    ↓
RESPONSE FORMATTER
    ↓
RESPONSE


Avoid endpoints that independently implement all domain logic inline.


# =====================================================================
# 5. KNOWN / HISTORICAL FUNCTIONS
# =====================================================================

Known or historically used functions may include:

- agent-amy-public.js
- agent-amy.js
- ask-amy.js
- opensource-brain.js
- login.js
- register.js
- send-code.js
- verify-code.js
- financial-intake.js
- mortgage.js
- profile.js
- decision-brief.js
- voice-base-brief.js
- health.js


This list is NOT guaranteed to be exhaustive or current.

Repository state is authoritative.


Before modifying a named endpoint:

1. verify that it exists
2. inspect the full implementation
3. inspect imports
4. inspect shared modules
5. search all repository callers
6. inspect tests
7. identify external compatibility risk


# =====================================================================
# 6. PUBLIC VS AUTHENTICATED ENDPOINTS
# =====================================================================

Every endpoint should be understood as one of:

PUBLIC
AUTHENTICATED
INTERNAL
ADMIN / PRIVILEGED


Do not blur these categories.


## Public

Public endpoints may be callable without an account.

Examples may include:

- agent-amy-public
- opensource-brain
- mortgage
- public PCS utilities


Public endpoints must:

- never require private browser credentials
- never expose secrets
- validate input
- enforce safe CORS
- avoid privileged Supabase access unless absolutely necessary
- avoid persistent user storage by default


## Authenticated

Authenticated endpoints may use:

- verified session identity
- Supabase user data
- persisted profile
- financial intake
- user history


Authenticated endpoints must:

- authenticate server-side
- authorize resource access
- never trust user_id supplied only by request body
- avoid cross-user data leakage


## Internal / privileged

Internal endpoints should not become public accidentally.

If an endpoint uses:

- service-role access
- privileged mutations
- internal operational controls
- sensitive debugging

then treat it as high risk.


# =====================================================================
# 7. HTTP METHOD HANDLING
# =====================================================================

Each endpoint should explicitly handle allowed methods.

Example:

GET
POST
OPTIONS


Do not silently accept arbitrary HTTP methods.


Preferred pattern:

- OPTIONS → CORS/preflight response
- unsupported method → 405
- supported method → normal execution


Do not perform mutations via GET.


# =====================================================================
# 8. REQUEST BODY PARSING
# =====================================================================

Request parsing must be defensive.

Never assume:

event.body

contains valid JSON.


Handle:

- missing body
- empty body
- malformed JSON
- wrong content type
- unexpected shape


Do not allow malformed JSON to produce uncontrolled 500 responses when
a clear 400 response is appropriate.


# =====================================================================
# 9. INPUT VALIDATION
# =====================================================================

Validate before business logic.

Examples:

rank:
- expected string / supported value

yos:
- numeric
- supported range

dependents_count:
- integer
- >= 0

home price:
- numeric
- non-negative
- bounded when necessary

credit score:
- numeric
- sensible supported range

base:
- canonical or resolvable installation identifier


Reject or normalize invalid values intentionally.


# =====================================================================
# 10. NORMALIZATION
# =====================================================================

Normalization should occur centrally where practical.

Do not allow every endpoint to independently implement different
versions of:

- rank parsing
- family parsing
- base parsing
- YoS parsing
- profile merging
- dependent detection


Prefer shared functions such as conceptually:

normalizeProfile()
normalizeRank()
normalizeBase()
normalizeFinancialInput()


Use actual existing module names when available.


# =====================================================================
# 11. CANONICAL PROFILE
# =====================================================================

Where applicable, functions should operate on a normalized canonical
profile.

Potential fields include:

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


Do not assume all fields are always present.


# =====================================================================
# 12. PUBLIC AMY GATEWAY
# =====================================================================

Unless current repository architecture proves otherwise:

netlify/functions/agent-amy-public.js

should be treated as the primary public Amy gateway.


Its responsibilities may include:

1. validate request
2. normalize profile
3. determine intent
4. select deterministic tools/modules
5. execute those modules
6. construct Truth Packet
7. call LLM if useful
8. produce public-safe response
9. preserve fail-open behavior
10. enforce CORS
11. avoid leaking secrets


Do not casually bypass agent-amy-public with direct browser → model calls.


# =====================================================================
# 13. AMY'S ROLE
# =====================================================================

Amy explains.

Amy may:

- summarize
- classify
- explain
- organize
- rewrite
- identify next steps
- compare supported scenarios
- ask for missing inputs
- translate structured outputs into natural language


Amy must not independently invent authoritative domain values.


# =====================================================================
# 14. DETERMINISTIC-FIRST
# =====================================================================

When a deterministic module exists, use it.

Do not ask the LLM:

"What is the BAH?"

when TheWing has an authoritative BAH module.


Do not ask the LLM:

"What is the mortgage payment?"

when a mortgage engine exists.


Do not ask the LLM:

"What should this E-7's expected responsibility level be?"

when a rank-tier module exists.


# =====================================================================
# 15. TRUTH PACKET
# =====================================================================

LLM-facing endpoints should prefer structured Truth Packets.

Conceptual structure:

{
  "profile_summary": {},
  "compensation": {},
  "housing_inputs": {},
  "mortgage": {},
  "affordability": {},
  "pcs": {},
  "location": {},
  "decision_context": {},
  "verdict": {},
  "va_loan": {},
  "next_action": {},
  "missing_inputs": [],
  "warnings": [],
  "sources": []
}


Do not dump uncontrolled raw server state into model prompts.


# =====================================================================
# 16. TRUTH PACKET RULES
# =====================================================================

Truth Packets should clearly separate:

KNOWN
UNKNOWN
CALCULATED
ASSUMED
UNAVAILABLE


Unknown values must not silently become:

0
false
"none"

unless that value is semantically correct.


# =====================================================================
# 17. FAIL-OPEN
# =====================================================================

The backend should fail open when:

- a non-critical intelligence component fails
- useful deterministic information remains available
- continuing is safe


Example:

compensation succeeds
mortgage succeeds
market commentary fails

Preferred:
return partial useful response.

Not preferred:
500 entire request.


# =====================================================================
# 18. FAIL-CLOSED
# =====================================================================

Fail-open does NOT apply to security boundaries.

Fail closed for:

- failed authentication
- failed authorization
- invalid privileged token
- destructive operations
- sensitive account operations
- security-sensitive mutations


Security wins over convenience.


# =====================================================================
# 19. PARTIAL RESPONSE
# =====================================================================

When returning partial data, consider structured indicators such as:

{
  "ok": true,
  "partial": true,
  "data": {},
  "warnings": [],
  "unavailable": []
}


Preserve existing response contracts if they differ.


# =====================================================================
# 20. RESPONSE CONTRACTS
# =====================================================================

Do not casually change:

- JSON field names
- field types
- nesting
- status codes
- error structure
- response semantics


External Webflow consumers may depend on these even if repo search finds
no references.


# =====================================================================
# 21. BACKWARD COMPATIBILITY
# =====================================================================

Before removing or renaming a response field:

1. search repository
2. inspect docs
3. inspect tests
4. inspect known frontend integrations
5. consider Webflow usage
6. preserve legacy aliases when practical


Adding a new canonical key while temporarily preserving an old key is
often safer than immediate replacement.


# =====================================================================
# 22. CORS
# =====================================================================

Public Netlify Functions may be called by external frontend origins.

Preserve existing CORS behavior unless explicitly tasked otherwise.


At minimum consider:

Access-Control-Allow-Origin
Access-Control-Allow-Methods
Access-Control-Allow-Headers


Handle OPTIONS consistently.


Do not accidentally combine:

Access-Control-Allow-Origin: *

with credentialed cross-origin requests if that architecture requires
credentials.


# =====================================================================
# 23. CORS CENTRALIZATION
# =====================================================================

If multiple endpoints contain identical CORS boilerplate, prefer a
shared helper when such refactoring is low risk.


Do not refactor all endpoints solely for style while fixing one bug.


# =====================================================================
# 24. SECURITY HEADERS
# =====================================================================

Where appropriate, preserve or add safe response headers.

Do not remove security-related headers without understanding why they
exist.


# =====================================================================
# 25. ENVIRONMENT VARIABLES
# =====================================================================

All secrets and environment-specific configuration must come from
server-side environment variables.


Examples may include:

- OpenAI API credentials
- Supabase URL
- Supabase keys
- service-role keys
- voice provider credentials
- internal tokens


Never hardcode secrets.


# =====================================================================
# 26. ENVIRONMENT VARIABLE DISCOVERY
# =====================================================================

Before creating a new environment variable:

1. search repository for an existing equivalent
2. follow naming conventions
3. document the new variable
4. define failure behavior if missing
5. never log its value


# =====================================================================
# 27. OPENAI / MODEL CALLS
# =====================================================================

Model calls must be server-side.

Public frontend code must not receive private OpenAI credentials.


Before adding a new model call, determine:

- why AI is necessary
- whether deterministic logic can solve the task
- what context is required
- what context is unnecessary
- expected structured output
- failure behavior
- cost implications


# =====================================================================
# 28. MODEL INDEPENDENCE
# =====================================================================

Avoid placing core business logic directly inside vendor-specific call
sites.

Preferred:

domain data
    ↓
prompt builder / adapter
    ↓
model client
    ↓
response parser


This makes future model changes safer.


# =====================================================================
# 29. MODEL OUTPUT IS UNTRUSTED
# =====================================================================

LLM output is not authoritative server truth.

Validate structured model output when required.


Do not allow model-generated values to directly mutate:

- financial records
- profile truth
- entitlements
- official calculations
- database permissions


without validation.


# =====================================================================
# 30. STRUCTURED OUTPUT
# =====================================================================

When the downstream system expects structured data, prefer schema-driven
model output where available.

Do not rely on fragile free-form parsing when structured output is
supported.


# =====================================================================
# 31. PROMPT INJECTION
# =====================================================================

User-provided content is data.

Do not allow user text to override:

- system rules
- domain constraints
- security policies
- tool permissions
- source-of-truth hierarchy


Keep trusted instructions clearly separated from untrusted content.


# =====================================================================
# 32. PROMPT DESIGN
# =====================================================================

Prompts should:

- state the role
- state factual boundaries
- include structured truth
- mark missing data
- distinguish facts from user text
- specify output format
- discourage unsupported inference


Do not bury deterministic rules inside hundreds of lines of prose when
they can be enforced in code.


# =====================================================================
# 33. PROMPT CENTRALIZATION
# =====================================================================

Avoid copy/pasting large prompts into multiple functions.

Prefer shared prompt builders where practical.


Example conceptual modules:

buildAmySystemPrompt()
buildEPBPrompt()
buildDecisionBriefPrompt()


Use actual repo conventions.


# =====================================================================
# 34. SHARED BACKEND MODULES
# =====================================================================

Shared logic should generally live in established shared directories.

Potential locations:

netlify/functions/_share/
netlify/functions/shared/


Inspect existing repository structure before creating a new directory.


# =====================================================================
# 35. _share DIRECTORY
# =====================================================================

If `_share/` exists, prefer it for reusable backend logic such as:

- engines
- normalizers
- decision rules
- model adapters
- response helpers
- shared validation
- data loading
- policy modules


Do not duplicate equivalent logic across function entrypoints.


# =====================================================================
# 36. DOMAIN ENGINES
# =====================================================================

Likely or historical deterministic modules may include concepts such as:

- official-pay
- pay-engine
- official-bah
- mortgage-engine
- affordability-engine
- official-retirement
- official-va
- decision-rules
- profile-normalizer
- compensation-context


Use repository inspection to find actual modules.


# =====================================================================
# 37. COMPENSATION
# =====================================================================

Military compensation must remain deterministic.


Never allow the LLM to independently generate:

- official base pay
- BAH
- BAS
- official retirement amounts
- official disability amounts


Compensation endpoints should return machine-readable components where
practical.


# =====================================================================
# 38. RANK HANDLING
# =====================================================================

Rank parsing should be centralized.

Avoid duplicating mappings such as:

E-1
E-2
...
O-10

across multiple functions.


If display names are needed, use canonical shared mappings.


# =====================================================================
# 39. YEARS OF SERVICE
# =====================================================================

YoS values must be validated and normalized.

Do not silently accept impossible or unsupported values.


Use pay-table breakpoint logic from deterministic modules rather than
LLM inference.


# =====================================================================
# 40. BAH
# =====================================================================

BAH logic must use approved structured data / deterministic modules.

Inputs may include:

- location/base
- rank
- dependency status
- year


Never derive official BAH from model memory.


# =====================================================================
# 41. BAS
# =====================================================================

BAS must use deterministic values/data.

Do not assume enlisted and officer values are interchangeable.


# =====================================================================
# 42. MORTGAGE
# =====================================================================

Mortgage functions should delegate calculations to mortgage modules.

Expected concepts may include:

- purchase price
- down payment
- loan amount
- interest rate
- term
- principal and interest
- taxes
- insurance
- PMI
- total monthly housing cost


Avoid inline duplicated formulas across endpoints.


# =====================================================================
# 43. MORTGAGE CONTRACT COMPATIBILITY
# =====================================================================

Historically expected response fields may include:

{
  "loan_amount": ...,
  "principal_interest": ...,
  "taxes_monthly": ...,
  "insurance_monthly": ...,
  "pmi_monthly": ...,
  "totalMonthly": ...
}


Do not rename these blindly.

Search callers first.


# =====================================================================
# 44. FINANCIAL PRECISION
# =====================================================================

Define rounding intentionally.

Avoid inconsistent rounding between:

- engine
- endpoint
- frontend


Prefer calculations with full precision internally and formatting at the
presentation boundary unless domain rules require otherwise.


# =====================================================================
# 45. AFFORDABILITY
# =====================================================================

Affordability outputs should expose assumptions where practical.

Examples:

- income considered
- debt considered
- housing cost
- ratio thresholds
- rate assumption
- insurance assumption
- taxes


Do not return unexplained affordability conclusions.


# =====================================================================
# 46. VA
# =====================================================================

VA-related authoritative rules belong in deterministic modules.

Amy may explain VA results but must not become the authoritative VA
calculator.


# =====================================================================
# 47. PCS / OPENSOURCE BRAIN
# =====================================================================

Public PCS Snapshot logic should remain:

- deterministic-first
- memory-friendly
- profile-normalized
- safe without account persistence


A canonical wrapper may use:

{
  "tool": "PCS_SNAPSHOT",
  "input": {
    ...
  }
}


Preserve current actual contracts if different.


# =====================================================================
# 48. BASICBRAIN INTEGRATION
# =====================================================================

BasicBrain is an input initializer / PCS snapshot experience.

Backend responsibilities may include calculating:

- base pay
- BAH
- BAS
- total compensation
- initial location intelligence
- affordability context


Do not require frontend calculation duplication.


# =====================================================================
# 49. BASE DATA
# =====================================================================

Base data should be read from canonical structured data where available.

Do not fabricate installation information.


Important categories may include:

- official base name
- city/state
- gates
- housing
- services
- neighborhoods
- commute intelligence
- market information
- official links


# =====================================================================
# 50. DYNAMIC BASE DATA
# =====================================================================

Treat these as potentially dynamic:

- gate hours
- gate closures
- visitor center hours
- commute times
- market values
- rental data


Static JSON should not falsely imply permanent accuracy.


# =====================================================================
# 51. DATA FILE LOADING
# =====================================================================

When loading files under:

netlify/functions/data/**
netlify/functions/cities/**

or similar:

- validate existence
- handle missing file gracefully
- avoid path traversal
- preserve deployment compatibility
- avoid expensive repeated parsing when unnecessary


# =====================================================================
# 52. DATA SCHEMA COMPATIBILITY
# =====================================================================

Do not casually remove structured fields from canonical base/city JSON.

Consumers may depend on shape even when values are null.


# =====================================================================
# 53. EPB / OPB
# =====================================================================

Performance writing functions require strict factual boundaries.

Canonical framework:

ACTION → SCOPE → RESULT → IMPACT


Never fabricate:

- metrics
- scope
- awards
- savings
- readiness effects
- people led
- dollars saved
- time saved
- rankings
- mission effects


# =====================================================================
# 54. EPB MODES
# =====================================================================

STRICT:
- closest to user facts
- minimal inference
- clarity and grammar improvements

BALANCED:
- stronger structure/tone
- all claims still supported

COMPETITIVE:
- strongest defensible framing
- no exaggeration
- no invented facts


# =====================================================================
# 55. EPB MULTIPLE OPTIONS
# =====================================================================

When generating multiple statements, outputs must be materially
different.

Do not generate three nearly identical statements with verb swaps only.


# =====================================================================
# 56. RANK TIER
# =====================================================================

If rank-tier.js or equivalent exists:

use it to determine expected responsibility framing.

Do NOT use it to claim actions that the user did not provide.


Example:

Rank may support stronger organizational framing.

Rank alone does not prove organizational impact occurred.


# =====================================================================
# 57. IMPACT ENGINE
# =====================================================================

If impact-engine.js or equivalent exists:

use it to connect supported:

ACTION
RESULT
MISSION EFFECT


Do not manufacture impact merely to make a statement sound stronger.


# =====================================================================
# 58. UNIVERSAL WRITING LOGIC
# =====================================================================

If universal.js or equivalent exists:

prefer shared writing logic over endpoint duplication.


Do not fork the same EPB writing rules into:

epb.js
ask-amy.js
agent-amy.js
decision-brief.js

unless intentionally designed.


# =====================================================================
# 59. AUTHENTICATION
# =====================================================================

Authentication functions may include:

- login
- register
- send-code
- verify-code


Never:

- log passwords
- log verification codes
- expose internal auth provider errors unnecessarily
- trust browser-provided authorization claims


# =====================================================================
# 60. SESSION HANDLING
# =====================================================================

Use established authentication/session architecture.

Do not invent a second session system during unrelated work.


# =====================================================================
# 61. SUPABASE
# =====================================================================

Supabase may be used server-side for authenticated functionality.

Service-role credentials:

MUST remain server-side.


Never return them to clients.

Never commit them.

Never log them.


# =====================================================================
# 62. SUPABASE AUTHORIZATION
# =====================================================================

Authentication is not authorization.

Even after identifying a valid user:

verify that the user is allowed to access or modify the requested
resource.


# =====================================================================
# 63. FINANCIAL INTAKE
# =====================================================================

Financial intake is sensitive.

Validate:

- ownership
- field types
- supported ranges
- update semantics


Do not expose another user's intake.


Avoid logging full financial payloads.


# =====================================================================
# 64. PROFILE ENDPOINTS
# =====================================================================

Profile responses should expose only fields appropriate for the client.

Do not return internal-only metadata or credentials.


# =====================================================================
# 65. VOICE
# =====================================================================

Voice endpoints should consume existing structured intelligence.

Avoid building separate calculation logic for voice.


Preferred:

deterministic result
    ↓
voice-specific explanation
    ↓
speech generation / delivery


# =====================================================================
# 66. VOICE-BASE-BRIEF
# =====================================================================

If voice-base-brief.js is current:

preserve its current endpoint contract unless explicitly changing it.


Do not revive deprecated voice endpoints without repository evidence or
explicit instruction.


# =====================================================================
# 67. DECISION BRIEFS
# =====================================================================

Decision briefs should be based on structured data.

Prefer:

facts
+
decision rules
+
explicit assumptions
+
LLM explanation


over:

LLM receives raw question and invents recommendation.


# =====================================================================
# 68. DECISION RULES
# =====================================================================

Reusable deterministic decision logic belongs in shared modules.

Decision rules should be:

- inspectable
- testable
- versionable
- explainable


# =====================================================================
# 69. HEALTH ENDPOINT
# =====================================================================

Health endpoints should be cheap and safe.


Do not expose:

- environment variables
- secrets
- internal infrastructure details
- stack traces
- database credentials


A health endpoint may verify service availability without disclosing
sensitive internals.


# =====================================================================
# 70. ERROR HANDLING
# =====================================================================

Public errors should be useful but sanitized.


Preferred categories:

400 → invalid request
401 → unauthenticated
403 → unauthorized
404 → unavailable/not found
405 → unsupported method
409 → conflict when applicable
429 → rate limited when applicable
500 → unexpected server failure
503 → dependency unavailable when applicable


Preserve established endpoint behavior where compatibility matters.


# =====================================================================
# 71. ERROR RESPONSE SHAPE
# =====================================================================

Prefer consistent structured errors, conceptually:

{
  "ok": false,
  "error": {
    "code": "...",
    "message": "..."
  }
}


Do not expose raw stack traces publicly.


# =====================================================================
# 72. INTERNAL ERROR LOGGING
# =====================================================================

Internal logs may include:

- function name
- error category
- correlation/request id
- safe diagnostic metadata


Avoid sensitive request contents.


# =====================================================================
# 73. LOGGING
# =====================================================================

Use logs intentionally.

Good:

[agent-amy-public] mortgage engine unavailable

Bad:

dumping the entire request, profile, secrets, and prompt by default.


# =====================================================================
# 74. CORRELATION IDS
# =====================================================================

If the repository already uses request IDs / correlation IDs, preserve
them.

If debugging complex distributed behavior, adding a safe correlation ID
may be helpful.


Do not undertake a repository-wide observability rewrite unless tasked.


# =====================================================================
# 75. TIMEOUTS
# =====================================================================

Serverless functions have execution limits.

Avoid uncontrolled loops.

Avoid indefinite retries.

Avoid unnecessary sequential model/tool calls.


Use bounded retries when needed.


# =====================================================================
# 76. RETRIES
# =====================================================================

Retry only when failure is plausibly transient.

Examples:

- temporary upstream network failure
- rate-limited dependency, if safe


Do not retry:

- authentication failure
- invalid input
- deterministic validation failure


Use bounded retry counts.


# =====================================================================
# 77. MODEL RETRIES
# =====================================================================

Do not repeatedly call expensive models without a reason.

If retrying model output:

- bound attempts
- clarify why retry is needed
- avoid creating uncontrolled cost loops


# =====================================================================
# 78. NETWORK CALLS
# =====================================================================

External network calls should have:

- clear purpose
- error handling
- timeout behavior when supported
- safe fallback


Do not add external dependencies when canonical local data already
exists.


# =====================================================================
# 79. COST CONTROL
# =====================================================================

Every model call has cost.

Reduce unnecessary:

- duplicated prompts
- huge context
- repeated deterministic data
- repeated model calls


Prefer compact structured truth.


# =====================================================================
# 80. TOKEN DISCIPLINE
# =====================================================================

Do not send the entire repository or massive data files into a model
prompt when only a subset is needed.


Filter first.


# =====================================================================
# 81. PERFORMANCE
# =====================================================================

Avoid repeated expensive operations inside one request.

Examples:

- reading the same file multiple times
- recalculating identical values
- invoking the same model repeatedly
- repeated database reads without need


# =====================================================================
# 82. CACHING
# =====================================================================

Cache only when data semantics support it.

Be cautious with:

- user-specific financial data
- dynamic market data
- authentication state


Static official tables may be better caching candidates.


# =====================================================================
# 83. DATE-SENSITIVE DATA
# =====================================================================

Date-sensitive engines should know what year/version they are using.

Examples:

- military pay
- BAH
- VA rates
- policy thresholds


Do not silently use stale data.


# =====================================================================
# 84. TIME / DATE
# =====================================================================

Avoid relying on ambiguous local server time when date semantics matter.

Use explicit dates/time zones where relevant.


# =====================================================================
# 85. DEPENDENCIES
# =====================================================================

Do not add dependencies unnecessarily.

Before adding one:

1. check existing package.json
2. check native runtime capabilities
3. assess bundle/deployment size
4. assess maintenance/security
5. verify Netlify compatibility


# =====================================================================
# 86. COMMONJS VS ESM
# =====================================================================

Follow the repository's existing module system.

Do not randomly convert:

require/module.exports

to:

import/export

inside a narrow task unless needed.


Mixed module changes can break Netlify deployment.


# =====================================================================
# 87. NODE VERSION
# =====================================================================

Inspect project configuration before using APIs that require a newer
Node runtime.


Do not assume the latest Node version is deployed.


# =====================================================================
# 88. NETLIFY COMPATIBILITY
# =====================================================================

Before using runtime-specific behavior, inspect:

- netlify.toml
- package.json
- function configuration
- deployment settings in repo


Do not assume local behavior exactly matches Netlify.


# =====================================================================
# 89. FUNCTION EXPORT STYLE
# =====================================================================

Preserve the function export convention already used by the repository.

Do not rewrite every endpoint simply to adopt a newer style.


# =====================================================================
# 90. LOCAL TESTING
# =====================================================================

When modifying functions, run relevant existing tests.

Where practical, also test:

- valid request
- invalid request
- unsupported method
- missing env variable
- dependency failure
- malformed JSON


# =====================================================================
# 91. CONTRACT TESTING
# =====================================================================

Critical endpoints should protect:

- status codes
- response keys
- field types
- CORS
- error behavior


This is especially important because Webflow clients may be external to
the repository.


# =====================================================================
# 92. REGRESSION TESTS
# =====================================================================

When fixing a backend bug:

reproduce
    ↓
write failing test if practical
    ↓
fix
    ↓
test passes


Do not rely solely on manual inspection.


# =====================================================================
# 93. MOCKING
# =====================================================================

Mock external services when unit testing:

- model APIs
- Supabase
- voice providers
- network dependencies


Do not mock deterministic engines in tests whose purpose is to verify
those engines.


# =====================================================================
# 94. FIXTURE QUALITY
# =====================================================================

Use realistic but non-sensitive fixtures.


Never place:

- real credentials
- private personal data
- production user data

inside test fixtures.


# =====================================================================
# 95. TESTING AI ENDPOINTS
# =====================================================================

Do not require exact prose matching unless necessary.

Prefer testing:

- structure
- factual constraints
- required fields
- forbidden fabrication
- deterministic values
- fallback behavior


# =====================================================================
# 96. TESTING FAIL-OPEN
# =====================================================================

Where an endpoint is designed to fail open, test dependency failure.


Example:

mortgage works
market module throws
Amy still returns useful supported response


# =====================================================================
# 97. TESTING SECURITY
# =====================================================================

For authenticated endpoints, test:

- missing auth
- invalid auth
- wrong user
- valid user
- unauthorized resource access


# =====================================================================
# 98. TESTING NULLS
# =====================================================================

Test missing/unknown data explicitly.

Ensure:

unknown != 0

unless zero is actually correct.


# =====================================================================
# 99. TESTING EPB FABRICATION
# =====================================================================

EPB/OPB tests should actively verify that unsupported numbers are not
invented.


Example input:

"Led team improving process."

Model output must not invent:

"Led 25 Airmen, saving 1,200 hours and $2.4M."

unless those facts were supplied.


# =====================================================================
# 100. BEFORE MODIFYING A FUNCTION
# =====================================================================

Complete this discovery process:

1. read the whole function
2. inspect imported modules
3. search all references to endpoint
4. inspect related tests
5. inspect CORS behavior
6. inspect response contract
7. inspect environment variables
8. inspect external dependency usage
9. identify deterministic logic
10. identify AI logic


Then modify.


# =====================================================================
# 101. BEFORE CREATING A FUNCTION
# =====================================================================

Search first.

Determine whether:

- an equivalent endpoint exists
- a shared endpoint can be extended
- a module already handles the logic
- a new route is actually necessary


Avoid endpoint proliferation.


# =====================================================================
# 102. FUNCTION NAMING
# =====================================================================

Follow existing function naming convention.

Do not create near-duplicates like:

ask-amy-new.js
ask-amy-v2-final.js
agent-amy-newest.js


Use deliberate versioning only when required.


# =====================================================================
# 103. DUPLICATE LOGIC
# =====================================================================

If two functions contain the same domain calculations:

prefer moving the calculation into a shared module.


Do not maintain multiple sources of truth.


# =====================================================================
# 104. DUPLICATE PROMPTS
# =====================================================================

If multiple endpoints use equivalent large prompts:

consider centralizing them.


Do not perform broad prompt refactors during unrelated bug fixes.


# =====================================================================
# 105. DEPRECATED ENDPOINTS
# =====================================================================

Do not delete an old endpoint solely because a newer one exists.

Confirm:

- no callers
- no external Webflow dependency
- no documentation dependency
- no compatibility requirement


# =====================================================================
# 106. PUBLIC API STABILITY
# =====================================================================

Treat public endpoints as externally consumed APIs.

Breaking changes should be deliberate.


Possible migration approach:

old field preserved
+
new field introduced
+
consumer migration
+
old field eventually removed


# =====================================================================
# 107. DATABASE MUTATIONS
# =====================================================================

Database writes must be intentional.


Never let an LLM autonomously decide to persist arbitrary generated
content as canonical user truth without validation.


# =====================================================================
# 108. IDEMPOTENCY
# =====================================================================

Where appropriate, mutations should consider duplicate/retry behavior.

Examples:

- financial intake save
- registration steps
- verification
- event processing


Avoid accidental duplicate records.


# =====================================================================
# 109. AUTH FLOWS
# =====================================================================

Auth flows should not reveal whether sensitive account details exist
more than necessary.


Avoid leaking internal auth state through overly specific errors when
security implications exist.


# =====================================================================
# 110. RATE LIMITING
# =====================================================================

If the architecture already supports rate limiting, preserve it.

High-cost endpoints may benefit from protection against abuse.


Do not implement ad-hoc client-side rate limiting as the only defense.


# =====================================================================
# 111. ABUSE BOUNDARIES
# =====================================================================

Model-backed public endpoints should assume hostile or excessive usage is
possible.

Protect:

- API costs
- privileged tools
- database mutations
- internal prompts
- environment details


# =====================================================================
# 112. INTERNAL PROMPTS
# =====================================================================

Do not return system prompts or hidden internal instructions in public
API responses.


# =====================================================================
# 113. INTERNAL ERRORS
# =====================================================================

Do not return:

process.env
raw upstream errors
stack traces
full SQL errors
internal network topology


to public clients.


# =====================================================================
# 114. FILE PATH SECURITY
# =====================================================================

Do not construct arbitrary filesystem paths directly from user input.

Protect against path traversal.


# =====================================================================
# 115. EXTERNAL URL FETCHING
# =====================================================================

If an endpoint fetches a user-supplied URL:

consider SSRF risk.


Do not allow unrestricted internal-network access through fetch proxies.


# =====================================================================
# 116. HTML / MARKDOWN
# =====================================================================

If generated text will be rendered as HTML:

sanitize appropriately at the correct boundary.


Do not assume LLM-generated HTML is trusted.


# =====================================================================
# 117. JSON SERIALIZATION
# =====================================================================

Return valid JSON.

Avoid accidentally returning:

undefined
NaN
Infinity

in API structures.


Normalize these values appropriately.


# =====================================================================
# 118. NUMERIC INPUTS
# =====================================================================

Beware:

Number("")
Number(null)
parseInt("6abc")


Do not rely on permissive conversion without validation.


# =====================================================================
# 119. BOOLEAN INPUTS
# =====================================================================

Do not assume:

"false"

is false.


Normalize string booleans explicitly when accepting them.


# =====================================================================
# 120. DEPENDENT LOGIC
# =====================================================================

Keep distinctions clear between:

dependents_count
has_dependents
family


Do not infer inconsistent values in multiple places.


# =====================================================================
# 121. BASE IDENTIFIERS
# =====================================================================

Installation names may have aliases.

Prefer centralized mapping between:

display name
slug
legacy name
canonical identifier


# =====================================================================
# 122. FIELD ALIASES
# =====================================================================

If supporting legacy aliases such as:

base
selected_base
pcs_base


normalize them centrally.


Avoid repeatedly choosing precedence differently across endpoints.


# =====================================================================
# 123. FIELD PRECEDENCE
# =====================================================================

If aliases exist, define precedence explicitly.

Do not let object merge order accidentally determine canonical truth.


# =====================================================================
# 124. OBJECT MERGING
# =====================================================================

Be careful when merging:

stored profile
request overrides
defaults
derived values


Preferred conceptual order:

safe defaults
    ↓
stored canonical profile
    ↓
validated user updates
    ↓
derived deterministic values


But preserve existing intended semantics.


# =====================================================================
# 125. DERIVED VALUES
# =====================================================================

Do not accept user-supplied derived values as authoritative when the
server can calculate them.


Example:

User may send rank + YoS.

Server calculates base pay.


Do not trust a browser-provided basePay as canonical.


# =====================================================================
# 126. DEMO VALUES
# =====================================================================

Do not allow demo defaults such as:

E-5
6 YoS
Lackland

to silently overwrite real users.


Demo initialization belongs at presentation/testing boundaries.


# =====================================================================
# 127. AI FALLBACK
# =====================================================================

If an LLM call fails:

return deterministic information when useful.

Do not throw away valid calculations solely because explanation failed.


# =====================================================================
# 128. DETERMINISTIC FAILURE
# =====================================================================

If authoritative calculation fails:

do not ask Amy to guess the missing number.


Return it as unavailable.


# =====================================================================
# 129. UPSTREAM DATA FAILURE
# =====================================================================

If canonical source data is unavailable:

- report limitation
- avoid fabrication
- preserve available information


# =====================================================================
# 130. SOURCE METADATA
# =====================================================================

Where useful, domain results should carry metadata such as:

- year
- source
- version
- updated_at


Especially for date-sensitive official data.


# =====================================================================
# 131. EXPLAINABILITY
# =====================================================================

Backend decisions should expose enough structure for the frontend/Amy to
explain why.


Avoid opaque final decisions with no factors.


# =====================================================================
# 132. NO FAKE CONFIDENCE
# =====================================================================

Do not invent percentages such as:

"92% confident"

unless a real calibrated mechanism exists.


# =====================================================================
# 133. NO SILENT POLICY
# =====================================================================

If a deterministic rule affects a consequential outcome, prefer a named,
testable rule rather than hidden prompt wording.


# =====================================================================
# 134. MODEL TEMPERATURE / RANDOMNESS
# =====================================================================

Use lower randomness for:

- structured outputs
- factual explanation
- constrained military writing
- deterministic-adjacent tasks


Higher creativity should be deliberate, not accidental.


Follow existing model client conventions.


# =====================================================================
# 135. MODEL SELECTION
# =====================================================================

Do not change models merely because a newer model exists.

Consider:

- quality
- cost
- latency
- structured-output support
- compatibility
- task type


Model upgrades should be deliberate.


# =====================================================================
# 136. LATENCY
# =====================================================================

Public UX matters.

Avoid sequentially calling multiple AI models when one can handle the
necessary explanation after deterministic work is complete.


# =====================================================================
# 137. PARALLELISM
# =====================================================================

Independent deterministic operations may be run in parallel when safe.

Example:

compensation
mortgage
location lookup


Only parallelize when:

- dependencies allow it
- error handling remains understandable
- cost/latency improves


# =====================================================================
# 138. PROMISE HANDLING
# =====================================================================

Avoid unhandled promise rejections.

Use explicit async error handling.


# =====================================================================
# 139. RESOURCE CLEANUP
# =====================================================================

If a function creates temporary resources/connections, clean them up
appropriately.


# =====================================================================
# 140. MIGRATIONS
# =====================================================================

Do not perform destructive production schema changes from a Netlify
Function task unless explicitly authorized.


# =====================================================================
# 141. FEATURE FLAGS
# =====================================================================

If a high-risk feature is introduced, consider established feature flag
patterns if the repo uses them.


Do not create a parallel flag framework unnecessarily.


# =====================================================================
# 142. EXPERIMENTAL LOGIC
# =====================================================================

Experimental behavior must not silently replace production truth.


Isolate experiments clearly.


# =====================================================================
# 143. DEBUG CODE
# =====================================================================

Remove temporary:

console dumps
hardcoded test payloads
debug bypasses
fake auth
mock secrets


before completion.


# =====================================================================
# 144. SECURITY BYPASS
# =====================================================================

Never disable:

authentication
authorization
validation
CORS controls
secret protections

merely to get tests passing.


Fix the underlying issue.


# =====================================================================
# 145. TEST BYPASS
# =====================================================================

Do not:

- comment out failing tests
- mark critical tests skipped
- weaken assertions

just to declare success.


# =====================================================================
# 146. BUILD VALIDATION
# =====================================================================

Inspect available scripts.

Run the strongest relevant checks.


Examples only:

npm test
npm run lint
npm run typecheck
npm run build
npm run verify


Do not claim commands were run unless they actually were.


# =====================================================================
# 147. FUNCTION-SPECIFIC VALIDATION
# =====================================================================

For every changed endpoint, validate at least:

- supported method
- valid request
- invalid input
- error path
- expected response shape


And where relevant:

- auth
- CORS
- fail-open
- model failure
- deterministic-module failure


# =====================================================================
# 148. PR REVIEW CHECKLIST
# =====================================================================

Before completing backend work, review the diff for:

[ ] authoritative logic remains server-side

[ ] deterministic logic was reused

[ ] no duplicate source of truth created

[ ] no secrets exposed

[ ] no auth boundary weakened

[ ] no CORS regression

[ ] no unintentional API contract break

[ ] no unsupported user facts invented

[ ] errors are sanitized

[ ] tests were run

[ ] model calls are necessary

[ ] cost is reasonable

[ ] fail-open/fail-closed behavior is correct


# =====================================================================
# 149. FUNCTION CHANGE REPORT
# =====================================================================

At completion report:

## Endpoint(s)

Which function entrypoints changed.


## Shared modules

Which backend modules changed.


## Contract

What request/response behavior changed, if anything.


## Security

Any auth/CORS/secret implications.


## Verification

Exact tests/commands run.


## Risks

Known unresolved issues only.


# =====================================================================
# 150. AGENT AUTONOMY
# =====================================================================

Agents are expected to resolve normal implementation issues.

Do not stop immediately for:

- missing import
- syntax error
- failing local test
- simple contract mismatch
- straightforward lint error


Investigate.
Fix.
Retest.


Escalate when the decision requires genuine product intent or would alter
a major architectural boundary.


# =====================================================================
# 151. HUMAN APPROVAL REQUIRED
# =====================================================================

Do not autonomously perform high-impact production changes such as:

- production database deletion
- production schema destruction
- secret rotation
- auth architecture replacement
- domain/DNS changes
- direct production deployment with irreversible behavior
- billing changes
- destructive data migration


without explicit authorization.


# =====================================================================
# 152. NO ASSUMED PRODUCTION ACCESS
# =====================================================================

Even if credentials appear available, do not assume the task authorizes
production mutation.


Code access != deployment authorization.


# =====================================================================
# 153. ARCHITECTURE PROTECTION
# =====================================================================

Do not redesign the backend merely because another architecture seems
cleaner.


The existing TheWing architecture values:

- deterministic-first
- modular engines
- thin clients
- Truth Packets
- Amy as explanation layer
- public/auth separation
- compatibility
- graceful degradation


Preserve these unless explicitly tasked otherwise.


# =====================================================================
# 154. REPOSITORY REALITY WINS
# =====================================================================

This file documents intended architecture.

The actual repository may evolve.


When this file references a module that does not exist:

DO NOT invent it automatically.

First:

1. search
2. inspect equivalent modules
3. determine current architecture
4. adapt implementation appropriately


# =====================================================================
# 155. NESTED AGENTS FILES
# =====================================================================

More-specific directories may contain their own AGENTS.md.

Examples:

netlify/functions/_share/AGENTS.md
netlify/functions/epb/AGENTS.md
netlify/functions/data/AGENTS.md


Those files may define specialized implementation rules.

They must still preserve root architecture invariants.


# =====================================================================
# 156. CRITICAL BACKEND INVARIANTS
# =====================================================================

INVARIANT 1

Netlify Functions are trusted server execution boundaries.


INVARIANT 2

Incoming data is still untrusted.


INVARIANT 3

TheWing calculates. Amy explains.


INVARIANT 4

Authoritative calculations remain deterministic.


INVARIANT 5

LLMs do not become databases or calculators of record.


INVARIANT 6

Secrets remain server-side.


INVARIANT 7

Authentication and authorization are separate checks.


INVARIANT 8

Public API compatibility matters.


INVARIANT 9

Unknown data remains unknown.


INVARIANT 10

Deterministic failure must never be hidden by fabricated AI output.


INVARIANT 11

Useful partial results should survive non-critical module failure.


INVARIANT 12

Security-sensitive failures fail closed.


INVARIANT 13

A function is not complete until tested.


INVARIANT 14

External Webflow clients may exist outside repository search.


INVARIANT 15

Human approval remains the final production control point.


# =====================================================================
# 157. STANDARD FUNCTION DEVELOPMENT LOOP
# =====================================================================

For substantial Netlify Function work:

DISCOVER
    ↓
READ ENTRYPOINT
    ↓
READ SHARED MODULES
    ↓
SEARCH CALLERS
    ↓
IDENTIFY CONTRACT
    ↓
IDENTIFY SECURITY BOUNDARY
    ↓
PLAN
    ↓
IMPLEMENT
    ↓
UNIT TEST
    ↓
ENDPOINT TEST
    ↓
FAILURE TEST
    ↓
BUILD
    ↓
REVIEW DIFF
    ↓
REPORT


Do not stop after IMPLEMENT.


# =====================================================================
# 158. FINAL DIRECTIVE
# =====================================================================

When changing code in netlify/functions:

Protect the backend as the source of truth.

Reuse deterministic engines.

Keep endpoints thin.

Validate everything entering the trust boundary.

Protect credentials and user data.

Preserve public contracts.

Allow useful partial results when safe.

Never hide missing deterministic truth behind LLM prose.

Test real behavior.

And always preserve the governing principle:

               THEWING CALCULATES.
                  AMY EXPLAINS.
