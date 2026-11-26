from ultralytics import YOLO
import os
from fastapi import HTTPException

def viewResultsPhoto(results, image_path):
    detections = []
    animalList = {}
    animalNames = []
    totalSum = 0
    for result in results:
        for box in result.boxes:

            #Gets Class ID Number, where this stores the animal's ID number to return its name.
            class_id = int(box.cls[0])
            name = result.names[class_id]

            #If the animal is not in the dictionary, store it.
            if(name not in animalList):
                animalList[name] = 1
                animalNames.append(name)
            else:
                animalList[name] += 1

            #If more than one animal is detected, return "STOP" and invalidate the request.
            if(len(animalList) > 1):
                return "STOP"


            #Get Confidence level
            totalSum += float(box.conf[0]) * 100
           

    if(len(animalList) == 1 and len(animalNames) == 1):
        averageConfidence = totalSum / animalList[animalNames[0]]
        
        detected = {
           "name": animalNames[0],
           "Average Detected Confidence": f"{round(averageConfidence,2)}%"
        }

        return detected
    return None

def scanFootprints(imageURL):
    confidenceScore = 0.50
    runModel = model.predict(source=imageURL, show=False, conf=confidenceScore, save=False,imgsz=640,iou=0.70)
    detections = viewResultsPhoto(runModel, imageURL)
    return detections


#MAIN CODE
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "footprintModel", "weights", "best.pt")
if not os.path.isfile(MODEL_PATH):
    raise RuntimeError(f"AI model file not found at {MODEL_PATH}")
model = YOLO(MODEL_PATH)