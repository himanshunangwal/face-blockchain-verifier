import json
import os


def save_json(data, file_path):
    dir_name = os.path.dirname(os.path.abspath(file_path))
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=4, ensure_ascii=False)

    print(f"✓ Results saved to {file_path}")


def create_verification_record(results, result_hash):
    return {
        "results": results,
        "sha256_hash": result_hash
    }