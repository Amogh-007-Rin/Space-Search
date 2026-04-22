<div align="center">

# 🚀 Space Search

### End-to-End MLOps Platform for Near-Earth Object Hazard Prediction

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Apache Airflow](https://img.shields.io/badge/Airflow-2.7.1-017CEE?style=for-the-badge&logo=apacheairflow&logoColor=white)](https://airflow.apache.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)

<br/>

> **Space Search** is a production-grade MLOps system that ingests NASA's Near-Earth Object (NEO) dataset, orchestrates a full machine-learning pipeline from raw data to tuned models, and serves real-time hazard predictions through a REST API and an interactive web application.

<br/>

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SPACE SEARCH STACK                          │
│                                                                     │
│   NASA CSV  ──▶  Airflow Pipeline  ──▶  ML Models  ──▶  FastAPI    │
│                       (7 DAGs)        (RF + GBR)     (10 endpoints) │
│                          │                                  │       │
│                     PostgreSQL                         Next.js UI   │
│                    (raw + features)               (dashboard, predict│
│                                                    search, auth)    │
└─────────────────────────────────────────────────────────────────────┘
```

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Dataset](#-dataset)
- [ML Pipeline](#-ml-pipeline)
  - [DAG 0 — CSV to PostgreSQL](#dag-0--csv-to-postgresql)
  - [DAG 1 — Dataset Preprocessor](#dag-1--dataset-preprocessor)
  - [DAG 2 — Feature Transformer](#dag-2--feature-transformer)
  - [DAG 3 — Model Training](#dag-3--model-training)
  - [DAG 4 — Final Model Selector](#dag-4--final-model-selector)
  - [DAG 5 — Hyperparameter Tuning](#dag-5--hyperparameter-tuning)
  - [DAG 6 — Model Extractor](#dag-6--model-extractor)
- [Model Performance](#-model-performance)
- [API Server](#-api-server)
- [Web Application](#-web-application)
- [Database Schema](#-database-schema)
- [Infrastructure](#-infrastructure)
- [Setup & Installation](#-setup--installation)
  - [Prerequisites](#prerequisites)
  - [1 — Clone the Repository](#1--clone-the-repository)
  - [2 — Environment Variables](#2--environment-variables)
  - [3 — Build & Start All Services](#3--build--start-all-services)
  - [4 — Run the ML Pipeline](#4--run-the-ml-pipeline)
  - [5 — Access the Services](#5--access-the-services)
- [Running Without Docker](#-running-without-docker)
- [API Reference](#-api-reference)
- [Environment Variables Reference](#-environment-variables-reference)
- [Tech Stack](#-tech-stack)

---

## 🌌 Overview

Space Search answers two questions about any asteroid approaching Earth:

| Question | ML Task | Model |
|----------|---------|-------|
| Is this asteroid **hazardous**? | Binary Classification | RandomForestClassifier |
| How far will it **miss Earth**? | Regression | GradientBoostingRegressor (Optuna-tuned) |

The system is built around three pillars:

1. **Reproducible ML Pipeline** — Apache Airflow orchestrates every step from raw CSV ingestion through feature engineering, model training, cross-validation, hyperparameter tuning, and artifact export. Each DAG is a discrete, rerunnable unit with no hidden state.

2. **Production API** — A FastAPI server loads trained model artifacts at startup and exposes RESTful endpoints for single and batch predictions, paginated dataset access, and model introspection.

3. **Interactive Frontend** — A Next.js web application lets users explore the NEO dataset, run predictions through a form UI, view model metadata, and authenticate via NextAuth.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Docker Compose                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────┐                        │
│  │              Apache Airflow                      │                        │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │                        │
│  │  │ DAG 0-01 │→ │ DAG 2-03 │→ │ DAG 4-06 │      │                        │
│  │  │ Ingest + │  │ Engineer │  │ Tune  +  │      │                        │
│  │  │ Preproc  │  │ + Train  │  │ Export   │      │                        │
│  │  └──────────┘  └──────────┘  └──────────┘      │                        │
│  │        │              │             │            │                        │
│  └────────┼──────────────┼─────────────┼───────────┘                        │
│           ▼              ▼             ▼                                     │
│  ┌─────────────────┐  ┌────────────────────┐  ┌──────────────────────────┐  │
│  │   PostgreSQL 16  │  │  Dataset/Processed  │  │    models/artifacts/     │  │
│  │  NearEarthObject │  │  12 CSVs + 2 scalers│  │  .joblib + .json files   │  │
│  │  NewFeatures     │  └────────────────────┘  └────────────┬─────────────┘  │
│  └─────────────────┘                                        │               │
│                                                             ▼               │
│  ┌──────────────────────────────────┐   ┌──────────────────────────────┐   │
│  │         FastAPI Server           │   │        Next.js App            │   │
│  │   :8000  — 10 REST endpoints     │◀──│   :3000  — Dashboard, Predict │   │
│  │   Loads artifacts at startup     │   │   Search, Model Info, Auth    │   │
│  └──────────────────────────────────┘   └──────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Space-Search/
│
├── airflow/                          # ML orchestration layer
│   ├── Dockerfile                    # Extends airflow:2.7.1, installs ML deps
│   ├── requirements.txt              # scikit-learn, imbalanced-learn, optuna, …
│   └── dags/
│       ├── csv_to_postgres_dag.py    # DAG 0 — load raw CSV into Postgres
│       ├── dataset_preprocesser_dag.py  # DAG 1 — feature engineering + splits + SMOTE
│       ├── feature_transformer_dag.py   # DAG 2 — write engineered features to DB
│       ├── model_training_dag.py        # DAG 3 — train 6 baseline models
│       ├── final_model_selector_dag.py  # DAG 4 — evaluate on test set, pick best
│       ├── model_parameter_tunner_dag.py # DAG 5 — Optuna HPO, 50 trials each
│       └── model_extractor_dag.py       # DAG 6 — export artifacts + smoke test
│
├── api-server/                       # Prediction & data API
│   ├── Dockerfile                    # python:3.11-slim, installs deps
│   ├── requirements.txt              # fastapi, uvicorn, scikit-learn, joblib, …
│   └── app.py                        # FastAPI application (10 endpoints)
│
├── neo-app/                          # Web frontend
│   ├── Dockerfile                    # Multi-stage Node build → lean runner image
│   ├── .dockerignore
│   ├── next.config.ts                # output: standalone
│   ├── prisma/
│   │   └── schema.prisma             # Admin, NearEarthObject, NewFeatures models
│   ├── prisma.config.ts
│   ├── app/
│   │   ├── page.tsx                  # Dashboard
│   │   ├── predict/                  # Prediction form
│   │   ├── model/                    # Model metadata viewer
│   │   ├── neo/                      # NEO browser & search
│   │   ├── signin/ & signup/         # Auth pages
│   │   └── api/auth/                 # NextAuth handlers
│   ├── components/                   # Shared React components
│   └── lib/
│       ├── api.ts                    # Typed API client (all 10 endpoints)
│       └── prisma.ts                 # Prisma client singleton
│
├── models/
│   ├── artifacts/                    # Final trained artifacts (git-tracked output)
│   │   ├── classifier.joblib         # RandomForestClassifier
│   │   ├── regressor.joblib          # GradientBoostingRegressor (Optuna-tuned)
│   │   ├── scaler_clf.joblib         # StandardScaler for classification features
│   │   ├── scaler_reg.joblib         # StandardScaler for regression features
│   │   ├── feature_names.json        # clf_features and reg_features arrays
│   │   └── model_metadata.json       # hyperparams, test metrics, pipeline trace
│   └── *.ipynb                       # Research notebooks (EDA → Final model)
│
├── Dataset/
│   ├── Raw/neo.csv                   # 90,836 NASA NEO records (source of truth)
│   └── Processed/                    # Generated by DAG 1 (12 CSVs + 2 scalers)
│
├── docker-compose.yml                # Orchestrates all 6 services
├── .env.example                      # Airflow UID template
└── README.md
```

---

## 📊 Dataset

| Property | Value |
|----------|-------|
| Source | NASA Near-Earth Object dataset |
| Records | **90,836** asteroids |
| File size | ~9 MB |
| Class balance | ~10% hazardous, ~90% safe (handled with SMOTE) |

**Raw features (10 columns):**

| Column | Type | Description |
|--------|------|-------------|
| `id` | int | NASA asteroid identifier |
| `name` | string | Asteroid designation |
| `est_diameter_min` | float | Minimum estimated diameter (km) |
| `est_diameter_max` | float | Maximum estimated diameter (km) |
| `relative_velocity` | float | Relative velocity to Earth (km/h) |
| `miss_distance` | float | Miss distance from Earth (km) |
| `orbiting_body` | string | Body being orbited (always Earth) |
| `sentry_object` | bool | Whether it's in NASA Sentry system |
| `absolute_magnitude` | float | Absolute magnitude (H) |
| `hazardous` | bool | **Classification target** |

> `id`, `name`, `orbiting_body`, and `sentry_object` are dropped before modelling — they carry no predictive signal.

---

## 🔄 ML Pipeline

The pipeline is split across **7 Airflow DAGs** that execute in sequence. Every intermediate output is persisted to disk or PostgreSQL so any DAG can be rerun independently.

```
[DAG 0] csv_to_postgres
    └─▶ [DAG 1] dataset_preprocesser  ←── you are here (triggered internally)
              └─▶ [DAG 2] feature_transformer
              └─▶ [DAG 3] model_training
                      └─▶ [DAG 4] final_model_selector
                                └─▶ [DAG 5] model_parameter_tunner
                                          └─▶ [DAG 6] model_extractor
```

---

### DAG 0 — CSV to PostgreSQL

**File:** `airflow/dags/csv_to_postgres_dag.py`

Loads `Dataset/Raw/neo.csv` into the `NearEarthObject` table. Uses `ON CONFLICT (id) DO UPDATE` so it is idempotent — safe to rerun at any time.

```
neo.csv (90,836 rows)
    └─▶ CREATE TABLE IF NOT EXISTS "NearEarthObject"
    └─▶ executemany INSERT … ON CONFLICT DO UPDATE
```

---

### DAG 1 — Dataset Preprocessor

**File:** `airflow/dags/dataset_preprocesser_dag.py`

The heaviest DAG. Handles all feature engineering, data splitting, class balancing, and scaling. Also calls DAG 0 inline so the DB is always populated before later DAGs read from it.

**Feature engineering:**

| New Feature | Formula |
|-------------|---------|
| `diameter_avg` | `(est_diameter_min + est_diameter_max) / 2` |
| `diameter_ratio` | `est_diameter_max / est_diameter_min` |
| `log_diameter_avg` | `log1p(diameter_avg)` |
| `log_diameter_ratio` | `log1p(diameter_ratio)` |
| `log_relative_velocity` | `log1p(relative_velocity)` |
| `log_miss_distance` | `log1p(miss_distance)` — *regression target* |

Log transforms correct the heavy right-skew present in all magnitude features.

**Data split:**

```
Full dataset (90,836)
    ├── Train  70%  (63,585) ──▶ SMOTE ──▶ StandardScaler.fit_transform()
    ├── Val    15%  (13,625) ──────────▶ StandardScaler.transform()
    └── Test   15%  (13,626) ──────────▶ StandardScaler.transform()
```

> Scalers are fitted **only** on the training set to prevent data leakage into validation and test splits.

**SMOTE** (Synthetic Minority Over-sampling Technique) is applied to the training split only, synthetically creating minority-class (hazardous) samples to address the ~10:1 class imbalance.

**Outputs:** `Dataset/Processed/` — 12 CSV files (`X_train/val/test_clf/reg.csv`, `y_train/val/test_clf/reg.csv`) + `scaler_clf.joblib` + `scaler_reg.joblib`.

---

### DAG 2 — Feature Transformer

**File:** `airflow/dags/feature_transformer_dag.py`

Reads the engineered features from the processed CSVs and writes them to the `NearEarthObjectNewFeatures` table in PostgreSQL, creating a queryable ML feature store.

---

### DAG 3 — Model Training

**File:** `airflow/dags/model_training_dag.py`

Trains 3 classifiers and 3 regressors on the SMOTE-balanced, scaled training data, then runs 5-fold stratified cross-validation on the top-2 performers of each type.

**Classifiers trained:**
- `LogisticRegression`
- `RandomForestClassifier`
- `GradientBoostingClassifier`

**Regressors trained:**
- `LinearRegression`
- `RandomForestRegressor`
- `GradientBoostingRegressor`

**Saved outputs** (`Dataset/mlops_pipeline/`):
- `baseline_models/*.joblib` — all 6 trained models
- `clf_baseline_metrics.json` — accuracy, F1, AUC per classifier on the val set
- `reg_baseline_metrics.json` — R², RMSE, MAE per regressor on the val set
- `cv_results.json` — 5-fold cross-validation results for top-2 models

---

### DAG 4 — Final Model Selector

**File:** `airflow/dags/final_model_selector_dag.py`

Evaluates all baseline models on the **sealed test set** (first and only time) and picks winners by:

- **Classifier** → highest `(F1_weighted + AUC-ROC) / 2`
- **Regressor** → highest `R²`

Saves `model_selection.json` and `clf/reg_test_metrics.json`.

---

### DAG 5 — Hyperparameter Tuning

**File:** `airflow/dags/model_parameter_tunner_dag.py`

Uses **Optuna** with the TPE (Tree-structured Parzen Estimator) sampler to tune the winning models from DAG 4. Runs **50 trials per model** against the validation set, then re-evaluates the best params on the test set.

**Search space:**

| Hyperparameter | Range |
|---------------|-------|
| `n_estimators` | 100 – 500 |
| `max_depth` | 3 – 8 |
| `learning_rate` | 0.001 – 0.3 (log scale) |
| `min_samples_split` | 2 – 20 |
| `subsample` | 0.6 – 1.0 |

**Saved outputs:** `tuned_classifier.joblib`, `tuned_regressor.joblib`, `best_clf/reg_params.json`, `tuned_test_metrics.json`.

---

### DAG 6 — Model Extractor

**File:** `airflow/dags/model_extractor_dag.py`

Copies the tuned artifacts to `models/artifacts/`, writes `model_metadata.json` (includes trained-at timestamp, hyperparams, and all test metrics), then runs a **smoke test** — a full end-to-end inference call — before declaring success. If the smoke test fails, the DAG fails.

**Final artifacts:**

```
models/artifacts/
├── classifier.joblib       RandomForestClassifier
├── regressor.joblib        GradientBoostingRegressor (Optuna-tuned)
├── scaler_clf.joblib       StandardScaler (7 classification features)
├── scaler_reg.joblib       StandardScaler (6 regression features)
├── feature_names.json      {"clf_features": […], "reg_features": […]}
└── model_metadata.json     trained_at, hyperparams, test metrics, pipeline trace
```

---

## 📈 Model Performance

Final results on the **held-out test set** (13,626 rows, never seen during training or tuning):

### Classifier — RandomForestClassifier

| Metric | Score |
|--------|-------|
| **F1 (weighted)** | **0.9039** |
| **AUC-ROC** | **0.9145** |
| **Accuracy** | **0.9015** |

### Regressor — GradientBoostingRegressor (Optuna-tuned)

| Metric | Score |
|--------|-------|
| **R²** | 0.1657 |
| **RMSE (log scale)** | 1.0434 |
| **RMSE (km)** | 22,470,463 km |

**Tuned hyperparameters:**

```json
{
  "n_estimators": 104,
  "max_depth": 7,
  "learning_rate": 0.0302,
  "min_samples_split": 17,
  "subsample": 0.9542,
  "random_state": 42
}
```

> The regressor's R² reflects the inherent difficulty of predicting miss distance from orbital characteristics alone — the classifier is the primary value signal.

---

## 🌐 API Server

**Location:** `api-server/` · **Port:** `8000` · **Docs:** `http://localhost:8000/docs`

Built with **FastAPI**. All artifacts and the full NEO dataset are loaded into memory at startup via a `lifespan` context manager for sub-millisecond inference latency.

**Inference pipeline (per request):**

```
Raw input (5 fields)
    │
    ▼
Feature engineering   →  diameter_avg, diameter_ratio, log_*  (6–7 features)
    │
    ▼
StandardScaler.transform()   (fitted scaler loaded from .joblib)
    │
    ├──▶ RandomForestClassifier.predict_proba()  →  hazardous: bool + probability
    └──▶ GradientBoostingRegressor.predict()     →  miss_distance_km (via expm1)
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/model/info` | Model metadata — hyperparams, test metrics, feature list |
| `POST` | `/predict` | Single asteroid prediction |
| `POST` | `/neo/predict-batch` | Batch predictions (max 100) |
| `GET` | `/neo/info/all` | Paginated full dataset (`limit`, `offset`) |
| `GET` | `/neo/info/{neo_id}` | Single NEO record by ID |
| `GET` | `/neo/hazardous` | Paginated hazardous NEOs |
| `GET` | `/neo/safe` | Paginated safe NEOs |
| `GET` | `/neo/stats` | Dataset summary statistics |
| `GET` | `/neo/search` | Case-insensitive name search |

### Prediction Request & Response

**`POST /predict`**

```json
// Request
{
  "est_diameter_min": 0.5,
  "est_diameter_max": 1.2,
  "relative_velocity": 45000,
  "absolute_magnitude": 18.5,
  "miss_distance": 5000000
}

// Response
{
  "hazardous": true,
  "hazardous_probability": 0.8731,
  "miss_distance_km": 4987234.12
}
```

---

## 💻 Web Application

**Location:** `neo-app/` · **Port:** `3000`

Built with **Next.js 16** (App Router), **React 19**, **TypeScript**, **TailwindCSS 4**, and **Prisma 7** for database access.

### Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — total NEOs, hazard %, velocity stats, miss distance stats |
| `/predict` | Prediction form — enter asteroid parameters, see classification + miss distance |
| `/model` | Model metadata viewer — hyperparameters, test metrics, feature names |
| `/neo` | NEO browser — paginated table of all asteroid records |
| `/neo/search` | Name-based NEO search |
| `/signin` | Sign-in page (NextAuth) |
| `/signup` | Registration page |

### Key Libraries

| Library | Version | Use |
|---------|---------|-----|
| Next.js | 16.2.4 | Framework, App Router, SSR |
| React | 19.2.4 | UI rendering |
| Prisma | 7.7.0 | Database ORM (PostgreSQL) |
| NextAuth | 4.24.14 | Authentication |
| TailwindCSS | 4 | Styling |
| Three.js | 0.184.0 | 3D space visualizations |
| Framer Motion | 12.38.0 | Animations |

---

## 🗄️ Database Schema

Running on **PostgreSQL 16**. Two application tables:

```sql
-- Raw NASA data (populated by DAG 0)
CREATE TABLE "NearEarthObject" (
    id                 BIGINT PRIMARY KEY,
    name               TEXT,
    est_diameter_min   FLOAT,
    est_diameter_max   FLOAT,
    relative_velocity  FLOAT,
    miss_distance      FLOAT,
    orbiting_body      TEXT,
    sentry_object      BOOLEAN,
    absolute_magnitude FLOAT,
    hazardous          BOOLEAN
);

-- Engineered ML features (populated by DAG 2)
CREATE TABLE "NearEarthObjectNewFeatures" (
    featureId             SERIAL PRIMARY KEY,
    diameter_avg          FLOAT,
    diameter_ratio        FLOAT,
    log_diameter_avg      FLOAT,
    log_diameter_ratio    FLOAT,
    log_relative_velocity FLOAT,
    log_miss_distance     FLOAT,
    absolute_magnitude    FLOAT,
    hazardous             INT,       -- 0 = safe, 1 = hazardous
    sourceNeoId           INT REFERENCES "NearEarthObject"(id)
);

-- NextAuth user table (managed by Prisma)
CREATE TABLE "Admin" (
    id       SERIAL PRIMARY KEY,
    name     TEXT    NOT NULL,
    email    TEXT    UNIQUE NOT NULL,
    password TEXT    NOT NULL
);
```

---

## 🐳 Infrastructure

All services are defined in `docker-compose.yml` and share an internal Docker network. Postgres health checks gate all dependent services.

```
┌─────────────────────────────────────────────────────┐
│                    docker-compose                    │
│                                                     │
│  postgres:5432          neo-database                │
│       ▲                                             │
│       │ (healthy)                                   │
│       ├──────────────────────────────────┐          │
│       │                                  │          │
│  airflow-webserver:8080   airflow-scheduler         │
│  airflow-init             (same image, built from   │
│       │                    airflow/Dockerfile)       │
│       │                                             │
│  neo-app:3000             api-server:8000           │
│  (built from             (built from                │
│   neo-app/Dockerfile)     api-server/Dockerfile)    │
└─────────────────────────────────────────────────────┘
```

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `postgres` | `postgres:16-alpine` | `5432` | Primary database |
| `airflow-webserver` | built from `airflow/` | `8080` | Airflow UI & API |
| `airflow-scheduler` | built from `airflow/` | — | DAG scheduling |
| `airflow-init` | built from `airflow/` | — | DB migration + admin user |
| `neo-app` | built from `neo-app/` | `3000` | Next.js frontend |
| `api-server` | built from `api-server/` | `8000` | FastAPI prediction server |

**Shared volumes:**
- `postgres_data` — persistent Postgres data
- `./models` → Airflow at `/opt/airflow/models`, API server at `/models`
- `./Dataset` → Airflow at `/opt/airflow/dataset`, API server at `/Dataset`

---

## 🛠️ Setup & Installation

### Prerequisites

Make sure you have the following installed:

- [Docker](https://docs.docker.com/get-docker/) `>= 24`
- [Docker Compose](https://docs.docker.com/compose/install/) `>= 2.20`
- Git

> **No Python or Node.js installation required** — everything runs inside containers.

---

### 1 — Clone the Repository

```bash
git clone https://github.com/Amogh-007-Rin/Space-Search.git
cd Space-Search
```

---

### 2 — Environment Variables

Create the Airflow `.env` file at the project root:

```bash
echo "AIRFLOW_UID=$(id -u)" > .env
```

Create the Next.js `.env` file:

```bash
cp neo-app/.env.example neo-app/.env
```

The defaults in `.env.example` work out of the box for a local Docker setup:

```env
DATABASE_URL="postgresql://mlops:password123@localhost:5432/mlops?schema=public"
NEXTAUTH_SECRET=neo-prediction-mlops-secret-2026
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> `GITHUB_ID` and `GITHUB_SECRET` are optional — only needed if you want GitHub OAuth login.

---

### 3 — Build & Start All Services

```bash
docker compose up --build -d
```

This will:
1. Build custom images for Airflow (with ML deps), the API server, and the Next.js app
2. Start PostgreSQL and wait for it to pass its health check
3. Run `airflow-init` to apply DB migrations and create the default admin user (`airflow` / `airflow`)
4. Start the Airflow webserver, scheduler, API server, and Next.js app

> **First build takes ~5–10 minutes** due to pip installing scikit-learn, Optuna, and npm installing all Next.js dependencies.

Check that all services are running:

```bash
docker compose ps
```

You should see all services with status `running` (or `exited 0` for `airflow-init`).

---

### 4 — Run the ML Pipeline

The ML pipeline must be run **before** the API server can serve predictions (it needs the trained artifacts).

**Step 1 — Open the Airflow UI**

Navigate to [http://localhost:8080](http://localhost:8080) and log in with:
- **Username:** `airflow`
- **Password:** `airflow`

**Step 2 — Enable and trigger the DAGs in order**

Each DAG is paused by default. Enable and trigger them one at a time, waiting for each to complete (green) before starting the next:

| Order | DAG ID | Approx. Runtime | What it does |
|-------|--------|-----------------|-------------|
| 1 | `dataset_preprocesser` | 15–25 min | Ingest CSV + feature engineering + splits + SMOTE |
| 2 | `feature_transformer` | 5–10 min | Write features to PostgreSQL |
| 3 | `model_training` | 40–70 min | Train 6 baseline models + cross-validation |
| 4 | `final_model_selector` | 5–10 min | Evaluate on test set, select best |
| 5 | `model_parameter_tunner` | 30–60 min | Optuna HPO — 50 trials each |
| 6 | `model_extractor` | < 2 min | Export artifacts + smoke test |

> **Total pipeline runtime: ~100–180 minutes** on standard hardware.

**Alternatively, trigger via CLI:**

```bash
docker compose exec airflow-webserver airflow dags trigger dataset_preprocesser
docker compose exec airflow-webserver airflow dags trigger feature_transformer
docker compose exec airflow-webserver airflow dags trigger model_training
docker compose exec airflow-webserver airflow dags trigger final_model_selector
docker compose exec airflow-webserver airflow dags trigger model_parameter_tunner
docker compose exec airflow-webserver airflow dags trigger model_extractor
```

**Step 3 — Restart the API server** (so it loads the fresh artifacts)

```bash
docker compose restart api-server
```

---

### 5 — Access the Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Web App** | [http://localhost:3000](http://localhost:3000) | Register via `/signup` |
| **API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | — |
| **Airflow UI** | [http://localhost:8080](http://localhost:8080) | `airflow` / `airflow` |
| **PostgreSQL** | `localhost:5432` | `mlops` / `password123` / db: `mlops` |

---

## 💻 Running Without Docker

If you want to run individual components locally for development:

### Airflow DAGs (Python)

```bash
cd airflow
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### API Server

```bash
cd api-server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

> Make sure `models/artifacts/` is populated (run the pipeline first) and that the relative paths resolve correctly from `api-server/`.

### Next.js App

```bash
cd neo-app
npm install
npx prisma generate
npm run dev
```

> Ensure `neo-app/.env` has a valid `DATABASE_URL` pointing to a running PostgreSQL instance.

---

## 📖 API Reference

### `POST /predict`

Predict whether a single asteroid is hazardous and estimate its miss distance.

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "est_diameter_min": 0.5,
    "est_diameter_max": 1.2,
    "relative_velocity": 45000,
    "absolute_magnitude": 18.5,
    "miss_distance": 5000000
  }'
```

### `POST /neo/predict-batch`

Run predictions on up to 100 asteroids in a single request.

```bash
curl -X POST http://localhost:8000/neo/predict-batch \
  -H "Content-Type: application/json" \
  -d '[
    {"est_diameter_min": 0.1, "est_diameter_max": 0.3, "relative_velocity": 20000, "absolute_magnitude": 22.0, "miss_distance": 70000000},
    {"est_diameter_min": 1.5, "est_diameter_max": 3.2, "relative_velocity": 80000, "absolute_magnitude": 15.0, "miss_distance": 1000000}
  ]'
```

### `GET /neo/stats`

```bash
curl http://localhost:8000/neo/stats
```

### `GET /neo/search?name=<query>`

```bash
curl "http://localhost:8000/neo/search?name=2000+SS&limit=10"
```

Full interactive documentation with try-it-out support is available at **[http://localhost:8000/docs](http://localhost:8000/docs)**.

---

## 🔧 Environment Variables Reference

### Root `.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `AIRFLOW_UID` | `$(id -u)` | Host user ID — required so Airflow can write to mounted volumes |

### `neo-app/.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://mlops:password123@localhost:5432/mlops` | Prisma database connection string |
| `NEXTAUTH_SECRET` | `neo-prediction-mlops-secret-2026` | Secret for signing NextAuth JWTs |
| `NEXTAUTH_URL` | `http://localhost:3000` | Canonical URL of the app |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | API server URL (baked into client bundle at build time) |
| `GITHUB_ID` | _(optional)_ | GitHub OAuth app client ID |
| `GITHUB_SECRET` | _(optional)_ | GitHub OAuth app client secret |

---

## 🧰 Tech Stack

### Machine Learning & Data

| Technology | Version | Role |
|------------|---------|------|
| scikit-learn | 1.3.0+ | Model training, scalers, metrics |
| imbalanced-learn | 0.11.0+ | SMOTE oversampling |
| Optuna | 3.3.0+ | Hyperparameter optimisation (TPE) |
| pandas | 2.0.0+ | Data manipulation |
| numpy | 1.24.0+ | Numerical operations |
| joblib | 1.3.0+ | Model serialisation |

### Orchestration & Infrastructure

| Technology | Version | Role |
|------------|---------|------|
| Apache Airflow | 2.7.1 | Pipeline orchestration (7 DAGs) |
| PostgreSQL | 16 | Primary datastore |
| Docker | — | Containerisation |
| Docker Compose | — | Multi-service orchestration |

### API

| Technology | Version | Role |
|------------|---------|------|
| FastAPI | 0.136.0 | REST API framework |
| Uvicorn | 0.45.0 | ASGI server |
| Pydantic | 2.13.3 | Request/response validation |

### Frontend

| Technology | Version | Role |
|------------|---------|------|
| Next.js | 16.2.4 | React framework (App Router, SSR) |
| React | 19.2.4 | UI library |
| TypeScript | 5.x | Type safety |
| TailwindCSS | 4 | Utility-first styling |
| Prisma | 7.7.0 | ORM for PostgreSQL |
| NextAuth.js | 4.24.14 | Authentication |
| Three.js | 0.184.0 | 3D visualisations |
| Framer Motion | 12.38.0 | Animations |

---

<div align="center">

Built with ☕ and a healthy respect for asteroids.

</div>
