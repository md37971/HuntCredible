# HuntCredible AI Service

## Overview

The HuntCredible AI service uses Python, FastAPI, and YOLO to recognize animals in uploaded images. The service receives an image, processes it through the trained YOLO model, and returns the detected animal and its confidence score.

## Requirements

- Python 3.10 or newer recommended
- A trained YOLO model (`best.pt`)
- The Python libraries listed in `requirements.txt`

### Recommended `requirements.txt`

```txt
fastapi
uvicorn
ultralytics
python-multipart
pillow
```

**Library purposes:**

| Library | Purpose |
|---|---|
| `fastapi` | Creates the Python REST API. |
| `uvicorn` | Runs the FastAPI server and provides development features. |
| `ultralytics` | Provides the YOLO model and image prediction functionality. |
| `python-multipart` | Allows FastAPI to receive uploaded image files. |
| `pillow` | Opens and processes uploaded images. |

Ultralytics installs its required dependencies, including PyTorch, automatically. They do not need to be listed separately unless the project later requires specific versions.

## Setting Up the Python Environment

Open a terminal in the project directory and navigate to `ai-service`.

### 1. Create a virtual environment

```bash
python -m venv venv
```

This creates a virtual environment named `venv`. It keeps the Python packages for this service separate from other Python projects on your computer.

You only need to create the environment once.

### 2. Activate the virtual environment

From the `ai-service` directory, run the appropriate command for your terminal.

**Windows PowerShell:**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows Command Prompt:**
```cmd
venv\Scripts\activate.bat
```

**Git Bash:**
```bash
source venv/Scripts/activate
```

Once activated, your terminal should display `(venv)` before the current directory.

### 3. Preview package installation (optional)

```bash
python -m pip install -r requirements.txt --dry-run
```

This performs a dry run and shows which packages pip would install. It does not actually install them.

### 4. Install the required libraries

```bash
python -m pip install -r requirements.txt
```

This installs the dependencies listed in `requirements.txt` into the active virtual environment.

## Starting the Python API

Make sure your terminal is inside the `ai-service` directory and the virtual environment is activated.

Run the following command:

```bash
uvicorn main:app --reload
```

This starts the FastAPI server with automatic reloading enabled. Changes to the Python source files will restart the server during development.

By default, the API runs at:

```text
http://127.0.0.1:8000
```

You can access the interactive API documentation at:

```text
http://127.0.0.1:8000/docs
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Returns the AI service root response. |
| GET | `/health` | Checks whether the API is running. |
| POST | `/predict` | Receives an image and runs animal recognition. |

### POST `/predict`

Accepts an uploaded image using the `file` form-data field.

The service processes the image using the trained YOLO model and returns the detected animal information.

## Animal Classes

The current trained model supports the following five animal classes:

```yaml
names:
  0: bear
  1: boar
  2: deer
  3: rabbit
  4: squirrel
```

The model is trained to recognize these five classes. Animals outside these classes are not supported and will generally not be recognized by the model.

## Expected JSON Responses

The following examples describe the intended API response contract. The implementation should return responses that match these examples.

### 1. Successful Detection

When exactly one supported animal is detected, the API returns the animal's name and confidence score.

```json
{
  "success": true,
  "detections": {
    "name": "deer",
    "confidence": 0.9231
  }
}
```

**Confidence scores:** Confidence is represented as a decimal between `0` and `1`. For example, `0.9231` represents a confidence score of 92.31%.

The frontend can convert this value into a percentage for display.

### 2. No Animals Detected

When no supported animals are detected, the API returns:

```json
{
  "success": true,
  "detections": null,
  "message": "No animals detected in the image."
}
```

The image was processed successfully, but the model did not detect a supported animal.

### 3. Multiple Animals Detected

HuntCredible's scanning workflow expects users to submit an image containing one animal.

If the model detects more than one animal, the image should be rejected.

```json
{
  "success": false,
  "detections": [
    {
      "name": "deer",
      "confidence": 0.9231
    },
    {
      "name": "deer",
      "confidence": 0.8872
    }
  ],
  "message": "Multiple animals detected. Please upload an image containing only one animal."
}
```

**Note:** YOLO may occasionally identify one physical animal as multiple detections. This is a known limitation and does not necessarily mean multiple animals are present.

### 4. Unsupported Animals

If an image contains an animal outside the model's five supported classes, the model may simply fail to recognize it.

The API should handle this like an image with no supported animals detected.

### 5. Invalid Images

The API should reject images that cannot be processed. The only valid image formats for image submission are JPG, JPEG, PNG, WEBP, HEIC, and HEIF. Other image formats outside of these are not supported. The API should return an error response for invalid images.

Other invalid image examples include:
- Files that are not images.
- Corrupted or unreadable image files.
- Images exceeding the configured maximum file size.

Example response:

```json
{
  "detail": "Uploaded file must be a valid image."
}
```

Expected HTTP status codes:

| Status | Meaning |
|---|---|
| 400 | Invalid, corrupted, or unsupported image. |
| 413 | Uploaded image exceeds the maximum file size. |

### 6. Model Unavailable

If the trained YOLO model cannot be loaded because `best.pt` is missing, corrupted, or otherwise unavailable, the API should report that the AI service cannot currently perform predictions.

Example response:

```json
{
  "detail": "AI model is currently unavailable."
}
```

Expected HTTP status code:

```text
503 Service Unavailable
```

The API should remain available for health checks when possible, even if the YOLO model cannot be loaded.

## Limitations of the AI Model

The following limitations were observed or identified during the initial development and testing of the YOLO model.

### 1. Incorrect or Missing Classifications

YOLO may sometimes classify an image incorrectly or fail to recognize an animal altogether. This is due to limitations of the model and its training data. The model may not have seen enough examples of certain objects or may have been trained on biased data, leading to incorrect classifications.

Additionally, YOLO may struggle with images that are too small, too large, or have poor lighting conditions.

### 2. Difficulty Detecting Certain Animals

YOLO may fail to recognize an animal in an image if the animal is partially obscured, too far away, or not clearly visible.

The model may also struggle with images containing multiple animals or objects, as it may have difficulty distinguishing between them. Animals that are not commonly found in its training data, such as exotic or rare species, may also go unrecognized.

### 3. Duplicate Animal Detections

YOLO may sometimes identify one physical animal as multiple animals. This can happen because of limitations in recognizing certain features or patterns.

Images containing multiple animals or objects may also make it difficult for the model to distinguish individual animals. Multiple detections do not always mean that multiple physical animals are present.

### 4. Low-Confidence Predictions

YOLO may occasionally return predictions with low confidence scores. This occurs less frequently but can happen when an image is unclear or the animal is difficult to identify.

The confidence threshold helps filter out detections that do not meet the configured minimum confidence level.

## Additional Notes

- The trained model must be located at the path expected by the Python prediction service.
- The virtual environment must be activated whenever starting the service in a new terminal.
- Do not commit the `venv` directory to Git.
- Do not commit unnecessary temporary files or local environment settings.
- Keep `requirements.txt` updated whenever new direct Python dependencies are added.
- The model's recognition capabilities are limited to the five classes listed above.