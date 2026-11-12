from ultralytics import YOLO
import os
from fastapi import HTTPException

def viewResultsPhoto(results):
    detections = []

    for result in results:
        for box in result.boxes:
            print(box)

            #Gets Class ID Number, where this stores the animal's ID number to return its name.
            class_id = int(box.cls[0])
            name = result.names[class_id]

            #Get Confidence level
            confidence = float(box.conf[0])

            # Get bounding box coordinates - Perhaps pixel cordinates?
            coordinates = box.xyxy[0].tolist()

            detected = {
              "name": name,
              "confidence": f"{round(confidence, 4) * 100}%"
            }

            #return detected
            detections.append(detected)

    return detections

def predictImage(imageURL):
    confidenceScore = 0.65
    runModel = model.predict(source=imageURL, show=False, conf=confidenceScore, save=False)
    detections = viewResultsPhoto(runModel)
   
    return detections

#MAIN CODE

try:
    MODEL_PATH = "../models/trainedModel/weights/best.pt"
    if(os.path.isfile(MODEL_PATH)):
        raise FileNotFoundError()
    model = YOLO(MODEL_PATH)
except FileNotFoundError:
    raise HTTPException(
        status_code=503,
        detail="AI Model file not found. Please ensure the model is correctly loaded."
    )