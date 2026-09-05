from deepface import DeepFace


def detect_face(image_path):
    try:
        result = DeepFace.extract_faces(
            img_path=image_path,
            detector_backend="retinaface",
            enforce_detection=True
        )

        print("✓ Face detected!")
        print(f"Number of faces: {len(result)}")

        return result

    except Exception as e:
        print("✗ No face detected.")
        print("Error:", e)
        return None