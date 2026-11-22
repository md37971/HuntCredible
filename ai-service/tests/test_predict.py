import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from main import app
from main import app, MAX_FILE_SIZE
from PIL import Image
from io import BytesIO
import main

client = TestClient(app)

#IMAGE CREATION METHOD
def create_test_image():
	image = Image.new("RGB", (100,100), color="green")
	image_bytes = BytesIO()
	image.save(image_bytes, format="jpeg")
	return image_bytes.getvalue()


#Uploading a valid image.
def test_predict_valid_image():
	with open("tests/testImages/deer.jpg", "rb") as image:
		response = client.post("/predict", files={"file": ("deer.jpg", image, "image/jpeg")})
		assert response.status_code == 200
		data = response.json()
		assert "detections" in data

#Denying invalid file upload.
def test_predict_invalid_file_type():
	response = client.post("/predict", files={"file": ("document.txt", b"Hello World", "text/plain")})
	assert response.status_code == 400
	assert response.json()["detail"] == (
		"Uploaded file must be an image that supports the types: "
        "jpg, jpeg, png, webp, heic, heif"
	)

#Denying empty file test.
def test_predict_empty_file():
	response = client.post("/predict", files={"file": ("empty.jpg", b"", "image/jpeg")})
	assert response.status_code == 400
	assert response.json()["detail"] == "Empty file."

#Denying a large file test.
def test_predict_file_too_large():
	oversized_file = b"x" * (MAX_FILE_SIZE + 1)
	response = client.post("/predict", files={"file": ("large.jpg", oversized_file, "image/jpeg")})
	assert response.status_code == 413
	assert response.json()["detail"] == "Image exceeds 15 MB limit."

#Denying a corrupted or invalid image test.
def test_predict_corrupted_image():
	response = client.post("/predict", files={"file": ("corrupted.jpg", b"This is not a real image.", "image/jpeg")})
	assert response.status_code == 400
	assert response.json()["detail"] == "Invalid or corrupted image."


#Making a prediction with no GPS meta data test.
def test_predict_missing_gps(monkeypatch):
    class FakeCoordinates:
        def __init__(self, contents):
            pass

        def getCoordinates(self):
            return None

	#Monkey Patch temps replacing part of code with a different version.
    monkeypatch.setattr(main, "ImageCoordinates", FakeCoordinates)
    monkeypatch.setattr(main, "predictImage", lambda image: [])
    response = client.post("/predict", files={"file": ("no_gps.jpg", create_test_image(), "image/jpeg")})
    assert response.status_code == 200
    assert response.json()["success"] is False
    assert response.json()["coordinates"] is None
    assert "No animals detected" in response.json()["message"]

#Prediction on an animal test.
def test_predict_one_animal(monkeypatch):
    class FakeCoordinates:
        def __init__(self, contents):
            pass

        def getCoordinates(self):
            return (35.3859, -94.3985)

    fake_detections = [{"animal": "deer", "confidence": 0.95}]
    monkeypatch.setattr(main, "ImageCoordinates", FakeCoordinates)
    monkeypatch.setattr(main, "predictImage", lambda image: fake_detections)
    response = client.post("/predict",files={"file": ("deer.jpg",create_test_image(),"image/jpeg")})
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["detections"] == fake_detections
    assert response.json()["coordinates"] == [35.3859, -94.3985]


#Pprediction on multiple animals test.
def test_predict_multiple_animals(monkeypatch):
    class FakeCoordinates:
        def __init__(self, contents):
            pass

        def getCoordinates(self):
            return (35.3859, -94.3985)

    fake_detections = [
        {"animal": "deer", "confidence": 0.95},
        {"animal": "bear", "confidence": 0.89}
    ]

    monkeypatch.setattr(main, "ImageCoordinates", FakeCoordinates)
    monkeypatch.setattr(main, "predictImage", lambda image: fake_detections)
    response = client.post("/predict", files={"file": ("multiple_animals.jpg", create_test_image(), "image/jpeg")})
    assert response.status_code == 200
    assert response.json()["success"] is False
    assert response.json()["detections"] is None
    assert response.json()["coordinates"] == [35.3859, -94.3985]
    assert "Multiple animals detected" in response.json()["message"]


#Prediction on an animal test.
def test_predict_success(monkeypatch):
    class FakeCoordinates:
        def __init__(self, contents):
            pass

        def getCoordinates(self):
            return (35.3859, -94.3985)

    fake_detections = [
        {"animal": "deer", "confidence": 0.95}
    ]

    monkeypatch.setattr(main, "ImageCoordinates", FakeCoordinates)
    monkeypatch.setattr(main, "predictImage", lambda image: fake_detections)
    response = client.post("/predict",files={"file": ("deer.jpg",create_test_image(),"image/jpeg")})
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["detections"] == fake_detections
    assert response.json()["coordinates"] == [35.3859, -94.3985]
    assert response.json()["message"] == "An animal has been detected in the image."