# Learning Disability Detection System

AI-powered early detection of Dysgraphia and Dyscalculia with multi-language support.

## Features

- **Dysgraphia Detection**: Analyze handwriting samples using EfficientNetB0 CNN
- **Dyscalculia Detection**: Math reasoning quiz analyzed by SVM model
- **Multi-language Support**: English, Malayalam, and Hindi
- **Explainable AI**: Grad-CAM heatmaps and SHAP feature importance
- **User Authentication**: Secure login with Supabase
- **Test History**: Track progress over time
- **Report Generation**: Download results as PDF or CSV
- **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- Supabase (Auth & Database)
- Lucide React (Icons)

### Backend
- FastAPI (Python)
- TensorFlow (Dysgraphia model)
- Scikit-learn (Dyscalculia model)
- SHAP (Explainability)
- OpenCV (Image processing)

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- Supabase account

### 1. Clone and Install Frontend

```bash
npm install
```

### 2. Configure Environment Variables

The `.env` file already contains your Supabase credentials. Keep it secure!

### 3. Set Up Backend

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env` and copy the Supabase credentials from the main `.env`:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
DYSGRAPHIA_MODEL_PATH=models/dysgraphia_efficientnet.h5
DYSCALCULIA_MODEL_PATH=models/dyscalculia_svm.pkl
```

### 4. Add Trained Models

Place your trained models in the `backend/models/` directory:

- `backend/models/dysgraphia_efficientnet.h5` - EfficientNetB0 model for handwriting analysis
- `backend/models/dyscalculia_svm.pkl` - SVM model for math reasoning

**Model Requirements:**

#### Dysgraphia Model (EfficientNetB0)
- Input: 224x224x3 RGB images
- Output: 3 classes [Normal, Low, High]
- Format: Keras .h5 or SavedModel

#### Dyscalculia Model (SVM)
- Input: 20 numerical features from quiz responses
- Output: 3 classes [0=Normal, 1=Low, 2=High]
- Format: Pickle file (.pkl)
- Must have `predict()` and `predict_proba()` methods

### 5. Run the Application

**Terminal 1 - Start Backend:**
```bash
cd backend
python main.py
```
Backend runs on `http://localhost:8000`

**Terminal 2 - Start Frontend:**
```bash
npm run dev
```
Frontend runs on `http://localhost:5173`

## Usage Guide

### First Time Setup
1. Open the app in your browser
2. Create an account with email and password
3. Complete your profile with name, age, and language preference

### Taking Tests

#### Dysgraphia Test
1. Navigate to "Dysgraphia Test" from the dashboard
2. Upload a handwriting sample (JPG or PNG)
3. Click "Analyze Handwriting"
4. View results with Grad-CAM heatmap showing attention areas
5. Download report if needed

#### Dyscalculia Test
1. Navigate to "Dyscalculia Test" from the dashboard
2. Answer 8 math questions at your own pace
3. Submit the quiz when complete
4. View prediction with confidence scores and quiz statistics
5. Download report if needed

### Viewing History
- Access "Test History" to see all past tests
- Results are organized by test type
- Each entry shows date, prediction, and confidence score

## Model Training (Reference)

If you need to train new models:

### Dysgraphia Model
```python
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.models import Model

base_model = EfficientNetB0(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
x = GlobalAveragePooling2D()(base_model.output)
x = Dense(128, activation='relu')(x)
predictions = Dense(3, activation='softmax')(x)
model = Model(inputs=base_model.input, outputs=predictions)

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
model.save('backend/models/dysgraphia_efficientnet.h5')
```

### Dyscalculia Model
```python
from sklearn.svm import SVC
import pickle

model = SVC(kernel='rbf', probability=True)
model.fit(X_train, y_train)

with open('backend/models/dyscalculia_svm.pkl', 'wb') as f:
    pickle.dump(model, f)
```

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

### Key Endpoints

- `POST /api/dysgraphia/predict` - Upload handwriting image
- `POST /api/dyscalculia/predict` - Submit quiz responses
- `GET /api/user/{user_id}/tests` - Get test history
- `GET /api/reports/{test_type}/{test_id}?format=pdf` - Download report

## Database Schema

The application uses Supabase PostgreSQL with the following tables:

- `users_profile` - User information and preferences
- `dysgraphia_tests` - Handwriting test results
- `dyscalculia_tests` - Math quiz results
- `test_reports` - Generated reports
- `model_metadata` - Model versions and metrics

## Offline Usage

For true offline functionality:

1. Export the database schema
2. Use local PostgreSQL instead of Supabase
3. Update connection strings in `.env`
4. Models are already local in the backend

## Language Support

The app supports three languages:
- **English (en)** - Default
- **Malayalam (ml)** - മലയാളം
- **Hindi (hi)** - हिंदी

Change language from the profile page or navigation menu.

## Security & Privacy

- All data is encrypted at rest
- Row Level Security (RLS) ensures users only access their own data
- Authentication handled by Supabase
- No data is shared with third parties
- Images are stored as base64 in the database (consider S3 for production)

## Disclaimer

This application is a screening tool and should NOT be used as a substitute for professional medical diagnosis. Always consult qualified healthcare professionals for accurate diagnosis and treatment of learning disabilities.

## Troubleshooting

### Backend won't start
- Ensure Python 3.9+ is installed
- Check all dependencies are installed: `pip list`
- Verify model files exist in `backend/models/`

### Models not loading
- Check file paths in `backend/.env`
- Ensure models are in correct format (.h5 for CNN, .pkl for SVM)
- Look at backend console for specific error messages

### Database errors
- Verify Supabase credentials in `.env`
- Check if migration was applied successfully
- Ensure RLS policies are active

### Frontend build errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run typecheck`

## Development

### Build for Production

```bash
npm run build
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## Future Enhancements

- [ ] Real-time progress tracking
- [ ] Teacher/Parent dashboard for monitoring students
- [ ] Multi-user comparison and analytics
- [ ] Additional language support
- [ ] Mobile app (React Native)
- [ ] Advanced visualization of model performance
- [ ] Integration with school management systems

## License

MIT License - Feel free to use for educational and research purposes.

## Support

For issues or questions, please check the backend logs and browser console for error messages.
