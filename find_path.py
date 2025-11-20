import json

def find_key_path(data, target_key, current_path=""):
    if isinstance(data, dict):
        for key, value in data.items():
            new_path = f"{current_path}.{key}" if current_path else key
            if key == target_key:
                return new_path
            result = find_key_path(value, target_key, new_path)
            if result:
                return result
    elif isinstance(data, list):
        for i, item in enumerate(data):
            result = find_key_path(item, target_key, f"{current_path}[{i}]")
            if result:
                return result
    return None

with open("public/locales/en/common.json", "r", encoding="utf-8") as f:
    en_data = json.load(f)

path = find_key_path(en_data, "quizOverview")
print(f"quizOverview found at: {path}")

if path:
    # Navigate to parent
    keys = path.split(".")
    parent = en_data
    for k in keys[:-1]:
        parent = parent[k]
    print(f"Parent keys: {list(parent.keys())[:10]}")
