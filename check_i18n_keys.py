import re
import json

# Read QuizPreviewPage.tsx
with open("src/features/quiz/pages/QuizPreviewPage.tsx", "r", encoding="utf-8") as f:
    tsx_content = f.read()

# Extract all quizOverview translation keys
pattern = r"t\(['\"]quizOverview\.([^'\"]+)['\"]"
matches = re.findall(pattern, tsx_content)
required_keys = sorted(set(matches))

print("=== REQUIRED KEYS IN CODE ===")
for key in required_keys:
    print(f"  quizOverview.{key}")

# Read EN file
with open("public/locales/en/common.json", "r", encoding="utf-8") as f:
    en_data = json.load(f)

# Read VI file  
with open("public/locales/vi/common.json", "r", encoding="utf-8") as f:
    vi_data = json.load(f)

def check_nested_key(data, key_path):
    keys = key_path.split(".")
    current = data
    for k in keys:
        if isinstance(current, dict) and k in current:
            current = current[k]
        else:
            return False
    return True

print("\n=== MISSING IN EN ===")
missing_en = []
for key in required_keys:
    full_key = f"quizOverview.{key}"
    if not check_nested_key(en_data, full_key):
        missing_en.append(full_key)
        print(f"  {full_key}")

if not missing_en:
    print("  None - All keys present!")

print("\n=== MISSING IN VI ===")
missing_vi = []
for key in required_keys:
    full_key = f"quizOverview.{key}"
    if not check_nested_key(vi_data, full_key):
        missing_vi.append(full_key)
        print(f"  {full_key}")
        
if not missing_vi:
    print("  None - All keys present!")

print(f"\n=== SUMMARY ===")
print(f"Total required keys: {len(required_keys)}")
print(f"Missing in EN: {len(missing_en)}")
print(f"Missing in VI: {len(missing_vi)}")
