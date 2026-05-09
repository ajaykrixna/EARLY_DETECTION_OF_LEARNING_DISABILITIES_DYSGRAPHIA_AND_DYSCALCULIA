# Learning Disability Detection - Backend API

Python FastAPI backend for AI-powered detection of Dysgraphia and Dyscalculia.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Update the `.env` file with your Supabase credentials (from the main project `.env`).

### 3. Add Model Files

Place your trained models in the `models/` directory:

- **Dysgraphia Model**: `models/dysgraphia_efficientnet.h5` (EfficientNetB0)
- **Dyscalculia Model**: `models/dyscalculia_svm.pkl` (SVM)

### 4. Run the Server

```bash
python main.py
```

Or using uvicorn:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check
- `GET /api/health` - Check API and model status

### Dysgraphia Detection
- `POST /api/dysgraphia/predict` - Upload handwriting image for analysis
  - Body: `multipart/form-data` with `file` field
  - Optional: `user_id` parameter

### Dyscalculia Detection
- `POST /api/dyscalculia/predict` - Submit quiz responses
  - Body: JSON with `user_id` and `responses` array

### Model Metadata
- `GET /api/models/{model_type}` - Get active model information
- `POST /api/models/metadata` - Upload model metrics

### Reports
- `GET /api/reports/{test_type}/{test_id}?format=pdf|csv|json` - Generate reports

### User Tests
- `GET /api/user/{user_id}/tests?test_type=dysgraphia|dyscalculia` - Get user test history

## Model Requirements

### Dysgraphia Model (EfficientNetB0)
- Input shape: (224, 224, 3)
- Output classes: ["Normal", "Low", "High"]
- Format: Keras/TensorFlow SavedModel (.h5)

### Dyscalculia Model (SVM)
- Input features: 20 features extracted from quiz responses
- Output classes: [0, 1, 2] mapping to ["Normal", "Low", "High"]
- Format: Pickle file (.pkl)

## Features

- **Grad-CAM Visualization**: Explainable AI for CNN predictions
- **SHAP Values**: Feature importance for SVM predictions
- **Multi-format Reports**: PDF, CSV, and JSON exports
- **Database Integration**: Automatic result storage in Supabase
- **Offline Capable**: Run locally without internet (after setup)
