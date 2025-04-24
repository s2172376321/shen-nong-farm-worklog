import requests
import json

url = 'http://localhost:5004/api/auth/login'
headers = {'Content-Type': 'application/json'}
data = {
    'username': '1224',
    'password': '5ji6gj94'
}

try:
    response = requests.post(url, headers=headers, data=json.dumps(data))
    print(f'Status Code: {response.status_code}')
    print(f'Response Headers: {response.headers}')
    print(f'Response Body: {response.text}')
except requests.exceptions.RequestException as e:
    print(f'Error: {e}') 