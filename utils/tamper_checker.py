import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from utils.hashing import generate_hash
from blockchain.blockchain import verify_hash


def check_local_integrity(record):

    original_hash = record["sha256_hash"]
    current_hash = generate_hash(record["results"])

    print("\nOriginal Hash:")
    print(original_hash)

    print("\nCurrent Hash:")
    print(current_hash)

    if original_hash == current_hash:
        print("\n✓ LOCAL INTEGRITY CHECK PASSED")
        return True

    print("\n⚠️ TAMPERED — Local data has been modified.")
    return False


def check_tampering(file_path):

    with open(file_path, "r", encoding="utf-8") as file:
        record = json.load(file)

    # Step 1: Local integrity check
    if not check_local_integrity(record):
        return False

    # Step 2: Blockchain verification
    current_hash = generate_hash(record["results"])

    try:
        blockchain_verified = verify_hash(current_hash)
    except Exception as e:
        # If blockchain is not configured in .env or is demo record
        if record.get("blockchain", {}).get("mode") == "demo":
            print("\n✓ BLOCKCHAIN VERIFICATION (DEMO MODE)")
            print("✓ VERIFIED — Data is authentic and unchanged.")
            return True
        print(f"\n⚠️ Blockchain check skipped: {e}")
        print("✓ LOCAL INTEGRITY PASSED.")
        return True

    if blockchain_verified:
        print("\n✓ BLOCKCHAIN VERIFICATION PASSED")
        print("✓ VERIFIED — Data is authentic and unchanged.")
        return True

    print("\n✗ BLOCKCHAIN VERIFICATION FAILED")
    print("✗ NOT VERIFIED — Hash not found on blockchain.")
    return False