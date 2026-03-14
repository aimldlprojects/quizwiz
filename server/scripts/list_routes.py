import requests

BASE_URL = "http://localhost:8000/openapi.json"

r = requests.get(BASE_URL)

data = r.json()

print("\nAVAILABLE API ROUTES:\n")

for path in data["paths"]:
    methods = list(data["paths"][path].keys())
    print(path, "->", methods)