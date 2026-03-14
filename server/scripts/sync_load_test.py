import requests
import random
import time

BASE_URL = "http://localhost:8000"
SYNC_ENDPOINT = "/sync"

TOTAL_REQUESTS = 100
REVIEWS_PER_REQUEST = 20


def generate_review(question_id):
    return {
        "question_id": question_id,
        "repetition": random.randint(0, 5),
        "interval": random.randint(1, 10),
        "ease_factor": 2.5,
        "next_review": int(time.time()) + random.randint(1000, 100000),
        "last_result": random.choice(["again", "good", "easy"])
    }


def generate_payload(start_qid):

    reviews = []

    for i in range(REVIEWS_PER_REQUEST):
        reviews.append(generate_review(start_qid + i))

    payload = {
        "user_id": 1,
        "reviews": reviews
    }

    return payload


def send_sync(payload):

    try:
        r = requests.post(
            f"{BASE_URL}{SYNC_ENDPOINT}",
            json=payload,
            timeout=10
        )

        return r.status_code

    except Exception:
        return "FAILED"


def run_load_test():

    print("\nQUIZWIZ SYNC LOAD TEST\n")

    start_time = time.time()

    success = 0
    failed = 0

    for i in range(TOTAL_REQUESTS):

        payload = generate_payload(i * REVIEWS_PER_REQUEST)

        status = send_sync(payload)

        if status == 200:
            success += 1
        else:
            failed += 1

        print(f"Request {i+1}/{TOTAL_REQUESTS} → {status}")

    duration = time.time() - start_time

    print("\nLOAD TEST RESULT")

    print("Total Requests:", TOTAL_REQUESTS)
    print("Success:", success)
    print("Failed:", failed)

    print("Duration (sec):", round(duration, 2))
    print("Requests/sec:", round(TOTAL_REQUESTS / duration, 2))


if __name__ == "__main__":
    run_load_test()