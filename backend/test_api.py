import urllib.request, json

# Test menu endpoint
resp = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/menu/')
data = json.loads(resp.read())
print(f'Menu items: {len(data)}')
for item in data[:5]:
    print(f'  - {item["name"]} Rs{item["price"]}')

# Test staff login
req = urllib.request.Request(
    'http://127.0.0.1:8000/api/v1/auth/staff/',
    data=json.dumps({'email': 'admin@sies.edu.in', 'password': 'admin123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
resp2 = urllib.request.urlopen(req)
staff_data = json.loads(resp2.read())
print(f'\nStaff login: {staff_data["user"]["name"]} [{staff_data["user"]["role"]}]')
print(f'Access token: {staff_data["access"][:40]}...')

# Test slots endpoint with token
token = staff_data['access']
req3 = urllib.request.Request(
    'http://127.0.0.1:8000/api/v1/slots/',
    headers={'Authorization': f'Bearer {token}'}
)
resp3 = urllib.request.urlopen(req3)
slots = json.loads(resp3.read())
print(f'\nSlots today: {len(slots)}')
if slots:
    print(f'  First slot: {slots[0]["start_time"]} - {slots[0]["end_time"]} (cutoff: {slots[0]["cutoff_time"]})')

# Test dashboard
req4 = urllib.request.Request(
    'http://127.0.0.1:8000/api/v1/dashboard/',
    headers={'Authorization': f'Bearer {token}'}
)
resp4 = urllib.request.urlopen(req4)
dash = json.loads(resp4.read())
print(f'\nDashboard: revenue=Rs{dash["revenue"]}, processed={dash["orders_processed"]}, pending={dash["orders_pending"]}')
print('Top items:', dash['top_items'])
