// netlify/functions/_brain/profile-normalizer.js
// ============================================================
// TheWing.ai • Profile Normalizer
// v1.0.0
//
// PURPOSE
// - Normalizes messy PCSUnited / TheWing user inputs into one canonical profile
// - Handles aliases from Webflow, Supabase, localStorage bridges, and calculator UIs
// - NO Supabase
// - NO OpenAI
// ============================================================

// ============================================================
// //#1) VERSION
// ============================================================

export const ENGINE_VERSION = "thewing-profile-normalizer-1.0.0";

// ============================================================
// //#2) HELPERS
// ============================================================

export function n0(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function round0(value) {
  return Math.round(Number(value) || 0);
}

export function firstString(...values) {
  for (const value of values) {
    const s = String(value ?? "").trim();

    if (s) return s;
  }

  return "";
}

export function firstNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;

    const n = Number(value);

    if (Number.isFinite(n)) return n;
  }

  return 0;
}

export function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return null;
}

export function lower(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function bool(value, fallback = false) {
  if (typeof value === "boolean") return value;

  const s = lower(value);

  if (["true", "yes", "y", "1", "with", "with dependents"].includes(s)) return true;
  if (["false", "no", "n", "0", "without", "without dependents", "none"].includes(s)) return false;

  return fallback;
}

// ============================================================
// //#3) NORMALIZERS
// ============================================================

export function normalizeEmail(value) {
  return lower(value);
}

export function normalizeRank(value) {
  const raw = String(value ?? "").trim().toUpperCase();

  if (!raw) return "";

  const m = raw.match(/^([EOW])\s*-?\s*(\d{1,2})(E)?$/);

  if (m) {
    return `${m[1]}-${m[2]}${m[3] ? "E" : ""}`;
  }

  return raw.replace(/\s+/g, "");
}

export function normalizeMode(value) {
  const raw = lower(value);

  if (["vet", "veteran", "retired", "retiree", "separated", "civilian"].includes(raw)) {
    return "VETERAN";
  }

  if (["ad", "active", "active duty", "active_duty", "activeduty"].includes(raw)) {
    return "ACTIVE_DUTY";
  }

  return "ACTIVE_DUTY";
}

export function normalizeBase(value) {
  const raw = String(value ?? "").trim();

  if (!raw) return "";

  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, "");

  const aliasMap = {
    jbsalackland: "Lackland AFB",
    lackland: "Lackland AFB",
    lacklandafb: "Lackland AFB",

    jbsarandolph: "Randolph AFB",
    randolph: "Randolph AFB",
    randolphafb: "Randolph AFB",

    jbsafortsamhouston: "Fort-Sam-Houston AFB",
    fortsamhouston: "Fort-Sam-Houston AFB",
    fortsamhoustonafb: "Fort-Sam-Houston AFB",

    davismonthan: "Davis-Monthan AFB",
    davismonthanafb: "Davis-Monthan AFB",
    dmafb: "Davis-Monthan AFB",

    fewarren: "F.E-Warren AFB",
    fewarrenafb: "F.E-Warren AFB",
    fewarrenairforcebase: "F.E-Warren AFB",
    francisewarren: "F.E-Warren AFB",

    littlerock: "Little-Rock AFB",
    littlerockafb: "Little-Rock AFB",

    mountainhome: "Mountain-Home AFB",
    mountainhomeafb: "Mountain-Home AFB",

    seymourjohnson: "Seymour-Johnson AFB",
    seymourjohnsonafb: "Seymour-Johnson AFB",

    wrightpatterson: "Wright-Patterson AFB",
    wrightpattersonafb: "Wright-Patterson AFB",
    wpafb: "Wright-Patterson AFB"
  };

  return aliasMap[compact] || raw;
}

export function normalizeDependents(value, profile = {}) {
  const explicit = firstDefined(
    value,
    profile.dependents,
    profile.dependentStatus,
    profile.dependent_status,
    profile.hasDependents,
    profile.has_dependents,
    profile.family,
    profile.familySize,
    profile.family_size
  );

  if (typeof explicit === "number") {
    return explicit >= 2 ? "with" : "without";
  }

  if (typeof explicit === "boolean") {
    return explicit ? "with" : "without";
  }

  const s = lower(explicit);

  if (!s) {
    const family = firstNumber(profile.family, profile.familySize, profile.family_size, 1);
    return family >= 2 ? "with" : "without";
  }

  if (["with", "yes", "true", "1", "dependent", "dependents", "with dependents", "with_dependents"].includes(s)) {
    return "with";
  }

  if (["without", "no", "false", "0", "single", "none", "without dependents", "without_dependents"].includes(s)) {
    return "without";
  }

  const maybeNumber = Number(s);

  if (Number.isFinite(maybeNumber)) {
    return maybeNumber >= 2 ? "with" : "without";
  }

  return s.includes("without") || s.includes("no") ? "without" : "with";
}

export function rankTitle(rank) {
  const map = {
    "E-1": "Airman Basic",
    "E-2": "Airman",
    "E-3": "Airman First Class",
    "E-4": "Senior Airman",
    "E-5": "Staff Sergeant",
    "E-6": "Technical Sergeant",
    "E-7": "Master Sergeant",
    "E-8": "Senior Master Sergeant",
    "E-9": "Chief Master Sergeant",

    "W-1": "Warrant Officer 1",
    "W-2": "Chief Warrant Officer 2",
    "W-3": "Chief Warrant Officer 3",
    "W-4": "Chief Warrant Officer 4",
    "W-5": "Chief Warrant Officer 5",

    "O-1": "Second Lieutenant",
    "O-2": "First Lieutenant",
    "O-3": "Captain",
    "O-4": "Major",
    "O-5": "Lieutenant Colonel",
    "O-6": "Colonel",
    "O-7": "Brigadier General",
    "O-8": "Major General",

    "O-1E": "Second Lieutenant prior enlisted",
    "O-2E": "First Lieutenant prior enlisted",
    "O-3E": "Captain prior enlisted"
  };

  return map[rank] || rank;
}

// ============================================================
// //#4) MAIN NORMALIZER
// ============================================================

export function normalizeProfile(input = {}) {
  const profile = input.profile && typeof input.profile === "object"
    ? { ...input.profile, ...input }
    : { ...input };

  const firstName = firstString(
    profile.first_name,
    profile.firstName
  );

  const lastName = firstString(
    profile.last_name,
    profile.lastName
  );

  const fullName = firstString(
    profile.full_name,
    profile.fullName,
    [firstName, lastName].filter(Boolean).join(" ")
  );

  const email = normalizeEmail(firstString(
    profile.email,
    profile.user_email,
    profile.loginEmail,
    profile.sessionEmail
  ));

  const mode = normalizeMode(firstString(
    profile.mode,
    profile.status,
    profile.member_status,
    profile.memberStatus,
    profile.service_status,
    profile.serviceStatus
  ));

  const rank = normalizeRank(firstString(
    profile.rank_paygrade,
    profile.rankPaygrade,
    profile.paygrade,
    profile.rank,
    profile.grade
  ));

  const yearsOfService = firstNumber(
    profile.yos,
    profile.yearsOfService,
    profile.years_of_service,
    profile.serviceYears
  );

  const base = normalizeBase(firstString(
    profile.base,
    profile.currentBase,
    profile.current_base,
    profile.location,
    profile.duty_station,
    profile.dutyStation,
    profile.station,
    profile.pcs_base,
    profile.pcsBase
  ));

  const familySize = firstNumber(
    profile.family,
    profile.familySize,
    profile.family_size,
    profile.dependents_count,
    profile.dependentsCount,
    1
  );

  const dependents = normalizeDependents(
    firstDefined(
      profile.dependents,
      profile.dependentStatus,
      profile.dependent_status,
      profile.hasDependents,
      profile.has_dependents,
      familySize
    ),
    profile
  );

  const vaRating = firstNumber(
    profile.va_disability,
    profile.vaDisability,
    profile.va_rating,
    profile.vaRating,
    profile.rating
  );

  const monthlyExpenses = firstNumber(
    profile.monthly_expenses,
    profile.monthlyExpenses,
    profile.expenses
  );

  const monthlyDebt = firstNumber(
    profile.monthly_debt,
    profile.monthlyDebt,
    profile.debt,
    profile.debtPayments,
    profile.non_housing_debt,
    profile.nonHousingDebt
  );

  const additionalIncome = firstNumber(
    profile.additional_income,
    profile.additionalIncome,
    profile.additional_monthly_income,
    profile.additionalMonthlyIncome
  );

  const projectedHomePrice = firstNumber(
    profile.projected_home_price,
    profile.projectedHomePrice,
    profile.home_price,
    profile.homePrice,
    profile.price
  );

  const downpayment = firstNumber(
    profile.downpayment,
    profile.downPayment,
    profile.down_payment,
    profile.dpAmt,
    profile.savings,
    profile.current_savings
  );

  const creditScore = firstNumber(
    profile.credit_score,
    profile.creditScore,
    profile.score,
    profile.fico
  );

  const bedrooms = firstNumber(
    profile.bedrooms,
    profile.bedroomsWanted,
    profile.beds
  );

  const bathrooms = firstNumber(
    profile.bathrooms,
    profile.baths
  );

  const sqft = firstNumber(
    profile.sqft,
    profile.squareFeet,
    profile.square_feet
  );

  const propertyType = firstString(
    profile.property_type,
    profile.propertyType
  );

  const amenities = firstString(
    profile.amenities,
    Array.isArray(profile.amenities) ? profile.amenities.join(", ") : ""
  );

  const homeCondition = firstString(
    profile.home_condition,
    profile.homeCondition
  );

  return {
    id: profile.id ?? null,
    email,

    firstName,
    first_name: firstName,

    lastName,
    last_name: lastName,

    fullName,
    full_name: fullName,

    phone: firstString(profile.phone, profile.phone_number, profile.phoneNumber),

    mode,

    rank,
    rank_paygrade: rank,
    rankTitle: rankTitle(rank),

    yearsOfService: round2(yearsOfService),
    years_of_service: round2(yearsOfService),
    yos: round2(yearsOfService),

    base,
    currentBase: base,
    current_base: base,

    familySize: round0(familySize),
    family_size: round0(familySize),
    family: round0(familySize),

    dependents,
    hasDependents: dependents === "with",
    has_dependents: dependents === "with",

    vaRating: round0(vaRating),
    va_rating: round0(vaRating),
    vaDisability: round0(vaRating),
    va_disability: round0(vaRating),

    monthlyExpenses: round2(monthlyExpenses),
    monthly_expenses: round2(monthlyExpenses),

    monthlyDebt: round2(monthlyDebt),
    monthly_debt: round2(monthlyDebt),
    nonHousingDebt: round2(monthlyDebt),
    non_housing_debt: round2(monthlyDebt),

    additionalIncome: round2(additionalIncome),
    additional_income: round2(additionalIncome),
    additionalMonthlyIncome: round2(additionalIncome),
    additional_monthly_income: round2(additionalIncome),

    projectedHomePrice: round2(projectedHomePrice),
    projected_home_price: round2(projectedHomePrice),
    price: round2(projectedHomePrice),

    downpayment: round2(downpayment),
    downPayment: round2(downpayment),
    savings: round2(downpayment),

    creditScore: round0(creditScore),
    credit_score: round0(creditScore),

    bedrooms: round0(bedrooms),
    bathrooms: round0(bathrooms),
    sqft: round0(sqft),
    propertyType,
    property_type: propertyType,
    amenities,
    homeCondition,
    home_condition: homeCondition,

    raw: profile,

    meta: {
      engineVersion: ENGINE_VERSION,
      normalizedAt: new Date().toISOString()
    }
  };
}

export function mergeProfileInputs(...objects) {
  const merged = {};

  for (const obj of objects) {
    if (!obj || typeof obj !== "object") continue;

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null || value === "") continue;
      merged[key] = value;
    }
  }

  return normalizeProfile(merged);
}

export function safeNormalizeProfile(input = {}) {
  try {
    return {
      ok: true,
      profile: normalizeProfile(input)
    };
  } catch (error) {
    return {
      ok: false,
      engineVersion: ENGINE_VERSION,
      error: error?.message || "Profile normalization failed."
    };
  }
}

// ============================================================
// //#5) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  ENGINE_VERSION,

  n0,
  round2,
  round0,
  firstString,
  firstNumber,
  firstDefined,
  lower,
  bool,

  normalizeEmail,
  normalizeRank,
  normalizeMode,
  normalizeBase,
  normalizeDependents,
  rankTitle,

  normalizeProfile,
  mergeProfileInputs,
  safeNormalizeProfile
});
