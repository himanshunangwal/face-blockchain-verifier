import json


def save_json(data, file_path):
    with open(file_path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=4, ensure_ascii=False)

    print(f"✓ Results saved to {file_path}")


def create_verification_record(results, result_hash):
    return {
        "results": results,
        "sha256_hash": result_hash
    }