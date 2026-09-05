import os
import sys
import requests
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")


def search_google_lens(image_id):

    if not SERPAPI_API_KEY:
        raise ValueError(
            "SERPAPI_API_KEY is missing. Check your .env file."
        )

    if not image_id:
        raise ValueError(
            "Image ID is missing. Cannot perform Google Lens search."
        )

    url = "https://serpapi.com/search.json"

    params = {
        "engine": "google_lens",
        "image_id": image_id,
        "api_key": SERPAPI_API_KEY,
        "type": "all",
        "auto_crop": "true",
        "no_cache": "true"
    }

    try:

        response = requests.get(
            url,
            params=params,
            timeout=30
        )

        response.raise_for_status()

    except requests.exceptions.Timeout:
        raise RuntimeError(
            "Google Lens request timed out. Please try again."
        )

    except requests.exceptions.RequestException as e:
        raise RuntimeError(
            f"Google Lens request failed: {e}"
        )

    try:

        result = response.json()

    except ValueError:
        raise RuntimeError(
            "Google Lens returned an invalid response."
        )

    if "error" in result:
        raise RuntimeError(
            f"Google Lens API error: {result['error']}"
        )

    return result


if __name__ == "__main__":

    print("google_lens.py is ready.")