# Face ID + Blockchain Verification

A privacy-conscious verification pipeline that combines **face detection, face embeddings, reverse image search, SHA-256 hashing, and blockchain-based integrity verification**.

The system takes an input image, detects and encodes the face, performs a genuine reverse-image search using Google Lens through SerpApi, records the discovered sources, generates a deterministic SHA-256 fingerprint of those results, and stores that fingerprint on the **Base Sepolia** blockchain.

Later, the recorded evidence can be checked again. If the local data has been modified, its hash changes and the system detects the tampering.

> **Important:** This project verifies the integrity and authenticity of the recorded reverse-search evidence. It does **not** prove the real-world identity of a person.

---

## 🚀 Features

* Face detection using **RetinaFace**
* Face representation using **ArcFace**
* 512-dimensional face embedding generation
* Genuine reverse-image search using **SerpApi Google Lens**
* Automatic image compression for images larger than 500 KB
* Extraction and deduplication of reverse-search results
* SHA-256 data fingerprinting
* Blockchain registration on **Base Sepolia**
* On-chain hash verification
* Local tamper detection
* Automated tamper demonstration
* JSON-based verification records
* Environment-variable based secret management

---

## 🧠 How It Works

```text
                Input Image
                     │
                     ▼
             Face Detection
               RetinaFace
                     │
                     ▼
              Face Encoding
                ArcFace
                     │
                     ▼
          Image Upload to SerpApi
                     │
                     ▼
             Google Lens Search
                     │
                     ▼
          Matching Sources/Results
                     │
                     ▼
             Deterministic JSON
                     │
                     ▼
               SHA-256 Hash
                     │
                     ▼
          Base Sepolia Blockchain
                     │
                     ▼
             Hash Verification
                     │
              ┌──────┴──────┐
              ▼             ▼
           VERIFIED       TAMPERED
```

---

## 🛠️ Technology Stack

| Component              | Technology            |
| ---------------------- | --------------------- |
| Programming Language   | Python                |
| Face Detection         | DeepFace + RetinaFace |
| Face Encoding          | DeepFace + ArcFace    |
| Reverse Image Search   | SerpApi Google Lens   |
| Image Processing       | Pillow                |
| Computer Vision        | OpenCV                |
| Hashing                | SHA-256               |
| Blockchain             | Base Sepolia          |
| Smart Contract         | Solidity              |
| Blockchain Interaction | Web3.py               |
| Wallet                 | MetaMask              |
| Data Format            | JSON                  |
| Version Control        | Git + GitHub          |

---

## 📁 Project Structure

```text
face-blockchain-verifier/
│
├── abi/
│   └── VerificationRegistry.json
│
├── blockchain/
│   └── blockchain.py
│
├── contracts/
│   └── VerificationRegistry.sol
│
├── data/
│   ├── input/
│   │   ├── public_test.jpg
│   │   ├── test.JPG
│   │   └── test_search.jpg
│   │
│   └── results/
│
├── face/
│   ├── detector.py
│   └── encoder.py
│
├── search/
│   ├── google_lens.py
│   ├── image_upload.py
│   └── result_parser.py
│
├── utils/
│   ├── hashing.py
│   ├── json_utils.py
│   ├── logger.py
│   └── tamper_checker.py
│
├── .env.example
├── .gitignore
├── main.py
└── requirements.txt
```

---

## ⚙️ Setup

### 1. Clone the repository

```bash
git clone https://github.com/himanshunangwal/face-blockchain-verifier.git
cd face-blockchain-verifier
```

### 2. Create a virtual environment

```bash
python3 -m venv venv
```

Activate it:

**macOS/Linux**

```bash
source venv/bin/activate
```

**Windows**

```bash
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file:

```env
SERPAPI_API_KEY=your_serpapi_api_key
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
CONTRACT_ADDRESS=your_contract_address
PRIVATE_KEY=your_wallet_private_key
```

Never commit `.env` to GitHub.

---

## ▶️ Running the Project

Place the test image inside:

```text
data/input/
```

Update the image path in `main.py` if necessary.

Then run:

```bash
python main.py
```

The pipeline performs:

1. Face detection
2. Face encoding
3. Image upload
4. Google Lens reverse search
5. Result processing
6. SHA-256 generation
7. Blockchain registration
8. Blockchain verification

---

## 🔍 Reverse Image Search

The project uses SerpApi to upload the input image and obtain an `image_id`.

Google Lens is then queried using that image ID.

The returned results are parsed and converted into a simplified structure:

```json
{
    "title": "Example Result",
    "source": "Example Website",
    "link": "https://example.com"
}
```

Duplicate links are removed and incomplete results are ignored.

---

## 🔐 SHA-256 Integrity Verification

After processing the reverse-search results, the project generates a SHA-256 hash.

Example:

```text
5c60df17570af8396e1140ef558d921c1f39b679b322f3d0b4872e5b92690847
```

The hash acts as a fingerprint of the recorded search results.

If even a small part of the recorded data changes, the resulting SHA-256 hash changes.

---

## ⛓️ Blockchain Verification

The project uses a Solidity smart contract deployed on **Base Sepolia**.

### Network

```text
Network: Base Sepolia
Chain ID: 84532
```

### Smart Contract

```text
VerificationRegistry
```

The contract stores SHA-256 fingerprints as `bytes32` values.

The relevant operations are:

```solidity
registerHash(bytes32 hash)
```

and

```solidity
verifyHash(bytes32 hash)
```

Only the hash is stored on-chain. The image and reverse-search results remain off-chain.

---

## 🧪 Tamper Detection

The project includes a tamper demonstration.

Run:

```bash
python main.py tamper
```

The system temporarily modifies a stored search result.

The modified data produces a different SHA-256 hash.

The system then reports:

```text
⚠️ TAMPERED — Local data has been modified.
```

The original verification record is then restored.

---

## ✅ Verification

To verify an existing verification record:

```bash
python main.py verify
```

A successful verification produces output similar to:

```text
✓ LOCAL INTEGRITY CHECK PASSED

✓ BLOCKCHAIN VERIFICATION PASSED
✓ VERIFIED — Data is authentic and unchanged.
```

If the local record has been modified:

```text
⚠️ TAMPERED — Local data has been modified.
```

---

## 📊 Example Successful Run

The current implementation has successfully completed the complete pipeline with:

```text
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

Transaction status: 1

✓ Hash registered on Base Sepolia!

✓ VERIFIED — Hash exists on blockchain.

FULL PIPELINE COMPLETE ✓
```

---

## 🔗 Blockchain Transaction

A successful test transaction was recorded on Base Sepolia.

```text
Transaction:
9183a2abeefbd48dff6305b170609e415b27e59c9d0688b617619c870922e227

Block:
46414373
```

---

## ⚠️ Limitations

### 1. Reverse-search results can change

Google Lens results are live search results and may vary between searches. Therefore, running the search again can produce a different result set and consequently a different SHA-256 hash.

### 2. Blockchain stores the fingerprint, not the evidence

The blockchain stores the hash rather than the complete image or search-result dataset.

### 3. Face encoding is not currently used for blockchain verification

The ArcFace embedding is generated as part of the pipeline, but the current blockchain fingerprint is generated from the processed reverse-search results.

### 4. Identity is not proven

A face embedding or reverse-image match should not be interpreted as definitive proof of a person's real-world identity.

The blockchain component provides an immutable integrity record for the data that was registered.

---

## 🔮 Future Improvements

* Store a complete deterministic evidence snapshot
* Add similarity scores for reverse-search results
* Add result timestamps
* Add source validation
* Add a web-based dashboard
* Add QR-code based verification
* Improve evidence provenance
* Add encrypted off-chain evidence storage
* Add a confidence score
* Add support for multiple images
* Add automated blockchain explorer links

---

## 🎯 Hackathon Demonstration

Recommended demo flow:

```text
1. Select an image
        ↓
2. Detect face
        ↓
3. Generate ArcFace embedding
        ↓
4. Perform reverse-image search
        ↓
5. Show genuine matching sources
        ↓
6. Generate SHA-256 fingerprint
        ↓
7. Register fingerprint on Base Sepolia
        ↓
8. Verify fingerprint
        ↓
9. Modify the local record
        ↓
10. Run verification again
        ↓
11. Show TAMPERED result
```

This demonstrates both the **search/provenance pipeline** and the **blockchain integrity mechanism**.

---

## 📜 License

This project is intended for educational, research, and hackathon purposes.
