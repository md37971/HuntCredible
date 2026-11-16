#This file is used to evalulate the model for testing fine-tuned performance.
from ultralytics import YOLO

# Load your trained model
model = YOLO("trainedModel/weights/best.pt")

# Evaluate using the test dataset.

#NOTE: THE COMBINED DATASET FOLDER MUST BE IN THE SAME DIRECTORY AS THIS PYTHON FILE. IT IS NOT INCLUDED IN THIS REPOSITORY DUE TO GIT FILE LIMIT RESTRICTIONS.
metrics = model.val(
    data="combined_dataset/data.yaml",
    split="test",
    imgsz=640
)

# Display evaluation results
"""
print("Precision:", metrics.box.mp)
print("Recall:", metrics.box.mr)
print("mAP50:", metrics.box.map50)
print("mAP50-95:", metrics.box.map)
"""

# Print formatted evaluation results
print("\n========== MODEL EVALUATION RESULTS ==========")
print("Model: Fine-tuned YOLO26n")
print("Dataset: combined_dataset/data.yaml")
print("Split: test")
print("==============================================")

print(f"{'Metric':<20} {'Score':>10}")
print("-" * 32)

print(f"{'Precision':<20} {metrics.box.mp:>9.4f}")
print(f"{'Recall':<20} {metrics.box.mr:>9.4f}")
print(f"{'mAP50':<20} {metrics.box.map50:>9.4f}")
print(f"{'mAP50-95':<20} {metrics.box.map:>9.4f}")

print("==============================================")

# Print per-class results
print("\n========== PER-CLASS RESULTS ==========")
print(f"{'Class':<15} {'Precision':>10} {'Recall':>10} {'mAP50':>10} {'mAP50-95':>12}")


for i, name in model.names.items():
    print(
        f"{name:<15} "
        f"{metrics.box.p[i]:>10.4f} "
        f"{metrics.box.r[i]:>10.4f} "
        f"{metrics.box.ap50[i]:>10.4f} "
        f"{metrics.box.maps[i]:>12.4f}"
    )


print("==============================================")