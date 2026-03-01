import json, glob

chars = {
    'mao_mao': 'dataset/mao_mao/*.json',
    'edgar': 'dataset/edgar/*.json',
    'celestin': 'dataset/celestin/*.json',
    'guenivre': 'dataset/guenivre/*.json',
}

results = {}
for char, pattern in chars.items():
    tools = set()
    for fp in glob.glob(pattern):
        data = json.load(open(fp))
        for msg in data['messages']:
            if msg.get('role') == 'assistant' and 'tool_calls' in msg:
                for tc in msg['tool_calls']:
                    tools.add(tc['function']['name'])
    results[char] = sorted(tools)

for char, tools in results.items():
    print(f"{char}: {tools}")

print()
chars_list = list(results.keys())
all_unique = True
for i in range(len(chars_list)):
    for j in range(i+1, len(chars_list)):
        overlap = set(results[chars_list[i]]) & set(results[chars_list[j]])
        print(f"Overlap {chars_list[i]} vs {chars_list[j]}: {sorted(overlap)}")
        if overlap:
            all_unique = False

print()
if all_unique:
    print("RESULT: All NPCs have fully distinct tool sets.")
else:
    print("RESULT: Some NPCs share tools (see overlaps above).")
