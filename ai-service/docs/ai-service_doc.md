# HuntCredible AI Service Applied Documentation

## 1. AI Feature Overview

### Purpose of the AI Feature

HuntCredible incorporates an artificial intelligence feature that uses image recognition to identify animal species that hunters encounter in the wild during their hunting experience by their camera for the AI model to recognize that animal. The application uses an object detection model to recognize five supported animal categories: **bears, boars, deer, rabbits, and squirrels.**

### Why Object Detection Was Selected

Object detection was selected because it allows the application to identify and locate animals within an image rather than simply assigning one classification to the entire image.
This approach provides several advantages:

- **Multiple Objects Detection:** The model can identify multiple objects within a single image.
- **Object Localization:** Bounding boxes indicate where detected objects are located within the image.
- **Confidence Scores:** Each prediction includes a confidence score that indicates the model's confidence in its detection.

## 2. Dataset and Data Sources

### Dataset Origins

The animal detection model was trained using a custom combined dataset assembled from multiple externally sourced animal image datasets from Roboflow to be combined into five animal classes.

### Dataset Links
- Bear: https://universe.roboflow.com/bear-s8vh1/bear-im4k
- Boar: https://universe.roboflow.com/sofiayolo/boars
- Deer: https://universe.roboflow.com/garage-2/deer-dvrkw
- Rabbit: https://universe.roboflow.com/bruno-d349b/rabbit-gr1lk
- Squirrel: https://universe.roboflow.com/computer-vision-d3tfs/squirrel-kgcpd

### Dataset Licenses and Usage Rights

The datasets incorporated into the combined dataset are identified as being distributed under the Creative Commons Attribution 4.0 International (CC BY 4.0) license.
This license permits the use, modification, and redistribution of licensed material, including its use for machine learning and model training, provided that appropriate attribution is given to the original creators.

### Animal Categories and Image Counts

The combined dataset contains five animal categories:

| Class ID | Animal Category | Image Count |Percentage |
|---|---|---:|
| 0 | Bear | 791 |24.44% |
| 1 | Boar | 500 |15.45% |
| 2 | Deer | 893 |27.59% |
| 3 | Rabbit | 453 |13.99% |
| 4 | Squirrel | 600 |18.53%|
| | **Reported Total** | **3,237** | |

### Dataset Preparation and Preprocessing
Before training, the individual datasets were combined and standardized into a unified YOLO-compatible format.

The preparation process included:

1. Combining images and corresponding annotation files from multiple animal datasets.
2. Standardizing animal categories and class IDs across the different sources and updating the annotating mappings of each animal category, automated using a Python script due to the number of images.
3. Organizing the dataset into training, validation, and testing directories after combination.
4. Checking the combined dataset for annotation and formatting errors.
5. Creating a YAML configuration file to define the dataset paths and animal categories.

The final dataset configuration uses the following class mappings:

```yaml
train: ../train/images
val: ../valid/images
test: ../test/images

nc: 5
names:
  0: bear
  1: boar
  2: deer
  3: rabbit
  4: squirrel
```

The dataset is separated into three subsets:

- **Training Set:** Used to train the model and adjust its learned parameters.
- **Validation Set:** Used to monitor model performance during training and assist with model selection.
- **Testing Set:** Reserved for evaluating the final trained model using previously unseen images.

## 3. Model Architecture and Methodology

### Training Configuration

The model was initialized using the pretrained `yolo26n.pt` weights and fine-tuned using the combined animal dataset. YOLO26n is a lightweight object detection model designed to identify and locate objects within images. It analyzes an image and generates predictions containing detected object categories, confidence scores, and bounding box coordinates.

The training process uses the Ultralytics Python framework and the custom dataset YAML configuration.

| Configuration | Value |
|---|---|
| Model Architecture | YOLO26n |
| Initial Weights | `yolo26n.pt` |
| Framework | Ultralytics |
| Type | Object Detection |
| Number of Classes | 5 |
| Dataset | Custom Combined Animal Dataset |
| Dataset Configuration | `data.yaml` |

Training parameters:

```python
trainedModel = model.train(data="combined_dataset/data.yaml",epochs=10,imgsz=640,batch=16)
```

- Epochs: 10 (The number of steps it takes for the model to go through all the images)
- Number of batches: 16 (Number of images per batches during training)
- Image Size (imgsz): 640 (Size of the images during training)

### Model Input and Output

**Input**

The model accepts an image submitted through the application's animal recognition feature.

The image is processed by the Python service and passed to the custom trained YOLO26n model for object detection.

**Output**

The model generates predictions containing the following information:

| Output | Description |
|---|---|
| Animal Category | The predicted animal species (bear, boar, deer, rabbit, or squirrel). |
| Confidence Score | A numerical value representing the model's confidence in the prediction. |
| Bounding Box | Coordinates identifying the location of a detected animal within the image. |
| Multiple Detections | The model can return multiple animal detections from a single image. |

The model may also return no detections if it cannot identify any supported animal categories within the submitted image.


## Failure Cases for the AI Model

The following failure cases were observed or identified during the initial development and testing of the YOLO model.

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