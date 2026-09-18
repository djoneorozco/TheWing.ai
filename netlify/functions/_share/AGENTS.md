```markdown
# netlify/functions/_share/AGENTS.md
# TheWing.ai Shared Intelligence Layer Engineering Rules
#
# Scope:
# Applies to:
#
#   netlify/functions/_share/**
#
# This file supplements:
#
#   /AGENTS.md
#   /netlify/functions/AGENTS.md
#
# Instruction precedence:
#
#   1. A deeper nested AGENTS.md applies to its directory.
#   2. This file governs shared backend modules.
#   3. netlify/functions/AGENTS.md governs backend entrypoints.
#   4. Root AGENTS.md remains the project constitution.
#
# Core architectural rule:
#
#               THEWING CALCULATES.
#                  AMY EXPLAINS.
#
# Core _share rule:
#
#        ONE DOMAIN RULE.
#        ONE AUTHORITATIVE IMPLEMENTATION.
#
# Shared modules exist to prevent duplicated truth.


# =====================================================================
# 1. PURPOSE OF _share
# =====================================================================

The _share directory is the reusable intelligence layer for TheWing.ai.

It should contain reusable backend logic that may be consumed by
multiple Netlify Functions.


Typical responsibilities include:

- deterministic engines
- domain rules
- profile normalization
- rank normalization
- installation normalization
- military compensation calculations
- BAH calculations
- BAS calculations
- mortgage calculations
- affordability calculations
- VA calculations
- retirement calculations
- decision rules
- Truth Packet builders
- response helpers
- validation helpers
- structured data access
- canonical mappings
- EPB / OPB writing rules
- rank-tier logic
- impact logic
- model adapters
- prompt builders
- safe utility functions


_share should NOT become a miscellaneous dumping ground.


# =====================================================================
# 2. PRIMARY RESPONSIBILITY
# =====================================================================

The primary purpose of _share is:

CENTRALIZE REUSABLE TRUTH.


If multiple endpoints need the same:

- calculation
- policy
- mapping
- normalization
- rule
- transformation
- schema interpretation

it should usually exist once in _share rather than being independently
implemented inside each endpoint.


# =====================================================================
# 3. SOURCE-OF-TRUTH PRINCIPLE
# =====================================================================

For every authoritative domain concept, prefer one canonical
implementation.


Examples:

Base pay
    ↓
one authoritative pay engine

BAH
    ↓
one authoritative BAH engine

Mortgage payment
    ↓
one authoritative mortgage engine

Profile normalization
    ↓
one authoritative profile normalizer

Rank responsibility tier
    ↓
one authoritative rank-tier module

EPB impact reasoning
    ↓
one authoritative impact engine


Avoid multiple competing implementations.


# =====================================================================
# 4. DUPLICATED TRUTH IS A BUG
# =====================================================================

Duplicating critical business logic creates:

- inconsistent outputs
- harder testing
- stale copies
- hidden regressions
- contradictory user experiences


If duplicate logic is discovered during a task:

1. determine which implementation is canonical
2. assess compatibility
3. consolidate when safe
4. preserve public API behavior
5. add regression tests


Do not create a third implementation.


# =====================================================================
# 5. _share IS NOT AN ENDPOINT
# =====================================================================

Modules under _share should generally NOT directly behave like Netlify
Function entrypoints.


Avoid shared modules that directly depend on:

- event
- context
- Netlify request shape
- browser headers
- CORS
- HTTP status codes


Prefer:

endpoint
    ↓
extract / validate request
    ↓
call shared module
    ↓
format HTTP response


This separation keeps shared modules portable and testable.


# =====================================================================
# 6. HTTP INDEPENDENCE
# =====================================================================

A deterministic shared engine should ideally accept plain JavaScript
data and return plain JavaScript data.


Good:

calculateMortgage({
  homePrice,
  downPayment,
  interestRate,
  termYears
})


Avoid:

calculateMortgage(event)


The engine should not need to know how the request arrived.


# =====================================================================
# 7. FUNCTION PURITY
# =====================================================================

Prefer pure functions for deterministic business logic.


A pure function:

- receives explicit inputs
- produces explicit outputs
- does not mutate external state
- does not read hidden globals
- does not depend on unrelated runtime state


Example:

resolveRankTier(rank)


is preferable to:

resolveRankTier()


where rank is read from hidden global state.


# =====================================================================
# 8. SIDE EFFECTS
# =====================================================================

Deterministic engines should avoid side effects.


Do not unexpectedly:

- write databases
- mutate files
- call APIs
- modify environment variables
- send messages
- log sensitive data


If side effects are required, isolate them behind explicit adapter
modules.


# =====================================================================
# 9. DEPENDENCY DIRECTION
# =====================================================================

Preferred dependency flow:

Netlify Function
    ↓
Orchestration Module
    ↓
Domain Engine
    ↓
Canonical Data / Rules


Avoid:

Domain Engine
    ↓
Netlify Function


Lower-level modules should not depend on higher-level endpoint code.


# =====================================================================
# 10. MODULE LAYERS
# =====================================================================

Useful conceptual module categories include:

DATA
    ↓
NORMALIZERS
    ↓
DETERMINISTIC ENGINES
    ↓
DECISION RULES
    ↓
TRUTH BUILDERS
    ↓
AI ADAPTERS / PROMPT BUILDERS
    ↓
ENDPOINTS


Keep dependency direction mostly downward.


# =====================================================================
# 11. NO CIRCULAR DEPENDENCIES
# =====================================================================

Avoid circular imports.


Example of bad architecture:

profile-normalizer
    imports compensation-context

compensation-context
    imports profile-normalizer


Instead isolate common logic into a lower-level module.


# =====================================================================
# 12. MODULE CLASSIFICATION
# =====================================================================

Before creating a new shared module, classify it.


Possible categories:

ENGINE
NORMALIZER
RULE
MAPPING
ADAPTER
DATA LOADER
VALIDATOR
FORMATTER
TRUTH BUILDER
PROMPT BUILDER
MODEL CLIENT
UTILITY


Do not create vaguely named modules without clear ownership.


# =====================================================================
# 13. MODULE NAMING
# =====================================================================

Names should communicate responsibility.


Good:

mortgage-engine.js
affordability-engine.js
profile-normalizer.js
rank-tier.js
impact-engine.js
decision-rules.js
official-bah.js
compensation-context.js


Weak:

helpers2.js
stuff.js
utils-new.js
logic-final.js
common-v3.js


Follow existing repository naming conventions.


# =====================================================================
# 14. ONE MODULE, ONE PRIMARY PURPOSE
# =====================================================================

A module may contain multiple related functions.

But its responsibility should remain clear.


Avoid modules that simultaneously:

- query Supabase
- calculate BAH
- build prompts
- call OpenAI
- format HTTP responses


Split responsibilities.


# =====================================================================
# 15. DOMAIN BOUNDARIES
# =====================================================================

Keep domains separated where practical.


Examples:

compensation
mortgage
affordability
VA
PCS
EPB
OPB
profile
decision
AI adapters


Do not create hidden cross-domain coupling without justification.


# =====================================================================
# 16. CANONICAL MODULE DISCOVERY
# =====================================================================

Before creating a module:

SEARCH FIRST.


Look for:

- same concept
- same formula
- same mapping
- same normalization
- same data
- legacy equivalent


Do not infer absence based only on filename.


# =====================================================================
# 17. HISTORICAL SHARED MODULES
# =====================================================================

The repository may contain or historically have contained concepts such
as:

- pay-engine
- official-pay
- official-bah
- mortgage-engine
- affordability-engine
- official-retirement
- official-va
- decision-rules
- profile-normalizer
- compensation-context
- rank-tier
- impact-engine
- universal


This list is descriptive, not authoritative.


Repository inspection always wins.


# =====================================================================
# 18. DETERMINISTIC-FIRST
# =====================================================================

_shared deterministic modules are the preferred home of authoritative
calculations.


If something can be calculated deterministically:

DO NOT ASK AN LLM TO CALCULATE IT.


Examples:

- military compensation
- mortgage payment
- debt ratios
- rank tier
- pay-table lookup
- BAH lookup
- dependency status
- structured eligibility rule
- EPB character count


# =====================================================================
# 19. AI MUST NOT REPLACE DOMAIN ENGINES
# =====================================================================

Do not replace deterministic logic with:

"Ask the model and parse its answer."


This is prohibited for authoritative values.


# =====================================================================
# 20. DATA IN, DATA OUT
# =====================================================================

Domain engines should preferably have explicit contracts.


Example:

input:

{
  "rank": "E-5",
  "yos": 6
}


output:

{
  "paygrade": "E-5",
  "yearsOfService": 6,
  "monthlyBasePay": 0,
  "sourceYear": 2026
}


Actual schema should follow repository conventions.


# =====================================================================
# 21. UNKNOWN DATA
# =====================================================================

Unknown values must remain unknown.


Do not silently transform unknown into:

0
false
"none"
"N/A"

unless that is semantically correct.


Prefer:

null

or explicit unavailable metadata.


# =====================================================================
# 22. DERIVED VS PROVIDED VALUES
# =====================================================================

Distinguish:

PROVIDED
DERIVED
LOOKED UP
ASSUMED
UNKNOWN


Where useful, return metadata indicating origin.


# =====================================================================
# 23. NO SILENT ASSUMPTIONS
# =====================================================================

Avoid hidden defaults in authoritative calculations.


If an assumption is necessary:

- make it explicit
- return it
- document it
- test it


# =====================================================================
# 24. DEFAULTS
# =====================================================================

Defaults are acceptable for:

- tests
- demos
- non-authoritative presentation behavior


Defaults should NOT silently become user truth.


# =====================================================================
# 25. VERSIONED DATA
# =====================================================================

Date-sensitive official data should carry version/year information when
practical.


Examples:

- military pay tables
- BAH
- BAS
- VA rates
- policy thresholds


Do not silently mix values from different years.


# =====================================================================
# 26. OFFICIAL DATA
# =====================================================================

Official or authoritative data should be preferred for:

- military pay
- BAH
- BAS
- VA
- retirement
- installation information
- policy rules


Model memory is not an authoritative data source.


# =====================================================================
# 27. DATA SOURCE METADATA
# =====================================================================

Where appropriate, structured datasets should expose metadata such as:

{
  "year": 2026,
  "version": "1.0.0",
  "source": "...",
  "updated_at": "..."
}


Do not fabricate source metadata.


# =====================================================================
# 28. DATA LOADING
# =====================================================================

Shared loaders may read structured files from places such as:

- netlify/functions/data/**
- netlify/functions/cities/**
- other canonical data directories


Data loaders should:

- validate paths
- handle missing files
- validate parsed shape
- avoid path traversal
- preserve Netlify runtime compatibility


# =====================================================================
# 29. DATA LOADER RESPONSIBILITY
# =====================================================================

A loader should load/validate data.

It should not unexpectedly perform unrelated domain reasoning.


Prefer:

loadBaseData(slug)


followed by:

evaluateBaseContext(data)


rather than one opaque mega-function.


# =====================================================================
# 30. SCHEMA STABILITY
# =====================================================================

Shared structured data may be consumed by multiple modules.


Do not remove keys casually.


If schema evolution is needed:

- consider compatibility
- version intentionally
- update tests
- update consumers


# =====================================================================
# 31. PROFILE NORMALIZATION
# =====================================================================

Profile normalization should be centralized.


Potential canonical fields include:

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


Do not require every consumer to understand every legacy alias.


# =====================================================================
# 32. PROFILE ALIASES
# =====================================================================

Potential aliases may include:

base
selected_base
pcs_base


Normalize aliases once.


Avoid differing precedence rules across endpoints.


# =====================================================================
# 33. RANK NORMALIZATION
# =====================================================================

Rank should have one canonical normalization strategy.


Potential accepted forms may include:

E5
E-5
e-5
SSgt
Staff Sergeant


Actual supported aliases should be explicit and testable.


Do not invent aliases casually.


# =====================================================================
# 34. RANK DISPLAY NAMES
# =====================================================================

If rank display names are needed, maintain one canonical mapping where
practical.


Do not duplicate full rank maps across many modules.


# =====================================================================
# 35. YEARS OF SERVICE
# =====================================================================

YoS normalization should:

- validate numeric input
- reject impossible values
- map correctly to official table breakpoints where needed


Do not let parseInt-style permissiveness create hidden errors.


# =====================================================================
# 36. DEPENDENT NORMALIZATION
# =====================================================================

Keep these concepts distinct:

dependents_count
has_dependents
family


Do not generate contradictory values.


# =====================================================================
# 37. BASE NORMALIZATION
# =====================================================================

Installations may have:

- canonical names
- slugs
- legacy names
- abbreviations
- local aliases


Centralize mapping where possible.


# =====================================================================
# 38. COMPENSATION ENGINE
# =====================================================================

Compensation must be deterministic.


Potential inputs:

- paygrade
- years of service
- dependent status
- installation/location
- year


Potential outputs:

- base pay
- BAH
- BAS
- total monthly compensation


# =====================================================================
# 39. COMPENSATION COMPOSITION
# =====================================================================

Prefer composing specialized engines:

officialPay()
officialBah()
officialBas()


then:

buildCompensationContext()


rather than maintaining one giant opaque calculator.


# =====================================================================
# 40. BASE PAY
# =====================================================================

Official base pay must use authoritative structured data.


Never infer pay from:

- language model
- approximate formula
- stale hardcoded memory


# =====================================================================
# 41. BAH
# =====================================================================

BAH should use canonical lookup logic.


Inputs may include:

- location identifier
- paygrade
- dependency status
- year


BAH is not a model-generated estimate.


# =====================================================================
# 42. BAS
# =====================================================================

BAS should use deterministic values.


Respect distinctions such as:

- officer
- enlisted
- applicable year


# =====================================================================
# 43. TOTAL COMPENSATION
# =====================================================================

When producing total compensation, make components visible.


Prefer:

{
  "basePay": ...,
  "bah": ...,
  "bas": ...,
  "totalMonthly": ...
}


over returning only an unexplained total.


# =====================================================================
# 44. MORTGAGE ENGINE
# =====================================================================

Mortgage calculations belong in deterministic shared logic.


Potential inputs:

- purchase price
- down payment
- principal
- interest rate
- term
- taxes
- insurance
- PMI


Potential outputs:

- loan amount
- principal and interest
- taxes monthly
- insurance monthly
- PMI monthly
- total monthly housing cost


# =====================================================================
# 45. MORTGAGE FORMULA
# =====================================================================

Mortgage formulas should be independently testable.


Do not embed the authoritative mortgage formula separately inside:

- mortgage.js
- decision-brief.js
- agent-amy.js
- frontend code


# =====================================================================
# 46. MORTGAGE ROUNDING
# =====================================================================

Define rounding deliberately.


Prefer:

calculate at full precision
    ↓
return canonical numeric values
    ↓
format for display later


unless the domain requires earlier rounding.


# =====================================================================
# 47. AFFORDABILITY ENGINE
# =====================================================================

Affordability should use deterministic inputs/rules.


Potential factors:

- income
- debts
- housing cost
- rate
- taxes
- insurance
- ratio thresholds
- available cash


# =====================================================================
# 48. AFFORDABILITY EXPLAINABILITY
# =====================================================================

Return supporting factors.


Avoid:

{
  "affordable": true
}


without meaningful context.


Prefer something like:

{
  "affordable": true,
  "monthlyHousing": ...,
  "income": ...,
  "ratios": {...},
  "assumptions": {...}
}


# =====================================================================
# 49. VA ENGINE
# =====================================================================

VA calculations and eligibility logic should be deterministic where the
rules permit.


Do not make the AI model the source of truth for:

- entitlement
- funding fee calculations
- disability compensation
- official VA rates


# =====================================================================
# 50. RETIREMENT
# =====================================================================

Retirement calculations should use explicit:

- retirement system
- years
- pay basis
- applicable rules
- official values


Avoid hidden assumptions.


# =====================================================================
# 51. DECISION RULES
# =====================================================================

Decision rules should be inspectable and testable.


Good:

evaluateHousingPressure(context)


Less desirable:

large prompt decides everything invisibly.


# =====================================================================
# 52. RULE IDENTIFIERS
# =====================================================================

For consequential rule systems, consider explicit identifiers.


Example:

{
  "rule": "HOUSING_RATIO_HIGH",
  "triggered": true,
  "reason": "..."
}


This improves auditing and explanation.


# =====================================================================
# 53. RULE ORDER
# =====================================================================

If rule precedence matters, define it intentionally.


Do not rely on accidental object iteration or import order.


# =====================================================================
# 54. RULE CONFLICTS
# =====================================================================

If two rules conflict:

- define precedence
- expose conflict where appropriate
- add tests


Do not let whichever rule executes last silently win.


# =====================================================================
# 55. TRUTH PACKET BUILDERS
# =====================================================================

Truth Packet construction may belong in _share.


Truth Packets should organize validated deterministic truth for Amy.


Potential structure:

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


# =====================================================================
# 56. TRUTH PACKET BOUNDARY
# =====================================================================

Truth Packet builders should NOT fabricate missing facts.


They may:

- assemble
- normalize
- label
- organize
- identify missing information


They may not invent unsupported values.


# =====================================================================
# 57. MISSING INPUTS
# =====================================================================

Missing inputs should be explicit.


Example:

{
  "missing_inputs": [
    "interest_rate",
    "monthly_debt"
  ]
}


This is preferable to hidden guessed defaults.


# =====================================================================
# 58. WARNINGS
# =====================================================================

Structured warnings should be machine-readable when practical.


Examples:

STALE_DATA
PARTIAL_PROFILE
MISSING_MARKET_DATA
UNSUPPORTED_RANK
CALCULATION_UNAVAILABLE


# =====================================================================
# 59. AI ADAPTERS
# =====================================================================

Model/API-specific code may live in shared adapters.


Example responsibilities:

- model client initialization
- request formatting
- structured output handling
- error normalization
- timeout behavior
- retry policy


Do not mix domain calculations into model adapters.


# =====================================================================
# 60. MODEL ADAPTER CONTRACT
# =====================================================================

The rest of TheWing should ideally call a stable adapter interface
rather than vendor-specific code everywhere.


Conceptually:

generateExplanation({
  system,
  context,
  userMessage
})


instead of dozens of direct provider calls.


# =====================================================================
# 61. MODEL INDEPENDENCE
# =====================================================================

TheWing business logic should survive model-provider changes.


Do not make critical domain objects depend on provider-specific response
structures.


# =====================================================================
# 62. MODEL OUTPUT IS UNTRUSTED
# =====================================================================

LLM output must be treated as generated content.


It is not:

- canonical profile data
- official calculation
- authorization decision
- validated financial result


unless validated by deterministic logic.


# =====================================================================
# 63. PROMPT BUILDERS
# =====================================================================

Prompt builders may live in _share.


Their purpose is to consistently provide:

- role
- constraints
- structured truth
- output requirements
- factual boundaries


# =====================================================================
# 64. PROMPTS ARE NOT DATABASES
# =====================================================================

Do not encode large amounts of canonical changing data directly into
prompt text when structured datasets exist.


Examples:

Do not maintain military pay tables in prompts.

Do not maintain BAH tables in prompts.


# =====================================================================
# 65. PROMPTS ARE NOT RULE ENGINES
# =====================================================================

Rules that must always be enforced should live in code where practical.


Prompt:

"Do not fabricate metrics"


is useful.


But deterministic post-validation and structured generation constraints
are stronger where available.


# =====================================================================
# 66. PROMPT VERSIONING
# =====================================================================

If prompt behavior becomes significant to production output, consider
explicit versions or centralized constants.


Avoid undocumented prompt drift.


# =====================================================================
# 67. PROMPT DUPLICATION
# =====================================================================

Avoid large duplicated prompt strings.


Centralize shared prompt logic while allowing task-specific additions.


# =====================================================================
# 68. EPB / OPB SHARED LOGIC
# =====================================================================

Performance-writing intelligence should be modular.


Potential shared components include:

- rank-tier.js
- impact-engine.js
- universal.js
- statement validator
- evidence extractor
- mode resolver
- compression logic
- character counter


# =====================================================================
# 69. EPB FACTUAL INTEGRITY
# =====================================================================

EPB/OPB shared modules must never invent:

- numbers
- scope
- awards
- people led
- dollar savings
- time savings
- readiness gains
- rankings
- outcomes
- mission impact


# =====================================================================
# 70. ACTION → SCOPE → RESULT → IMPACT
# =====================================================================

Canonical performance-writing reasoning:

ACTION
    ↓
SCOPE
    ↓
RESULT
    ↓
IMPACT


Missing components may remain missing.


Do not invent a component merely to complete the pattern.


# =====================================================================
# 71. STRICT MODE
# =====================================================================

Strict mode should remain closest to supplied facts.


Allowed:

- grammar
- structure
- compression
- clear verbs
- supported terminology


Not allowed:

- unsupported scope expansion
- inferred metrics
- invented impact


# =====================================================================
# 72. BALANCED MODE
# =====================================================================

Balanced mode may improve:

- tone
- impact framing
- military relevance
- structure


But every substantive claim must remain supported.


# =====================================================================
# 73. COMPETITIVE MODE
# =====================================================================

Competitive mode may use:

- strongest defensible wording
- stronger supported mission linkage
- stronger supported leadership framing


It may NOT use fabrication as a substitute for competitiveness.


# =====================================================================
# 74. RANK-TIER ENGINE
# =====================================================================

rank-tier.js or equivalent should represent expected responsibility
level by rank/paygrade.


It may inform:

- vocabulary
- expected leadership framing
- scale awareness
- responsibility lens
- organizational context


It must NOT claim the member actually operated at that scale unless the
input supports it.


# =====================================================================
# 75. RANK IS CONTEXT, NOT EVIDENCE
# =====================================================================

Example:

E-8 may imply senior-level expectations.


But rank alone does NOT prove:

- wing-level leadership
- enterprise impact
- strategic influence
- large team leadership


User evidence must support those claims.


# =====================================================================
# 76. IMPACT ENGINE
# =====================================================================

impact-engine.js or equivalent should reason from supported evidence.


Preferred flow:

USER FACT
    ↓
DIRECT RESULT
    ↓
SUPPORTED MISSION CONNECTION
    ↓
DEFENSIBLE IMPACT


Do not jump from:

"updated spreadsheet"

to:

"transformed Air Force readiness"

without evidence.


# =====================================================================
# 77. IMPACT STRENGTH
# =====================================================================

Impact may be classified by level where useful.


Example concepts:

individual
team
section
flight
squadron
group
wing
MAJCOM
enterprise


But classification must be evidence-driven.


# =====================================================================
# 78. UNIVERSAL WRITING MODULE
# =====================================================================

universal.js or equivalent should contain genuinely reusable writing
logic.


Good candidates:

- normalization
- mode definitions
- evidence checks
- safe transformations
- structural helpers
- common statement rules


Avoid turning universal.js into a 5,000-line mega-module.


# =====================================================================
# 79. WRITING VALIDATION
# =====================================================================

Shared validators should detect unsupported additions where practical.


Examples:

Input contains no number
Output introduces "$2.4M"
    ↓
flag


Input contains no team size
Output introduces "25 Airmen"
    ↓
flag


# =====================================================================
# 80. CHARACTER LIMITS
# =====================================================================

If statement limits exist, enforce them deterministically.


Do not rely on the model to count accurately.


Use actual string measurement logic.


# =====================================================================
# 81. TEXT NORMALIZATION
# =====================================================================

Text normalization should preserve meaning.


Avoid transformations that alter:

- rank
- names
- metrics
- acronyms
- units
- mission terminology


unless explicitly intended.


# =====================================================================
# 82. VALIDATORS
# =====================================================================

Reusable validators belong in _share where multiple callers need them.


Examples:

validateRank()
validateMortgageInput()
validateProfile()
validateEPBEvidence()


Validators should return predictable structures.


# =====================================================================
# 83. VALIDATION ERRORS
# =====================================================================

Prefer structured validation results.


Example:

{
  "valid": false,
  "errors": [
    {
      "field": "yos",
      "code": "INVALID_RANGE"
    }
  ]
}


Do not require every endpoint to parse validation exception strings.


# =====================================================================
# 84. THROW VS RETURN
# =====================================================================

Choose error behavior intentionally.


Expected validation failure:
often return structured result.


Unexpected programmer/system failure:
may throw.


Follow established repository conventions.


# =====================================================================
# 85. ERROR TYPES
# =====================================================================

Where useful, shared modules may define explicit error classes.


Examples:

ValidationError
DataUnavailableError
UnsupportedValueError


Avoid unnecessary class proliferation.


# =====================================================================
# 86. NO HTTP STATUS CODES IN DOMAIN LOGIC
# =====================================================================

Domain engines should usually not return:

statusCode: 400


That is an endpoint concern.


Return domain error information instead.


# =====================================================================
# 87. LOGGING
# =====================================================================

Lower-level pure modules should generally avoid noisy logging.


Prefer returning structured information and letting orchestration layers
decide what to log.


# =====================================================================
# 88. DEBUG LOGGING
# =====================================================================

Do not leave permanent:

console.log(fullProfile)
console.log(process.env)
console.log(prompt)
console.log(financialData)


inside reusable shared modules.


# =====================================================================
# 89. SENSITIVE DATA
# =====================================================================

Shared modules should process only the minimum necessary sensitive data.


Avoid retaining or propagating unrelated profile fields.


# =====================================================================
# 90. DATABASE ACCESS
# =====================================================================

Core deterministic engines should not depend directly on Supabase unless
database access is inherently part of the module's responsibility.


Prefer:

repository/data adapter
    ↓
domain engine


over:

domain engine contains random SQL queries.


# =====================================================================
# 91. STORAGE ADAPTERS
# =====================================================================

If shared database access exists, isolate it.


Potential conceptual modules:

profile-repository.js
financial-repository.js


These should not become calculation engines.


# =====================================================================
# 92. AUTHORIZATION
# =====================================================================

Authorization should remain primarily an endpoint/orchestration concern.


Domain engines should not need to understand browser sessions.


# =====================================================================
# 93. SECURITY
# =====================================================================

Never place secrets inside shared source files.


Use environment variables through appropriate adapters.


# =====================================================================
# 94. ENVIRONMENT VARIABLES
# =====================================================================

Pure deterministic modules should avoid depending directly on
process.env where practical.


Better:

const client = createModelClient(config)


than hidden environment reads throughout business logic.


# =====================================================================
# 95. TESTABILITY
# =====================================================================

Shared modules must be easy to test independently.


A module that requires:

- Netlify runtime
- browser state
- live database
- production API

just to test basic calculations is too tightly coupled.


# =====================================================================
# 96. UNIT TEST PRIORITY
# =====================================================================

_share should have strong unit-test coverage because many endpoints may
depend on it.


High priority:

- compensation
- mortgage
- affordability
- profile normalization
- rank normalization
- decision rules
- EPB constraints
- schema transformations


# =====================================================================
# 97. TABLE-DRIVEN TESTS
# =====================================================================

Use table-driven tests where many structured cases exist.


Examples:

paygrades
YoS breakpoints
rank tiers
mortgage scenarios
dependency states


# =====================================================================
# 98. BOUNDARY TESTS
# =====================================================================

Test boundaries.


Examples:

YoS 1 vs 2
YoS table breakpoints
zero down payment
interest rate near zero
no dependents vs one dependent
minimum/maximum supported credit score


# =====================================================================
# 99. INVALID INPUT TESTS
# =====================================================================

Test:

null
undefined
empty string
NaN
negative numbers
unsupported ranks
unknown installation
malformed objects


# =====================================================================
# 100. NUMERIC PRECISION TESTS
# =====================================================================

For financial engines, verify:

- decimal behavior
- rounding
- totals
- component sums
- edge cases


# =====================================================================
# 101. GOLDEN TESTS
# =====================================================================

Where official deterministic outputs are known, maintain golden test
cases.


Example:

known rank
known YoS
known year
    ↓
known official pay


# =====================================================================
# 102. REGRESSION TESTS
# =====================================================================

Every meaningful bug fix should gain a regression test where practical.


Shared bugs can affect many endpoints.


# =====================================================================
# 103. PROPERTY-STYLE TESTING
# =====================================================================

Where useful, test invariants.


Example:

loanAmount must never exceed purchase price when down payment >= 0


Example:

dependents_count = 0
    ↓
has_dependents = false


# =====================================================================
# 104. MOCKING
# =====================================================================

Do not mock the module under test.


Mock:

- external APIs
- model providers
- database adapters


Do not mock deterministic calculations when verifying those
calculations.


# =====================================================================
# 105. FIXTURES
# =====================================================================

Use synthetic test fixtures.


Never use:

- real customer financial data
- real credentials
- private personal records


# =====================================================================
# 106. PERFORMANCE
# =====================================================================

Shared functions may be called frequently.


Avoid:

- repeated heavy parsing
- repeated file reads
- repeated model calls
- unnecessary deep clones


But correctness remains more important than micro-optimization.


# =====================================================================
# 107. CACHING
# =====================================================================

Caching may be appropriate for:

- static official tables
- canonical mappings
- stable parsed JSON


Be cautious caching:

- user-specific data
- rapidly changing market data
- authentication state


# =====================================================================
# 108. MUTATION
# =====================================================================

Avoid mutating input objects unless explicitly documented.


Prefer:

return {
  ...profile,
  normalizedField
}


over silently rewriting the caller's object.


# =====================================================================
# 109. IMMUTABILITY
# =====================================================================

Pure domain modules should generally treat input as immutable.


This reduces hidden cross-module effects.


# =====================================================================
# 110. OBJECT MERGING
# =====================================================================

When merging profile/context objects, define precedence intentionally.


Do not let spread order become an undocumented business rule.


# =====================================================================
# 111. SCHEMA TRANSFORMATIONS
# =====================================================================

Schema transformers should be explicit.


Example:

normalizeLegacyProfile()
    ↓
canonical profile


Do not scatter legacy-field conversion throughout multiple modules.


# =====================================================================
# 112. LEGACY SUPPORT
# =====================================================================

Shared modules may preserve legacy aliases when required.


But normalize legacy forms toward a canonical internal representation.


# =====================================================================
# 113. INTERNAL CANONICAL FORM
# =====================================================================

Prefer:

many accepted inputs
    ↓
one canonical internal shape
    ↓
predictable outputs


This simplifies all downstream modules.


# =====================================================================
# 114. PUBLIC CONTRACT VS INTERNAL CONTRACT
# =====================================================================

The internal shared-module schema does not always need to match a public
API response exactly.


Endpoint adapters may translate between:

canonical internal form
    ↓
legacy/public response form


# =====================================================================
# 115. NO FRONTEND KNOWLEDGE
# =====================================================================

Shared deterministic engines should not know about:

- DOM IDs
- Webflow classes
- UI colors
- browser events
- button labels


Those belong outside _share.


# =====================================================================
# 116. EVENT CONTRACTS
# =====================================================================

Shared modules may provide data used in browser events.


They should not generally dispatch browser events themselves.


# =====================================================================
# 117. VOICE
# =====================================================================

Voice should reuse shared intelligence.


Do not build duplicate compensation or PCS engines for voice.


# =====================================================================
# 118. ASK AMY
# =====================================================================

Amy should consume shared canonical outputs.


Do not create parallel hidden calculations inside Amy prompts.


# =====================================================================
# 119. DECISION BRIEF
# =====================================================================

Decision briefs should use shared decision rules and Truth Packets.


Do not implement independent decision logic in every brief endpoint.


# =====================================================================
# 120. MODULE EXPORTS
# =====================================================================

Exports should be deliberate.


Expose only what consumers need.


Avoid exporting every internal helper by default.


# =====================================================================
# 121. PUBLIC MODULE API
# =====================================================================

Treat shared exported functions like internal APIs.


Changing:

- function name
- argument order
- return shape
- thrown errors


may affect many consumers.


Search usages first.


# =====================================================================
# 122. OBJECT PARAMETERS
# =====================================================================

Prefer object parameters for functions with multiple inputs.


Better:

calculateMortgage({
  principal,
  annualRate,
  termYears
})


than:

calculateMortgage(
  principal,
  annualRate,
  termYears,
  taxes,
  insurance,
  pmi,
  hoa,
  ...
)


# =====================================================================
# 123. OPTIONAL PARAMETERS
# =====================================================================

Make optional parameters explicit.


Avoid hidden positional semantics.


# =====================================================================
# 124. RETURN STRUCTURE
# =====================================================================

Prefer structured results over ambiguous primitives where context
matters.


Better:

{
  "tier": "SNCO",
  "paygrade": "E-7"
}


than:

"3"


# =====================================================================
# 125. ENUM-LIKE VALUES
# =====================================================================

Use clear canonical string values where practical.


Examples:

STRICT
BALANCED
COMPETITIVE


Avoid magic numbers.


# =====================================================================
# 126. CONSTANTS
# =====================================================================

Centralize meaningful shared constants.


Avoid duplicating:

MAX_STATEMENT_LENGTH = ...


across many modules.


# =====================================================================
# 127. MAGIC NUMBERS
# =====================================================================

Domain thresholds should be named.


Bad:

if (ratio > 0.41)


Better:

if (ratio > MAX_BACKEND_DTI)


where the threshold's meaning is documented.


# =====================================================================
# 128. COMMENTS
# =====================================================================

Comments should explain:

WHY
SOURCE
DOMAIN REASON


Good:

// Preserve legacy alias because public Webflow consumers still send
// selected_base.


Bad:

// Set selectedBase variable.


# =====================================================================
# 129. OFFICIAL RULE COMMENTS
# =====================================================================

When implementing an official rule, document:

- source type
- applicable year/version
- important interpretation


Do not paste entire external documents into comments.


# =====================================================================
# 130. DATE-SENSITIVE LOGIC
# =====================================================================

Avoid:

if (currentYear === ...)


when the system should operate against an explicit selected dataset
year.


Prefer deterministic year selection.


# =====================================================================
# 131. CURRENT DATE
# =====================================================================

Do not let server runtime date silently change historical calculations.


Example:

A 2025 compensation scenario should use 2025 data even when executed in
2026.


# =====================================================================
# 132. DATA FRESHNESS
# =====================================================================

Modules using dynamic data should make staleness visible where practical.


Example:

{
  "dataAsOf": "2026-09-01"
}


# =====================================================================
# 133. MARKET DATA
# =====================================================================

Market values are not timeless truth.


Distinguish:

official static data
from
dynamic market data


# =====================================================================
# 134. BASE DATA
# =====================================================================

Do not fabricate:

- gate hours
- commute time
- neighborhood values
- base services
- addresses


Shared modules should return unknown when canonical data is absent.


# =====================================================================
# 135. DATA CONFIDENCE
# =====================================================================

Do not invent numeric confidence scores.


If data quality varies, use explicit categories or metadata backed by
real rules.


# =====================================================================
# 136. FAIL-OPEN SUPPORT
# =====================================================================

Shared modules should make graceful degradation possible.


Prefer modules that fail independently.


Example:

BAH unavailable
    ↓
base pay and BAS can still return


Avoid unnecessarily coupling all compensation components into one
all-or-nothing failure.


# =====================================================================
# 137. FAIL-CLOSED SECURITY
# =====================================================================

Shared security adapters should fail closed.


Do not apply fail-open philosophy to:

- authorization
- credential validation
- privileged access


# =====================================================================
# 138. EXCEPTIONS
# =====================================================================

Do not swallow unexpected exceptions silently.


Bad:

try {
  ...
} catch {
  return null;
}


unless null is explicitly the correct contract and failure is logged at
the appropriate layer.


# =====================================================================
# 139. ERROR CONTEXT
# =====================================================================

Errors should carry enough safe context to debug.


Avoid placing sensitive values in error messages.


# =====================================================================
# 140. RETRIES
# =====================================================================

Pure deterministic modules should not need retries.


External adapters may use bounded retries for transient failures.


# =====================================================================
# 141. MODEL RETRIES
# =====================================================================

Model adapters should avoid uncontrolled retry loops.


Bound attempts.


Do not create runaway API cost.


# =====================================================================
# 142. NETWORK ADAPTERS
# =====================================================================

External fetch logic should be isolated.


A mortgage engine should not unexpectedly call the internet.


# =====================================================================
# 143. EXTERNAL DATA ADAPTERS
# =====================================================================

Separate:

fetchExternalData()


from:

evaluateExternalData()


This makes testing and future provider replacement easier.


# =====================================================================
# 144. PROVIDER-SPECIFIC LOGIC
# =====================================================================

Provider-specific code should remain behind adapters.


Examples:

OpenAI
Supabase
voice provider
market-data provider


# =====================================================================
# 145. NO VENDOR LOCK-IN IN DOMAIN RULES
# =====================================================================

Domain engines should not contain vendor-specific response parsing.


# =====================================================================
# 146. DEPENDENCIES
# =====================================================================

Shared modules should minimize unnecessary external dependencies.


Before adding a package:

1. inspect existing dependencies
2. check native platform capability
3. assess security
4. assess maintenance
5. assess Netlify compatibility


# =====================================================================
# 147. COMMONJS / ESM
# =====================================================================

Follow repository convention.


Do not perform broad module-system conversions during unrelated tasks.


# =====================================================================
# 148. IMPORT PATHS
# =====================================================================

Use stable relative paths consistent with repository structure.


Avoid fragile import chains.


# =====================================================================
# 149. RESTRUCTURING
# =====================================================================

Do not reorganize the entire _share tree simply because another layout
looks cleaner.


Refactor when there is a concrete benefit:

- duplication reduction
- dependency clarification
- testing improvement
- source-of-truth consolidation


# =====================================================================
# 150. LARGE MODULES
# =====================================================================

If a shared module becomes very large, consider decomposition.


Potential decomposition:

mortgage/
  calculator.js
  taxes.js
  insurance.js
  assumptions.js


Only do this when complexity justifies it.


# =====================================================================
# 151. MICRO-MODULES
# =====================================================================

Do not fragment trivial logic into dozens of one-line files.


Balance modularity with discoverability.


# =====================================================================
# 152. INTERNAL DIRECTORY STRUCTURE
# =====================================================================

Possible future organization may include:

_share/
  compensation/
  mortgage/
  affordability/
  va/
  pcs/
  epb/
  decision/
  profile/
  ai/
  data/


Do not impose this structure unless repository needs justify it.


# =====================================================================
# 153. NESTED AGENTS FILES
# =====================================================================

Complex domains may eventually contain nested AGENTS.md files.


Example:

_share/epb/AGENTS.md
_share/compensation/AGENTS.md
_share/mortgage/AGENTS.md


These may add stricter local rules.


# =====================================================================
# 154. MODULE DOCUMENTATION
# =====================================================================

Important engines should document:

- purpose
- expected input
- output
- assumptions
- source/year where applicable
- important failure cases


Avoid excessive commentary around obvious implementation details.


# =====================================================================
# 155. TEST LOCATION
# =====================================================================

Follow existing repository test conventions.


Tests may live:

- adjacent to modules
- in dedicated test directories


Do not introduce a second testing convention unnecessarily.


# =====================================================================
# 156. VERIFY CONSUMERS
# =====================================================================

Before changing a shared module:

SEARCH ALL IMPORTS.


A one-line shared change may affect:

- public Amy
- mortgage
- decision brief
- BasicBrain
- profile
- voice
- EPB


# =====================================================================
# 157. BLAST RADIUS
# =====================================================================

Shared-module changes have larger blast radius than endpoint-local
changes.


Therefore shared changes require stronger testing.


# =====================================================================
# 158. CHANGE STRATEGY
# =====================================================================

For significant shared-module changes:

1. understand current behavior
2. add/confirm tests
3. make smallest coherent change
4. run direct unit tests
5. run affected integration tests
6. inspect endpoint contracts
7. review diff


# =====================================================================
# 159. BACKWARD COMPATIBILITY
# =====================================================================

When changing a shared return shape, consider transitional aliases.


Example:

new canonical:

total_monthly


legacy consumer:

totalMonthly


An adapter may preserve compatibility during migration.


# =====================================================================
# 160. NO SILENT BREAKING CHANGES
# =====================================================================

Do not change a shared function from:

number


to:

object


without finding and updating all consumers.


# =====================================================================
# 161. DEPRECATION
# =====================================================================

When deprecating a shared function:

- identify consumers
- add replacement
- migrate callers
- test
- remove only when safe


# =====================================================================
# 162. NO VERSION-NAME CHAOS
# =====================================================================

Avoid files such as:

mortgage-engine-v2-final.js
mortgage-engine-new.js
mortgage-engine-fixed.js


Use Git for history.


# =====================================================================
# 163. PERFORMANCE CONTRACT
# =====================================================================

Shared deterministic modules should generally be fast.


Do not introduce network dependency into a previously local calculator
without explicit architectural reason.


# =====================================================================
# 164. SYNCHRONOUS VS ASYNC
# =====================================================================

Keep pure calculations synchronous where appropriate.


Do not make a function async merely because other modules are async.


# =====================================================================
# 165. MODEL CALL BOUNDARY
# =====================================================================

Model calls should remain visibly separate from deterministic logic.


Preferred:

const truth = buildTruthPacket(...)
const answer = await generateExplanation(truth)


Not:

calculateAffordability() internally calls LLM.


# =====================================================================
# 166. AI SELF-REVIEW
# =====================================================================

AI writing modules may optionally perform validation passes.


However:

validation must not silently introduce new facts.


# =====================================================================
# 167. AI GENERATED STRUCTURED DATA
# =====================================================================

If AI extracts structured data from user text:

mark it as extracted/inferred until validated.


Do not automatically elevate inference to canonical truth.


# =====================================================================
# 168. EVIDENCE MODEL
# =====================================================================

For EPB/OPB, preserve separation between:

FACT
INFERENCE
FRAMING


FACT:
explicit user-provided information


INFERENCE:
reasonable but not explicitly stated relationship


FRAMING:
wording choice that does not change substantive truth


Competitive writing may strengthen FRAMING.


It must not invent FACT.


# =====================================================================
# 169. EVIDENCE TRACEABILITY
# =====================================================================

Where practical, important generated claims should be traceable back to
input evidence.


This is especially valuable for EPB/OPB.


# =====================================================================
# 170. RANK-TIER TESTING
# =====================================================================

If rank-tier supports full military paygrade ranges, test representative
or exhaustive mappings.


Potential coverage:

E-1 through E-9
O-1 through O-10


Include any supported warrant-officer logic only if the product uses it.


# =====================================================================
# 171. IMPACT ENGINE TESTING
# =====================================================================

Test that stronger language does not create unsupported impact.


Input:

"trained 3 teammates on process"


Allowed:

improved team process proficiency


Not automatically allowed:

improved wing readiness by 30%


# =====================================================================
# 172. STRICT / BALANCED / COMPETITIVE TESTS
# =====================================================================

For identical facts:

Strict
Balanced
Competitive


should differ in framing strength while preserving identical factual
boundaries.


# =====================================================================
# 173. MULTIPLE OUTPUT DIVERSITY
# =====================================================================

If a shared generator supports multiple options, verify outputs are
meaningfully distinct.


Differences may include:

- structure
- emphasis
- sequencing
- leadership angle
- mission angle


Not just synonym replacement.


# =====================================================================
# 174. COMPRESSION
# =====================================================================

Compression logic must preserve critical facts.


Do not remove:

- measurable result
- essential scope
- mission connection


before removing lower-value filler.


# =====================================================================
# 175. ACRONYMS
# =====================================================================

Do not expand or redefine military acronyms incorrectly.


Where acronym dictionaries exist, centralize them.


# =====================================================================
# 176. MILITARY TERMINOLOGY
# =====================================================================

Use validated terminology.


Do not allow model-generated invented military terms to become
canonical mappings.


# =====================================================================
# 177. OFFICIAL RESPONSIBILITIES
# =====================================================================

Rank-tier expectations should be grounded in approved/official
responsibility frameworks when available.


Do not invent rank doctrine.


# =====================================================================
# 178. USER FACTS OVERRIDE GENERIC EXPECTATIONS
# =====================================================================

If a user's actual duties differ from common rank expectations, user
facts control statement content.


Rank provides context, not fictional duties.


# =====================================================================
# 179. OPENAI SAFETY BOUNDARY
# =====================================================================

Shared model adapters should preserve application safety requirements.


Do not implement hidden bypasses to provider safeguards.


# =====================================================================
# 180. INTERNAL TOOL PERMISSIONS
# =====================================================================

A shared AI adapter should not automatically gain:

- database write access
- network access
- filesystem write access


unless explicitly required by architecture.


# =====================================================================
# 181. MINIMUM PRIVILEGE
# =====================================================================

Adapters should receive only the capabilities necessary for their task.


# =====================================================================
# 182. COST METADATA
# =====================================================================

Where model usage monitoring exists, preserve it.


Do not remove useful token/cost instrumentation without reason.


# =====================================================================
# 183. LATENCY METADATA
# =====================================================================

If timing instrumentation exists, preserve it when refactoring shared
AI adapters.


# =====================================================================
# 184. OBSERVABILITY
# =====================================================================

Shared modules should enable useful observability without embedding
endpoint-specific logging policy.


# =====================================================================
# 185. FEATURE FLAGS
# =====================================================================

Shared logic may respect established feature flags.


Do not invent a second independent flag system.


# =====================================================================
# 186. EXPERIMENTAL MODULES
# =====================================================================

Experimental modules must not silently replace production canonical
engines.


Name and isolate experimental behavior clearly.


# =====================================================================
# 187. NO FAKE DATA
# =====================================================================

Production shared modules must not use mock values when real data is
expected.


Mocks belong in:

- tests
- fixtures
- demos


# =====================================================================
# 188. DEMO DATA
# =====================================================================

Demo data should be explicitly marked.


Example:

source: "demo"


Never mix demo records into production source data.


# =====================================================================
# 189. DATA VALIDATION
# =====================================================================

Canonical data files should be validated for required structure where
practical.


Do not assume JSON presence implies correctness.


# =====================================================================
# 190. BAD DATA
# =====================================================================

If data is malformed:

- surface error
- fail gracefully where safe
- do not silently invent replacement values


# =====================================================================
# 191. DUPLICATE RECORDS
# =====================================================================

If canonical datasets contain duplicate keys/records, do not silently
pick one unless precedence is defined.


# =====================================================================
# 192. CASE NORMALIZATION
# =====================================================================

Normalize identifiers intentionally.


Example:

E-5
e-5
E5


may normalize to:

E-5


But preserve user-facing canonical display separately if needed.


# =====================================================================
# 193. STRING TRIMMING
# =====================================================================

Trim external string input where appropriate.


Do not unexpectedly alter meaningful internal whitespace in user writing
content.


# =====================================================================
# 194. LOCALE
# =====================================================================

Financial/internal numeric calculations should not depend on display
locale.


Store/calculate numerically.


Format locale at presentation boundary.


# =====================================================================
# 195. CURRENCY
# =====================================================================

Do not store authoritative monetary values as formatted strings.


Prefer:

1234.56


not:

"$1,234.56"


Formatting happens later.


# =====================================================================
# 196. PERCENTAGES
# =====================================================================

Document whether percentage values use:

0.41


or:

41


Avoid mixing conventions.


# =====================================================================
# 197. UNITS
# =====================================================================

Be explicit about units.


Examples:

monthly
annual
percentage
percentage points
miles
minutes
USD


Do not rely on ambiguous field names.


# =====================================================================
# 198. BOOLEAN SEMANTICS
# =====================================================================

A boolean should mean one thing.


Do not overload false to mean:

- no
- unknown
- not evaluated
- unavailable


Use separate states when needed.


# =====================================================================
# 199. ENUM VALIDATION
# =====================================================================

Validate finite mode sets.


Example:

STRICT
BALANCED
COMPETITIVE


Do not silently accept arbitrary mode strings.


# =====================================================================
# 200. SAFE EXTENSIBILITY
# =====================================================================

Design modules so future capabilities can be added without rewriting
every consumer.


Prefer stable interfaces and composable outputs.


# =====================================================================
# 201. DO NOT OVER-ENGINEER
# =====================================================================

Not every helper needs:

- class hierarchy
- factory
- plugin architecture
- dependency injection framework


Use complexity only when it earns its cost.


# =====================================================================
# 202. CODE CLARITY
# =====================================================================

Prefer obvious code over clever code.


Domain logic should be readable by future maintainers and agents.


# =====================================================================
# 203. CRITICAL PATH SIMPLICITY
# =====================================================================

Keep high-trust calculations straightforward.


Complex abstraction should not make official pay calculations impossible
to audit.


# =====================================================================
# 204. REVIEW QUESTIONS
# =====================================================================

Before completing shared-module work, ask:

- Did I create a second source of truth?
- Is this really reusable?
- Is this deterministic where it should be?
- Did I introduce hidden side effects?
- Did I preserve module contracts?
- Did I test boundaries?
- Did I preserve unknown values?
- Did I keep Amy out of authoritative calculation?
- Did I increase coupling?
- Did I affect multiple endpoints?


# =====================================================================
# 205. REQUIRED DISCOVERY BEFORE CHANGING SHARED CODE
# =====================================================================

Before modifying a significant _share module:

1. read the full module
2. inspect imports
3. inspect exports
4. search all consumers
5. inspect related datasets
6. inspect tests
7. inspect adjacent domain modules
8. identify public endpoints affected
9. identify backward-compatibility risks
10. identify whether the module is authoritative


# =====================================================================
# 206. SHARED CHANGE VALIDATION
# =====================================================================

After modifying shared code:

1. run module unit tests
2. run dependent tests
3. run relevant endpoint tests
4. run build/type/lint checks
5. review public response compatibility
6. inspect diff for accidental broad changes


# =====================================================================
# 207. NO FAKE SUCCESS
# =====================================================================

Never claim:

"All consumers are compatible."

unless consumers were actually inspected/tested.


Never claim:

"All tests pass."

unless tests actually ran.


# =====================================================================
# 208. DOCUMENT BREAKING CHANGES
# =====================================================================

If a breaking shared-module change is intentionally required:

report:

- old contract
- new contract
- affected consumers
- migration performed
- remaining risk


# =====================================================================
# 209. HUMAN APPROVAL
# =====================================================================

Shared-module architecture changes with broad repository impact should
remain visible to human review.


Especially changes involving:

- authentication
- financial truth
- military compensation
- model access
- profile schema
- public contracts
- production persistence


# =====================================================================
# 210. MODULE COMPLETION REPORT
# =====================================================================

At the end of substantial _share work, report:


## Shared module

What module(s) changed.


## Source of truth

What canonical responsibility the module owns.


## Consumers

Which major callers are affected.


## Behavioral change

What changed.


## Compatibility

What was preserved or migrated.


## Verification

Exact tests/commands run.


## Risks

Only unresolved real risks.


# =====================================================================
# 211. CRITICAL _share INVARIANTS
# =====================================================================

INVARIANT 1

One authoritative domain rule should have one canonical implementation.


INVARIANT 2

Shared deterministic engines do not depend on HTTP request objects.


INVARIANT 3

Shared domain logic should be independently testable.


INVARIANT 4

TheWing calculates. Amy explains.


INVARIANT 5

LLMs never replace authoritative calculators.


INVARIANT 6

Unknown data stays unknown.


INVARIANT 7

Shared modules do not silently mutate caller state.


INVARIANT 8

Official data is version/date aware where relevant.


INVARIANT 9

Shared-module changes require blast-radius awareness.


INVARIANT 10

Model output is generated content, not canonical truth.


INVARIANT 11

Endpoint concerns remain outside core domain engines.


INVARIANT 12

Secrets do not live in shared source code.


INVARIANT 13

EPB/OPB logic never fabricates performance facts.


INVARIANT 14

Rank context does not create fictional accomplishments.


INVARIANT 15

A shared module is not complete until its consumers remain healthy.


# =====================================================================
# 212. STANDARD _share DEVELOPMENT LOOP
# =====================================================================

For significant shared intelligence work:

IDENTIFY DOMAIN
    ↓
FIND EXISTING SOURCE OF TRUTH
    ↓
READ MODULE
    ↓
SEARCH ALL CONSUMERS
    ↓
INSPECT TESTS
    ↓
IDENTIFY CONTRACT
    ↓
PLAN MINIMAL CHANGE
    ↓
IMPLEMENT
    ↓
UNIT TEST
    ↓
REGRESSION TEST
    ↓
DEPENDENT ENDPOINT TEST
    ↓
BUILD / VERIFY
    ↓
REVIEW DIFF
    ↓
REPORT


Do not stop after IMPLEMENT.


# =====================================================================
# 213. FINAL DIRECTIVE
# =====================================================================

When working inside netlify/functions/_share:

Do not merely create reusable code.

Create reusable truth.

Centralize authoritative logic.

Keep calculations deterministic.

Keep modules testable.

Keep dependencies directional.

Preserve compatibility.

Protect official data.

Expose assumptions.

Preserve unknowns.

Prevent duplicated business rules.

Never let AI-generated prose become authoritative domain truth.

Never invent unsupported EPB/OPB facts.

Remember that every shared-module mistake can propagate across multiple
TheWing products.

And always preserve the governing architecture:

               THEWING CALCULATES.
                  AMY EXPLAINS.

With the shared-layer corollary:

        ONE DOMAIN RULE.
        ONE AUTHORITATIVE IMPLEMENTATION.
```
