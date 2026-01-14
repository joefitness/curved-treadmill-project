import json
from collections import OrderedDict

INPUT_FILE = "test_with_all_fields.json"
OUTPUT_FILE = "test_reordered.json"

PROPERTY_ORDER = [
    "id",
    "year",
    "title",
    "authors",
    "journal",
    "methods",
    "population",
    "sampleSize",
    "treadmill",
    "treadmillFocus",
    "abstract",
    "keyFindings",
    "keywords",
    "openAccess",
    "DOI",
    "citations"
]

with open(INPUT_FILE, "r") as f:
    data = json.load(f)

if not isinstance(data, list):
    raise TypeError("JSON root must be a list of objects")

reordered_data = []

for obj in data:
    if not isinstance(obj, dict):
        raise TypeError("Each item must be a JSON object")

    new_obj = OrderedDict()

    # Add properties in the desired order (if they exist)
    for key in PROPERTY_ORDER:
        if key in obj:
            new_obj[key] = obj[key]

    # Append any remaining properties that weren't specified
    for key, value in obj.items():
        if key not in new_obj:
            new_obj[key] = value

    reordered_data.append(new_obj)

with open(OUTPUT_FILE, "w") as f:
    json.dump(reordered_data, f, indent=2)

print(f"Reordered {len(reordered_data)} records → {OUTPUT_FILE}")
