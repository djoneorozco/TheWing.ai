#!/usr/bin/env python3
"""
QA checker for base refresh pipeline outputs.

Validates all bases listed in base_registry.json against refreshed
output JSONs, production baselines, and refresh_report.json.

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
REGISTRY_PATH = BASE_REFRESH_DIR / "base_registry.json"
OUTPUT_DIR = BASE_REFRESH_DIR / "output"
CITIES_DIR = REPO_ROOT / "netlify" / "functions" / "cities"

KNOWN_BASELINE_WARNING_SLUGS = {"andrews-afb"}

CENSUS_SENTINELS = {-666666666, -777777777, -888888888, -999999999}

RENTCAST_FIELDS_WHEN_AVAILABLE = [
    "avg_home_value",
    "average_home_value",
    "rental_metrics",
    "market_metrics",
]

PRESERVED_SECTIONS = [
    "base_profile",
    "base_profile.gates",
    "base_profile.major_services",
    "market_bluf",
    "scorecard",
    "summary_points",
    "opportunities",
    "risks",
    "buyer_guidance",
    "seller_guidance",
    "landlord_notes",
    "housing",
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


def load_registry():
    registry = read_json(REGISTRY_PATH)
    if not isinstance(registry, list):
        raise RuntimeError("base_registry.json must be a JSON array")
    return registry


def load_baseline(path):
    if not path.exists() or path.stat().st_size == 0:
        return None, "missing_or_empty"

    try:
        data = read_json(path)
    except json.JSONDecodeError:
        return None, "invalid_json"

    if not isinstance(data, dict) or not data:
        return None, "empty_or_invalid"

    return data, None


def load_output(path):
    if not path.exists():
        return None, "missing"

    if path.stat().st_size == 0:
        return None, "empty"

    try:
        data = read_json(path)
    except json.JSONDecodeError as exc:
        return None, f"invalid_json: {exc}"

    if not isinstance(data, dict):
        return None, "not_an_object"

    return data, None


def build_refresh_lookup():
    if not REFRESH_REPORT_PATH.exists():
        return {}, []

    report = read_json(REFRESH_REPORT_PATH)
    updated = {
        item.get("slug"): item
        for item in report.get("updated", [])
        if item.get("slug")
    }
    failed = report.get("failed", [])
    return updated, failed


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
        "mode_comment_present": "RentCast + Census only" in text,
    }


def check_refresh_report(registry_count):
    if not REFRESH_REPORT_PATH.exists():
        return {
            "report_exists": False,
            "failed_count": None,
            "updated_count": 0,
            "expected_count": registry_count,
            "refresh_failures_present": True,
            "all_bases_updated": False,
            "nearby_services_baseline_preserved": False,
            "failed": [],
            "failed_slugs": [],
        }

    report = read_json(REFRESH_REPORT_PATH)
    updated = report.get("updated", [])
    failed = report.get("failed", [])

    nearby_ok = all(
        item.get("api_sources_used", {}).get("nearby_services") == "baseline_preserved"
        for item in updated
    ) if updated else False

    return {
        "report_exists": True,
        "batch_id": report.get("batch_id"),
        "total_bases": report.get("total_bases"),
        "failed_count": len(failed),
        "updated_count": len(updated),
        "expected_count": registry_count,
        "refresh_failures_present": len(failed) > 0,
        "all_bases_updated": len(updated) == registry_count,
        "nearby_services_baseline_preserved": nearby_ok,
        "failed": failed,
        "failed_slugs": [item.get("slug") for item in failed],
        "updated_slugs": [item.get("slug") for item in updated],
    }


def qa_one_base(entry, refresh_result):
    slug = entry["slug"]
    name = entry.get("name", slug)
    file_name = entry.get("file")
    baseline_path = CITIES_DIR / f"{file_name}.json"
    output_path = OUTPUT_DIR / f"{slug}.json"

    result = {
        "slug": slug,
        "name": name,
        "file": file_name,
        "baseline_file": str(baseline_path.relative_to(REPO_ROOT)),
        "output_file": str(output_path.relative_to(REPO_ROOT)),
        "output_exists": output_path.exists(),
        "output_valid_json": False,
        "baseline_valid": False,
        "baseline_issue": None,
        "qa_pass": True,
        "missing_top_level_keys": [],
        "new_top_level_keys": [],
        "preserved_sections": {},
        "rentcast_fields": {},
        "bad_census_values_found": [],
        "missing_required_sections": [],
        "skipped_rentcast_zips": [],
        "refresh_status": refresh_result.get("status") if refresh_result else None,
        "warnings": [],
        "errors": [],
    }

    if refresh_result:
        skipped = refresh_result.get("skipped_rentcast_zips") or []
        result["skipped_rentcast_zips"] = skipped
        if skipped and refresh_result.get("status") == "updated":
            result["warnings"].append(
                "RentCast skipped ZIPs: "
                + ", ".join(
                    f"{item.get('zip')} ({item.get('reason', 'skipped')})"
                    for item in skipped
                )
            )

    output, output_issue = load_output(output_path)
    if output_issue:
        result["qa_pass"] = False
        result["errors"].append(f"Output JSON issue: {output_issue}")
        return result

    result["output_valid_json"] = True

    baseline, baseline_issue = load_baseline(baseline_path)
    result["baseline_issue"] = baseline_issue

    if baseline_issue:
        if slug in KNOWN_BASELINE_WARNING_SLUGS:
            result["warnings"].append(
                f"Known baseline warning: production {file_name}.json is {baseline_issue}"
            )
        else:
            result["qa_pass"] = False
            result["errors"].append(
                f"Production baseline unavailable: {baseline_path.name} ({baseline_issue})"
            )
    else:
        result["baseline_valid"] = True

        baseline_keys = set(baseline.keys())
        output_keys = set(output.keys())

        result["missing_top_level_keys"] = sorted(baseline_keys - output_keys)
        result["new_top_level_keys"] = sorted(output_keys - baseline_keys)

        if result["missing_top_level_keys"]:
            result["qa_pass"] = False
            result["errors"].append(
                "Missing baseline top-level keys: "
                + ", ".join(result["missing_top_level_keys"])
            )

        unexpected_new_keys = set(result["new_top_level_keys"]) - EXPECTED_NEW_TOP_LEVEL_KEYS
        if unexpected_new_keys:
            result["warnings"].append(
                "Unexpected new top-level keys: " + ", ".join(sorted(unexpected_new_keys))
            )

    for section in PRESERVED_SECTIONS:
        value = get_nested(output, section)
        present = has_content(value)
        result["preserved_sections"][section] = {"present": present}

        if not present:
            result["qa_pass"] = False
            result["missing_required_sections"].append(section)
            result["errors"].append(f"Missing preserved section: {section}")

    rentcast_expected = False
    if refresh_result:
        rentcast_expected = bool(
            refresh_result.get("api_sources_used", {}).get("rentcast")
        )
    else:
        rentcast_expected = has_content(get_nested(output, "market_metrics"))

    if rentcast_expected:
        for field in RENTCAST_FIELDS_WHEN_AVAILABLE:
            value = get_nested(output, field) if "." in field else output.get(field)
            present = has_content(value)
            result["rentcast_fields"][field] = {"present": present}

            if not present:
                result["qa_pass"] = False
                result["errors"].append(f"Missing RentCast field: {field}")
    else:
        for field in RENTCAST_FIELDS_WHEN_AVAILABLE:
            value = get_nested(output, field) if "." in field else output.get(field)
            result["rentcast_fields"][field] = {
                "present": has_content(value),
                "skipped": "RentCast not used for this base refresh",
            }

    result["bad_census_values_found"] = find_sentinel_values(output)
    if result["bad_census_values_found"]:
        result["qa_pass"] = False
        result["errors"].append("Census sentinel values found in output JSON.")

    if slug == "lackland-afb" and baseline and output:
        households = get_nested(output, "households.total_households")
        baseline_households = get_nested(baseline, "households.total_households")
        if households is not None and baseline_households is not None:
            if households < baseline_households * 0.5:
                result["warnings"].append(
                    "Lackland households.total_households dropped sharply "
                    f"({baseline_households} -> {households}). Review Census place geo_id."
                )

    return result


def scan_stray_outputs(registry_slugs):
    warnings = []
    bad_values = []

    for path in sorted(OUTPUT_DIR.glob("*.json")):
        if path.name == ".gitkeep":
            continue

        slug = path.stem
        if slug not in registry_slugs:
            warnings.append(f"Output file not in registry: {path.name}")

        try:
            data = read_json(path)
        except json.JSONDecodeError:
            warnings.append(f"Stray output file is not valid JSON: {path.name}")
            continue

        sentinels = find_sentinel_values(data)
        if sentinels:
            bad_values.append({
                "file": str(path.relative_to(REPO_ROOT)),
                "values": sentinels,
            })

        text = path.read_text(encoding="utf-8")
        if "ArcGIS" in text or "arcgis" in text:
            warnings.append(f"ArcGIS reference found in output file: {path.name}")

    return warnings, bad_values


def build_recommendation(qa_pass, registry_count, per_base_results, global_warnings):
    passed_bases = [item for item in per_base_results if item["qa_pass"]]
    failed_bases = [item for item in per_base_results if not item["qa_pass"]]

    if not qa_pass:
        return (
            f"FAIL — Do not promote outputs to netlify/functions/cities. "
            f"{len(passed_bases)}/{registry_count} bases passed QA; "
            f"{len(failed_bases)} failed. Fix errors, rerun refresh, then QA."
        )

    if global_warnings:
        return (
            f"PASS with warnings — All {registry_count} refreshed output files passed QA "
            "and are safe to promote after reviewing flagged warnings "
            "(including any skipped RentCast ZIPs and known Andrews baseline caveat)."
        )

    return (
        f"PASS — All {registry_count} output files are safe to promote to "
        "netlify/functions/cities when ready."
    )


def main():
    registry = load_registry()
    registry_count = len(registry)
    registry_slugs = {entry["slug"] for entry in registry}

    script_check = check_refresh_script()
    refresh_report_check = check_refresh_report(registry_count)
    refresh_lookup, _failed_entries = build_refresh_lookup()

    per_base_results = [
        qa_one_base(entry, refresh_lookup.get(entry["slug"]))
        for entry in registry
    ]

    stray_warnings, stray_bad_values = scan_stray_outputs(registry_slugs)

    pipeline_pass = (
        not script_check["uses_arcgis_api"]
        and refresh_report_check.get("report_exists", False)
        and not refresh_report_check.get("refresh_failures_present", True)
        and refresh_report_check.get("all_bases_updated", False)
        and refresh_report_check.get("nearby_services_baseline_preserved", False)
    )

    base_pass = all(item["qa_pass"] for item in per_base_results)
    qa_pass = pipeline_pass and base_pass

    global_warnings = list(stray_warnings)
    if stray_bad_values:
        global_warnings.append(
            "Sentinel Census values found in output files: "
            + ", ".join(item["file"] for item in stray_bad_values)
        )

    if refresh_report_check.get("refresh_failures_present"):
        global_warnings.append(
            "refresh_report.json contains failed bases: "
            + ", ".join(refresh_report_check.get("failed_slugs") or ["unknown"])
        )

    if refresh_report_check.get("report_exists") and not refresh_report_check.get("all_bases_updated"):
        global_warnings.append(
            "refresh_report.json updated count "
            f"({refresh_report_check.get('updated_count')}) "
            f"does not match registry count ({registry_count})."
        )

    for base_result in per_base_results:
        global_warnings.extend(base_result.get("warnings", []))

    if not script_check["mode_comment_present"]:
        global_warnings.append(
            "refresh_bases.py mode comment missing expected RentCast + Census only text."
        )

    report = {
        "qa_pass": qa_pass,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "registry_path": str(REGISTRY_PATH.relative_to(REPO_ROOT)),
        "registry_count": registry_count,
        "output_count": sum(1 for item in per_base_results if item["output_exists"]),
        "passed_count": sum(1 for item in per_base_results if item["qa_pass"]),
        "failed_count": sum(1 for item in per_base_results if not item["qa_pass"]),
        "files_checked": [
            {
                "slug": entry["slug"],
                "name": entry.get("name"),
                "baseline": str((CITIES_DIR / f"{entry['file']}.json").relative_to(REPO_ROOT)),
                "output": str((OUTPUT_DIR / f"{entry['slug']}.json").relative_to(REPO_ROOT)),
            }
            for entry in registry
        ],
        "pipeline_checks": {
            "refresh_script": script_check,
            "refresh_report": refresh_report_check,
            "pipeline_pass": pipeline_pass,
        },
        "per_base": per_base_results,
        "summary_by_slug": {
            item["slug"]: {
                "qa_pass": item["qa_pass"],
                "output_exists": item["output_exists"],
                "output_valid_json": item["output_valid_json"],
                "baseline_valid": item["baseline_valid"],
                "error_count": len(item["errors"]),
                "warning_count": len(item["warnings"]),
            }
            for item in per_base_results
        },
        "missing_keys": {
            item["slug"]: item["missing_top_level_keys"]
            for item in per_base_results
            if item["missing_top_level_keys"]
        },
        "bad_census_values_found": {
            item["slug"]: item["bad_census_values_found"]
            for item in per_base_results
            if item["bad_census_values_found"]
        },
        "missing_required_sections": {
            item["slug"]: item["missing_required_sections"]
            for item in per_base_results
            if item["missing_required_sections"]
        },
        "skipped_rentcast_zips": {
            item["slug"]: item["skipped_rentcast_zips"]
            for item in per_base_results
            if item["skipped_rentcast_zips"]
        },
        "stray_output_bad_census_values": stray_bad_values,
        "warnings": global_warnings,
        "recommendation": build_recommendation(
            qa_pass, registry_count, per_base_results, global_warnings
        ),
    }

    write_json(REPORT_PATH, report)

    print(f"QA {'PASS' if qa_pass else 'FAIL'}")
    print(f"Registry bases: {registry_count}")
    print(f"Outputs found: {report['output_count']}")
    print(f"Per-base pass: {report['passed_count']}/{registry_count}")
    print(f"Report written to: {REPORT_PATH}")
    print(f"Recommendation: {report['recommendation']}")

    if not qa_pass:
        failed = [item["slug"] for item in per_base_results if not item["qa_pass"]]
        print("Failed bases:")
        for slug in failed:
            print(f"  - {slug}")

    if global_warnings:
        print("Warnings:")
        for warning in global_warnings[:20]:
            print(f"  - {warning}")
        if len(global_warnings) > 20:
            print(f"  ... and {len(global_warnings) - 20} more (see qa_report.json)")

    raise SystemExit(0 if qa_pass else 1)


if __name__ == "__main__":
    main()
