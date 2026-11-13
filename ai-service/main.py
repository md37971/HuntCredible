from fastapi import FastAPI
from fastapi import UploadFile
from fastapi import File
from fastapi import HTTPException
from services.prediction_service import predictImage
from PIL import Image
import io
from exif import Image as exifImage
from services.imageCoordinatesService import ImageCoordinates

app = FastAPI()
#Runs Uvicorn server on Port 8000. Link: http://127.0.0.1:8000/
#Swagger link: http://127.0.0.1:8000/docs

MUST_HAVE_COORDS = False  #Set to True if coordinates are required, False otherwise
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB
ALLOWED_EXTENSIONS = {"image/jpg", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
ALLOWED_FORMATS = {"JPG","JPEG","PNG","WEBP","HEIC","HEIF"}

@app.get("/") #Root endpoint
def read_root():
    return {"HuntCredible": "AI API Root"}

@app.get("/health") #Health check endpoint
def health_check():
    return {"status": "healthy"}

@app.post("/predict") #Predict endpoint
async def predict_endpoint(file: UploadFile = File(...)):   

        #Check if the uploaded file is an image
        if file.content_type not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file must be an image that supports the types: jpg, jpeg, png, webp, heic, heif"
            )

        #Read the file contents and check the size
        contents = await file.read(MAX_FILE_SIZE + 1)

        if not contents:
            raise HTTPException(status_code=400, message="Empty file.")

        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, message="Image exceeds 15 MB limit.")

        #Validate actual image contents and if format is valid.
        try:
            with Image.open(io.BytesIO(contents)) as uploaded_image:

                if uploaded_image.format not in ALLOWED_FORMATS:
                    raise HTTPException(
                        status_code=400,
                        detail="Unsupported image format."
                    )

                uploaded_image.load()
                image = uploaded_image.convert("RGB")

        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            raise HTTPException(
                status_code=400,
                detail="Invalid or corrupted image."
            )   

        try:
            detections = predictImage(image)
            coordinateResult = ImageCoordinates(contents)
            coordinates = coordinateResult.getCoordinates()

            if(MUST_HAVE_COORDS):
                if ((coordinates is None) or (coordinates[0] == 0 and coordinates[1] == 0)):
                    return {
                        "success": False,
                        "detections": None,
                        "coordinates": None,
                        "message": "Image does not contain GPS coordinates. Please ensure the image has GPS metadata."
                    }

            if not detections: #No animals detected.
                return {
                  "success": False,
                  "detections": None,
                  "coordinates": coordinates,
                  "message": "No animals detected in the image or animals were unclear in the image."
                }

            if(len(detections) > 1): #More than one animal is detected.
               return {
                 "success": False,
                 "detections": None,
                 "coordinates": coordinates,
                 "message": "Multiple animals detected. Only one animal is allowed per image."
               }

            if(len(detections) == 1): #One animal detected.
              return {
                "success": True,
                "detections": detections,
                "coordinates": coordinates,
                "message": "An animal has been detected in the image."
              }

        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"An error occurred during prediction: {str(e)}"
            )