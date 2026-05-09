# TheWing.ai Agent Instructions

TheWing.ai is the SaaS intelligence layer for PCSUnited.

PCSUnited is the public-facing military resource hub. It owns open-access calculators, PCS Snapshot, base demographics, blogs, guides, SEO pages, and public trust-building content.

TheWing.ai owns the advanced account-based software layer. Its primary mission is to power the PCSUnited Financial Dashboard, AI concierge, saved profile logic, housing intelligence, decision briefs, and future BuyerBrief / Realtor-by-base workflows.

## Core Brand Architecture

PCSUnited gets the eyes.  
TheWing.ai powers the decisions.

Do not treat TheWing.ai as a full rebrand of PCSUnited.

Do not move public PCSUnited calculators, base pages, blogs, or SEO content into TheWing.ai unless explicitly requested.

Do not expand TheWing.ai into unrelated product ideas. TheWing.ai exists to make the advanced software layer behind PCSUnited clean, credible, and technically reliable.

## Current Strategic Split

### PCSUnited owns open-access public resources

These should remain public, fast, and no-login unless explicitly changed:

- PT Calculator
- BAH Calculator
- VA Calculator
- PCS Snapshot
- Base Demographics
- Blogs / Briefing Room
- PCS guides
- Basic open-access calculators
- Base pages
- Public SEO pages

PCSUnited pages may embed software hosted by TheWing.ai, but PCSUnited should remain the public-facing page owner.

Example:

PCSUnited public page:
`pcsunited.com/pt-calculator`

Embedded software:
`https://thewing.netlify.app/PTCalculator`

### TheWing.ai owns account-based SaaS services

These may require login, Supabase, saved user profile data, email, AI, and advanced analysis:

- Financial Dashboard
- Ask Amy / AI concierge
- Saved profile
- Personalized housing readiness grade
- Decision Briefs
- Saved scenarios
- Housing Intelligence Dashboard
- BuyerBrief engine
- Realtor-by-base intelligence
- Future realtor/lender handoff tools

## Technical Architecture

TheWing.ai uses Netlify Functions.

Public API routes live directly in:

```txt
netlify/functions/
