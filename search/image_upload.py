import os
import requests
from dotenv import load_dotenv

load_dotenv()

SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")

MAX_FILE_SIZE = 500 * 1024  # 500 KB


def compress_image(image_path):

    if not os.path.exists(image_path):
        raise FileNotFoundError(
            f"Image file not found: {image_path}"
        )

    file_size = os.path.getsize(image_path)

    if file_size <= MAX_FILE_SIZE:
        return image_path

    print("⚠️ Image is larger than 500 KB.")
    print("Compressing image...")

    compressed_path = "data/input/compressed_search.jpg"

    try:
        from PIL import Image
        image = Image.open(image_path)
        image = image.convert("RGB")

        quality = 85

        while quality >= 20:

            image.save(
                compressed_path,
                "JPEG",
                quality=quality,
                optimize=True
            )

            new_size = os.path.getsize(compressed_path)

            if new_size <= MAX_FILE_SIZE:
                print(
                    f"✓ Image compressed to {new_size / 1024:.1f} KB"
                )
                return compressed_path

            quality -= 5

    except Exception as e:
        raise RuntimeError(
            f"Image compression failed: {e}"
        )

    raise ValueError(
        "Could not compress image below 500 KB."
    )


def upload_image(image_path):

    if not SERPAPI_API_KEY:
        raise ValueError(
            "SERPAPI_API_KEY is missing. Check your .env file."
        )

    image_path = compress_image(image_path)

    file_size = os.path.getsize(image_path)

    print(f"Image size: {file_size / 1024:.1f} KB")

    url = "https://serpapi.com/image"

    try:

        with open(image_path, "rb") as image_file:

            response = requests.post(
                url,
                files={
                    "image": image_file
                },
                data={
                    "api_key": SERPAPI_API_KEY
                },
                timeout=30
            )

        response.raise_for_status()

    except requests.exceptions.Timeout:
        raise RuntimeError(
            "Image upload timed out. Please try again."
        )

    except requests.exceptions.RequestException as e:
        raise RuntimeError(
            f"Image upload failed: {e}"
        )

    try:

        result = response.json()

    except ValueError:
        raise RuntimeError(
            "SerpApi returned an invalid response."
        )

    if "error" in result:
        raise RuntimeError(
            f"SerpApi image upload error: {result['error']}"
        )

    if "image_id" not in result:
        raise RuntimeError(
            "SerpApi response did not contain an image ID."
        )

    return result


if __name__ == "__main__":

    result = upload_image(
        "data/input/public_test.jpg"
    )

    print(result)