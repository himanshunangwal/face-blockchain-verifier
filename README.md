# Face ID + Blockchain Verification

A hackathon project that answers one narrow question honestly:

> **"Can we prove that a specific reverse-image-search result was recorded at a point in time, and detect if that record is ever altered afterward?"**

It does this by running a face through detection + encoding, sending it out for a genuine reverse-image search, fingerprinting what comes back with SHA-256, and anchoring that fingerprint on the **Base Sepolia** blockchain so the record can never be silently rewritten.

> ⚠️ **What this is *not*:** identity verification. A face match or a reverse-search hit is not proof of who someone is. This project only guarantees that **the evidence we recorded hasn't been tampered with** — nothing about the real-world person behind the photo.

This is a local, script-run pipeline built for a hackathon demo — there is no hosted web app or public link. Everything below runs on your own machine with your own API keys and wallet.

---

## The Big Picture

```
   ┌─────────────┐
   │ Input Image │
   └──────┬──────┘
          │
          ▼
 ┌────────────────────┐      "Is there a face here, and where?"
 │  1. FACE DETECTION  │──►   RetinaFace finds bounding box(es)
 └──────────┬──────────┘
          │
          ▼
 ┌────────────────────┐      "Turn the face into 512 numbers"
 │  2. FACE ENCODING   │──►   ArcFace embedding (generated, logged,
 └──────────┬──────────┘      but NOT part of the on-chain hash — see Limitations)
          │
          ▼
 ┌────────────────────┐      "Shrink it if it's chunky"
 │ 3. COMPRESS (if >   │──►   Re-saved as JPEG at falling quality
 │    500 KB)          │      until it's under the SerpApi limit
 └──────────┬──────────┘
          │
          ▼
 ┌────────────────────┐      "Hand the image to Google"
 │ 4. UPLOAD TO SERPAPI│──►   POST the file → get back an `image_id`
 └──────────┬──────────┘
          │
          ▼
 ┌────────────────────┐      "Where else does this image appear?"
 │ 5. GOOGLE LENS      │──►   Query by image_id → raw `visual_matches`
 │    REVERSE SEARCH   │      (titles, sources, links)
 └──────────┬──────────┘
          │
          ▼
 ┌────────────────────┐      "Clean it up"
 │ 6. PARSE + DEDUPE   │──►   Drop incomplete entries, drop duplicate
 └──────────┬──────────┘      links → simplified {title, source, link} list
          │
          ▼
 ┌────────────────────┐      "Freeze it into a fingerprint"
 │ 7. SHA-256 HASHING  │──►   Deterministic JSON → one hash
 └──────────┬──────────┘
          │
          ▼
 ┌────────────────────┐      "Write it somewhere nobody can quietly edit"
 │ 8. BLOCKCHAIN       │──►   registerHash(bytes32) on Base Sepolia
 │    REGISTRATION     │
 └──────────┬──────────┘
          │
          ▼
 ┌────────────────────┐
 │ 9. VERIFICATION     │──►   Re-hash local record, compare to what's
 │    (anytime later)  │      on-chain →  VERIFIED  or  TAMPERED
 └─────────────────────┘
```

---

## What Actually Happens to Your Image, Step by Step

### 1. Face Detection — `face/detector.py`

The raw image file (e.g. `data/input/public_test.jpg`) is handed to **DeepFace**, which uses the **RetinaFace** backend to locate faces.

```python
DeepFace.extract_faces(img_path=image_path, detector_backend="retinaface", enforce_detection=True)
```

- If no face is found, the pipeline **stops immediately** — nothing else runs.
- If a face is found, we log how many faces were detected and continue. The image itself is untouched at this point; detection only tells us *whether and where* a face exists.

### 2. Face Encoding — `face/encoder.py`

The same image is passed to DeepFace again, this time with the **ArcFace** model, which converts the detected face into a **512-dimensional numeric vector** (an embedding — a mathematical "fingerprint" of facial geometry, not a picture).

```python
DeepFace.represent(img_path=image_path, model_name="ArcFace", detector_backend="retinaface")
```

This embedding is generated and its size is logged (`512`), but — important honesty point — **it is not currently mixed into the SHA-256 hash that goes on-chain**. Right now it exists to prove the face-recognition half of the pipeline works and to set up future work (e.g. matching faces across records). See [Limitations](#limitations).

### 3. Compression (only if needed) — `search/image_upload.py`

Before anything leaves your machine, the file size is checked. If it's **over 500 KB**, it's re-opened with Pillow, converted to RGB, and re-saved as JPEG starting at quality 85, stepping down in increments of 5 until it fits under the limit. The image content isn't cropped or altered structurally — only compression quality changes.

### 4. Upload to SerpApi — `search/image_upload.py`

The (possibly compressed) image file is POSTed as multipart form data to `https://serpapi.com/image` along with your `SERPAPI_API_KEY`. SerpApi hosts the image temporarily and returns an `image_id` — a reference token, not the image itself.

### 5. Google Lens Reverse Search — `search/google_lens.py`

That `image_id` is used to query `https://serpapi.com/search.json` with `engine=google_lens`. This is the same reverse-image search Google Lens does when you upload a photo — it asks *"where else on the web does this image (or something close to it) appear?"* and returns a JSON block of `visual_matches`, each with a title, source site, and link.

### 6. Parsing + Deduplication — `search/result_parser.py`

The raw `visual_matches` array is cleaned:
- Entries missing a `title` or `link` are dropped.
- Duplicate links are removed (only the first occurrence is kept).
- What's left is reshaped into a simple, deterministic structure:

```json
{ "title": "Example Result", "source": "Example Website", "link": "https://example.com" }
```

This parsed list is what gets fingerprinted — **not** the raw Google Lens response, and **not** the image itself.

### 7. SHA-256 Fingerprinting — `utils/hashing.py`

The parsed results list is serialized to JSON with sorted keys and no extra whitespace (`json.dumps(data, sort_keys=True, separators=(",", ":"))`), so the exact same data always produces the exact same bytes. Those bytes are hashed with SHA-256:

```
5c60df17570af8396e1140ef558d921c1f39b679b322f3d0b4872e5b92690847
```

Change even one character in one result (a title, a link) and this hash changes completely — that's the property the tamper detection relies on.

The results + hash are saved locally as a **verification record** (`data/results/verification_record.json`) via `utils/json_utils.py`.

### 8. Blockchain Registration — `blockchain/blockchain.py` + `contracts/VerificationRegistry.sol`

The hash is converted to raw bytes and sent to a small Solidity contract deployed on **Base Sepolia** (a public Ethereum testnet, chain ID `84532`):

```solidity
mapping(bytes32 => bool) public verifiedHashes;

function registerHash(bytes32 hash) public {
    verifiedHashes[hash] = true;
    emit HashRegistered(hash, block.timestamp);
}
```

This is signed and sent as a real transaction from your wallet (via `PRIVATE_KEY` in `.env`) using Web3.py. Only the **hash** goes on-chain — the image, the embedding, and the search results all stay off-chain, on your machine. The blockchain's only job is to make "this hash existed at this time" tamper-evident and publicly checkable.

### 9. Verification — `utils/tamper_checker.py`

Run any time later with `python main.py verify`:

1. **Local integrity check** — re-hash the results currently sitting in `verification_record.json` and compare to the `sha256_hash` stored in that same file. If they don't match, the local file itself was edited.
2. **Blockchain check** — take the (re-computed) hash and call `verifyHash()` / read `verifiedHashes` on the deployed contract. If the hash isn't found on-chain, the record either was never registered or doesn't match what was registered.

Both checks have to pass for a `VERIFIED` result.

### Tamper Demo — `python main.py tamper`

For demo purposes, this command:
1. Backs up the current verification record.
2. Deliberately overwrites the first result's `title` with `"TAMPERED DATA"`.
3. Re-runs the same verification logic — the local hash no longer matches, so it correctly reports `⚠️ TAMPERED`.
4. Restores the original record from the backup, so nothing is permanently changed.

This is the core "proof" moment of the demo: show a clean `VERIFIED`, corrupt the data, show `TAMPERED`, restore it.

---

## Technology Stack

| Layer                   | Technology              |
|--------------------------|--------------------------|
| Language                | Python                  |
| Face Detection           | DeepFace + RetinaFace    |
| Face Encoding            | DeepFace + ArcFace       |
| Image Processing         | Pillow, OpenCV           |
| Reverse Image Search     | SerpApi (Google Lens engine) |
| Hashing                 | SHA-256 (hashlib)        |
| Blockchain               | Base Sepolia (testnet)   |
| Smart Contract           | Solidity ^0.8.20         |
| Chain Interaction        | Web3.py                  |
| Wallet                  | MetaMask (or any EVM key)|
| Data Format              | JSON                    |

---

## Project Structure

```
face-blockchain-verifier/
│
├── abi/
│   └── VerificationRegistry.json      # Compiled contract ABI
│
├── blockchain/
│   └── blockchain.py                  # register_hash(), verify_hash()
│
├── contracts/
│   └── VerificationRegistry.sol       # On-chain hash registry
│
├── data/
│   ├── input/                         # Put test images here
│   └── results/                       # search_result.json, verification_record.json
│
├── face/
│   ├── detector.py                    # RetinaFace detection
│   └── encoder.py                     # ArcFace embedding
│
├── search/
│   ├── image_upload.py                # Compress + upload to SerpApi
│   ├── google_lens.py                 # Query Google Lens engine
│   └── result_parser.py               # Clean + dedupe visual_matches
│
├── utils/
│   ├── hashing.py                     # Deterministic SHA-256
│   ├── json_utils.py                  # Save results / build record
│   └── tamper_checker.py              # Local + on-chain verification
│
├── main.py                            # Orchestrates the full pipeline
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## Setup

### 1. Clone and enter the repo

```bash
git clone https://github.com/himanshunangwal/face-blockchain-verifier.git
cd face-blockchain-verifier
```

### 2. Create and activate a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate      # macOS/Linux
venv\Scripts\activate         # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
SERPAPI_API_KEY=your_serpapi_api_key
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
CONTRACT_ADDRESS=your_deployed_contract_address
PRIVATE_KEY=your_wallet_private_key
```

You'll need:
- A **SerpApi** key (for the Google Lens engine)
- A wallet **private key** with a small amount of Base Sepolia testnet ETH (from a faucet — testnet funds only, never use a real/mainnet key here)
- Your own deployment of `VerificationRegistry.sol` on Base Sepolia, with its address in `CONTRACT_ADDRESS`

Never commit `.env`.

---

## Running It

Drop a test image into `data/input/` and point `IMAGE_PATH` in `main.py` at it, then:

```bash
python main.py              # full pipeline: detect → encode → search → hash → register → verify
python main.py verify       # re-check an existing verification_record.json against the chain
python main.py tamper       # corrupt the record, show TAMPERED, then restore it
```

### Sample Output (illustrative)

```
Face detected!
Number of faces: 1

Face encoded successfully!
Embedding size: 512

Image uploaded!
Image ID received.

Google Lens search completed!
Found 60 results.

SHA-256 Hash:
5c60df17570af8396e1140ef558d921c1f39b679b322f3d0b4872e5b92690847

✓ Hash registered on Base Sepolia!
✓ VERIFIED — Hash exists on blockchain.

FULL PIPELINE COMPLETE ✓
```

Because this runs against a live testnet contract and a live search API, your own run will produce a different hash and a different transaction each time.

---

## Limitations

**1. Reverse-search results aren't stable.** Google Lens returns live results — running the same image again can surface a different set of matches, which produces a different hash. The hash verifies *the specific record we saved*, not "the truth about this image" in general.

**2. Only the fingerprint is on-chain.** The image, the embedding, and the full result list all live off-chain, on disk. If someone deletes `verification_record.json`, the on-chain hash alone can't reconstruct what it was — it can only confirm whether a *given* piece of data matches it.

**3. The face embedding is currently cosmetic.** ArcFace generates a 512-d vector and logs its size, but it isn't folded into the SHA-256 hash yet. Today the on-chain fingerprint covers the search results only.

**4. This does not prove identity.** A face match or a reverse-image hit tells you an image looks similar to other images online — it is not legal or forensic proof of who a person is.

---

## Future Improvements

- Fold the face embedding into the on-chain evidence, not just the search results
- Store a full deterministic evidence snapshot (not just title/source/link)
- Add similarity/confidence scores per result
- Add timestamps and source-credibility checks
- Encrypted off-chain evidence storage
- Support batches of multiple images per run
- A minimal dashboard to browse verification records instead of raw JSON

---

## Hackathon Demo Flow

1. Pick a test image
2. Run `python main.py` — walk through detection → encoding → reverse search → hashing → on-chain registration → verification, narrating each step
3. Show the resulting `VERIFIED` output
4. Run `python main.py tamper` — show the record getting corrupted and instantly flagged as `TAMPERED`
5. Point out that the record self-restores afterward, and explain *why* this matters: once a hash is on-chain, nobody — including us — can quietly change the recorded evidence without it being detectable

---

## License

Built for educational, research, and hackathon purposes.