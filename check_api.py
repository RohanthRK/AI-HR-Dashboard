import requests
import json
import traceback

API_URL = 'http://localhost:8000/api'

def check_endpoint(endpoint):
    try:
        print(f"\nChecking {endpoint}...")
        response = requests.get(f"{API_URL}{endpoint}", timeout=5)
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            # Try to parse as JSON
            try:
                data = response.json()
                print(f"Response JSON: {json.dumps(data, indent=2)[:1000]}...")  # Limit output length
                print(f"Total data size: {len(response.text)} bytes")
                return True
            except json.JSONDecodeError:
                print(f"Response is not valid JSON: {response.text[:200]}...")
                return False
        else:
            print(f"Error response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"Exception occurred: {str(e)}")
        traceback.print_exc()
        return False

# Check API root
print("Checking API availability...")
check_endpoint('/')

# Check employees endpoint
check_endpoint('/employees/')

# Check employees debug endpoint
check_endpoint('/employees/debug/')

# Check departments endpoint
check_endpoint('/employees/departments/') 