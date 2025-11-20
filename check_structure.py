import json

with open("public/locales/en/common.json", "r", encoding="utf-8") as f:
    en_data = json.load(f)

with open("public/locales/vi/common.json", "r", encoding="utf-8") as f:
    vi_data = json.load(f)

print("=== EN quizOverview structure ===")
if "quizOverview" in en_data:
    print(f"quizOverview exists: {type(en_data['quizOverview'])}")
    print(f"Keys: {list(en_data['quizOverview'].keys())[:10]}")
else:
    print("quizOverview NOT FOUND in EN")

print("\n=== VI quizOverview structure ===")
if "quizOverview" in vi_data:
    print(f"quizOverview exists: {type(vi_data['quizOverview'])}")
    print(f"Keys: {list(vi_data['quizOverview'].keys())[:10]}")
else:
    print("quizOverview NOT FOUND in VI")
