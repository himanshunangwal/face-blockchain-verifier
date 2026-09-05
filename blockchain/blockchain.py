import os
import json
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv("BASE_SEPOLIA_RPC_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")

w3 = Web3(Web3.HTTPProvider(RPC_URL))

print("Connected:", w3.is_connected())
print("Chain ID:", w3.eth.chain_id)

with open("abi/VerificationRegistry.json", "r") as file:
    ABI = json.load(file)

contract = w3.eth.contract(
    address=Web3.to_checksum_address(CONTRACT_ADDRESS),
    abi=ABI
)

print("Contract:", CONTRACT_ADDRESS)

PRIVATE_KEY = os.getenv("PRIVATE_KEY")

account = w3.eth.account.from_key(PRIVATE_KEY)

print("Wallet:", account.address)
print(
    "Balance:",
    w3.from_wei(
        w3.eth.get_balance(account.address),
        "ether"
    ),
    "ETH"
)


def register_hash(result_hash):

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
        private_key=PRIVATE_KEY
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

    hash_bytes = bytes.fromhex(result_hash)

    for attempt in range(5):

        stored = contract.functions.verifiedHashes(
            hash_bytes
        ).call()

        print(f"Verification attempt {attempt + 1}: {stored}")

        if stored:
            return True

        import time
        time.sleep(2)

    return False