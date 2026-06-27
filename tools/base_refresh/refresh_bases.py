#!/usr/bin/env python3
"""
PCSUnited / TheWing.ai
Base JSON Refresh Script - RentCast Starter Pipeline

What this does:
1. Reads tools/base_refresh/base_registry.json
2. Calls RentCast market data for each housing-market ZIP
3. Saves raw RentCast responses into tools/base_refresh/raw/
4. Extracts saleData and rentalData correctly
5. Updates/preserves existing base JSON structure when possible
6. Writes refreshed JSONs into tools/base_refresh/output/
7. Writes tools/base_refresh/refresh_report.json

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

LIVE_CITIES_DIR = REPO_ROOT / "netlify" / "functions" / "cities"

RAW_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# CONFIG
# ============================================================

RENTCAST_BASE_URL = "https://api.rentcast.io/v1"
RENTCAST_MARKET_ENDPOINT = "/markets"

REQUEST_TIMEOUT_SECONDS = 30
REQUEST_SLEEP_SECONDS = 0.25

BATCH_ID = datetime.now(timezone.utc).strftime("%Y_%m")
AS_OF = datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ============================================================
# BASIC HELPERS
# ============================================================

def load_env():
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
    if not LIVE_CITIES_DIR.exists():
        return None

    slug = base.get("slug")
    name = base.get("name")

    candidates = []

    if slug:
        candidates.extend([
            f"{slug}.json",
            f"{slug.title()}.json",
            f"{slug.lower()}.json"
        ])

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
# RENTCAST EXTRACTION
# ============================================================

def extract_zip_market_values(payload):
    """
    RentCast /markets response shape observed:

    saleData:
      averagePrice
      medianPrice
      averagePricePerSquareFoot
      medianPricePerSquareFoot
      averageDaysOnMarket
      medianDaysOnMarket
      newListings
      totalListings

    rentalData:
      averageRent
      medianRent
      averageRentPerSquareFoot
      medianRentPerSquareFoot
      averageDaysOnMarket
      medianDaysOnMarket
      newListings
      totalListings
    """

    sale_data = payload.get("saleData") or {}
    rental_data = payload.get("rentalData") or {}

    # Safety fallback in case RentCast ever changes naming.
    if not rental_data:
        rental_data = payload.get("rentData") or {}

    values = {
        "sale_last_updated": sale_data.get("lastUpdatedDate"),
        "rental_last_updated": rental_data.get("lastUpdatedDate"),

        # Sale market values
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

        # Rental market values
        # IMPORTANT:
        # RentCast rentalData uses averageRent / medianRent,
        # not averagePrice / medianPrice.
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


def extract_market_summary(zip_payloads):
    """
    Aggregates RentCast ZIP-level market data into one base-market summary.
    """

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

    total_sale_listings = sum_or_none(sale_total_listings)
    total_rental_listings = sum_or_none(rent_total_listings)
    total_sale_new_listings = sum_or_none(sale_new_listings)
    total_rental_new_listings = sum_or_none(rent_new_listings)

    return {
        "avg_home_value": avg_home_value,
        "average_sale_price": average_sale_price,
        "median_sale_price": median_sale_price,
        "median_list_price": median_sale_price,
        "price_per_sqft": price_per_sqft,
        "days_on_market": sale_days_on_market,
        "total_sale_listings": total_sale_listings,
        "new_sale_listings": total_sale_new_listings,

        "average_rent": average_rent,
        "median_rent": median_rent,
        "rent_price_per_sqft": rent_price_per_sqft,
        "rent_days_on_market": rent_days_on_market,
        "total_rental_listings": total_rental_listings,
        "new_rental_listings": total_rental_new_listings,

        "sale_last_updated": max(sale_dates) if sale_dates else None,
        "rental_last_updated": max(rental_dates) if rental_dates else None,

        "zip_summaries": zip_summaries
    }


# ============================================================
# UPDATE BASE JSON
# ============================================================

def update_base_json(base_json, base, market_summary, raw_refs, existing_source_path=None):
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
    median_sale_price = market_summary.get("median_sale_price")
    average_sale_price = market_summary.get("average_sale_price")

    if avg_home_value:
        updated["avg_home_value"] = avg_home_value
        updated["average_home_value"] = avg_home_value
        updated["avgHome"] = avg_home_value

    updated.setdefault("snapshot", {})
    if median_sale_price:
        updated["snapshot"]["median_home_price"] = median_sale_price
    elif avg_home_value:
        updated["snapshot"]["median_home_price"] = avg_home_value

    updated.setdefault("market_metrics", {})
    updated["market_metrics"].update({
        "median_list_price": market_summary.get("median_list_price"),
        "median_sold_price": median_sale_price,
        "median_sale_price": median_sale_price,
        "average_sale_price": average_sale_price,
        "days_on_market": market_summary.get("days_on_market"),
        "price_per_sqft": market_summary.get("price_per_sqft"),
        "total_listings": market_summary.get("total_sale_listings"),
        "new_listings": market_summary.get("new_sale_listings"),
        "as_of": AS_OF,
        "source": "RentCast",
        "source_last_updated": market_summary.get("sale_last_updated"),
        "method": "Aggregated from surrounding housing-market ZIPs"
    })

    updated.setdefault("rental_metrics", {})
    updated["rental_metrics"].update({
        "average_rent": market_summary.get("average_rent"),
        "median_rent": market_summary.get("median_rent"),
        "rent_price_per_sqft": market_summary.get("rent_price_per_sqft"),
        "days_on_market": market_summary.get("rent_days_on_market"),
        "total_listings": market_summary.get("total_rental_listings"),
        "new_listings": market_summary.get("new_rental_listings"),
        "as_of": AS_OF,
        "source": "RentCast",
        "source_last_updated": market_summary.get("rental_last_updated"),
        "method": "Aggregated from surrounding housing-market ZIPs"
    })

    updated["market_area"] = {
        "primary_base_zip": primary_zip,
        "housing_market_zips": housing_zips,
        "method": "Uses surrounding PCS buyer/renter ZIPs, not installation-only ZIP."
    }

    updated["rentcast_zip_summaries"] = market_summary.get("zip_summaries", [])

    updated.setdefault("data_quality", {})
    updated["data_quality"]["housing_market"] = {
        "provider": "RentCast",
        "as_of": AS_OF,
        "batch_id": BATCH_ID,
        "confidence": "medium-high",
        "method": "Surrounding housing-market ZIP aggregation",
        "raw_files": raw_refs,
        "notes": "Sale and rental metrics are aggregated across selected PCS housing-market ZIPs."
    }

    updated.setdefault("sources", {})
    updated["sources"]["housing_market"] = {
        "provider": "RentCast",
        "dataset": "RentCast Markets API",
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
        warnings.append("No avg_home_value found from RentCast saleData")

    if not output_json.get("market_metrics", {}).get("median_sale_price"):
        warnings.append("No market_metrics.median_sale_price found from RentCast saleData")

    if not output_json.get("market_metrics", {}).get("price_per_sqft"):
        warnings.append("No market_metrics.price_per_sqft found from RentCast saleData")

    if not output_json.get("rental_metrics", {}).get("average_rent"):
        warnings.append("No rental_metrics.average_rent found from RentCast rentalData")

    if not output_json.get("rental_metrics", {}).get("median_rent"):
        warnings.append("No rental_metrics.median_rent found from RentCast rentalData")

    if not output_json.get("rental_metrics", {}).get("rent_price_per_sqft"):
        warnings.append("No rental_metrics.rent_price_per_sqft found from RentCast rentalData")

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
        "market_summary": {
            "avg_home_value": market_summary.get("avg_home_value"),
            "average_sale_price": market_summary.get("average_sale_price"),
            "median_sale_price": market_summary.get("median_sale_price"),
            "median_list_price": market_summary.get("median_list_price"),
            "price_per_sqft": market_summary.get("price_per_sqft"),
            "days_on_market": market_summary.get("days_on_market"),
            "total_sale_listings": market_summary.get("total_sale_listings"),
            "average_rent": market_summary.get("average_rent"),
            "median_rent": market_summary.get("median_rent"),
            "rent_price_per_sqft": market_summary.get("rent_price_per_sqft"),
            "rent_days_on_market": market_summary.get("rent_days_on_market"),
            "total_rental_listings": market_summary.get("total_rental_listings"),
            "sale_last_updated": market_summary.get("sale_last_updated"),
            "rental_last_updated": market_summary.get("rental_last_updated")
        },
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
            "housing_market": "RentCast Markets API",
            "demographics": "Census - not enabled in this script yet",
            "nearby_services": "ArcGIS - not enabled in this script yet"
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
