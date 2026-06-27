#!/usr/bin/env python3
"""
PCSUnited / TheWing.ai
Base JSON Refresh Script - Starter Version

What this does:
1. Reads tools/base_refresh/base_registry.json
2. Uses RentCast API to pull market data by housing-market ZIP
3. Saves raw RentCast responses into tools/base_refresh/raw/
4. Creates updated base JSON files into tools/base_refresh/output/
5. Writes a refresh report to tools/base_refresh/refresh_report.json

Run from repo root:

    python tools/base_refresh/refresh_bases.py

Required local file:

    tools/base_refresh/.env

Example .env:

    RENTCAST_API_KEY=your_key_here
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

# Existing live city JSON folder, if available.
# This lets us preserve your current schema instead of creating tiny JSON files.
LIVE_CITIES_DIR = REPO_ROOT / "netlify" / "functions" / "cities"

RAW_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# CONFIG
# ============================================================

RENTCAST_BASE_URL = "https://api.rentcast.io/v1"

# Starter endpoint.
# If RentCast changes endpoint names, adjust this one function: fetch_rentcast_market_zip()
RENTCAST_MARKET_ENDPOINT = "/markets"

REQUEST_TIMEOUT_SECONDS = 30
REQUEST_SLEEP_SECONDS = 0.25

BATCH_ID = datetime.now(timezone.utc).strftime("%Y_%m")
AS_OF = datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ============================================================
# BASIC HELPERS
# ============================================================

def load_env():
    """
    Loads tools/base_refresh/.env locally.
    """
    if load_dotenv is None:
        print("WARNING: python-dotenv is not installed.")
        print("Install it with: pip install python-dotenv")
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
    Converts a value into int/float if possible.
    Returns None if not possible.
    """
    if value is None:
        return None

    if isinstance(value, bool):
        return None

    if isinstance(value, (int, float)):
        return value

    if isinstance(value, str):
        cleaned = (
            value.replace("$", "")
            .replace(",", "")
            .replace("%", "")
            .strip()
        )
        try:
            if "." in cleaned:
                return float(cleaned)
            return int(cleaned)
        except ValueError:
            return None

    return None


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


def deep_find_numeric(data, candidate_keys):
    """
    Searches nested dict/list data for the first matching numeric value.

    This makes the script more forgiving if RentCast response shape differs.
    """
    if isinstance(data, dict):
        for key in candidate_keys:
            if key in data:
                num = safe_number(data.get(key))
                if num is not None:
                    return num

        for value in data.values():
            found = deep_find_numeric(value, candidate_keys)
            if found is not None:
                return found

    elif isinstance(data, list):
        for item in data:
            found = deep_find_numeric(item, candidate_keys)
            if found is not None:
                return found

    return None


def deep_find_all_numeric(data, candidate_keys):
    """
    Finds all numeric values matching candidate keys anywhere in payload.
    """
    found_values = []

    if isinstance(data, dict):
        for key, value in data.items():
            if key in candidate_keys:
                num = safe_number(value)
                if num is not None:
                    found_values.append(num)

            found_values.extend(deep_find_all_numeric(value, candidate_keys))

    elif isinstance(data, list):
        for item in data:
            found_values.extend(deep_find_all_numeric(item, candidate_keys))

    return found_values


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
    """
    Pull RentCast market data by ZIP.

    If RentCast endpoint behavior differs, this is the only function
    you should need to adjust.
    """
    params = {
        "zipCode": str(zip_code)
    }

    return rentcast_get(RENTCAST_MARKET_ENDPOINT, params=params)


def save_raw_rentcast(base_slug, zip_code, payload):
    raw_path = RAW_DIR / f"{base_slug}-rentcast-market-{zip_code}-{BATCH_ID}.json"
    write_json(raw_path, payload)
    return str(raw_path.relative_to(BASE_REFRESH_DIR))


# ============================================================
# EXISTING JSON PRESERVATION
# ============================================================

def find_existing_base_json(base):
    """
    Tries to find an existing JSON file so we preserve the current schema.
    """
    if not LIVE_CITIES_DIR.exists():
        return None

    slug = base.get("slug")
    name = base.get("name")

    candidates = []

    if slug:
        candidates.extend([
            f"{slug}.json",
            f"{slug.title()}.json"
        ])

    if name:
        candidates.extend([
            f"{name}.json",
            f"{name.replace(' ', '-')}.json",
            f"{name.replace(' ', '')}.json",
            f"{name.replace(' AFB', '')}.json"
        ])

    # Also scan by slug-ish match.
    for candidate in candidates:
        path = LIVE_CITIES_DIR / candidate
        if path.exists():
            return path

    slug_lower = safe_slug(slug or name or "")

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
        "state": base.get("state"),
        "state_code": base.get("state_code"),
        "zip": base.get("primary_zip"),
        "snapshot": {},
        "market_metrics": {},
        "rental_metrics": {},
        "sources": {}
    }

    return minimal, None


# ============================================================
# TRANSFORM RENTCAST DATA INTO PCSU FIELDS
# ============================================================

def extract_market_summary(zip_payloads):
    """
    Converts RentCast raw market payloads into simple PCSU metrics.

    Because APIs sometimes return different field names by endpoint/plan,
    this looks for several likely key names.
    """
    median_home_values = []
    average_home_values = []
    median_sale_prices = []
    median_list_prices = []
    average_rents = []
    median_rents = []
    price_per_sqft_values = []
    days_on_market_values = []

    for item in zip_payloads:
        payload = item.get("payload")

        median_home_values.extend(
            deep_find_all_numeric(payload, [
                "medianHomeValue",
                "medianValue",
                "medianPropertyValue",
                "medianEstimatedValue",
                "medianSalePrice"
            ])
        )

        average_home_values.extend(
            deep_find_all_numeric(payload, [
                "averageHomeValue",
                "avgHomeValue",
                "averageValue",
                "avgValue",
                "averageEstimatedValue",
                "avgEstimatedValue"
            ])
        )

        median_sale_prices.extend(
            deep_find_all_numeric(payload, [
                "medianSalePrice",
                "medSalePrice",
                "medianSoldPrice",
                "medianSalesPrice"
            ])
        )

        median_list_prices.extend(
            deep_find_all_numeric(payload, [
                "medianListPrice",
                "medianListingPrice",
                "medianAskingPrice"
            ])
        )

        average_rents.extend(
            deep_find_all_numeric(payload, [
                "averageRent",
                "avgRent",
                "averageRentalRate",
                "avgRentalRate"
            ])
        )

        median_rents.extend(
            deep_find_all_numeric(payload, [
                "medianRent",
                "medianRentalRate"
            ])
        )

        price_per_sqft_values.extend(
            deep_find_all_numeric(payload, [
                "pricePerSquareFoot",
                "pricePerSqFt",
                "avgPricePerSqFt",
                "medianPricePerSqFt"
            ])
        )

        days_on_market_values.extend(
            deep_find_all_numeric(payload, [
                "daysOnMarket",
                "averageDaysOnMarket",
                "avgDaysOnMarket",
                "medianDaysOnMarket"
            ])
        )

    avg_home_value = (
        median_or_none(median_home_values)
        or average_or_none(average_home_values)
        or median_or_none(median_sale_prices)
    )

    median_sale_price = median_or_none(median_sale_prices)
    median_list_price = median_or_none(median_list_prices)
    average_rent = average_or_none(average_rents)
    median_rent = median_or_none(median_rents)
    price_per_sqft = average_or_none(price_per_sqft_values)
    days_on_market = average_or_none(days_on_market_values)

    return {
        "avg_home_value": avg_home_value,
        "median_sale_price": median_sale_price,
        "median_list_price": median_list_price,
        "average_rent": average_rent,
        "median_rent": median_rent,
        "price_per_sqft": price_per_sqft,
        "days_on_market": days_on_market
    }


def update_base_json(base_json, base, market_summary, raw_refs, existing_source_path=None):
    """
    Updates/preserves current base JSON.
    """
    updated = copy.deepcopy(base_json)

    slug = base.get("slug") or safe_slug(base.get("name"))
    primary_zip = base.get("primary_zip")
    housing_zips = base.get("housing_market_zips", [])

    updated["slug"] = slug
    updated["name"] = base.get("name", updated.get("name"))
    updated["city"] = base.get("city", updated.get("city"))
    updated["state"] = base.get("state", updated.get("state"))
    updated["state_code"] = base.get("state_code", updated.get("state_code"))
    updated["zip"] = primary_zip or updated.get("zip")

    avg_home_value = market_summary.get("avg_home_value")

    if avg_home_value:
        updated["avg_home_value"] = avg_home_value
        updated["average_home_value"] = avg_home_value
        updated["avgHome"] = avg_home_value

    updated.setdefault("snapshot", {})
    if market_summary.get("median_sale_price"):
        updated["snapshot"]["median_home_price"] = market_summary["median_sale_price"]
    elif avg_home_value:
        updated["snapshot"]["median_home_price"] = avg_home_value

    updated.setdefault("market_metrics", {})
    updated["market_metrics"].update({
        "median_list_price": market_summary.get("median_list_price"),
        "median_sold_price": market_summary.get("median_sale_price"),
        "median_sale_price": market_summary.get("median_sale_price"),
        "days_on_market": market_summary.get("days_on_market"),
        "price_per_sqft": market_summary.get("price_per_sqft"),
        "as_of": AS_OF,
        "source": "RentCast",
        "method": "Aggregated from surrounding housing-market ZIPs"
    })

    updated.setdefault("rental_metrics", {})
    updated["rental_metrics"].update({
        "average_rent": market_summary.get("average_rent"),
        "median_rent": market_summary.get("median_rent"),
        "as_of": AS_OF,
        "source": "RentCast",
        "method": "Aggregated from surrounding housing-market ZIPs"
    })

    updated["market_area"] = {
        "primary_base_zip": primary_zip,
        "housing_market_zips": housing_zips,
        "method": "Uses surrounding PCS buyer/renter ZIPs, not installation-only ZIP."
    }

    updated.setdefault("data_quality", {})
    updated["data_quality"]["housing_market"] = {
        "provider": "RentCast",
        "as_of": AS_OF,
        "batch_id": BATCH_ID,
        "confidence": "medium-high",
        "method": "Surrounding housing-market ZIP aggregation",
        "raw_files": raw_refs
    }

    updated.setdefault("sources", {})
    updated["sources"]["housing_market"] = {
        "provider": "RentCast",
        "as_of": AS_OF,
        "batch_id": BATCH_ID,
        "primary_base_zip": primary_zip,
        "housing_market_zips": housing_zips,
        "raw_files": raw_refs,
        "existing_json_used": existing_source_path
    }

    updated["last_updated_data_from_sources"] = AS_OF

    return updated


# ============================================================
# VALIDATION
# ============================================================

def validate_base_output(base, output_json):
    warnings = []

    required_top = [
        "slug",
        "name",
        "city",
        "state",
        "state_code",
        "zip",
        "snapshot",
        "market_metrics",
        "rental_metrics",
        "sources"
    ]

    for key in required_top:
        if key not in output_json:
            warnings.append(f"Missing required top-level key: {key}")

    if not output_json.get("avg_home_value"):
        warnings.append("No avg_home_value found from RentCast extraction")

    if not output_json.get("market_metrics", {}).get("median_sale_price"):
        warnings.append("No market_metrics.median_sale_price found")

    if not output_json.get("rental_metrics", {}).get("average_rent"):
        warnings.append("No rental_metrics.average_rent found")

    if not base.get("housing_market_zips"):
        warnings.append("Base has no housing_market_zips in base_registry.json")

    return warnings


# ============================================================
# MAIN REFRESH
# ============================================================

def refresh_one_base(base):
    slug = base.get("slug") or safe_slug(base.get("name"))
    name = base.get("name") or slug
    housing_zips = base.get("housing_market_zips") or []

    print(f"\n=== Refreshing {name} ===")

    if not housing_zips:
        raise RuntimeError(f"{name} has no housing_market_zips")

    zip_payloads = []
    raw_refs = []

    for zip_code in housing_zips:
        print(f"  RentCast market ZIP: {zip_code}")

        payload = fetch_rentcast_market_zip(zip_code)
        raw_ref = save_raw_rentcast(slug, zip_code, payload)

        zip_payloads.append({
            "zip": zip_code,
            "payload": payload
        })

        raw_refs.append(raw_ref)
        time.sleep(REQUEST_SLEEP_SECONDS)

    market_summary = extract_market_summary(zip_payloads)

    existing_json, existing_source_path = load_existing_or_minimal(base)

    output_json = update_base_json(
        base_json=existing_json,
        base=base,
        market_summary=market_summary,
        raw_refs=raw_refs,
        existing_source_path=existing_source_path
    )

    warnings = validate_base_output(base, output_json)

    output_path = OUTPUT_DIR / f"{slug}.json"
    write_json(output_path, output_json)

    return {
        "slug": slug,
        "name": name,
        "status": "updated",
        "output_file": str(output_path.relative_to(BASE_REFRESH_DIR)),
        "existing_json_used": existing_source_path,
        "housing_market_zips": housing_zips,
        "market_summary": market_summary,
        "warnings": warnings,
        "raw_files": raw_refs
    }


def main():
    print("PCSUnited Base JSON Refresh")
    print(f"Base refresh folder: {BASE_REFRESH_DIR}")
    print(f"Batch ID: {BATCH_ID}")
    print(f"As of: {AS_OF}")

    load_env()

    if not REGISTRY_PATH.exists():
        raise RuntimeError(f"Missing base registry: {REGISTRY_PATH}")

    bases = read_json(REGISTRY_PATH)

    if not isinstance(bases, list):
        raise RuntimeError("base_registry.json must be a JSON array/list")

    report = {
        "batch_id": BATCH_ID,
        "as_of": AS_OF,
        "started_at": now_iso(),
        "source_stack": {
            "housing_market": "RentCast",
            "demographics": "Census - not enabled in starter script",
            "nearby_services": "ArcGIS - not enabled in starter script"
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
