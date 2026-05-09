# AI Models Directory

Place your trained models in this directory.

## Required Models

### 1. Dysgraphia Detection Model
**Filename:** `dysgraphia_efficientnet.h5`

**Type:** CNN (Convolutional Neural Network) based on EfficientNetB0

**Requirements:**
- Input shape: (224, 224, 3) - RGB images
- Output: 3 classes - ["Normal", "Low", "High"]
- Format: Keras HDF5 (.h5) or SavedModel directory
- Must be compatible with TensorFlow 2.x

**Training Guidelines:**
```python
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.models import Model

base_model = EfficientNetB0(
    weights='imagenet',
    include_top=False,
    input_shape=(224, 224, 3)
)

x = GlobalAveragePooling2D()(base_model.output)
x = Dense(128, activation='relu')(x)
predictions = Dense(3, activation='softmax', name='output')(x)

model = Model(inputs=base_model.input, outputs=predictions)

model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

model.save('dysgraphia_efficientnet.h5')
```

---

### 2. Dyscalculia Detection Model
**Filename:** `dyscalculia_svm.pkl`

**Type:** SVM (Support Vector Machine)

**Requirements:**
- Input: 20 numerical features extracted from quiz responses
- Output: 3 classes - [0, 1, 2] mapping to ["Normal", "Low", "High"]
- Format: Python pickle file (.pkl)
- Must have `predict()` and `predict_proba()` methods

**Feature Extraction:**
The system extracts these features from quiz responses:
- Correctness (0 or 1 for each answer)
- Time taken per question (seconds)
- Difficulty level (1=easy, 2=medium, 3=hard)
- Score per question

**Training Guidelines:**
```python
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
import pickle

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_train)

model = SVC(
    kernel='rbf',
    C=1.0,
    gamma='scale',
    probability=True,
    random_state=42
)

model.fit(X_scaled, y_train)

with open('dyscalculia_svm.pkl', 'wb') as f:
    model_data = {
        'model': model,
        'scaler': scaler
    }
    pickle.dump(model_data, f)
```

---

## Model Performance Metrics

After training your models, you can upload performance metrics via the API:

```python
import requests

model_metadata = {
    "model_type": "dysgraphia",
    "version": "1.0",
    "accuracy": 0.92,
    "roc_curve_data": {
        "fpr": [0.0, 0.1, 0.2, ...],
        "tpr": [0.0, 0.8, 0.95, ...],
        "auc": 0.94
    },
    "confusion_matrix": {
        "labels": ["Normal", "Low", "High"],
        "values": [[45, 2, 1], [3, 38, 2], [1, 2, 43]]
    }
}

response = requests.post(
    'http://localhost:8000/api/models/metadata',
    json=model_metadata
)
```

---

## Testing Your Models

### Test Dysgraphia Model
```bash
curl -X POST "http://localhost:8000/api/dysgraphia/predict" \
  -F "file=@sample_handwriting.jpg"
```

### Test Dyscalculia Model
```bash
curl -X POST "http://localhost:8000/api/dyscalculia/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-123",
    "responses": [
      {"question_id": 1, "is_correct": true, "time_taken": 5.2, "difficulty": "easy", "score": 1},
      {"question_id": 2, "is_correct": false, "time_taken": 12.5, "difficulty": "medium", "score": 0}
    ]
  }'
```

---

## Model Versioning

Keep track of different model versions:
- Use semantic versioning (e.g., 1.0, 1.1, 2.0)
- Store metadata in the database
- Archive old models with version suffix: `dysgraphia_efficientnet_v1.0.h5`

---

## Model Size Optimization

For production deployment, consider:
- **Quantization**: Reduce model size by converting to TF-Lite
- **Pruning**: Remove unnecessary weights
- **ONNX**: Convert to ONNX format for cross-platform compatibility

---

## Important Notes

1. **Privacy**: Never commit model files to version control if they contain sensitive training data
2. **Security**: Validate all inputs before feeding to models
3. **Performance**: Monitor inference time and optimize if needed
4. **Updates**: When updating models, maintain backward compatibility or migrate existing predictions
5. **Backup**: Always keep backup copies of working models

---

## Dataset Recommendations

### For Dysgraphia:
- Collect diverse handwriting samples
- Include various age groups and writing styles
- Label data as Normal, Low, or High dysgraphia indicators
- Minimum 500 samples per class
- Balance dataset across classes

### For Dyscalculia:
- Collect quiz responses with timing data
- Include questions at various difficulty levels
- Record accuracy, speed, and error patterns
- Minimum 1000 samples total
- Feature engineering is crucial

---

## Troubleshooting

**Model won't load:**
- Check file path in `.env`
- Verify file format and compatibility
- Look for error messages in backend logs

**Poor predictions:**
- Verify input preprocessing matches training
- Check model architecture matches saved model
- Ensure class labels are correctly mapped

**Slow inference:**
- Consider model optimization techniques
- Use GPU acceleration if available
- Batch predictions when possible
