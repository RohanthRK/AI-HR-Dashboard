import urllib.request
import urllib.parse
import json
import time

def call_api(path, method='GET', data=None, token=None):
    url = f'http://localhost:8000/api/attendance{path}'
    if data:
        encoded_data = json.dumps(data).encode('utf-8')
        req = urllib.request.Request(url, data=encoded_data, method=method)
        req.add_header('Content-Type', 'application/json')
    else:
        req = urllib.request.Request(url, method=method)
        if method == 'POST':
            req.add_header('Content-Length', '0')
    
    if token:
        req.add_header('Authorization', f'Bearer {token}')
        
    try:
        response = urllib.request.urlopen(req)
        return response.status, response.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')

try:
    # 1. Login
    login_data = {'username': 'employee1', 'password': 'employee1'}
    url = 'http://localhost:8000/api/auth/login'
    encoded_data = json.dumps(login_data).encode('utf-8')
    req = urllib.request.Request(url, data=encoded_data, method='POST')
    req.add_header('Content-Type', 'application/json')
    resp = urllib.request.urlopen(req)
    token = json.loads(resp.read())['token']
    print("--- Login Successful ---")

    # 2. Clock In (initial)
    status, body = call_api('/clock-in/', 'POST', token=token)
    print(f"Clock In 1: Status {status}, Body: {body[:100]}")

    # 3. Clock Out
    status, body = call_api('/clock-out/', 'POST', token=token)
    print(f"Clock Out 1: Status {status}, Body: {body[:100]}")

    # 4. Clock In AGAIN (This tests the update_one with clock_out: None)
    status, body = call_api('/clock-in/', 'POST', token=token)
    print(f"Clock In 2 (Re-clock): Status {status}, Body: {body[:100]}")

except Exception as e:
    print(f"Unexpected error: {e}")
