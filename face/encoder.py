from deepface import DeepFace


def encode_face(image_path):
    try:
        result = DeepFace.represent(
            img_path=image_path,
            model_name="ArcFace",
            detector_backend="retinaface",
            enforce_detection=True
        )

        embedding = result[0]["embedding"]

        print("✓ Face encoded successfully!")
        print(f"Embedding size: {len(embedding)}")

        return embedding

    except Exception as e:
        print("✗ Face encoding failed.")
        print("Error:", e)

        return None