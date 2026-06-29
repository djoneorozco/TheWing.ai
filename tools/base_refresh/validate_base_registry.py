#!/usr/bin/env python3
"""
Validate tools/base_refresh/base_registry.json against index.byBase.json
and netlify/functions/cities production JSON files.

Run from repo root:

    python tools/base_refresh/validate_base_registry.py
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

BASE_REFRESH_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_REFRESH_DIR.parents[1]

REGISTRY_PATH = BASE_REFRESH_DIR / "base_registry.json"
INDEX_PATH = BASE_REFRESH_DIR / "index.byBase.json"
REPORT_PATH = BASE_REFRESH_DIR / "base_registry_validation_report.json"
CITIES_DIR = REPO_ROOT / "netlify" / "functions" / "cities"

REQUIRED_FIELDS = [
    "slug",
    "name",
    "file",
    "city",
    "submarket",
    "place",
    "place_detail",
    "state",
    "state_code",
    "geo_id",
    "primary_zip",
    "market_label",
    "housing_market_zips",
    "lat",
    "lon",
]

GEO_ID_PREFIX = "1600000US"
STATE_CODE_RE = re.compile(r"^[A-Z]{2}$")


def load_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def validate_registry() -> dict:
    errors: list[str] = []
    warnings: list[str] = []
    checks: dict[str, bool] = {}

    # 1. Valid JSON array
    try:
        registry = load_json(REGISTRY_PATH)
        checks["valid_json_array"] = isinstance(registry, list)
        if not isinstance(registry, list):
            errors.append("base_registry.json must be a JSON array")
            registry = []
    except json.JSONDecodeError as exc:
        checks["valid_json_array"] = False
        errors.append(f"Invalid JSON in base_registry.json: {exc}")
        registry = []

    index = load_json(INDEX_PATH)
    index_bases: dict = index.get("bases", {})
    index_names = set(index_bases.keys())
    registry_names = {entry.get("name") for entry in registry if isinstance(entry, dict)}

    # 2. Same 44 bases as index
    checks["same_base_count_as_index"] = len(registry) == len(index_bases) == 44
    if len(registry) != 44:
        errors.append(f"Expected 44 registry entries, found {len(registry)}")
    if len(index_bases) != 44:
        errors.append(f"Expected 44 index bases, found {len(index_bases)}")

    # 12 / 13. Missing / extra bases by index name
    missing_from_registry = sorted(index_names - registry_names)
    extra_in_registry = sorted(registry_names - index_names)
    checks["no_missing_index_bases"] = not missing_from_registry
    checks["no_extra_registry_bases"] = not extra_in_registry
    if missing_from_registry:
        errors.append(
            "Bases in index.byBase.json missing from base_registry.json: "
            + ", ".join(missing_from_registry)
        )
    if extra_in_registry:
        errors.append(
            "Bases in base_registry.json not in index.byBase.json: "
            + ", ".join(extra_in_registry)
        )

    slugs: list[str] = []
    files: list[str] = []
    missing_production_files: list[str] = []
    empty_or_invalid_production_files: list[str] = []

    for idx, entry in enumerate(registry):
        if not isinstance(entry, dict):
            errors.append(f"Registry entry at index {idx} is not an object")
            continue

        label = entry.get("name") or entry.get("slug") or f"index {idx}"

        # 5. Required fields
        for field in REQUIRED_FIELDS:
            if field not in entry:
                errors.append(f"{label}: missing required field '{field}'")

        # 6. housing_market_zips count
        zips = entry.get("housing_market_zips")
        if not isinstance(zips, list) or len(zips) < 3:
            errors.append(f"{label}: housing_market_zips must contain at least 3 ZIPs")

        # 7. primary_zip
        primary_zip = str(entry.get("primary_zip", "")).strip()
        if not primary_zip:
            errors.append(f"{label}: primary_zip must not be empty")

        # 8. geo_id prefix
        geo_id = str(entry.get("geo_id", ""))
        if not geo_id.startswith(GEO_ID_PREFIX):
            errors.append(f"{label}: geo_id must start with '{GEO_ID_PREFIX}'")

        # 9. state_code
        state_code = str(entry.get("state_code", ""))
        if not STATE_CODE_RE.match(state_code):
            errors.append(f"{label}: state_code must be two uppercase letters")

        slug = entry.get("slug")
        file_name = entry.get("file")
        if slug:
            slugs.append(str(slug))
        if file_name:
            files.append(str(file_name))

        # 10 / 11. Production file exists
        if file_name:
            prod_path = CITIES_DIR / f"{file_name}.json"
            if not prod_path.exists():
                missing_production_files.append(str(file_name))
                errors.append(f"{label}: missing production file netlify/functions/cities/{file_name}.json")
            elif prod_path.stat().st_size == 0:
                empty_or_invalid_production_files.append(str(file_name))
                warnings.append(
                    f"{label}: production file netlify/functions/cities/{file_name}.json is empty"
                )
            else:
                try:
                    prod_data = load_json(prod_path)
                    if not isinstance(prod_data, dict) or not prod_data:
                        empty_or_invalid_production_files.append(str(file_name))
                        warnings.append(
                            f"{label}: production file netlify/functions/cities/{file_name}.json is empty or invalid"
                        )
                except json.JSONDecodeError:
                    empty_or_invalid_production_files.append(str(file_name))
                    warnings.append(
                        f"{label}: production file netlify/functions/cities/{file_name}.json is not valid JSON"
                    )

    # 3. Duplicate slugs
    duplicate_slugs = sorted({slug for slug in slugs if slugs.count(slug) > 1})
    checks["no_duplicate_slugs"] = not duplicate_slugs
    if duplicate_slugs:
        errors.append("Duplicate slugs: " + ", ".join(duplicate_slugs))

    # 4. Duplicate file values
    duplicate_files = sorted({file_name for file_name in files if files.count(file_name) > 1})
    checks["no_duplicate_files"] = not duplicate_files
    if duplicate_files:
        errors.append("Duplicate file values: " + ", ".join(duplicate_files))

    checks["all_required_fields_present"] = not any("missing required field" in e for e in errors)
    checks["housing_market_zips_min_3"] = not any("housing_market_zips must" in e for e in errors)
    checks["primary_zip_not_empty"] = not any("primary_zip must not be empty" in e for e in errors)
    checks["geo_id_prefix_valid"] = not any("geo_id must start" in e for e in errors)
    checks["state_code_two_letters"] = not any("state_code must be two" in e for e in errors)
    checks["production_files_exist"] = not missing_production_files

    passed = not errors

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "registry_path": str(REGISTRY_PATH.relative_to(REPO_ROOT)),
        "index_path": str(INDEX_PATH.relative_to(REPO_ROOT)),
        "registry_count": len(registry),
        "index_count": len(index_bases),
        "passed": passed,
        "checks": checks,
        "errors": errors,
        "warnings": warnings,
        "missing_from_registry": missing_from_registry,
        "extra_in_registry": extra_in_registry,
        "duplicate_slugs": duplicate_slugs,
        "duplicate_files": duplicate_files,
        "missing_production_files": sorted(set(missing_production_files)),
        "empty_or_invalid_production_files": sorted(set(empty_or_invalid_production_files)),
    }

    with REPORT_PATH.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")

    return report


def main() -> None:
    report = validate_registry()
    status = "PASSED" if report["passed"] else "FAILED"
    print(f"Validation {status}")
    print(f"Registry entries: {report['registry_count']}")
    print(f"Errors: {len(report['errors'])}")
    print(f"Warnings: {len(report['warnings'])}")
    print(f"Report: {REPORT_PATH}")
    if report["errors"]:
        for error in report["errors"]:
            print(f"  ERROR: {error}")
    if report["warnings"]:
        for warning in report["warnings"]:
            print(f"  WARN: {warning}")
    raise SystemExit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
