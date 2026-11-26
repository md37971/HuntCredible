import sys
from pathlib import Path
from io import BytesIO

"""
ON AI-SERVICE RUN THE FOLLOWING COMMAND TO TEST on 'ai-service' DIRECTORY.

python -m pytest tests/test_predict.py -v
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


#Uploading a valid image.
def test_predict_valid_image():
    with open("tests/testImages/deer.jpg", "rb") as image:
        response = client.post("/predict",files={"file": ("deer.jpg", image, "image/jpeg")})
    assert response.status_code == 200
    data = response.json()
    assert "detections" in data


#Denying invalid file upload.
def test_predict_invalid_file_type():
    response = client.post("/predict",files={"file": ("document.txt", b"Hello World", "text/plain")})
    assert response.status_code == 400
    assert response.json()["detail"] == ("Uploaded file must be an image in these formats: JPG, JPEG, PNG, WEBP, HEIC, or HEIF.")

#Denying empty file upload.
def test_predict_empty_file():
    response = client.post("/predict",files={"file": ("empty.jpg", b"", "image/jpeg")})
    assert response.status_code == 400
    assert response.json()["detail"] == "Empty file."


#Denying a large file upload.
def test_predict_file_too_large():
    oversized_file = b"x" * (MAX_FILE_SIZE + 1)
    response = client.post("/predict",files={"file": ("large.jpg", oversized_file, "image/jpeg")})
    assert response.status_code == 413
    assert response.json()["detail"] == "Image exceeds 15 MB limit."

#Denying a corrupted or invalid image.
def test_predict_corrupted_image():
    response = client.post("/predict",files={"file": ("corrupted.jpg",b"This is not a real image.","image/jpeg")})
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or corrupted image."


#Prediction when no animals are detected.
def test_predict_no_animals(monkeypatch):
    monkeypatch.setattr(main, "predictImage", lambda image: [])
    response = client.post("/predict",files={"file": ("no_animals.jpg",create_test_image(),"image/jpeg")})
    assert response.status_code == 200
    assert response.json()["success"] is False
    assert response.json()["detections"] is None
    assert "No animals detected" in response.json()["message"]


#Prediction when exactly one animal is detected.
def test_predict_one_animal(monkeypatch):
    fake_detections = [{"animal": "deer", "confidence": 0.95}]
    monkeypatch.setattr(main, "predictImage", lambda image: fake_detections)
    response = client.post("/predict",files={"file": ("deer.jpg",create_test_image(),"image/jpeg")})

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["detections"] == fake_detections
    assert response.json()["message"] == ("An animal has been detected in the image.")


#Prediction when multiple animals are detected.
def test_predict_multiple_animals(monkeypatch):
    fake_detections = [{"animal": "deer", "confidence": 0.95},{"animal": "bear", "confidence": 0.89}]
    monkeypatch.setattr(main, "predictImage", lambda image: fake_detections)
    response = client.post("/predict",files={"file": ("multiple_animals.jpg",create_test_image(),"image/jpeg")})
    assert response.status_code == 200
    assert response.json()["success"] is False
    assert response.json()["detections"] is None
    assert "Multiple animals detected" in response.json()["message"]


#Successful prediction with exactly one animal.
def test_predict_success(monkeypatch):
    fake_detections = [{"animal": "deer", "confidence": 0.95}]
    monkeypatch.setattr(main, "predictImage", lambda image: fake_detections)
    response = client.post("/predict",files={"file": ("deer.jpg",create_test_image(),"image/jpeg")})
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["detections"] == fake_detections
    assert response.json()["message"] == ("An animal has been detected in the image.")