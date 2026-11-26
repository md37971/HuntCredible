import sys
from pathlib import Path
from io import BytesIO

"""
ON AI-SERVICE RUN THE FOLLOWING COMMAND TO TEST on 'ai-service' DIRECTORY.

python -m pytest tests/test_footprint.py -v
"""

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from main import app, MAX_FILE_SIZE
from PIL import Image
import main

client = TestClient(app)


#IMAGE CREATION METHOD
def create_test_image():
    image = Image.new("RGB", (800, 800), color="green")
    image_bytes = BytesIO()
    image.save(image_bytes, format="JPEG")
    return image_bytes.getvalue()


#Rejecting an invalid file type.
def test_predict_invalid_file_type():
    response = client.post("/predictFootprint",files={"file": ("document.txt", b"Hello World", "text/plain")})
    assert response.status_code == 400
    assert response.json()["detail"] == ("Uploaded file must be an image in these formats: JPG, JPEG, PNG, WEBP, HEIC, or HEIF.")


#Rejecting an empty file.
def test_predict_empty_file():
    response = client.post("/predictFootprint",files={"file": ("empty.jpg", b"", "image/jpeg")})
    assert response.status_code == 400
    assert response.json()["detail"] == "Empty file."


# Rejecting a file exceeding the size limit.
def test_predict_file_too_large():
    oversized_file = b"x" * (MAX_FILE_SIZE + 1)
    response = client.post("/predictFootprint",files={"file": ("large.jpg", oversized_file, "image/jpeg")})
    assert response.status_code == 413
    assert response.json()["detail"] == "Image exceeds 15 MB limit."


# Rejecting a corrupted image.
def test_predict_corrupted_image():
    response = client.post("/predictFootprint",files={"file": ("corrupted.jpg",b"This is not a real image.","image/jpeg")})
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or corrupted image."


# Prediction when no footprints are detected.
def test_predict_no_footprints(monkeypatch):
    monkeypatch.setattr(main, "scanFootprints", lambda image: [])
    response = client.post("/predictFootprint",files={"file": ("no_footprints.jpg",create_test_image(),"image/jpeg")})
    assert response.status_code == 200
    assert response.json()["success"] is False
    assert response.json()["detections"] is None
    assert response.json()["message"] == ("No footprints have been detected in this image.")


#Prediction when multiple footprint types are detected.
def test_predict_multiple_footprint_types(monkeypatch):
    monkeypatch.setattr(main, "scanFootprints", lambda image: "STOP")
    response = client.post("/predictFootprint",files={"file": ("multiple_footprints.jpg",create_test_image(),"image/jpeg")})
    assert response.status_code == 200
    assert response.json()["success"] is False
    assert response.json()["detections"] is None
    assert response.json()["message"] == ("Multiple types of footprints detected. Only one type of footprint is allowed per image.")

#Successful footprint detection.
def test_predict_success(monkeypatch):
    fake_detections = [{"animal": "deer", "confidence": 0.95}]
    monkeypatch.setattr(main, "scanFootprints", lambda image: fake_detections)
    response = client.post("/predictFootprint",files={"file": ("deer_footprints.jpg",create_test_image(),"image/jpeg")})
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["detection"] == fake_detections
    assert response.json()["message"] == ("Footprints have been detected in this image.")


# Handling an unexpected prediction error.
def test_predict_prediction_error(monkeypatch):
    def raise_error(image):
        raise RuntimeError("Model prediction failed")
    monkeypatch.setattr(main, "scanFootprints", raise_error)
    response = client.post("/predictFootprint",files={"file": ("error_test.jpg",create_test_image(),"image/jpeg")})
    assert response.status_code == 400
    assert response.json()["detail"] == ("An error occurred during prediction: Model prediction failed")
