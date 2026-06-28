#!/usr/bin/env python3
"""
PCSUnited / TheWing.ai
Base JSON Refresh Pipeline - RentCast + Census Only

Purpose:
- Preserve the complete PCSU base JSON structure.
- Use the existing/base JSON as the template.
- Refresh only valid API data fields.
- Output a complete base.json file.

API responsibility:
- RentCast = housing market, sale metrics, rental metrics
- Census = demographics, income, education, labor, households
- Existing JSON = curated PCS guidance, base_profile, gates, services, watchouts, narrative

Run from repo root:

    python tools/base_refresh/refresh_bases.py

Required local file:

    tools/base_refresh/.env

Example .env:

    RENTCAST_API_KEY=your_key_here
    CENSUS_API_KEY=your_key_here

Important:
- raw/*.json stays local/private.
- output/*.json is safe to review and push.
- ArcGIS is intentionally removed from this refresh pipeline.
"""

import os
import json
import time
import copy
import statistics
from pathlib import Path
from datetime import datetime, timezone

import requests

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None


# ============================================================
# PATH SETUP
# ============================================================

BASE_REFRESH_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_REFRESH_DIR.parents[1]

REGISTRY_PATH = BASE_REFRESH_DIR / "base_registry.json"
RAW_DIR = BASE_REFRESH_DIR / "raw"
OUTPUT_DIR = BASE_REFRESH_DIR / "output"
REPORT_PATH = BASE_REFRESH_DIR / "refresh_report.json"
ENV_PATH = BASE_REFRESH_DIR / ".env"

LIVE_CITIES_DIR = REPO_ROOT / "netlify" / "functions" / "cities"

RAW_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# CONFIG
# ============================================================

RENTCAST_BASE_URL = "https://api.rentcast.io/v1"
RENTCAST_MARKET_ENDPOINT = "/markets"

CENSUS_YEAR = "2023"
CENSUS_DATASET = "acs/acs5/profile"
CENSUS_BASE_URL = f"https://api.census.gov/data/{CENSUS_YEAR}/{CENSUS_DATASET}"

REQUEST_TIMEOUT_SECONDS = 30
REQUEST_SLEEP_SECONDS = 0.25

BATCH_ID = datetime.now(timezone.utc).strftime("%Y_%m")
AS_OF_DATE = datetime.now(timezone.utc).strftime("%Y-%m-%d")
AS_OF_MONTH = datetime.now(timezone.utc).strftime("%Y-%m")


# ============================================================
# BASIC HELPERS
# ============================================================

CENSUS_MISSING_VALUES = {
    -666666666,
    -777777777,
    -888888888,
    -999999999
}


def load_env():
    if load_dotenv is None:
        print("WARNING: python-dotenv is not installed.")
        print("Install with: pip install python-dotenv")
        return

    if ENV_PATH.exists():
        load_dotenv(ENV_PATH)
    else:
        print(f"WARNING: No .env file found at: {ENV_PATH}")


def read_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def safe_slug(value):
    return (
        str(value)
        .strip()
        .lower()
        .replace(" ", "-")
        .replace(".", "")
        .replace("_", "-")
        .replace("--", "-")
    )


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def safe_number(value):
    """
    Converts API values into numbers.

    Important:
    Census sometimes returns sentinel values such as:
      -666666666
      -777777777
      -888888888
      -999999999

    Those mean missing / suppressed / not available.
    They must never overwrite good baseline JSON values.
    """
    if value is None:
        return None

    if isinstance(value, bool):
        return None

    if isinstance(value, (int, float)):
        if value in CENSUS_MISSING_VALUES:
            return None
        return value

    if isinstance(value, str):
        cleaned = (
            value.replace("$", "")
            .replace(",", "")
            .replace("%", "")
            .strip()
        )

        if cleaned in ("", "null", "None", "N/A", "-", "*****", "(X)"):
            return None

        try:
            if "." in cleaned:
                num = float(cleaned)
            else:
                num = int(cleaned)

            if num in CENSUS_MISSING_VALUES:
                return None

            return num

        except ValueError:
            return None

    return None


def valid_percent(value):
    num = safe_number(value)

    if num is None:
        return None

    if num < 0 or num > 100:
        return None

    return num


def round_number(value):
    num = safe_number(value)
    if num is None:
        return None
    return round(num)


def round_money(value):
    num = safe_number(value)
    if num is None:
        return None
    return round(num)


def round_decimal(value, places=2):
    num = safe_number(value)
    if num is None:
        return None
    return round(num, places)


def round_percent(value, places=1):
    num = valid_percent(value)
    if num is None:
        return None
    return round(num, places)


def median_or_none(values):
    nums = [safe_number(v) for v in values]
    nums = [v for v in nums if v is not None and v > 0]

    if not nums:
        return None

    return round(statistics.median(nums))


def average_or_none(values):
    nums = [safe_number(v) for v in values]
    nums = [v for v in nums if v is not None and v > 0]

    if not nums:
        return None

    return round(sum(nums) / len(nums))


def average_decimal_or_none(values, places=2):
    nums = [safe_number(v) for v in values]
    nums = [v for v in nums if v is not None and v > 0]

    if not nums:
        return None

    return round(sum(nums) / len(nums), places)


def sum_or_none(values):
    nums = [safe_number(v) for v in values]
    nums = [v for v in nums if v is not None]

    if not nums:
        return None

    return round(sum(nums))


def set_if_value(target, key, value):
    """
    Only writes valid API values.
    This protects baseline JSON values from being replaced by None.
    """
    if value is not None:
        target[key] = value


def update_section_valid(target, source):
    """
    Updates a dict with only non-None values.
    """
    if not isinstance(source, dict):
        return target

    for key, value in source.items():
        if value is not None:
            target[key] = value

    return target


def get_nested(data, path, default=None):
    current = data

    for key in path:
        if not isinstance(current, dict):
            return default

        current = current.get(key)

        if current is None:
            return default

    return current


# ============================================================
# EXISTING JSON / TEMPLATE LOADING
# ============================================================

def find_existing_base_json(base):
    """
    Finds the current live JSON so we can preserve the full schema.
    """
    if not LIVE_CITIES_DIR.exists():
        return None

    slug = base.get("slug")
    name = base.get("name")
    file_name = base.get("file")

    candidates = []

    if file_name:
        candidates.extend([
            f"{file_name}.json",
            f"{file_name.lower()}.json",
            f"{file_name.replace(' ', '-')}.json"
        ])

    if slug:
        candidates.extend([
            f"{slug}.json",
            f"{slug.lower()}.json",
            f"{slug.title()}.json"
        ])

        if slug.endswith("-afb"):
            candidates.append(f"{slug.replace('-afb', '')}.json")

    if name:
        name_no_afb = name.replace(" AFB", "").replace(" SFB", "")
        candidates.extend([
            f"{name}.json",
            f"{name.replace(' ', '-')}.json",
            f"{name.replace(' ', '')}.json",
            f"{name_no_afb}.json",
            f"{name_no_afb.replace(' ', '-')}.json",
            f"{name_no_afb.replace(' ', '')}.json"
        ])

    for candidate in candidates:
        path = LIVE_CITIES_DIR / candidate

        if path.exists():
            return path

    slug_lower = safe_slug(slug or file_name or name or "")

    for path in LIVE_CITIES_DIR.glob("*.json"):
        if safe_slug(path.stem) == slug_lower:
            return path

    return None


def load_existing_or_minimal(base):
    existing_path = find_existing_base_json(base)

    if existing_path:
        try:
            return read_json(existing_path), str(existing_path)
        except Exception as e:
            print(f"WARNING: Could not read existing JSON {existing_path}: {e}")

    minimal = {
        "slug": base.get("slug"),
        "name": base.get("name"),
        "city": base.get("city"),
        "submarket": base.get("submarket"),
        "place": base.get("place"),
        "place_detail": base.get("place_detail"),
        "state": base.get("state"),
        "state_code": base.get("state_code"),
        "geo_id": base.get("geo_id"),
        "year": int(datetime.now(timezone.utc).strftime("%Y")),
        "last_updated_data_from_sources": AS_OF_MONTH,
        "zip": base.get("primary_zip"),
        "market_label": base.get("market_label"),
        "profile": "",
        "avg_home_value": None,
        "average_home_value": None,
        "avgHome": None,
        "city_avg_home": None,
        "snapshot": {},
        "market_metrics": {},
        "metrics": {},
        "mortgage_assumptions": {},
        "ownership_costs": {},
        "costs": {},
        "avg_home_mortgage_monthly": {},
        "population": {},
        "households": {},
        "income": {},
        "education": {},
        "veterans": {},
        "immigration": {},
        "labor": {},
        "crime_status": {},
        "school_quality": {},
        "rental_vacancy": {},
        "rental_metrics": {},
        "climate_weather": {},
        "special_events": [],
        "military_lifestyle_fit": {},
        "financial_brief": {},
        "market_bluf": {},
        "scorecard": {},
        "rules": {},
        "summary_points": [],
        "opportunities": [],
        "risks": [],
        "buyer_notes": [],
        "seller_notes": [],
        "investor_angles": [],
        "neighborhoods": [],
        "target_neighborhoods": [],
        "buyer_guidance": [],
        "seller_guidance": [],
        "landlord_notes": [],
        "by_bedroom": {},
        "housing": {},
        "base_profile": {},
        "sources": {},
        "compatibility": {
            "orozco_realty_ready": True,
            "pcsunited_ready": True
        }
    }

    return minimal, None


# ============================================================
# RENTCAST CLIENT
# ============================================================

def rentcast_headers():
    api_key = os.getenv("RENTCAST_API_KEY")

    if not api_key:
        raise RuntimeError(
            "Missing RENTCAST_API_KEY. Add it to tools/base_refresh/.env"
        )

    return {
        "accept": "application/json",
        "X-Api-Key": api_key
    }


def rentcast_get(endpoint, params=None):
    url = f"{RENTCAST_BASE_URL}{endpoint}"

    response = requests.get(
        url,
        headers=rentcast_headers(),
        params=params or {},
        timeout=REQUEST_TIMEOUT_SECONDS
    )

    if response.status_code != 200:
        raise RuntimeError(
            f"RentCast request failed: {response.status_code} - {response.text}"
        )

    return response.json()


def fetch_rentcast_market_zip(zip_code):
    return rentcast_get(
        RENTCAST_MARKET_ENDPOINT,
        params={"zipCode": str(zip_code)}
    )


def save_raw_payload(provider, base_slug, label, payload):
    raw_path = RAW_DIR / f"{base_slug}-{provider}-{label}-{BATCH_ID}.json"
    write_json(raw_path, payload)
    return str(raw_path.relative_to(BASE_REFRESH_DIR))


def extract_zip_market_values(payload):
    sale_data = payload.get("saleData") or {}
    rental_data = payload.get("rentalData") or payload.get("rentData") or {}

    values = {
        "sale_last_updated": sale_data.get("lastUpdatedDate"),
        "rental_last_updated": rental_data.get("lastUpdatedDate"),

        "sale_average_price": round_money(sale_data.get("averagePrice")),
        "sale_median_price": round_money(sale_data.get("medianPrice")),
        "sale_min_price": round_money(sale_data.get("minPrice")),
        "sale_max_price": round_money(sale_data.get("maxPrice")),
        "sale_average_price_per_sqft": round_decimal(
            sale_data.get("averagePricePerSquareFoot")
        ),
        "sale_median_price_per_sqft": round_decimal(
            sale_data.get("medianPricePerSquareFoot")
        ),
        "sale_average_sqft": round_number(sale_data.get("averageSquareFootage")),
        "sale_median_sqft": round_number(sale_data.get("medianSquareFootage")),
        "sale_average_days_on_market": round_number(
            sale_data.get("averageDaysOnMarket")
        ),
        "sale_median_days_on_market": round_number(
            sale_data.get("medianDaysOnMarket")
        ),
        "sale_new_listings": round_number(sale_data.get("newListings")),
        "sale_total_listings": round_number(sale_data.get("totalListings")),

        "rent_average_price": round_money(rental_data.get("averageRent")),
        "rent_median_price": round_money(rental_data.get("medianRent")),
        "rent_min_price": round_money(rental_data.get("minRent")),
        "rent_max_price": round_money(rental_data.get("maxRent")),
        "rent_average_price_per_sqft": round_decimal(
            rental_data.get("averageRentPerSquareFoot")
        ),
        "rent_median_price_per_sqft": round_decimal(
            rental_data.get("medianRentPerSquareFoot")
        ),
        "rent_average_sqft": round_number(rental_data.get("averageSquareFootage")),
        "rent_median_sqft": round_number(rental_data.get("medianSquareFootage")),
        "rent_average_days_on_market": round_number(
            rental_data.get("averageDaysOnMarket")
        ),
        "rent_median_days_on_market": round_number(
            rental_data.get("medianDaysOnMarket")
        ),
        "rent_new_listings": round_number(rental_data.get("newListings")),
        "rent_total_listings": round_number(rental_data.get("totalListings"))
    }

    return values


def extract_rentcast_summary(zip_payloads):
    sale_average_prices = []
    sale_median_prices = []
    sale_avg_price_per_sqft = []
    sale_median_price_per_sqft = []
    sale_avg_dom = []
    sale_median_dom = []
    sale_new_listings = []
    sale_total_listings = []

    rent_average_prices = []
    rent_median_prices = []
    rent_avg_price_per_sqft = []
    rent_median_price_per_sqft = []
    rent_avg_dom = []
    rent_median_dom = []
    rent_new_listings = []
    rent_total_listings = []

    sale_dates = []
    rental_dates = []
    zip_summaries = []

    for item in zip_payloads:
        zip_code = item.get("zip")
        payload = item.get("payload") or {}

        values = extract_zip_market_values(payload)
        values["zip"] = zip_code
        zip_summaries.append(values)

        if values.get("sale_last_updated"):
            sale_dates.append(values["sale_last_updated"])

        if values.get("rental_last_updated"):
            rental_dates.append(values["rental_last_updated"])

        sale_average_prices.append(values.get("sale_average_price"))
        sale_median_prices.append(values.get("sale_median_price"))
        sale_avg_price_per_sqft.append(values.get("sale_average_price_per_sqft"))
        sale_median_price_per_sqft.append(values.get("sale_median_price_per_sqft"))
        sale_avg_dom.append(values.get("sale_average_days_on_market"))
        sale_median_dom.append(values.get("sale_median_days_on_market"))
        sale_new_listings.append(values.get("sale_new_listings"))
        sale_total_listings.append(values.get("sale_total_listings"))

        rent_average_prices.append(values.get("rent_average_price"))
        rent_median_prices.append(values.get("rent_median_price"))
        rent_avg_price_per_sqft.append(values.get("rent_average_price_per_sqft"))
        rent_median_price_per_sqft.append(values.get("rent_median_price_per_sqft"))
        rent_avg_dom.append(values.get("rent_average_days_on_market"))
        rent_median_dom.append(values.get("rent_median_days_on_market"))
        rent_new_listings.append(values.get("rent_new_listings"))
        rent_total_listings.append(values.get("rent_total_listings"))

    avg_home_value = (
        median_or_none(sale_median_prices)
        or average_or_none(sale_average_prices)
    )

    median_sale_price = median_or_none(sale_median_prices)
    average_sale_price = average_or_none(sale_average_prices)

    price_per_sqft = (
        median_or_none(sale_median_price_per_sqft)
        or average_decimal_or_none(sale_avg_price_per_sqft)
    )

    sale_days_on_market = (
        median_or_none(sale_median_dom)
        or average_or_none(sale_avg_dom)
    )

    average_rent = average_or_none(rent_average_prices)
    median_rent = median_or_none(rent_median_prices)

    rent_price_per_sqft = (
        median_or_none(rent_median_price_per_sqft)
        or average_decimal_or_none(rent_avg_price_per_sqft)
    )

    rent_days_on_market = (
        median_or_none(rent_median_dom)
        or average_or_none(rent_avg_dom)
    )

    return {
        "avg_home_value": avg_home_value,
        "average_sale_price": average_sale_price,
        "median_sale_price": median_sale_price,
        "median_list_price": median_sale_price,
        "price_per_sqft": price_per_sqft,
        "days_on_market": sale_days_on_market,
        "total_sale_listings": sum_or_none(sale_total_listings),
        "new_sale_listings": sum_or_none(sale_new_listings),

        "average_rent": average_rent,
        "median_rent": median_rent,
        "rent_price_per_sqft": rent_price_per_sqft,
        "rent_days_on_market": rent_days_on_market,
        "total_rental_listings": sum_or_none(rent_total_listings),
        "new_rental_listings": sum_or_none(rent_new_listings),

        "sale_last_updated": max(sale_dates) if sale_dates else None,
        "rental_last_updated": max(rental_dates) if rental_dates else None,
        "zip_summaries": zip_summaries
    }


# ============================================================
# CENSUS CLIENT
# ============================================================

CENSUS_PROFILE_VARIABLES = {
    "NAME": "NAME",

    # Core people / households
    "population": "DP05_0001E",
    "median_age": "DP05_0018E",
    "total_households": "DP02_0001E",
    "persons_per_household": "DP02_0016E",

    # Income / economy
    "median_household_income": "DP03_0062E",
    "per_capita_income": "DP03_0088E",
    "poverty_rate_percent": "DP03_0128PE",
    "mean_travel_time_to_work_minutes": "DP03_0025E",
    "unemployment_rate_percent": "DP03_0009PE",

    # Education
    "high_school_grad_or_higher_percent": "DP02_0067PE",
    "bachelors_degree_or_higher_percent": "DP02_0068PE",

    # Housing
    "housing_units": "DP04_0001E",
    "rental_vacancy_rate_percent": "DP04_0005PE",
    "median_value_owner_occupied": "DP04_0089E",

    # Use veteran count only for now.
    # Veteran percentage is preserved from baseline because profile variable behavior
    # can vary by geography and should not overwrite curated baseline values.
    "veteran_population": "DP02_0095E"

    # Immigration is also preserved from baseline for now.
}


def parse_census_geo_id(geo_id):
    """
    Expected format:
    1600000US4840036

    state = 48
    place = 40036
    """
    if not geo_id or "US" not in str(geo_id):
        return None, None

    geo_part = str(geo_id).split("US")[-1]

    if len(geo_part) < 7:
        return None, None

    state_code = geo_part[:2]
    place_code = geo_part[2:]

    return state_code, place_code


def census_get(params):
    api_key = os.getenv("CENSUS_API_KEY")
    request_params = dict(params)

    if api_key:
        request_params["key"] = api_key

    response = requests.get(
        CENSUS_BASE_URL,
        params=request_params,
        timeout=REQUEST_TIMEOUT_SECONDS
    )

    if response.status_code != 200:
        raise RuntimeError(
            f"Census request failed: {response.status_code} - {response.text}"
        )

    return response.json()


def fetch_census_profile_for_place(geo_id):
    state_code, place_code = parse_census_geo_id(geo_id)

    if not state_code or not place_code:
        raise RuntimeError(f"Invalid or missing Census geo_id: {geo_id}")

    variables = list(CENSUS_PROFILE_VARIABLES.values())

    payload = census_get({
        "get": ",".join(variables),
        "for": f"place:{place_code}",
        "in": f"state:{state_code}"
    })

    return payload


def parse_census_profile(payload):
    if not isinstance(payload, list) or len(payload) < 2:
        raise RuntimeError("Unexpected Census response shape")

    headers = payload[0]
    values = payload[1]

    row = dict(zip(headers, values))

    def raw(field_name):
        variable = CENSUS_PROFILE_VARIABLES.get(field_name)
        return row.get(variable)

    return {
        "name": row.get("NAME"),

        "population": {
            "estimate": round_number(raw("population")),
            "median_age": round_decimal(raw("median_age"), 1),
            "persons_per_household": round_decimal(
                raw("persons_per_household"), 2
            )
        },

        "households": {
            "total_households": round_number(raw("total_households"))
        },

        "income": {
            "median_household_income": round_money(
                raw("median_household_income")
            ),
            "per_capita_income": round_money(raw("per_capita_income")),
            "poverty_rate_percent": round_percent(
                raw("poverty_rate_percent"), 1
            )
        },

        "education": {
            "high_school_grad_or_higher_percent": round_percent(
                raw("high_school_grad_or_higher_percent"), 1
            ),
            "bachelors_degree_or_higher_percent": round_percent(
                raw("bachelors_degree_or_higher_percent"), 1
            )
        },

        "veterans": {
            "veteran_population": round_number(raw("veteran_population"))
        },

        "labor": {
            "mean_travel_time_to_work_minutes": round_decimal(
                raw("mean_travel_time_to_work_minutes"), 1
            ),
            "unemployment_rate_percent": round_percent(
                raw("unemployment_rate_percent"), 1
            )
        },

        "housing": {
            "housing_units": round_number(raw("housing_units")),
            "median_value_owner_occupied": round_money(
                raw("median_value_owner_occupied")
            )
        },

        "rental_vacancy": {
            "rate_percent": round_percent(
                raw("rental_vacancy_rate_percent"), 1
            )
        }
    }


# ============================================================
# APPLY API DATA TO COMPLETE PCSU JSON
# ============================================================

def apply_registry_identity(updated, base):
    slug = base.get("slug") or updated.get("slug") or safe_slug(base.get("name"))

    updated["slug"] = slug
    updated["name"] = base.get("name", updated.get("name"))
    updated["city"] = base.get("city", updated.get("city"))
    updated["submarket"] = base.get("submarket", updated.get("submarket"))
    updated["place"] = base.get("place", updated.get("place"))
    updated["place_detail"] = base.get("place_detail", updated.get("place_detail"))
    updated["state"] = base.get("state", updated.get("state"))
    updated["state_code"] = base.get("state_code", updated.get("state_code"))
    updated["geo_id"] = base.get("geo_id", updated.get("geo_id"))
    updated["zip"] = base.get("primary_zip", updated.get("zip"))
    updated["market_label"] = base.get("market_label", updated.get("market_label"))

    updated["year"] = int(datetime.now(timezone.utc).strftime("%Y"))
    updated["last_updated_data_from_sources"] = AS_OF_MONTH

    return updated


def apply_rentcast(updated, rentcast_summary, base, raw_refs):
    avg_home_value = rentcast_summary.get("avg_home_value")
    median_sale_price = rentcast_summary.get("median_sale_price")
    median_list_price = rentcast_summary.get("median_list_price")
    price_per_sqft = rentcast_summary.get("price_per_sqft")
    days_on_market = rentcast_summary.get("days_on_market")
    total_sale_listings = rentcast_summary.get("total_sale_listings")
    average_rent = rentcast_summary.get("average_rent")
    median_rent = rentcast_summary.get("median_rent")

    if avg_home_value:
        updated["avg_home_value"] = avg_home_value
        updated["average_home_value"] = avg_home_value
        updated["avgHome"] = avg_home_value
        updated["city_avg_home"] = avg_home_value

    updated.setdefault("snapshot", {})
    set_if_value(
        updated["snapshot"],
        "median_home_price",
        median_sale_price or avg_home_value
    )

    updated.setdefault("market_metrics", {})
    update_section_valid(updated["market_metrics"], {
        "median_list_price": median_list_price,
        "median_sold_price": median_sale_price,
        "median_sale_price": median_sale_price,
        "days_on_market": days_on_market,
        "inventory_months": updated["market_metrics"].get("inventory_months"),
        "price_per_sqft": price_per_sqft,
        "active_listings_total": total_sale_listings,
        "zillow_average_home_value": avg_home_value,
        "as_of": AS_OF_MONTH,
        "source": "RentCast Markets API",
        "source_last_updated": rentcast_summary.get("sale_last_updated"),
        "method": "Aggregated from selected PCS housing-market ZIPs"
    })

    updated.setdefault("metrics", {})
    update_section_valid(updated["metrics"], {
        "median_list_price": median_list_price,
        "median_sold_price": median_sale_price,
        "median_sale_price": median_sale_price,
        "days_on_market": days_on_market,
        "inventory_months": updated["metrics"].get("inventory_months"),
        "price_per_sqft": price_per_sqft,
        "median_rent": median_rent,
        "active_listings_total": total_sale_listings,
        "as_of": AS_OF_MONTH
    })

    updated.setdefault("rental_metrics", {})
    update_section_valid(updated["rental_metrics"], {
        "average_rent": average_rent,
        "median_rent": median_rent,
        "rent_price_per_sqft": rentcast_summary.get("rent_price_per_sqft"),
        "days_on_market": rentcast_summary.get("rent_days_on_market"),
        "total_listings": rentcast_summary.get("total_rental_listings"),
        "new_listings": rentcast_summary.get("new_rental_listings"),
        "as_of": AS_OF_MONTH,
        "source": "RentCast Markets API",
        "source_last_updated": rentcast_summary.get("rental_last_updated"),
        "method": "Aggregated from selected PCS housing-market ZIPs"
    })

    updated.setdefault("housing", {})
    updated["housing"].setdefault("market", {})
    update_section_valid(updated["housing"]["market"], {
        "zillow_average_home_value": avg_home_value,
        "average_days_on_market": days_on_market,
        "median_sale_price_current": median_sale_price,
        "median_listing_price_realtor": median_list_price,
        "median_listing_price_per_sqft": price_per_sqft,
        "active_listings_total": total_sale_listings
    })

    if median_sale_price:
        updated["housing"]["market"]["q1_2026"] = {
            "median_sale_price": median_sale_price
        }

    updated["market_area"] = {
        "primary_base_zip": base.get("primary_zip"),
        "housing_market_zips": base.get("housing_market_zips", []),
        "method": "Uses selected PCS buyer/renter ZIPs, not installation-only ZIP."
    }

    updated["rentcast_zip_summaries"] = rentcast_summary.get("zip_summaries", [])

    updated.setdefault("sources", {})
    updated["sources"]["housing_market"] = {
        "provider": "RentCast",
        "dataset": "RentCast Markets API",
        "as_of": AS_OF_MONTH,
        "batch_id": BATCH_ID,
        "primary_base_zip": base.get("primary_zip"),
        "housing_market_zips": base.get("housing_market_zips", []),
        "raw_files": raw_refs
    }

    return updated


def apply_census(updated, census_summary, raw_ref):
    if not census_summary:
        return updated

    updated.setdefault("snapshot", {})
    set_if_value(
        updated["snapshot"],
        "population_city",
        get_nested(census_summary, ["population", "estimate"])
    )
    set_if_value(
        updated["snapshot"],
        "median_household_income",
        get_nested(census_summary, ["income", "median_household_income"])
    )

    for section in [
        "population",
        "households",
        "income",
        "education",
        "veterans",
        "labor"
    ]:
        updated.setdefault(section, {})
        update_section_valid(updated[section], census_summary.get(section, {}))

    updated.setdefault("housing", {})
    housing_census = census_summary.get("housing", {})
    set_if_value(updated["housing"], "housing_units", housing_census.get("housing_units"))
    set_if_value(
        updated["housing"],
        "median_value_owner_occupied",
        housing_census.get("median_value_owner_occupied")
    )

    updated.setdefault("rental_vacancy", {})
    update_section_valid(
        updated["rental_vacancy"],
        census_summary.get("rental_vacancy", {})
    )

    updated.setdefault("sources", {})
    updated["sources"]["demographics"] = {
        "provider": "US Census Bureau ACS 5-Year Profile",
        "dataset": CENSUS_DATASET,
        "year": CENSUS_YEAR,
        "as_of": AS_OF_MONTH,
        "raw_file": raw_ref
    }

    return updated


def apply_data_quality(updated, base, raw_refs):
    updated.setdefault("data_quality", {})
    updated["data_quality"]["api_refresh"] = {
        "batch_id": BATCH_ID,
        "as_of": AS_OF_DATE,
        "housing_market": {
            "provider": "RentCast",
            "confidence": "medium-high",
            "method": "Selected housing-market ZIP aggregation"
        },
        "demographics": {
            "provider": "US Census Bureau ACS",
            "confidence": "high",
            "method": "Place-level ACS profile where geo_id is available"
        },
        "nearby_services": {
            "provider": "Baseline JSON / official-source review",
            "confidence": "medium-high",
            "method": "Preserved from existing PCSU base JSON"
        },
        "raw_files": raw_refs,
        "notes": [
            "The JSON structure is preserved from the existing PCSU base file.",
            "RentCast updates housing, sale, and rental market fields.",
            "Census updates demographic and economic fields only when values are valid.",
            "Curated PCS guidance, official links, gates, major services, and base_profile intelligence are preserved unless manually updated."
        ]
    }

    updated.setdefault("compatibility", {})
    updated["compatibility"]["orozco_realty_ready"] = True
    updated["compatibility"]["pcsunited_ready"] = True
    updated["compatibility"]["api_refresh_ready"] = True
    updated["compatibility"]["last_api_refresh_batch"] = BATCH_ID

    return updated


# ============================================================
# VALIDATION
# ============================================================

def validate_complete_schema(base, output_json):
    warnings = []

    required_top_keys = [
        "slug",
        "name",
        "city",
        "submarket",
        "place",
        "place_detail",
        "state",
        "state_code",
        "geo_id",
        "year",
        "last_updated_data_from_sources",
        "zip",
        "market_label",
        "profile",
        "avg_home_value",
        "average_home_value",
        "avgHome",
        "snapshot",
        "market_metrics",
        "metrics",
        "mortgage_assumptions",
        "ownership_costs",
        "costs",
        "population",
        "households",
        "income",
        "education",
        "veterans",
        "immigration",
        "labor",
        "crime_status",
        "school_quality",
        "rental_vacancy",
        "rental_metrics",
        "climate_weather",
        "special_events",
        "military_lifestyle_fit",
        "financial_brief",
        "market_bluf",
        "scorecard",
        "rules",
        "summary_points",
        "opportunities",
        "risks",
        "buyer_notes",
        "seller_notes",
        "investor_angles",
        "neighborhoods",
        "target_neighborhoods",
        "buyer_guidance",
        "seller_guidance",
        "landlord_notes",
        "by_bedroom",
        "housing",
        "base_profile",
        "sources",
        "compatibility"
    ]

    for key in required_top_keys:
        if key not in output_json:
            warnings.append(f"Missing top-level key from baseline schema: {key}")

    if not output_json.get("avg_home_value"):
        warnings.append("Missing avg_home_value")

    if not output_json.get("market_metrics", {}).get("median_sale_price"):
        warnings.append("Missing market_metrics.median_sale_price")

    if not output_json.get("rental_metrics", {}).get("median_rent"):
        warnings.append("Missing rental_metrics.median_rent")

    if not output_json.get("population", {}).get("estimate"):
        warnings.append("Missing population.estimate from Census or baseline")

    if not output_json.get("income", {}).get("median_household_income"):
        warnings.append("Missing income.median_household_income from Census or baseline")

    if not output_json.get("base_profile"):
        warnings.append("Missing base_profile")

    return warnings


# ============================================================
# REFRESH ONE BASE
# ============================================================

def refresh_one_base(base):
    slug = base.get("slug") or safe_slug(base.get("name"))
    name = base.get("name") or slug

    print(f"\n=== Refreshing {name} ===")

    base_json, existing_source_path = load_existing_or_minimal(base)
    updated = copy.deepcopy(base_json)
    updated = apply_registry_identity(updated, base)

    all_raw_refs = []
    warnings = []

    # ------------------------------
    # RentCast
    # ------------------------------
    rentcast_raw_refs = []
    zip_payloads = []

    housing_zips = base.get("housing_market_zips") or []

    if not housing_zips:
        warnings.append("No housing_market_zips in base_registry.json")
    else:
        for zip_code in housing_zips:
            print(f"  RentCast market ZIP: {zip_code}")

            payload = fetch_rentcast_market_zip(zip_code)
            raw_ref = save_raw_payload(
                "rentcast",
                slug,
                f"market-{zip_code}",
                payload
            )

            rentcast_raw_refs.append(raw_ref)
            all_raw_refs.append(raw_ref)

            zip_payloads.append({
                "zip": zip_code,
                "payload": payload
            })

            time.sleep(REQUEST_SLEEP_SECONDS)

        rentcast_summary = extract_rentcast_summary(zip_payloads)
        updated = apply_rentcast(
            updated,
            rentcast_summary,
            base,
            rentcast_raw_refs
        )

    # ------------------------------
    # Census
    # ------------------------------
    census_raw_ref = None

    try:
        geo_id = base.get("geo_id") or updated.get("geo_id")

        if geo_id:
            print(f"  Census profile GEOID: {geo_id}")

            census_payload = fetch_census_profile_for_place(geo_id)
            census_raw_ref = save_raw_payload(
                "census",
                slug,
                f"profile-{geo_id}",
                census_payload
            )
            all_raw_refs.append(census_raw_ref)

            census_summary = parse_census_profile(census_payload)
            updated = apply_census(updated, census_summary, census_raw_ref)
        else:
            warnings.append("No geo_id available for Census refresh")

    except Exception as e:
        warnings.append(f"Census refresh skipped/failed: {e}")

    # ------------------------------
    # Nearby Services / Base Profile
    # ------------------------------
    print("  Nearby services, gates, and base_profile preserved from baseline JSON")

    updated = apply_data_quality(updated, base, all_raw_refs)

    validation_warnings = validate_complete_schema(base, updated)
    warnings.extend(validation_warnings)

    output_path = OUTPUT_DIR / f"{slug}.json"
    write_json(output_path, updated)

    return {
        "slug": slug,
        "name": name,
        "status": "updated",
        "output_file": str(output_path.relative_to(BASE_REFRESH_DIR)),
        "existing_json_used": existing_source_path,
        "housing_market_zips": housing_zips,
        "api_sources_used": {
            "rentcast": bool(rentcast_raw_refs),
            "census": bool(census_raw_ref),
            "nearby_services": "baseline_preserved"
        },
        "key_outputs": {
            "avg_home_value": updated.get("avg_home_value"),
            "median_sale_price": updated.get("market_metrics", {}).get("median_sale_price"),
            "price_per_sqft": updated.get("market_metrics", {}).get("price_per_sqft"),
            "median_rent": updated.get("rental_metrics", {}).get("median_rent"),
            "average_rent": updated.get("rental_metrics", {}).get("average_rent"),
            "population": updated.get("population", {}).get("estimate"),
            "median_household_income": updated.get("income", {}).get("median_household_income")
        },
        "warnings": warnings,
        "raw_files": all_raw_refs
    }


# ============================================================
# MAIN
# ============================================================

def main():
    print("PCSUnited Base JSON Refresh")
    print("Mode: RentCast + Census only")
    print(f"Base refresh folder: {BASE_REFRESH_DIR}")
    print(f"Batch ID: {BATCH_ID}")
    print(f"As of: {AS_OF_DATE}")

    load_env()

    if not REGISTRY_PATH.exists():
        raise RuntimeError(f"Missing base registry: {REGISTRY_PATH}")

    bases = read_json(REGISTRY_PATH)

    if not isinstance(bases, list):
        raise RuntimeError("base_registry.json must be a JSON array/list")

    report = {
        "batch_id": BATCH_ID,
        "as_of": AS_OF_DATE,
        "started_at": now_iso(),
        "source_stack": {
            "housing_market": "RentCast Markets API",
            "demographics": "US Census Bureau ACS 5-Year Profile",
            "nearby_services": "Preserved from baseline JSON / official-source review",
            "baseline_schema": "Existing PCSU base JSON"
        },
        "total_bases": len(bases),
        "updated": [],
        "failed": []
    }

    for base in bases:
        try:
            result = refresh_one_base(base)
            report["updated"].append(result)

            warning_count = len(result.get("warnings", []))
            print(f"  ✅ Done: {result['name']} | warnings: {warning_count}")

            if warning_count:
                for warning in result["warnings"]:
                    print(f"     - {warning}")

        except Exception as e:
            slug = base.get("slug") or safe_slug(base.get("name", "unknown"))
            name = base.get("name") or slug

            print(f"  ❌ Failed: {name} -> {e}")

            report["failed"].append({
                "slug": slug,
                "name": name,
                "status": "failed",
                "error": str(e)
            })

    report["finished_at"] = now_iso()

    write_json(REPORT_PATH, report)

    print("\nRefresh complete.")
    print(f"Report written to: {REPORT_PATH}")
    print(f"Output JSONs written to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
