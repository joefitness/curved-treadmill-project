import json

INPUT_FILE = "test.json"
OUTPUT_FILE = "test_with_all_fields.json"

# Add the required fields here
REQUIRED_FIELDS = {
    "demographics": {
        "n":0,
        "ageMean":0,
        "ageSD": 0,
        "heightMean": 0,
        "heightSD": 0,
        "weightMean": 0,
        "weightSD": 0,
        "nMale": 0,
        "nFemale": 0,
        "maleAge": 0,
        "maleAgeSD": 0,
        "femaleAge": 0,
        "femaleAgeSD": 0,
        "maleHeight": 0,
        "maleHeightSD": 0,
        "femaleHeight": 0,
        "femaleHeightSD": 0,
        "maleWeight": 0,
        "maleWeightSD": 0,
        "femaleWeight": 0,
        "femaleWeightSD": 0
        }
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
