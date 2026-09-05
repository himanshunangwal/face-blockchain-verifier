import os
import sys

from blockchain.blockchain import register_hash, verify_hash
from face.detector import detect_face
from face.encoder import encode_face
from search.image_upload import upload_image
from search.google_lens import search_google_lens
from search.result_parser import parse_results
from utils.hashing import generate_hash
from utils.json_utils import save_json, create_verification_record
from utils.tamper_checker import check_tampering

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    result = check_tampering("data/results/verification_record.json")
    exit(0 if result else 1)

if len(sys.argv) > 1 and sys.argv[1] == "tamper":
    print("\n⚠️ TAMPER DEMO")
    print("This will modify the verification record temporarily.")

    import json
    import shutil

    file_path = "data/results/verification_record.json"
    backup_path = "data/results/verification_record_backup.json"

    shutil.copy(file_path, backup_path)

    with open(file_path, "r", encoding="utf-8") as file:
        record = json.load(file)

    record["results"][0]["title"] = "TAMPERED DATA"

    with open(file_path, "w", encoding="utf-8") as file:
        json.dump(record, file, indent=4, ensure_ascii=False)

    print("\n✓ Record modified.")
    print("\nRunning verification...\n")

    result = check_tampering(file_path)

    shutil.copy(backup_path, file_path)

    print("\n✓ Original record restored.")

    exit(0 if not result else 1)


IMAGE_PATH = "data/input/test_search.jpg"


print("=" * 50)
print("   FACE ID + BLOCKCHAIN VERIFICATION")
print("=" * 50)


# 1. Face Detection
print("\n[1] Detecting face...")

faces = detect_face(IMAGE_PATH)

if faces is None:
    print("\nStopping program.")
    exit()


# 2. Face Encoding
print("\n[2] Encoding face...")

embedding = encode_face(IMAGE_PATH)

if embedding is None:
    print("\nStopping program.")
    exit()


# 3. Upload Image
print("\n[3] Uploading image for reverse search...")

upload_result = upload_image(IMAGE_PATH)

image_id = upload_result["image_id"]

print("✓ Image uploaded!")
print("Image ID received.")


# 4. Google Lens Search
print("\n[4] Searching with Google Lens...")

lens_result = search_google_lens(image_id)

print("✓ Google Lens search completed!")


# 5. Parse Results
print("\n[5] Processing matching results...")

parsed_results = parse_results(lens_result)

if not parsed_results:
    print("\nStopping verification because no valid results were found.")
    exit()

print(f"✓ Found {len(parsed_results)} results.")
print("\nTop matching sources:")
for i, result in enumerate(parsed_results[:5], start=1):
    print(f"\n{i}. {result['title']}")
    print(f"   Source: {result['source']}")
    print(f"   Link: {result['link']}")


# 6. Save Search Results
save_json(
    parsed_results,
    "data/results/search_result.json"
)


# 7. Generate SHA-256 Hash
print("\n[6] Generating SHA-256 hash...")

result_hash = generate_hash(parsed_results)

print("✓ SHA-256 Hash:")
print(result_hash)


# 8. Create Verification Record
verification_record = create_verification_record(
    parsed_results,
    result_hash
)

save_json(
    verification_record,
    "data/results/verification_record.json"
)


# 9. Register Hash on Blockchain
print("\n[7] Registering hash on blockchain...")

tx_hash = register_hash(result_hash)

print("✓ Hash registered on Base Sepolia!")
print("Transaction Hash:", tx_hash)


print("\n[8] Verifying hash on blockchain...")

verified = verify_hash(result_hash)

if verified:
    print("✓ VERIFIED — Hash exists on blockchain.")
else:
    print("✗ NOT VERIFIED — Hash was not found.")


# 10. Save Blockchain Proof
verification_record["blockchain"] = {
    "network": "Base Sepolia",
    "contract_address": os.getenv("CONTRACT_ADDRESS"),
    "transaction_hash": tx_hash,
    "verified": verified
}

save_json(
    verification_record,
    "data/results/verification_record.json"
)


print("\n" + "=" * 50)
print("FULL PIPELINE COMPLETE ✓")
print("=" * 50)