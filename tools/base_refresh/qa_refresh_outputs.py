#!/usr/bin/env python3
"""
QA checker for base refresh pipeline outputs.

Compares refreshed output JSONs against production baseline files,
validates RentCast/Census field refresh, checks for Census sentinel
values, and verifies curated baseline sections were preserved.

Run from repo root:

    python tools/base_refresh/qa_refresh_outputs.py
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

BASE_REFRESH_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_REFRESH_DIR.parents[1]
REPORT_PATH = BASE_REFRESH_DIR / "qa_report.json"
REFRESH_REPORT_PATH = BASE_REFRESH_DIR / "refresh_report.json"
REFRESH_SCRIPT_PATH = BASE_REFRESH_DIR / "refresh_bases.py"

BASELINE_PAIRS = [
    {
        "slug": "lackland-afb",
        "baseline": REPO_ROOT / "netlify/functions/cities/Lackland.json",
        "output": BASE_REFRESH_DIR / "output/lackland-afb.json",
    },
    {
        "slug": "luke-afb",
        "baseline": REPO_ROOT / "netlify/functions/cities/Luke.json",
        "output": BASE_REFRESH_DIR / "output/luke-afb.json",
    },
    {
        "slug": "nellis",
        "baseline": REPO_ROOT / "netlify/functions/cities/Nellis.json",
        "output": BASE_REFRESH_DIR / "output/nellis.json",
    },
]

CENSUS_SENTINELS = {-666666666, -777777777, -888888888, -999999999}

RENTCAST_FIELDS = [
    "avg_home_value",
    "average_home_value",
    "avgHome",
    "city_avg_home",
    "snapshot.median_home_price",
    "market_metrics.median_sale_price",
    "market_metrics.price_per_sqft",
    "market_metrics.days_on_market",
    "metrics.median_rent",
    "rental_metrics.median_rent",
    "rental_metrics.average_rent",
    "housing.market.median_sale_price_current",
    "rentcast_zip_summaries",
]

CENSUS_FIELDS = [
    "snapshot.population_city",
    "snapshot.median_household_income",
    "population.estimate",
    "households.total_households",
    "income.median_household_income",
    "income.per_capita_income",
    "education.high_school_grad_or_higher_percent",
    "education.bachelors_degree_or_higher_percent",
    "labor.mean_travel_time_to_work_minutes",
    "labor.unemployment_rate_percent",
]

PRESERVED_SECTIONS = [
    "base_profile.gates",
    "base_profile.major_services",
    "base_profile.visitor_control_center",
    "base_profile.recommended_neighborhoods",
    "base_profile.commute_intelligence",
    "base_profile.bah_market_reality",
    "base_profile.arrival_checklist",
    "market_bluf",
    "scorecard",
    "summary_points",
    "opportunities",
    "risks",
    "buyer_guidance",
    "seller_guidance",
    "landlord_notes",
]

SCHEMA_KEYS = [
    "base_profile",
    "compatibility",
    "sources",
    "market_metrics",
    "rental_metrics",
    "by_bedroom",
]

EXPECTED_NEW_TOP_LEVEL_KEYS = {
    "data_quality",
    "market_area",
    "rentcast_zip_summaries",
}


def read_json(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)


def get_nested(data, path):
    current = data
    for key in path.split("."):
        if not isinstance(current, dict) or key not in current:
            return None
        current = current[key]
    return current


def has_content(value):
    if value is None:
        return False
    if isinstance(value, (list, dict)) and len(value) == 0:
        return False
    return True


def find_sentinel_values(obj, path=""):
    found = []
    if isinstance(obj, dict):
        for key, value in obj.items():
            child_path = f"{path}.{key}" if path else key
            found.extend(find_sentinel_values(value, child_path))
    elif isinstance(obj, list):
        for index, value in enumerate(obj):
            found.extend(find_sentinel_values(value, f"{path}[{index}]"))
    elif isinstance(obj, (int, float)) and obj in CENSUS_SENTINELS:
        found.append({"path": path, "value": obj})
    return found


def check_refresh_script():
    text = REFRESH_SCRIPT_PATH.read_text(encoding="utf-8")

    arcgis_api_patterns = [
        r"arcgis\.com",
        r"ARCGIS_",
        r"fetch_.*arcgis",
        r"apply_arcgis",
    ]

    live_arcgis_calls = []
    for pattern in arcgis_api_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            live_arcgis_calls.append(pattern)

    return {
        "uses_arcgis_api": len(live_arcgis_calls) > 0,
        "arcgis_api_patterns_found": live_arcgis_calls,
        "arcgis_token_required": "ARCGIS" in text and "getenv" in text and "ARCGIS" in re.findall(r'getenv\("([^"]+)"\)', text),
        "mode_comment_present": "RentCast + Census only" in text,
    }


def check_refresh_report():
    if not REFRESH_REPORT_PATH.exists():
        return {
            "report_exists": False,
            "nearby_services_baseline_preserved": False,
        }

    report = read_json(REFRESH_REPORT_PATH)
    updated = report.get("updated", [])

    nearby_ok = all(
        item.get("api_sources_used", {}).get("nearby_services") == "baseline_preserved"
        for item in updated
    )

    return {
        "report_exists": True,
        "batch_id": report.get("batch_id"),
        "total_bases": report.get("total_bases"),
        "failed_count": len(report.get("failed", [])),
        "nearby_services_baseline_preserved": nearby_ok,
        "updated_slugs": [item.get("slug") for item in updated],
    }


def qa_one_base(pair):
    slug = pair["slug"]
    baseline_path = pair["baseline"]
    output_path = pair["output"]

    result = {
        "slug": slug,
        "baseline_file": str(baseline_path.relative_to(REPO_ROOT)),
        "output_file": str(output_path.relative_to(REPO_ROOT)),
        "files_exist": baseline_path.exists() and output_path.exists(),
        "qa_pass": True,
        "missing_top_level_keys": [],
        "new_top_level_keys": [],
        "schema_checks": {},
        "rentcast_fields": {},
        "census_fields": {},
        "preserved_sections": {},
        "bad_census_values_found": [],
        "missing_required_sections": [],
        "warnings": [],
        "errors": [],
    }

    if not result["files_exist"]:
        result["qa_pass"] = False
        result["errors"].append("Baseline or output file is missing.")
        return result

    baseline = read_json(baseline_path)
    output = read_json(output_path)

    baseline_keys = set(baseline.keys())
    output_keys = set(output.keys())

    result["missing_top_level_keys"] = sorted(baseline_keys - output_keys)
    result["new_top_level_keys"] = sorted(output_keys - baseline_keys)

    if result["missing_top_level_keys"]:
        result["qa_pass"] = False
        result["errors"].append(
            f"Missing baseline top-level keys: {result['missing_top_level_keys']}"
        )

    unexpected_new_keys = set(result["new_top_level_keys"]) - EXPECTED_NEW_TOP_LEVEL_KEYS
    if unexpected_new_keys:
        result["warnings"].append(
            f"Unexpected new top-level keys: {sorted(unexpected_new_keys)}"
        )

    for key in SCHEMA_KEYS:
        result["schema_checks"][key] = {
            "baseline_exists": key in baseline,
            "output_exists": key in output,
        }
        if key not in output:
            result["qa_pass"] = False
            result["missing_required_sections"].append(key)
            result["errors"].append(f"Missing required top-level section: {key}")

    for field in RENTCAST_FIELDS:
        value = get_nested(output, field)
        baseline_value = get_nested(baseline, field)
        present = has_content(value)
        refreshed = present and value != baseline_value

        result["rentcast_fields"][field] = {
            "present": present,
            "refreshed_from_baseline": refreshed,
            "value": len(value) if field == "rentcast_zip_summaries" and isinstance(value, list) else value,
        }

        if not present:
            result["qa_pass"] = False
            result["errors"].append(f"Missing RentCast field: {field}")

    for field in CENSUS_FIELDS:
        value = get_nested(output, field)
        baseline_value = get_nested(baseline, field)
        present = has_content(value)

        result["census_fields"][field] = {
            "present": present,
            "baseline_value": baseline_value,
            "output_value": value,
            "changed_from_baseline": value != baseline_value if present else False,
        }

        if not present:
            result["qa_pass"] = False
            result["errors"].append(f"Missing Census field: {field}")

    for section in PRESERVED_SECTIONS:
        value = get_nested(output, section)
        baseline_value = get_nested(baseline, section)
        present = has_content(value)
        matches = value == baseline_value if present else False

        result["preserved_sections"][section] = {
            "present": present,
            "matches_baseline": matches,
        }

        if not present:
            result["qa_pass"] = False
            result["missing_required_sections"].append(section)
            result["errors"].append(f"Missing preserved section: {section}")
        elif not matches:
            result["qa_pass"] = False
            result["errors"].append(f"Preserved section changed from baseline: {section}")

    result["bad_census_values_found"] = find_sentinel_values(output)
    if result["bad_census_values_found"]:
        result["qa_pass"] = False
        result["errors"].append("Census sentinel values found in output JSON.")

    if slug == "lackland-afb":
        households = get_nested(output, "households.total_households")
        baseline_households = get_nested(baseline, "households.total_households")
        if households is not None and baseline_households is not None:
            if households < baseline_households * 0.5:
                result["warnings"].append(
                    "Lackland households.total_households dropped sharply "
                    f"({baseline_households} -> {households}). Review Census place geo_id."
                )

    return result


def scan_output_directory():
    warnings = []
    bad_values = []

    for path in sorted((BASE_REFRESH_DIR / "output").glob("*.json")):
        if path.name == ".gitkeep":
            continue

        data = read_json(path)
        sentinels = find_sentinel_values(data)
        if sentinels:
            bad_values.append({
                "file": str(path.relative_to(REPO_ROOT)),
                "values": sentinels,
            })

        text = path.read_text(encoding="utf-8")
        if "ArcGIS" in text or "arcgis" in text:
            warnings.append(
                f"ArcGIS reference found in output file not in QA pair list: {path.name}"
            )

    return warnings, bad_values


def build_recommendation(qa_pass, global_warnings, per_base_results):
    if not qa_pass:
        return (
            "FAIL — Do not expand to all bases yet. Fix reported errors first, "
            "then rerun refresh and QA."
        )

    if global_warnings:
        return (
            "PASS with warnings — The three registry output files are safe to promote "
            "after removing or ignoring stale output artifacts and reviewing flagged warnings."
        )

    return (
        "PASS — All three test-base output files are safe to promote to "
        "netlify/functions/cities when ready."
    )


def main():
    script_check = check_refresh_script()
    refresh_report_check = check_refresh_report()
    per_base_results = [qa_one_base(pair) for pair in BASELINE_PAIRS]
    output_warnings, stray_bad_values = scan_output_directory()

    pipeline_pass = (
        not script_check["uses_arcgis_api"]
        and refresh_report_check.get("nearby_services_baseline_preserved", False)
        and refresh_report_check.get("failed_count", 0) == 0
    )

    base_pass = all(item["qa_pass"] for item in per_base_results)
    qa_pass = pipeline_pass and base_pass

    global_warnings = list(output_warnings)
    if stray_bad_values:
        global_warnings.append(
            "Sentinel Census values found in non-canonical output files: "
            + ", ".join(item["file"] for item in stray_bad_values)
        )

    for base_result in per_base_results:
        global_warnings.extend(base_result.get("warnings", []))

    if not script_check["mode_comment_present"]:
        global_warnings.append("refresh_bases.py mode comment missing expected RentCast + Census only text.")

    report = {
        "qa_pass": qa_pass,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "files_checked": [
            {
                "slug": pair["slug"],
                "baseline": str(pair["baseline"].relative_to(REPO_ROOT)),
                "output": str(pair["output"].relative_to(REPO_ROOT)),
            }
            for pair in BASELINE_PAIRS
        ],
        "pipeline_checks": {
            "refresh_script": script_check,
            "refresh_report": refresh_report_check,
            "pipeline_pass": pipeline_pass,
        },
        "per_base": per_base_results,
        "missing_keys": {
            item["slug"]: item["missing_top_level_keys"]
            for item in per_base_results
        },
        "bad_census_values_found": {
            item["slug"]: item["bad_census_values_found"]
            for item in per_base_results
        },
        "stray_output_bad_census_values": stray_bad_values,
        "missing_required_sections": {
            item["slug"]: item["missing_required_sections"]
            for item in per_base_results
        },
        "warnings": global_warnings,
        "recommendation": build_recommendation(qa_pass, global_warnings, per_base_results),
    }

    write_json(REPORT_PATH, report)

    print(f"QA {'PASS' if qa_pass else 'FAIL'}")
    print(f"Report written to: {REPORT_PATH}")
    if global_warnings:
        print("Warnings:")
        for warning in global_warnings:
            print(f"  - {warning}")


if __name__ == "__main__":
    main()
