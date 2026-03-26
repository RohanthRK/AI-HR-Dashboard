import requests
import json

payload = {
    "name": "Test User",
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "phone": "1234567890",
    "date_of_birth": "1990-01-01",
    "gender": "Male",
    "address": "123 Test St",
    "employee_id": "EMP888",
    "department": "Engineering",
    "role": "Developer",
    "date_joined": "2024-01-01",
    "hire_date": "2024-01-01",
    "status": "Active",
    "manager": "Jane Doe",
    "salary": "90000",
    "username": "testuser",
    "is_admin": False,
    "skills": "Python, React",
    "bio": "Test bio"
}

try:
    response = requests.post(
        "http://localhost:8000/api/employees/",
        json=payload
    )
    print("Status:", response.status_code)
    print("Response:", response.text)
except Exception as e:
    print("Error:", e)
