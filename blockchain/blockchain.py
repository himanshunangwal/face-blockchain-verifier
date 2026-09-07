import os
import json
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ABI_PATH = os.path.join(BASE_DIR, "abi", "VerificationRegistry.json")

def load_abi():
    with open(ABI_PATH, "r", encoding="utf-8") as file:
        return json.load(file)

def get_web3():
    rpc_url = os.getenv("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org")
    return Web3(Web3.HTTPProvider(rpc_url))

def get_contract(w3=None):
    if w3 is None:
        w3 = get_web3()
    contract_address = os.getenv("CONTRACT_ADDRESS")
    if not contract_address or contract_address.startswith("your_") or contract_address.startswith("0xYour"):
        raise ValueError("Valid CONTRACT_ADDRESS is missing in .env")
    abi = load_abi()
    return w3.eth.contract(
        address=Web3.to_checksum_address(contract_address),
        abi=abi
    )

def get_account(w3=None):
    if w3 is None:
        w3 = get_web3()
    private_key = os.getenv("PRIVATE_KEY")
    if not private_key or private_key.startswith("your_"):
        raise ValueError("Valid PRIVATE_KEY is missing in .env")
    return w3.eth.account.from_key(private_key)

def get_blockchain_status():
    """Returns the connection and config status for diagnostics and frontend."""
    rpc_url = os.getenv("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org")
    contract_address = os.getenv("CONTRACT_ADDRESS")
    private_key = os.getenv("PRIVATE_KEY")

    has_rpc = bool(rpc_url)
    has_contract = bool(contract_address and not contract_address.startswith("your_") and not contract_address.startswith("0xYour"))
    has_key = bool(private_key and not private_key.startswith("your_"))

    status = {
        "rpc_url": rpc_url,
        "contract_address": contract_address if has_contract else None,
        "wallet_address": None,
        "balance_eth": None,
        "connected": False,
        "configured": has_contract and has_key,
        "error": None
    }

    try:
        w3 = get_web3()
        status["connected"] = bool(w3.is_connected())
        if has_key:
            account = get_account(w3)
            status["wallet_address"] = account.address
            balance_wei = w3.eth.get_balance(account.address)
            status["balance_eth"] = float(w3.from_wei(balance_wei, "ether"))
    except Exception as e:
        status["error"] = str(e)

    return status

def register_hash(result_hash):
    w3 = get_web3()
    contract = get_contract(w3)
    account = get_account(w3)
    private_key = os.getenv("PRIVATE_KEY")

    hash_bytes = bytes.fromhex(result_hash)

    nonce = w3.eth.get_transaction_count(
        account.address
    )

    transaction = contract.functions.registerHash(
        hash_bytes
    ).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "chainId": 84532,
        "gas": 200000,
        "gasPrice": w3.eth.gas_price
    })

    signed_transaction = w3.eth.account.sign_transaction(
        transaction,
        private_key=private_key
    )

    tx_hash = w3.eth.send_raw_transaction(
        signed_transaction.raw_transaction
    )

    print("Transaction sent!")
    print("Transaction hash:", tx_hash.hex())

    receipt = w3.eth.wait_for_transaction_receipt(
        tx_hash
    )

    print("Transaction confirmed!")
    print("Block number:", receipt.blockNumber)
    print("Transaction status:", receipt.status)

    return tx_hash.hex()

def verify_hash(result_hash):
    w3 = get_web3()
    contract = get_contract(w3)

    hash_bytes = bytes.fromhex(result_hash)

    for attempt in range(5):
        try:
            stored = contract.functions.verifiedHashes(
                hash_bytes
            ).call()

            print(f"Verification attempt {attempt + 1}: {stored}")

            if stored:
                return True
        except Exception as e:
            print(f"Verification attempt {attempt + 1} failed: {e}")

        import time
        time.sleep(2)

    return False