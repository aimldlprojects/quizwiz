import requests
import time

BASE_URL = "http://localhost:8000"


def wait_for_server(timeout=10):
    """
    Wait until FastAPI server becomes available.
    """
    start = time.time()

    while time.time() - start < timeout:
        try:
            r = requests.get(f"{BASE_URL}/docs")
            if r.status_code == 200:
                return True
        except Exception:
            pass

        time.sleep(1)

    return False


def test_server_running():
    """
    Test if FastAPI server is running.
    """
    assert wait_for_server(), "FastAPI server is not running"


def test_sync_endpoint():
    """
    Test sync endpoint with sample payload.
    """

    payload = {
        "user_id": 1,
        "reviews": [
            {
                "question_id": 101,
                "repetition": 1,
                "interval": 1,
                "ease_factor": 2.5,
                "next_review": 1710000000,
                "last_result": "good"
            }
        ]
    }

    response = requests.post(f"{BASE_URL}/sync", json=payload)

    print("Status Code:", response.status_code)
    print("Response:", response.text)

    assert response.status_code == 200


def test_invalid_payload():
    """
    Test API validation.
    """

    payload = {
        "invalid_field": "bad data"
    }

    response = requests.post(f"{BASE_URL}/sync", json=payload)

    print("Invalid payload response:", response.text)

    assert response.status_code in [400, 422]


def test_health_endpoint():
    """
    Optional health endpoint test.
    """

    response = requests.get(f"{BASE_URL}/docs")

    assert response.status_code == 200