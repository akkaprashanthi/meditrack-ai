# MediTrack AI – Intelligent Appointment No-Show Management

MediTrack AI is a healthcare operations dashboard prototype designed to help clinic staff identify missed appointments, estimate patient no-show risk using machine learning, generate actionable follow-up recommendations, and track outreach activities.

The application combines a React dashboard, FastAPI backend, scikit-learn prediction pipeline, rule-based recommendation engine, and SQLite persistence to demonstrate an end-to-end appointment management workflow.

**Note:** This project uses synthetic appointment data only. It is a demonstration prototype, not a clinical system. Its machine learning model has not been clinically validated and must not be used for real clinical decisions.

## Problem Statement

Missed medical appointments can reduce clinic capacity, affect scheduling efficiency, and create additional administrative work.

Clinic staff need a convenient way to:

- Identify patients who missed their scheduled appointments.
- Review appointment details and historical patterns.
- Understand estimated no-show risk.
- Receive practical follow-up suggestions.
- Record outreach activities and track completion.

MediTrack AI demonstrates how machine learning and automated workflows can support these operational activities through a centralized dashboard.

## Key Features

### 1. Appointment Management
- View appointments in a centralized dashboard.
- Highlight recorded no-show appointments in red.
- Search appointments by patient information.
- Filter by appointment status, department, and date.
- Sort by patient name, appointment date, and status in ascending or descending order.
- Inspect individual appointment details.

### 2. Machine Learning-Based No-Show Prediction
- Uses a scikit-learn classification pipeline to estimate no-show risk.
- Preprocesses numerical and categorical appointment features.
- Handles missing values through imputation.
- Applies numerical scaling and categorical encoding.
- Compares multiple classification algorithms.
- Uses a validation-based threshold selection process.

### 3. Actionable Follow-Up Recommendations
- Generates three deterministic recommendations for a no-show appointment.
- Uses appointment context and predicted risk to inform outreach suggestions.
- Provides practical actions such as phone calls, rescheduling, and reminder-related follow-up.
- Helps clinic staff prioritize follow-up activities.

### 4. Follow-Up Tracking
- Record outreach actions and notes.
- Mark follow-up activities as completed.
- Persist follow-up information in SQLite.
- Preserve the original appointment status when an outreach activity is completed.
- Maintain a separate follow-up history.

### 5. Analytics Dashboard
- Display appointment statistics and no-show counts.
- Visualize no-show trends.
- Compare department-level appointment statistics.
- Review recent no-show activity.

### 6. Performance and Reliability
- TTL caching for frequently accessed appointment and analytics data.
- Cache invalidation after follow-up updates.
- FastAPI request validation and error handling.
- Automated backend tests.
- Responsive React-based dashboard.

## System Architecture

MediTrack AI follows a modular frontend-backend architecture.

```text
                  Clinic Staff
                       |
                       v
                React Dashboard
                       |
                       v
                 FastAPI Backend
                       |
          +------------+------------+
          |            |            |
          v            v            v
      Appointment   ML Service   Analytics
       Management       |         Service
          |             v
          |        Risk Prediction
          |             |
          |             v
          |     Recommendation Engine
          |             |
          +-------------+
                |
                v
           Follow-Up API
                |
                v
             SQLite DB
                |
                v
       Persistent Follow-Up Records
```

### Component Overview

| Component | Responsibility |
|---|---|
| React Frontend | Dashboard, appointment management, analytics, and follow-up interface |
| FastAPI Backend | REST API endpoints and application logic |
| ML Service | Data preprocessing, model loading, and no-show risk prediction |
| Recommendation Service | Generates deterministic follow-up recommendations |
| Cache Service | Stores frequently accessed responses using TTL caching |
| SQLAlchemy | Database models and persistence |
| SQLite | Stores appointments and follow-up records |

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React 18, Vite, JavaScript, Tailwind CSS |
| UI and Visualization | Recharts, Lucide React |
| API Communication | Axios, REST APIs |
| Backend | Python, FastAPI, Pydantic, Uvicorn |
| Machine Learning | Scikit-learn |
| Data Processing | Pandas, NumPy |
| Model Persistence | Joblib |
| Database | SQLite, SQLAlchemy |
| Caching | Cachetools TTLCache |
| Testing | Pytest, HTTPX |
| Deployment | Docker-compatible backend, static frontend hosting |

## Machine Learning Pipeline

### Dataset

The project uses a reproducible synthetic dataset containing 1,200 appointment records.

The synthetic dataset includes features such as:

- Previous no-show history.
- Previous cancellations.
- Days since the last visit.
- Appointment time and day.
- Reminder status.
- Appointment type.
- Department.
- Booking lead time.

The synthetic target is generated from a weighted combination of selected appointment features, converted into a probability, and sampled as a binary outcome.

The latest dataset contains:

- Total records: 1,200
- Positive labels: 206
- Negative labels: 994
- Positive class proportion: 17.17%

The generator uses random seed `42` for reproducibility.

### Data Preprocessing

The preprocessing pipeline includes:

1. Handling missing numerical and categorical values.
2. Numerical feature scaling.
3. Categorical feature encoding.
4. Separating training, validation, and test datasets.
5. Fitting preprocessing transformations only on training data to avoid data leakage.

The `previous_appointments` field is retained in appointment data and preprocessing validation but excluded from classifier inputs because it does not contribute to the synthetic target formula.

### Model Training and Comparison

The following classification algorithms are evaluated:

- Dummy Classifier (baseline).
- Logistic Regression.
- Random Forest.
- Extra Trees Classifier.

The dataset is divided using a stratified split:

| Dataset | Percentage | Records |
|---|---:|---:|
| Training | 64% | 768 |
| Validation | 16% | 192 |
| Testing | 20% | 240 |

Model and classification threshold selection are performed using validation F1-score. ROC-AUC is used as a tie-breaker. The test dataset is held out for final evaluation.

The training script evaluates 181 classification thresholds between 0.05 and 0.95.

### Model Evaluation

The latest training run selected Extra Trees with a classification threshold of 0.30.

Held-out test results:

| Model | Threshold | Accuracy | Precision | Recall | F1-Score | ROC-AUC |
|---|---:|---:|---:|---:|---:|---:|
| Dummy Classifier | 0.05 | 0.1708 | 0.1708 | 1.0000 | 0.2918 | 0.5000 |
| Logistic Regression | 0.13 | 0.1708 | 0.1708 | 1.0000 | 0.2918 | 0.6357 |
| Random Forest | 0.23 | 0.5125 | 0.2031 | 0.6341 | 0.3077 | 0.6014 |
| Extra Trees | 0.30 | 0.5750 | 0.2150 | 0.5610 | 0.3108 | 0.5993 |

The selected Extra Trees model achieved an F1-score of approximately 0.311 and ROC-AUC of approximately 0.599 on the held-out test set.

These results indicate limited predictive performance. The dataset is synthetic and relatively small, so the model is intended to demonstrate an ML integration workflow rather than provide clinically reliable predictions.

Confusion matrices use the format `[[TN, FP], [FN, TP]]`.

### Training the Model

Run the following command from the `backend/` directory:

```bash
python ml/train_model.py
```

The trained model is saved as a Joblib artifact and loaded by the backend ML service.

## Recommendation Engine

The recommendation engine uses deterministic business rules rather than an external LLM.

It combines appointment context and predicted no-show risk to generate three actionable follow-up suggestions.

Example actions include:

- Contact the patient through a phone call.
- Offer an alternative appointment slot.
- Send a follow-up reminder or scheduling communication.

The recommendations are intended to assist clinic staff with operational follow-up. They do not replace staff judgment.

## Database Design

SQLite is used for persistent storage through SQLAlchemy.

The application currently uses two primary tables:

### Appointments

Stores:
- Patient identifier and name.
- Appointment date and time.
- Clinician and department.
- Appointment type.
- Historical appointment features.
- Original appointment status.
- Follow-up status, action, and notes.
- Timestamps.

### Follow-Ups

Stores:
- Appointment foreign key.
- Patient identifier.
- Follow-up action.
- Notes.
- Follow-up status.
- Follow-up date.
- Creation timestamp.

On first startup, the application creates missing database tables and inserts 30 synthetic demonstration appointments if the appointment table is empty.

Follow-up completion is stored separately from the original appointment status. For example, an appointment remains `No-Show` even after its follow-up status becomes `Completed`.

**Database limitation:** SQLite is suitable for this local demonstration and a single backend instance. A managed database would be more appropriate for concurrent multi-instance production deployments.

## Caching and Performance

MediTrack AI uses `cachetools.TTLCache` to reduce repeated database queries and response processing.

### Cache Configuration

- Default TTL: 60 seconds.
- Maximum cache entries: 256.
- Cached operations: appointment lists, appointment details, appointment statistics, and analytics.
- Cache invalidation: related entries are removed after follow-up writes.

### Local Cache Benchmark

The cache was evaluated using the FastAPI TestClient with 30 cold/warm request pairs against the same appointment-list endpoint and parameters.

| Measurement | Result |
|---|---:|
| Median cold response | 9.205 ms |
| Median cached response | 7.159 ms |
| Observed median reduction | 22.23% |
| Cache misses | 30 |
| Cache hits | 30 |

The measured reduction is calculated as:

`((Cold Response - Cached Response) / Cold Response) × 100`

A follow-up write also invalidates the relevant appointment-list cache key, ensuring the next read retrieves updated data.

These measurements represent a small local test and are not a production load benchmark or latency guarantee.

## REST API Endpoints

FastAPI provides REST endpoints for appointment management, recommendations, follow-up tracking, and analytics.

Interactive API documentation is available at:

`http://localhost:8000/docs`

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Backend health status |

### Appointments

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/appointments` | Retrieve appointments with optional filters and sorting |
| GET | `/api/appointments/today` | Retrieve today's appointments |
| GET | `/api/appointments/stats` | Retrieve appointment statistics |
| GET | `/api/appointments/{appointment_id}` | Retrieve appointment details |

Supported appointment-list query parameters include `status`, `department`, `patient_name`, `patient_id`, `date`, `sort_by`, and `sort_desc`.

### Recommendations

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/recommendations/{appointment_id}` | Retrieve recommendations |
| POST | `/api/recommendations/{appointment_id}/generate` | Generate recommendations for a recorded no-show |

### Follow-Ups

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/followups` | Retrieve follow-up records |
| POST | `/api/followups` | Create a follow-up record and mark follow-up complete |
| PATCH | `/api/appointments/{appointment_id}/follow-up` | Follow-up update alias |

### Analytics and Monitoring

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/overview` | Analytics summary |
| GET | `/api/analytics/weekly-trends` | Seven-day no-show trends |
| GET | `/api/analytics/department-stats` | Department-level statistics |
| GET | `/api/cache/stats` | Cache statistics |
| GET | `/api/model/metrics` | Model training metrics or loaded model status |

## Local Installation and Setup

### Prerequisites

Install the following:

- Python 3.12 or later.
- Node.js 18 or later.
- npm.
- Git.

### 1. Clone the Repository

```bash
git clone https://github.com/akkaprashanthi/meditrack-ai.git
cd meditrack-ai
```

### 2. Configure the Backend

Open a terminal:

```powershell
cd backend

py -3.12 -m venv .venv

.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip

pip install -r requirements.txt

Copy-Item .env.example .env
```

Start the backend:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Backend URL:

`http://localhost:8000`

API documentation:

`http://localhost:8000/docs`

### 3. Configure the Frontend

Open a separate terminal:

```powershell
cd frontend

npm ci

Copy-Item .env.example .env
```

Start the frontend:

```bash
npm run dev
```

Frontend URL:

`http://localhost:5173`

### 4. Startup Behavior

During startup, the backend:

1. Loads environment configuration.
2. Initializes the SQLite database and creates missing tables.
3. Inserts synthetic appointments if the database is empty.
4. Generates the synthetic dataset if it is missing.
5. Trains and saves the ML model if the model artifact is missing.
6. Loads the trained model before accepting requests.

The first startup may take longer because model training can occur automatically.

## Environment Configuration

Environment variables are configured through example files.

### Backend: `backend/.env.example`

| Variable | Default | Purpose |
|---|---|---|
| `APP_PORT` | `8000` | Application port |
| `DATABASE_URL` | `sqlite:///./meditrack.db` | Database connection URL |
| `CACHE_TTL` | `60` | Cache lifetime in seconds |
| `CORS_ORIGINS` | Local frontend origins | Allowed browser origins |
| `MODEL_ARTIFACT_DIR` | `ml/artifacts` | Model artifact directory |
| `SYNTHETIC_DATASET_PATH` | `ml/artifacts/synthetic_dataset.csv` | Synthetic dataset location |
| `MODEL_ARTIFACT_PATH` | `ml/artifacts/no_show_model.joblib` | Trained model location |

The platform-provided `PORT` is used when `APP_PORT` is not set. Relative SQLite and artifact paths resolve from the backend directory.

### Frontend: `frontend/.env.example`

```env
VITE_API_BASE_URL=http://localhost:8000
```

For deployment, configure `VITE_API_BASE_URL` with the deployed backend URL before building the frontend.

Configure backend `CORS_ORIGINS` to include the exact deployed frontend origin.

Never commit actual `.env` files, API keys, passwords, or other credentials.

## Docker Deployment

The root `Dockerfile` builds the backend container.

The trained Joblib model is intentionally excluded from the image. If the model is missing at startup, the backend trains it using the included synthetic dataset. If the dataset is also missing, it generates the dataset first.

Build the image:

```bash
docker build -t meditrack-ai-api .
```

Create a persistent volume:

```bash
docker volume create meditrack-ai-data
```

Run the container:

```bash
docker run --rm -p 8000:8000 -e CORS_ORIGINS="https://your-frontend.example" -v meditrack-ai-data:/data meditrack-ai-api
```

The `/data` volume is used for persistent SQLite storage. Configure the hosting platform's persistent volume and use `/health` as the health-check endpoint.

Do not run multiple backend replicas with the included SQLite configuration.

### Frontend Deployment

The frontend can be deployed using a static hosting provider.

1. Set `VITE_API_BASE_URL` to the deployed backend URL.
2. Run `npm run build` inside `frontend/`.
3. Publish the generated `frontend/dist/` directory.
4. Configure SPA fallback to `index.html`.
5. Configure backend CORS to allow the deployed frontend origin.

## Testing and Verification

### Backend Tests

Run from the `backend/` directory:

```bash
python -m pytest -q
```

Latest verification: **15 backend tests passed.**

Test coverage includes:

- Appointment retrieval, filtering, and sorting.
- Follow-up creation and persistence.
- Preservation of original appointment status.
- Cache behavior and invalidation.
- Missing-value preprocessing.
- Model loading and prediction validation.
- Recommendation generation.

### Frontend Production Build

Run from the `frontend/` directory:

```bash
npm ci
npm run build
```

The latest production build completed successfully.

Vite reports an advisory that the main minified JavaScript bundle exceeds 500 kB. This does not prevent the production build from succeeding.

## Known Limitations

- The application uses synthetic patient and appointment records only.
- The machine learning model has weak predictive performance and has not been clinically validated.
- The synthetic target is generated from selected input features and does not represent measured clinical outcomes.
- The recommendation engine uses deterministic business rules rather than an autonomous AI agent or external LLM.
- The prototype does not include authentication, authorization, production privacy controls, or audit-grade event history.
- Notification delivery is not integrated with external messaging services.
- SQLite is intended for local demonstration and a single backend instance.
- The cache benchmark is a local measurement, not a production performance guarantee.

## Future Improvements

- Integrate real-world, appropriately governed appointment datasets.
- Improve model performance through larger datasets and systematic feature engineering.
- Add model monitoring and drift detection.
- Introduce role-based authentication and authorization.
- Migrate to a managed database for production-scale usage.
- Integrate SMS, email, and automated reminder services.
- Add comprehensive audit logging.
- Optimize frontend bundle size and introduce code splitting.
- Expand integration and performance testing.

## License

This project is licensed under the [MIT License](LICENSE).
