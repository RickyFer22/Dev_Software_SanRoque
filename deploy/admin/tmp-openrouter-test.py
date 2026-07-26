import os
import json
import urllib.request
import urllib.error

base = os.path.join(os.path.dirname(__file__), '..')
# load deploy/.env
env_file = os.path.normpath(os.path.join(base, 'deploy', '.env'))
env = {}
with open(env_file, 'r', encoding='utf-8') as f:
    for line in f:
        text = line.strip()
        if not text or text.startswith('#'):
            continue
        if '=' not in text:
            continue
        key, value = text.split('=', 1)
        env[key.strip()] = value.strip().strip('"')

print('Loaded env keys:', [k for k in env.keys() if k.startswith('BOT_')])
url = env.get('BOT_API_URL')
key = env.get('BOT_API_KEY')
provider = env.get('BOT_PROVIDER')
print('URL:', url)
print('PROVIDER:', provider)
print('KEY present:', bool(key))
if not url or not key:
    raise SystemExit('Missing BOT_API_URL or BOT_API_KEY')

headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {key}',
}
body = json.dumps({
    'model': 'gpt-4o-mini',
    'messages': [
        {'role': 'system', 'content': 'Test de conexión'},
        {'role': 'user', 'content': 'hola'}
    ],
    'temperature': 0.3,
}).encode('utf-8')
req = urllib.request.Request(url, data=body, headers=headers, method='POST')
print('Requesting OpenRouter...')
try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        print('Status:', resp.status)
        data = resp.read().decode('utf-8')
        print('Response:', data[:800])
except urllib.error.HTTPError as e:
    print('HTTPError:', e.code, e.reason)
    try:
        print(e.read().decode('utf-8'))
    except Exception:
        pass
except Exception as e:
    print('Error:', type(e).__name__, e)
