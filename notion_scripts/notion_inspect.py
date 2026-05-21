import urllib.request
import json
import sys
import os

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

token = os.environ.get("NOTION_API_KEY")
if not token:
    print("La variable de entorno NOTION_API_KEY no está configurada.")
    token = input("Por favor, ingresa tu Token de Notion (ntn_...): ").strip()
page_id = "36730b4a-e7dc-81cc-8bab-c9cff253fbeb"

def call_notion_api(endpoint, method="POST", data=None):
    url = f"https://api.notion.com/v1/{endpoint}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"HTTP Error {e.code} calling {endpoint}: {error_body}")
        raise e
    except Exception as e:
        print(f"Error calling {endpoint}: {e}")
        raise e

def main():
    print("=== INSPECTING NOTION PAGE CHILDREN ===")
    res = call_notion_api(f"blocks/{page_id}/children", method="GET")
    blocks = res.get("results", [])
    for b in blocks:
        b_type = b.get("type")
        b_id = b.get("id")
        print(f"Block: {b_id} | Type: {b_type}")
        if b_type == "heading_2":
            text = "".join([t.get("plain_text", "") for t in b["heading_2"].get("rich_text", [])])
            print(f"  -> Heading 2 Content: '{text}'")
        elif b_type == "child_database":
            title = b["child_database"].get("title", "")
            print(f"  -> DATABASE TITLE: '{title}'")
        elif b_type == "child_page":
            title = b["child_page"].get("title", "")
            print(f"  -> PAGE TITLE: '{title}'")

if __name__ == "__main__":
    main()
