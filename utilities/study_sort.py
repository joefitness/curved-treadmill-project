import json

INPUT_FILE = "test.json"
OUTPUT_FILE = "test_sorted.json"

def sort_key(x):
    # Year: most recent first
    year = x.get("year", -float("inf"))

    # First author's last name (everything before first comma)
    authors = x.get("authors", [""])
    first_author = authors[0] if authors else ""
    last_name = first_author.split(",")[0].strip().lower()

    # Negative year reverses the sort order for year only
    return (-year, last_name)

with open(INPUT_FILE, "r") as f:
    data = json.load(f)

data.sort(key=sort_key)

with open(OUTPUT_FILE, "w") as f:
    json.dump(data, f, indent=2)

print(f"Sorted {len(data)} records → {OUTPUT_FILE}")
