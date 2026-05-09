import numpy as np
import pandas as pd
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
import os

os.makedirs("models", exist_ok=True)

# 1️⃣ Simulate quiz data
np.random.seed(42)
n_samples = 200
data = pd.DataFrame({
    "accuracy": np.random.uniform(0.5, 1.0, n_samples),
    "avg_time": np.random.uniform(2, 10, n_samples),
    "difficulty_score": np.random.uniform(1, 3, n_samples),
})

# 2️⃣ Assign labels (Normal / Low / High)
labels = []
for acc, t in zip(data.accuracy, data.avg_time):
    if acc > 0.85 and t < 6:
        labels.append("Normal")
    elif 0.65 <= acc <= 0.85:
        labels.append("Low")
    else:
        labels.append("High")

data["label"] = labels

# 3️⃣ Train-test split
X = data[["accuracy", "avg_time", "difficulty_score"]]
y = data["label"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4️⃣ Create + Train SVM model
model = make_pipeline(StandardScaler(), SVC(probability=True, kernel='rbf'))
model.fit(X_train, y_train)

# 5️⃣ Evaluate + Save
preds = model.predict(X_test)
print(classification_report(y_test, preds))
joblib.dump(model, "models/dyscalculia_model.pkl")
print("✅ Model saved to models/dyscalculia_model.pkl")
