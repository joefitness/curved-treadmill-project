import json

INPUT_FILE = "test.json"
OUTPUT_FILE = "test_with_all_fields.json"

REQUIRED_FIELDS = {
    "keywords": [],
    "DOI": "",
    "treadmillFocus": ""
}

with open(INPUT_FILE, "r") as f:
    data = json.load(f)

if not isinstance(data, list):
    raise TypeError("JSON root must be a list of objects")

for obj in data:
    for field, default_value in REQUIRED_FIELDS.items():
        if field not in obj:
            # Use a new object for mutable defaults (like lists)
            obj[field] = default_value.copy() if isinstance(default_value, list) else default_value

with open(OUTPUT_FILE, "w") as f:
    json.dump(data, f, indent=2)

print(f"Updated {len(data)} records → {OUTPUT_FILE}")
