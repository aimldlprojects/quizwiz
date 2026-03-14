import pytest


def run_all_tests():
    pytest.main(["-v", "tests"])


if __name__ == "__main__":
    run_all_tests()