# HemoLens - Non-invasive Hemoglobin Detection

Real-time hemoglobin estimation from eye images using machine learning and mobile app integration.

## Project Structure

```
hemolens_project/
├── hemolens/                 # Backend API (FastAPI)
│   ├── app.py               # Main FastAPI application
│   ├── eye_detector.py      # Eye detection and health classification
│   ├── feature_extraction.py # 46-feature engineering pipeline
│   ├── preprocessing.py      # Image preprocessing utilities
│   ├── requirements.txt      # Python dependencies
│   └── models/              # Trained ML models
│       ├── hemolens_ridge_model.pkl
│       ├── hemolens_gb_model.pkl
│       └── scaler.pkl
│
├── hemolens_mobile/          # Mobile App (React Native + Expo)
│   ├── RealtimeCamera.js    # Real-time camera component
│   ├── package.json         # JavaScript dependencies
│   ├── app.json             # Expo configuration
│   └── eas.json             # EAS build configuration
│
├── .gitignore
├── Dockerfile
├── render.yaml
└── README.md
```

## Backend Setup

### Requirements
- Python 3.12+
- FastAPI 0.104+
- OpenCV, NumPy, scikit-learn, Pillow

### Installation

```bash
cd hemolens_project/hemolens
pip install -r requirements.txt
```

### Run Server

```bash
python app.py
```

Server runs on `http://localhost:8000`

API Endpoints:
- `GET /health` - Health check
- `GET /info` - Model information
- `POST /predict` - Single image prediction with eye detection
- `POST /predict/batch` - Batch predictions

## Mobile App Setup

### Requirements
- Node.js 16+
- Expo CLI

### Installation

```bash
cd hemolens_project/hemolens_mobile
npm install
```

### Run App

```bash
npx expo start
```

Scan QR code with Expo Go app on your phone to test.

## Model Details

- **Algorithm**: Ridge Regression with 46 features
- **Performance**: R² = 0.6267, MAE = 0.96 g/dL
- **Input**: Eye images (palpebral conjunctiva)
- **Output**: Hemoglobin level + health status classification

## Features

- **Eye Detection**: Haar Cascade classifiers for strict eye validation
- **46-Feature Pipeline**: RGB, LAB, HSV, YCrCb, Statistical, Edge, Contrast, Histogram
- **Real-time Processing**: Continuous frame capture every 1.5s with rolling average
- **Health Classification**: LOW / BORDERLINE / SAFE / HIGH with color-coded UI

## Deployment

### To Render

Update remote and push to GitHub:

```bash
git remote add origin https://github.com/YOUR_USERNAME/hemolens_project.git
git push -u origin main
```

Render will auto-deploy on push.

## WHO Guidelines

- **Low**: < 12.0 g/dL (Red)
- **Borderline**: 12.0-13.5 g/dL (Amber)
- **Safe**: 13.5-17.5 g/dL (Green)
- **High**: > 17.5 g/dL (Orange)
