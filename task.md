## TASK-01 ##
    - Navigate to the airflow/dags folder 
    - Find the csv_to_postgres_dag.py file
    - Create a airflow dag which migrates the data from the dataset[csv file] present in the Dataset/Raw folder to the postgres database running locally on this machine. for reference look into the docker-compose.yml file present in the root folder.
    - Result: The csv_to_postgres dag must successfully load the data present in the dataset over to the postgres database.

## TASK-01 FINISHED NOTES ##

### Changes Made

1. **`docker-compose.yml`**
   - Updated Airflow dags volume mount: `./dags` → `./airflow/dags`
   - Added `./Dataset:/opt/airflow/dataset` volume so the CSV is accessible inside Airflow containers

2. **`airflow/dags/csv_to_postgres_dag.py`**
   - DAG ID: `csv_to_postgres`, scheduled `@once`, catchup disabled
   - Task 1 — `create_table`: Creates the `NearEarthObject` table in Postgres if it doesn't exist
   - Task 2 — `load_csv_to_postgres`: Reads `Dataset/Raw/neo.csv` via pandas and upserts all rows into `NearEarthObject` using `ON CONFLICT (id) DO UPDATE`

### NearEarthObject Table Schema

| Column           | Type         |
|------------------|--------------|
| id               | BIGINT (PK)  |
| name             | TEXT         |
| est_diameter_min | FLOAT        |
| est_diameter_max | FLOAT        |
| relative_velocity| FLOAT        |
| miss_distance    | FLOAT        |
| orbiting_body    | TEXT         |
| sentry_object    | BOOLEAN      |
| absolute_magnitude | FLOAT      |
| hazardous        | BOOLEAN      |

### Required Airflow Connection (add via Admin → Connections)

| Field           | Value         |
|-----------------|---------------|
| Connection ID   | `neo_postgres`|
| Connection Type | `Postgres`    |
| Host            | `postgres`    |
| Schema          | `mlops`       |
| Login           | `mlops`       |
| Password        | `password123` |
| Port            | `5432`        |

### How to Run

1. Start services: `docker-compose up -d`
2. Add the `neo_postgres` connection in Airflow UI (`localhost:8080`)
3. Trigger the `csv_to_postgres` DAG manually
4. Both tasks (`create_table` → `load_csv_to_postgres`) must turn green for success



## TASK-02 ##
   - Task Objective: We need to train a machine learning model on neo.csv dataset which is present in Dataset/Raw/neo.csv folder.
   - Navigate to the models folder. In the models folder there are 5 .ipynb notebooks each has its own significance. 
   - Correct the Dataset file paths in all the .ipynb notebooks and run each cell of code in the Exploration.ipynb notebook.
   - For running the code connect the python kernel to the virtual environment present inside the models folder .venv .
   - Once success let me know. 

## TASK-02 FINISHED NOTES ##

### Changes Made

1. **Path corrections in all 5 notebooks**
   - `Exploration.ipynb`: `DATASET_PATH = "neo.csv"` → `"../Dataset/Raw/neo.csv"`
   - `Pre-processing.ipynb`: `'../Dataset/Raw-Dataset/neo.csv'` → `'../Dataset/Raw/neo.csv'` and `'../Dataset/Processed-Dataset/'` → `'../Dataset/Processed/'`
   - `Experimentation.ipynb`: `'../Dataset/Processed-Dataset/'` → `'../Dataset/Processed/'`
   - `Model-training.ipynb`: `'../Dataset/Processed-Dataset/'` → `'../Dataset/Processed/'`
   - `Final-model.ipynb`: `'../Dataset/Processed-Dataset/'` → `'../Dataset/Processed/'`

2. **Installed required packages into `.venv`**
   - `jupyter`, `nbconvert`, `pandas`, `numpy`, `scikit-learn` and dependencies installed via `pip` into `models/.venv`

3. **Executed `Exploration.ipynb`**
   - Ran all cells using the `.venv` kernel via `jupyter nbconvert --execute`
   - Successfully loaded the 90,836-row NEO dataset from `Dataset/Raw/neo.csv`
   - Confirmed zero null values across all 10 columns
   - All cells (`head()`, `tail()`, `info()`, `describe()`, `isnull()`) produced correct output

### Notebook Roles

| Notebook | Purpose |
|---|---|
| `Exploration.ipynb` | Dataset exploration — shape, nulls, descriptive stats |
| `Pre-processing.ipynb` | Cleans data, engineers features, applies SMOTE, splits and scales, saves processed CSVs |
| `Experimentation.ipynb` | Compares baseline classifiers and regressors, runs cross-validation, selects best models |
| `Model-training.ipynb` | Hyperparameter tuning with Optuna, final training on train+val, test-set evaluation, saves artifacts |
| `Final-model.ipynb` | Loads artifacts, runs inference function, produces final visualisations, defines FastAPI integration |

## TASK-03 ##

   - Task context: We need to build a fastapi server which covers all the edge case enpoints such as /predict, /neo/info/all, and many more useful endpoints.
   - Navigate to the api-server folder where i have already initiallised the fast-api server make all the nessary updates in the app.py file.
   - Model artifacts are present in the /models/artifacts folder fetch the artifacts from there. 
   - I have also initiallised a virtual environment inside the api-server folder. Therefore activate the virtual environment before installing any external dependencies. 
   - After api-server development completion list all the used dependencies in the existing requirements.txt file by running -> pip freez > requirements.txt

## TASK-03 FINISHED NOTES ##

### Changes Made

1. **`api-server/app.py`** — Full rewrite with all endpoints
2. **`api-server/requirements.txt`** — Updated via `pip freeze`
3. **Installed into `.venv`** — `joblib`, `pandas`, `numpy`, `scikit-learn`

### Artifacts Loading
- Models and scalers loaded at startup via `lifespan` from `../models/artifacts/`
- NEO dataset loaded from `../Dataset/Raw/neo.csv`
- Paths resolved using `Path(__file__).parent` — works regardless of CWD

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/model/info` | Model metadata, hyperparameters, test metrics |
| `POST` | `/predict` | Predict hazard + miss distance for a single asteroid |
| `POST` | `/neo/predict-batch` | Batch predictions (max 100 per request) |
| `GET` | `/neo/info/all` | Paginated full dataset (`limit`, `offset`) |
| `GET` | `/neo/info/{neo_id}` | Single NEO record by ID |
| `GET` | `/neo/hazardous` | Paginated list of hazardous NEOs |
| `GET` | `/neo/safe` | Paginated list of safe NEOs |
| `GET` | `/neo/stats` | Dataset summary statistics |
| `GET` | `/neo/search?name=` | Case-insensitive name search |

### How to Run

```bash
cd api-server
.venv/bin/uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Interactive docs available at `http://localhost:8000/docs`


## TASK-04 ##

   - Task Context: We need to create table in the database for the transformed features got from the feature transformation. 
   - Navigate to the neo-app folder in there find the schema.prisma file and i have written a table called NearEarthObjectNewFeatures note that its not fully implemented we need to implement the table based on the features developed during the feature transformation. 
   - Write the schema for the table NearEarthObjectNewFeatures based on the new features developed. 
   - Once done ask for a review.

## TASK-04 FINISHED NOTES ##

### Changes Made

1. **`neo-app/prisma/schema.prisma`**
   - Implemented `NearEarthObjectNewFeatures` model with all engineered features from `Pre-processing.ipynb`
   - Added reverse relation `engineeredFeatures` on `NearEarthObject` to satisfy Prisma's referential integrity

### NearEarthObjectNewFeatures Schema

| Column | Type | Description |
|---|---|---|
| `featureId` | `Int` PK autoincrement | Row identifier |
| `diameter_avg` | `Float` | `(est_diameter_min + est_diameter_max) / 2` |
| `diameter_ratio` | `Float` | `est_diameter_max / est_diameter_min` |
| `log_diameter_avg` | `Float` | `log1p(diameter_avg)` |
| `log_diameter_ratio` | `Float` | `log1p(diameter_ratio)` |
| `log_relative_velocity` | `Float` | `log1p(relative_velocity)` |
| `log_miss_distance` | `Float` | `log1p(miss_distance)` |
| `absolute_magnitude` | `Float` | Retained from raw data |
| `hazardous` | `Int` | Target: `0` = safe, `1` = hazardous |
| `sourceNeoId` | `Int?` | Optional FK → `NearEarthObject.id` |

### Design Notes
- `sourceNeoId` is nullable because SMOTE generates synthetic training rows with no real NEO ID
- `hazardous` is stored as `Int` (0/1) rather than `Boolean` to match the encoded target used during model training
- Dropped columns from raw schema (`id`, `name`, `orbiting_body`, `sentry_object`, `est_diameter_min`, `est_diameter_max`, `relative_velocity`, `miss_distance`) are not present as they were removed during pre-processing.

## TASK-05 ##
   - Task Context: We need to make a End to End MLOPS pipeline for this project in Airflow. 
   - I have already created a DAG called csv_to_postgres_dag which is present in airflow/dags which migrates the data from neo.csv dataset present in Dataset/raw folder over to the postgres database.
   - Next we need to build a complete MLOPS pipeline in the airflow including all the machine learning model operations present inside the models folder and for that we have to create 5 dags.

   - DAG-01: dataset_preprocesser_dag.py which takes the dataset present in the Dataset/raw/neo.csv and pre-processes that and stores the pre-processed dataset into the Dataset/processed folder and then calls the csv_to_postgres DAG to migrate the pre-processed data into the postgres database.

   - DAG-02: feature_transformer_dag.py which create new useful features from exesting dataset and stores the newly created features into the NearEarthObjectsNewFeatures table. For the database schema refer neo-app/prisma/schema.prisma file.

   - DAG-03: model_training_dag.py which takes the pre-processed dataset present in the Dataset/processed folder and also takes the newly created feature and performs all the relevent machine learning operations present in the models folder and then trains the machine learning model.
   - All the models related context are present over the models folder.

   - DAG-04: final_model_selector_dag.py which performs tests on all the regression and classification models and selects the best performing model.

   - DAG-05: model_parameter_tunner_dag.py which takes the best performing model and make some parameter tuning to that model to increase the model accuracy. And run some test to conform the performance and accuracy.

   - DAG-06: model_extractor_dag.py which extracts the final model into the artifacts folder.   

## TASK-05 FINISHED NOTES ##

### Changes Made

1. **`airflow/dags/dataset_preprocesser_dag.py`** — DAG-01
2. **`airflow/dags/feature_transformer_dag.py`** — DAG-02
3. **`airflow/dags/model_training_dag.py`** — DAG-03
4. **`airflow/dags/final_model_selector_dag.py`** — DAG-04
5. **`airflow/dags/model_parameter_tunner_dag.py`** — DAG-05
6. **`airflow/dags/model_extractor_dag.py`** — DAG-06
7. **`docker-compose.yml`** — Added `./models:/opt/airflow/models` volume mount so DAG-06 can write to `models/artifacts/`
8. **`airflow/requirements.txt`** — Created with extra packages required by the pipeline DAGs

---

### DAG-01: `dataset_preprocesser` (dataset_preprocesser_dag.py)

**Tasks:** `preprocess_dataset` → `trigger_csv_to_postgres`

**What it does:**
- Loads `Dataset/Raw/neo.csv` (90,836 rows, 10 cols) with assertion guards
- Drops irrelevant/leaky columns: `id`, `name`, `orbiting_body`, `sentry_object`
- Engineers 6 new features: `diameter_avg`, `diameter_ratio`, `log_diameter_avg`, `log_diameter_ratio`, `log_relative_velocity`, `log_miss_distance`
- Drops raw columns replaced by engineered ones
- Encodes `hazardous` bool → int (0/1)
- Stratified 70/15/15 train/val/test split
- Applies SMOTE on training set only (minority class oversampling)
- Fits `StandardScaler` on training data, transforms val/test with same statistics (no leakage)
- Saves 12 CSVs + 2 scalers to `Dataset/Processed/`
- Triggers the existing `csv_to_postgres` DAG via `TriggerDagRunOperator`

**Output files saved to `Dataset/Processed/`:**
`X_train_clf.csv`, `X_val_clf.csv`, `X_test_clf.csv`, `y_train_clf.csv`, `y_val_clf.csv`, `y_test_clf.csv`, `X_train_reg.csv`, `X_val_reg.csv`, `X_test_reg.csv`, `y_train_reg.csv`, `y_val_reg.csv`, `y_test_reg.csv`, `scaler_clf.joblib`, `scaler_reg.joblib`

---

### DAG-02: `feature_transformer` (feature_transformer_dag.py)

**Tasks:** `create_features_table` → `transform_and_store_features`

**What it does:**
- Creates `NearEarthObjectNewFeatures` table in Postgres if it doesn't exist (schema matches `neo-app/prisma/schema.prisma`)
- Loads raw CSV, engineers all 6 features from the raw dataset
- Bulk-inserts all 90,836 rows into `NearEarthObjectNewFeatures` in batches of 1,000
- `sourceNeoId` FK wired to `NearEarthObject.id` for each real row

**NearEarthObjectNewFeatures Table (Postgres):**

| Column | Type | Description |
|---|---|---|
| `featureId` | SERIAL PK | Auto-increment row ID |
| `diameter_avg` | FLOAT | `(est_diameter_min + est_diameter_max) / 2` |
| `diameter_ratio` | FLOAT | `est_diameter_max / est_diameter_min` |
| `log_diameter_avg` | FLOAT | `log1p(diameter_avg)` |
| `log_diameter_ratio` | FLOAT | `log1p(diameter_ratio)` |
| `log_relative_velocity` | FLOAT | `log1p(relative_velocity)` |
| `log_miss_distance` | FLOAT | `log1p(miss_distance)` |
| `absolute_magnitude` | FLOAT | Retained from raw data |
| `hazardous` | INTEGER | 0 = safe, 1 = hazardous |
| `sourceNeoId` | INTEGER (FK) | References `NearEarthObject.id` |

---

### DAG-03: `model_training` (model_training_dag.py)

**Tasks:** `train_classifiers` + `train_regressors` (parallel) → `run_cross_validation`

**What it does:**

**train_classifiers** — trains 4 baseline classifiers on SMOTE-augmented scaled data, evaluates each on val set (accuracy, F1-weighted, AUC-ROC), saves each as `.joblib`, writes ranked results to `clf_baseline_metrics.json`:
- `LogisticRegression` (max_iter=1000, class_weight=balanced)
- `RandomForestClassifier` (n_estimators=100, class_weight=balanced)
- `GradientBoostingClassifier` (n_estimators=100)
- `SVC` (kernel=rbf, class_weight=balanced, probability=True)

**train_regressors** — trains 3 baseline regressors on scaled data, evaluates on val set (R², RMSE, MAE), saves each as `.joblib`, writes ranked results to `reg_baseline_metrics.json`:
- `LinearRegression`
- `RandomForestRegressor` (n_estimators=100)
- `GradientBoostingRegressor` (n_estimators=100)

**run_cross_validation** — 5-fold stratified cross-validation (F1-weighted) on top-2 classifiers; 5-fold KFold CV (R²) on top-2 regressors. Saves mean ± std to `cv_results.json`.

**Intermediate files saved to `Dataset/mlops_pipeline/`:**
`baseline_models/*.joblib`, `clf_baseline_metrics.json`, `reg_baseline_metrics.json`, `cv_results.json`

---

### DAG-04: `final_model_selector` (final_model_selector_dag.py)

**Tasks:** `evaluate_classifiers_on_test` + `evaluate_regressors_on_test` (parallel) → `select_best_models`

**What it does:**
- Loads all 7 baseline models from `baseline_models/`
- Evaluates each against the **sealed test set** (first time test set is touched)
- **Classifier ranking** by `(F1_weighted + AUC_ROC) / 2` — selects best overall performer
- **Regressor ranking** by R² — selects best fit to test targets
- Writes `model_selection.json` with winning model names and full metrics comparison

**Intermediate files saved:** `clf_test_metrics.json`, `reg_test_metrics.json`, `model_selection.json`

---

### DAG-05: `model_parameter_tunner` (model_parameter_tunner_dag.py)

**Tasks:** `tune_classifier` + `tune_regressor` (parallel) → `evaluate_tuned_models`

**What it does:**
- Reads `model_selection.json` to know which model family to tune
- Runs **Optuna TPE** (50 trials) to find best hyperparameters for GradientBoosting (expected winner):

| Hyperparameter | Search Range |
|---|---|
| `n_estimators` | 100–500 |
| `max_depth` | 3–8 |
| `learning_rate` | 0.001–0.3 (log scale) |
| `min_samples_split` | 2–20 |
| `subsample` | 0.6–1.0 |

- Classifier tuned by maximising F1-weighted on val set
- Regressor tuned by minimising RMSE on val set
- Final model retrained on **train + val combined** (85% of all data) with best params
- Evaluates final tuned models on test set, logs classification report + regression metrics in km scale
- Non-GBM winners are copied as-is (graceful fallback)

**Intermediate files saved to `Dataset/mlops_pipeline/tuned_models/`:**
`tuned_classifier.joblib`, `tuned_regressor.joblib`, `best_clf_params.json`, `best_reg_params.json`, `tuned_test_metrics.json`

---

### DAG-06: `model_extractor` (model_extractor_dag.py)

**Tasks:** `verify_tuned_models` → `extract_artifacts` → `smoke_test_artifacts`

**What it does:**
- **verify_tuned_models** — asserts all required pipeline files exist before touching the artifacts folder
- **extract_artifacts** — copies tuned models and scalers to `models/artifacts/`, generates `feature_names.json` and `model_metadata.json` (same format as `Model-training.ipynb`)
- **smoke_test_artifacts** — loads all 6 artifacts, runs full end-to-end inference with a hardcoded test asteroid, asserts output shapes/ranges are valid

**Final artifacts written to `models/artifacts/`:**

| File | Description |
|---|---|
| `classifier.joblib` | Tuned GradientBoostingClassifier |
| `regressor.joblib` | Tuned GradientBoostingRegressor |
| `scaler_clf.joblib` | Fitted StandardScaler for classification inputs |
| `scaler_reg.joblib` | Fitted StandardScaler for regression inputs |
| `feature_names.json` | Ordered feature name lists for both tasks |
| `model_metadata.json` | Training timestamp, best hyperparams, all test-set metrics, pipeline trace |

---

### Infrastructure Changes

**`docker-compose.yml`** — Added models volume mount:
```yaml
- ./models:/opt/airflow/models
```
Required so DAG-06 can write final artifacts to `models/artifacts/` which is the same directory the `api-server` loads from at startup.

**`airflow/requirements.txt`** — New file listing extra Python packages the pipeline DAGs need:
```
scikit-learn>=1.3.0
imbalanced-learn>=0.11.0
optuna>=3.3.0
pandas>=2.0.0
numpy>=1.24.0
joblib>=1.3.0
```
Install into the Airflow Docker image before running the pipeline (e.g. via `_PIP_ADDITIONAL_REQUIREMENTS` env var or a custom Dockerfile).

---

### DAG Execution Order

```
dataset_preprocesser
    └─ trigger_csv_to_postgres
feature_transformer          ← can run in parallel with dataset_preprocesser
model_training               ← depends on dataset_preprocesser output
final_model_selector         ← depends on model_training output
model_parameter_tunner       ← depends on final_model_selector output
model_extractor              ← depends on model_parameter_tunner output
```

### Intermediate State Storage

All pipeline state is stored under `Dataset/mlops_pipeline/` (mounted inside Docker at `/opt/airflow/dataset/mlops_pipeline/`):
```
mlops_pipeline/
├── baseline_models/          ← 7 .joblib files from DAG-03
├── clf_baseline_metrics.json ← DAG-03 val metrics
├── reg_baseline_metrics.json ← DAG-03 val metrics
├── cv_results.json           ← DAG-03 cross-validation
├── clf_test_metrics.json     ← DAG-04 test metrics
├── reg_test_metrics.json     ← DAG-04 test metrics
├── model_selection.json      ← DAG-04 winner selection
└── tuned_models/             ← DAG-05 tuned .joblib + params + metrics
```

---

## DAG-RUN-STEPS ##

Complete sequential guide to running all 7 DAGs end-to-end in the correct dependency order.

---

### Prerequisites

Before triggering any DAG, confirm the stack is up and healthy:

```bash
docker compose up -d
docker compose ps
```

All three containers must show **healthy / Up**:
- `neo-database` (postgres:16-alpine) — port 5432
- `mlops-v2-airflow-webserver-1` (apache/airflow:2.7.1) — port 8080
- `mlops-v2-airflow-scheduler-1` (apache/airflow:2.7.1)

**Airflow UI:** `http://localhost:8080` — login: `airflow` / `airflow`

**neo_postgres connection** is auto-configured via the `AIRFLOW_CONN_NEO_POSTGRES` env var in `docker-compose.yml`. No manual setup needed. Verify with:
```bash
docker exec mlops-v2-airflow-scheduler-1 airflow connections get neo_postgres
```

**Required Python packages** (`scikit-learn`, `imbalanced-learn`, `optuna`, `joblib`) must be installed in the Airflow container before running DAG-01 through DAG-06. Install once:
```bash
docker exec mlops-v2-airflow-scheduler-1 pip install scikit-learn imbalanced-learn optuna joblib
```

---

### DAG Dependency Map

```
STEP 1: dataset_preprocesser
            └── (auto-triggers) csv_to_postgres
STEP 2: feature_transformer       ← after Step 1 fully green
STEP 3: model_training            ← after Step 1 fully green
STEP 4: final_model_selector      ← after Step 3 fully green
STEP 5: model_parameter_tunner    ← after Step 4 fully green
STEP 6: model_extractor           ← after Step 5 fully green
```

Note: Steps 2 and 3 can run in parallel once Step 1 is complete.

---

### How to Unpause and Trigger a DAG

**Via UI:**
1. Open `http://localhost:8080`
2. Find the DAG row
3. Click the **toggle switch** on the left to unpause it (turns blue)
4. Click the **▶ Trigger DAG** button (play icon on the right)
5. Click **Trigger** in the confirmation dialog

**Via CLI:**
```bash
# Unpause
docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause <dag_id>

# Trigger
docker exec mlops-v2-airflow-scheduler-1 airflow dags trigger <dag_id>
```

**Check task states:**
```bash
docker exec mlops-v2-airflow-scheduler-1 \
  airflow dags list-runs --dag-id <dag_id>
```

**A DAG run is successful when all its tasks show green (success) in the UI grid view.**

---

### STEP 1 — Run `dataset_preprocesser` + `csv_to_postgres`

**DAG ID:** `dataset_preprocesser`
**What happens:** Preprocesses `Dataset/Raw/neo.csv` → saves 12 CSVs + 2 scalers to `Dataset/Processed/` → automatically triggers `csv_to_postgres` which loads raw data into the `NearEarthObject` PostgreSQL table.

```bash
docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause dataset_preprocesser
docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause csv_to_postgres
docker exec mlops-v2-airflow-scheduler-1 airflow dags trigger dataset_preprocesser
```

**Tasks to watch (in order):**
1. `preprocess_dataset` — ~5–10 min (SMOTE on 90K rows)
2. `trigger_csv_to_postgres` — triggers sub-DAG, waits for it to complete

**Verify success:**
```bash
# Processed files exist
ls Dataset/Processed/

# Postgres has data
docker exec neo-database psql -U mlops -d mlops -c 'SELECT COUNT(*) FROM "NearEarthObject";'
# Expected: 90836
```

**Do NOT proceed to Step 2 or 3 until this DAG is fully green.**

---

### STEP 2 — Run `feature_transformer`

**DAG ID:** `feature_transformer`
**Depends on:** Step 1 complete (needs `NearEarthObject` table populated by `csv_to_postgres`)
**What happens:** Engineers 6 features from raw data, creates `NearEarthObjectNewFeatures` table, bulk-inserts 90,836 rows in batches of 1,000.

```bash
docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause feature_transformer
docker exec mlops-v2-airflow-scheduler-1 airflow dags trigger feature_transformer
```

**Tasks to watch (in order):**
1. `create_features_table` — creates table if not exists (~seconds)
2. `transform_and_store_features` — inserts 90K rows (~10–15 min)

**Verify success:**
```bash
docker exec neo-database psql -U mlops -d mlops \
  -c 'SELECT COUNT(*) FROM "NearEarthObjectNewFeatures";'
# Expected: 90836
```

---

### STEP 3 — Run `model_training`

**DAG ID:** `model_training`
**Depends on:** Step 1 complete (needs all CSV files in `Dataset/Processed/`)
**Can run in parallel with:** Step 2
**What happens:** Trains 4 classifiers + 3 regressors as baselines, runs 5-fold cross-validation on top-2 of each. Saves 7 `.joblib` model files and 3 metrics JSON files.

```bash
docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause model_training
docker exec mlops-v2-airflow-scheduler-1 airflow dags trigger model_training
```

**Tasks to watch:**
1. `train_classifiers` + `train_regressors` — run in parallel (~20–40 min each, SVC is slowest)
2. `run_cross_validation` — runs after both complete (~10–15 min)

**Verify success:**
```bash
ls Dataset/mlops_pipeline/baseline_models/
# Expected: 7 .joblib files
# LogisticRegression_clf.joblib, RandomForestClassifier_clf.joblib,
# GradientBoostingClassifier_clf.joblib, SVC_clf.joblib,
# LinearRegression_reg.joblib, RandomForestRegressor_reg.joblib,
# GradientBoostingRegressor_reg.joblib

cat Dataset/mlops_pipeline/clf_baseline_metrics.json
cat Dataset/mlops_pipeline/reg_baseline_metrics.json
```

---

### STEP 4 — Run `final_model_selector`

**DAG ID:** `final_model_selector`
**Depends on:** Step 3 complete (needs the 7 baseline `.joblib` files)
**What happens:** Evaluates all baseline models on the sealed test set for the first time. Ranks classifiers by `(F1 + AUC) / 2` and regressors by R². Writes `model_selection.json` with the winning model names.

```bash
docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause final_model_selector
docker exec mlops-v2-airflow-scheduler-1 airflow dags trigger final_model_selector
```

**Tasks to watch:**
1. `evaluate_classifiers_on_test` + `evaluate_regressors_on_test` — run in parallel (~5 min each)
2. `select_best_models` — runs after both complete (~seconds)

**Verify success:**
```bash
cat Dataset/mlops_pipeline/model_selection.json
# Expected: JSON with "best_classifier" and "best_regressor" keys
# Likely: GradientBoostingClassifier + GradientBoostingRegressor
```

---

### STEP 5 — Run `model_parameter_tunner`

**DAG ID:** `model_parameter_tunner`
**Depends on:** Step 4 complete (needs `model_selection.json`)
**What happens:** Runs Optuna TPE hyperparameter tuning (50 trials each) on the selected best classifier and regressor. Retrains final models on train+val combined, evaluates on test set.

```bash
docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause model_parameter_tunner
docker exec mlops-v2-airflow-scheduler-1 airflow dags trigger model_parameter_tunner
```

**Tasks to watch:**
1. `tune_classifier` + `tune_regressor` — run in parallel (~20–40 min each, 50 Optuna trials)
2. `evaluate_tuned_models` — runs after both complete (~2 min)

**Verify success:**
```bash
ls Dataset/mlops_pipeline/tuned_models/
# Expected: tuned_classifier.joblib, tuned_regressor.joblib,
#           best_clf_params.json, best_reg_params.json, tuned_test_metrics.json

cat Dataset/mlops_pipeline/tuned_models/tuned_test_metrics.json
# Shows final F1, AUC, R2, RMSE values
```

---

### STEP 6 — Run `model_extractor`

**DAG ID:** `model_extractor`
**Depends on:** Step 5 complete (needs all files in `tuned_models/`)
**What happens:** Copies tuned models + scalers to `models/artifacts/`, generates `feature_names.json` and `model_metadata.json`, runs an end-to-end smoke test on the final artifacts.

```bash
docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause model_extractor
docker exec mlops-v2-airflow-scheduler-1 airflow dags trigger model_extractor
```

**Tasks to watch (in order):**
1. `verify_tuned_models` — checks all required files exist (~seconds)
2. `extract_artifacts` — copies files + generates metadata (~seconds)
3. `smoke_test_artifacts` — runs a full inference pass with a test asteroid (~seconds)

**Verify success:**
```bash
ls models/artifacts/
# Expected: classifier.joblib, regressor.joblib,
#           scaler_clf.joblib, scaler_reg.joblib,
#           feature_names.json, model_metadata.json

cat models/artifacts/model_metadata.json
# Shows trained_at timestamp, best hyperparams, test F1/R2
```

---

### Full Pipeline CLI — One-Shot (Run All in Sequence)

```bash
# Install ML packages into the Airflow container
docker exec mlops-v2-airflow-scheduler-1 \
  pip install scikit-learn imbalanced-learn optuna joblib

# Unpause all DAGs
docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause csv_to_postgres
docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause dataset_preprocesser
docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause feature_transformer
docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause model_training
docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause final_model_selector
docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause model_parameter_tunner
docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause model_extractor

# STEP 1: Trigger entry point (auto-triggers csv_to_postgres)
docker exec mlops-v2-airflow-scheduler-1 airflow dags trigger dataset_preprocesser
# Wait for dataset_preprocesser to show SUCCESS in UI before continuing

# STEP 2 + 3 (parallel — trigger both after Step 1 is green)
docker exec mlops-v2-airflow-scheduler-1 airflow dags trigger feature_transformer
docker exec mlops-v2-airflow-scheduler-1 airflow dags trigger model_training
# Wait for model_training to show SUCCESS before continuing

# STEP 4
docker exec mlops-v2-airflow-scheduler-1 airflow dags trigger final_model_selector
# Wait for SUCCESS

# STEP 5
docker exec mlops-v2-airflow-scheduler-1 airflow dags trigger model_parameter_tunner
# Wait for SUCCESS

# STEP 6
docker exec mlops-v2-airflow-scheduler-1 airflow dags trigger model_extractor
# Wait for SUCCESS — pipeline complete
```

---

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| DAG shows import error | ML packages not installed in container | `docker exec mlops-v2-airflow-scheduler-1 pip install scikit-learn imbalanced-learn optuna joblib` |
| `feature_transformer` fails on FK violation | `NearEarthObject` table empty | Re-run `dataset_preprocesser` (Step 1) first |
| `model_training` fails — file not found | `Dataset/Processed/` missing | Re-run `dataset_preprocesser` (Step 1) first |
| `final_model_selector` fails — joblib not found | baseline_models/ missing | Re-run `model_training` (Step 3) first |
| `model_parameter_tunner` fails — model_selection.json missing | selection file not written | Re-run `final_model_selector` (Step 4) first |
| `model_extractor` fails — verify step | tuned_models/ incomplete | Re-run `model_parameter_tunner` (Step 5) first |
| Tasks stay in `queued` forever | Scheduler not running | `docker compose restart airflow-scheduler` |
| `trigger_csv_to_postgres` stuck | csv_to_postgres DAG still paused | `docker exec mlops-v2-airflow-scheduler-1 airflow dags unpause csv_to_postgres` |

---

### Expected Total Runtime

| DAG | Estimated Duration |
|---|---|
| `dataset_preprocesser` (incl. csv_to_postgres) | 15–25 min |
| `feature_transformer` | 10–15 min |
| `model_training` | 40–70 min |
| `final_model_selector` | 5–10 min |
| `model_parameter_tunner` | 30–60 min |
| `model_extractor` | < 2 min |
| **Total (sequential)** | **~100–180 min** |

---

## TASK-06 ##

- Task Context: The Next.js frontend is unable to connect to the FastAPI backend and the Airflow dashboard.
- Go through the project and fix all connectivity issues between the frontend, FastAPI server, and Airflow dashboard.

## TASK-06 FINISHED NOTES ##

### Issues Found

#### Issue 1 — `docker-compose.yml` & `neo-app/Dockerfile`: Production domain URLs baked into the frontend bundle

**File:** `docker-compose.yml` (lines 72–73) and `neo-app/Dockerfile` (lines 10–13)

The docker-compose passed `http://reddx.me/api` and `http://reddx.me/airflow` as Docker build args for `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_AIRFLOW_URL`. Because Next.js bakes `NEXT_PUBLIC_*` variables into the JavaScript bundle at build time (not runtime), every browser running the app would try to fetch data from the production domain `reddx.me` — even when running locally. If `reddx.me` is not deployed or reachable from the developer's machine, every API call and the Airflow redirect button would fail with a network error.

The same hardcoded fallbacks (`http://localhost:8000` for the API, `http://localhost/airflow` for Airflow) were set in the Dockerfile's `ARG` defaults, meaning manual Docker image builds without passing build args would point the API client directly at port 8000 and bypass nginx entirely.

#### Issue 2 — `nginx.conf`: NextAuth `/api/auth/` routes hijacked by FastAPI

**File:** `nginx.conf` (location `/api/`)

The nginx `/api/` location block matched **all** paths beginning with `/api/`, including `/api/auth/...` which is the NextAuth callback and session route handled by Next.js itself (`app/api/auth/[...nextauth]/route.ts`). nginx forwarded these requests to the FastAPI container, which has no knowledge of authentication routes, causing login/session calls to return 404 or unexpected errors.

#### Issue 3 — `api-server/app.py`: CORS `allow_origins` missing the production domain

**File:** `api-server/app.py` (CORS middleware)

The FastAPI CORS middleware only listed `http://localhost:3000` and `http://localhost` as allowed origins. When the application is deployed at `http://reddx.me` and the browser makes a cross-origin request (e.g., during development when the Next.js dev server runs on a different port, or when the API URL differs from the page origin), requests from `http://reddx.me` or `https://reddx.me` would be blocked by the browser with a CORS error.

---

### Changes Made

#### 1. `docker-compose.yml`

Changed the `neo-app` build args from hardcoded production domain URLs to relative paths:

```yaml
# Before
args:
  NEXT_PUBLIC_API_URL: http://reddx.me/api
  NEXT_PUBLIC_AIRFLOW_URL: http://reddx.me/airflow

# After
args:
  NEXT_PUBLIC_API_URL: /api
  NEXT_PUBLIC_AIRFLOW_URL: /airflow
```

Relative paths (`/api`, `/airflow`) work on any host because the browser prepends its current origin. Locally the browser is at `http://localhost`, so `/api/predict` becomes `http://localhost/api/predict`, which nginx routes to the FastAPI container. In production the browser is at `http://reddx.me`, so the same relative path becomes `http://reddx.me/api/predict`. No rebuild is required when switching environments.

#### 2. `neo-app/Dockerfile`

Updated the `ARG` defaults to match the relative-URL approach:

```dockerfile
# Before
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_AIRFLOW_URL=http://localhost/airflow

# After
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_AIRFLOW_URL=/airflow
```

This ensures that a manual `docker build` of the neo-app image (without passing build args) also produces a bundle that routes through nginx at `/api/` rather than hitting port 8000 directly.

#### 3. `neo-app/.env` & `neo-app/.env.example`

Updated both files to use relative URLs, consistent with the docker-compose and Dockerfile changes:

```env
# Before
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_AIRFLOW_URL=http://localhost/airflow

# After
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_AIRFLOW_URL=/airflow
```

This ensures `npm run dev` (local Next.js dev server, reading the `.env` file) also uses relative paths, so it works on any machine regardless of the port nginx is on.

#### 4. `nginx.conf`

Added a more-specific `/api/auth/` location block **above** the existing `/api/` block so NextAuth routes are sent to the Next.js container instead of FastAPI:

```nginx
# Added — must appear before /api/ so nginx matches it first
location /api/auth/ {
    proxy_pass         http://neo_app/api/auth/;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade           $http_upgrade;
    proxy_set_header   Connection        'upgrade';
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Existing — now only matches non-auth /api/ paths
location /api/ {
    proxy_pass http://api_server/;
    ...
}
```

nginx uses longest-prefix matching, so `/api/auth/` takes precedence over `/api/` for all auth-related requests.

#### 5. `api-server/app.py`

Added the production domain to the CORS `allow_origins` list:

```python
# Before
allow_origins=["http://localhost:3000", "http://localhost"]

# After
allow_origins=[
    "http://localhost:3000",
    "http://localhost",
    "http://reddx.me",
    "https://reddx.me",
]
```

This covers both HTTP and HTTPS variants of the production domain so the FastAPI server accepts browser requests from any expected origin.

---

### How to Apply

Rebuild only the neo-app image (the only image whose bundle changed) and restart the stack:

```bash
docker compose build neo-app
docker compose up -d
```

nginx and the api-server pick up their config/code changes automatically on restart without a full rebuild.

---

## TASK-07 ##

- Task Context: Host the application on an AWS EC2 machine and make it publicly accessible at `http://spacesearch.reddx.me`.
- Document every file change and infrastructure step required to go from local docker-compose to a live AWS deployment.

## TASK-07 FINISHED NOTES ##

### Overview

The application runs entirely inside Docker Compose. Hosting it on AWS requires:
1. Pointing the subdomain DNS to the EC2 instance
2. Opening the right ports in the AWS Security Group
3. Changing four hardcoded values across three project files so the app knows its public URL
4. Installing Docker on the EC2 instance and starting the stack

---

### Step 1 — Launch and configure the EC2 instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Choose **Ubuntu 24.04 LTS** (or Amazon Linux 2023), instance type **t3.medium** or larger (the ML models need RAM)
3. Create or select a key pair — download the `.pem` file
4. Under **Network Settings → Security Group**, add the following inbound rules:

| Type | Protocol | Port | Source | Purpose |
|---|---|---|---|---|
| SSH | TCP | 22 | Your IP | Remote access |
| HTTP | TCP | 80 | 0.0.0.0/0 | Public web traffic |
| Custom TCP | TCP | 8080 | Your IP | Airflow UI direct access (optional) |

> Port 443 (HTTPS) is only needed if you later add an SSL certificate. Leave it closed for now.

5. Launch the instance and note the **public IPv4 address** (e.g. `3.x.x.x`).

---

### Step 2 — Point the subdomain DNS to the EC2 instance

In your DNS provider (wherever `reddx.me` is managed — e.g. Cloudflare, Route 53, Namecheap):

1. Add an **A record**:
   - **Name:** `spacesearch`
   - **Value:** the EC2 public IPv4 address (e.g. `3.x.x.x`)
   - **TTL:** 300 (5 min)
2. Wait for propagation (usually under 5 minutes with a low TTL)
3. Verify: `nslookup spacesearch.reddx.me` should return the EC2 IP

> If you use Cloudflare, keep the proxy toggle **off** (grey cloud) while setting up — turn it on later if you want Cloudflare CDN/DDoS protection.

---

### Step 3 — Install Docker on the EC2 instance

SSH into the instance:

```bash
ssh -i your-key.pem ubuntu@spacesearch.reddx.me
```

Install Docker and Docker Compose:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker ubuntu
newgrp docker
```

Verify:

```bash
docker --version
docker compose version
```

---

### Step 4 — Copy the project to the EC2 instance

Either clone from GitHub or `scp` the project:

```bash
# Option A — clone (if repo is on GitHub)
git clone https://github.com/<your-org>/Space-Search.git
cd Space-Search

# Option B — copy from local machine
scp -i your-key.pem -r /path/to/Space-Search ubuntu@spacesearch.reddx.me:~/
```

---

### Step 5 — Make the required file changes

These are the only project files that contain the deployment URL and must be updated before building the Docker images.

#### 5a. `nginx.conf` — `server_name`

```nginx
# Before (local dev)
server_name localhost;

# After (AWS production)
server_name spacesearch.reddx.me;
```

nginx uses `server_name` to match incoming HTTP requests. Without the correct value, browsers may get a 404 or be served the wrong virtual host when the EC2 instance runs multiple sites.

#### 5b. `docker-compose.yml` — two values

**`AIRFLOW__WEBSERVER__BASE_URL`** (line 11, inside `x-airflow-common` environment block):

```yaml
# Before
AIRFLOW__WEBSERVER__BASE_URL: 'http://reddx.me/airflow'

# After
AIRFLOW__WEBSERVER__BASE_URL: 'http://spacesearch.reddx.me/airflow'
```

Airflow uses this URL to construct redirect links and static asset paths. If it is wrong, the Airflow UI loads broken CSS/JS after nginx proxies it.

**`NEXTAUTH_URL`** (line 79, inside the `neo-app` service environment block):

```yaml
# Before
NEXTAUTH_URL: http://reddx.me

# After
NEXTAUTH_URL: http://spacesearch.reddx.me
```

NextAuth uses this as the base URL for OAuth callback URLs and CSRF cookie scoping. Mismatched values cause sign-in redirects to fail or cookies to be rejected.

#### 5c. `api-server/app.py` — CORS `allow_origins`

```python
# Before
allow_origins=[
    "http://localhost:3000",
    "http://localhost",
    "http://reddx.me",
    "https://reddx.me",
]

# After
allow_origins=[
    "http://localhost:3000",
    "http://localhost",
    "http://reddx.me",
    "https://reddx.me",
    "http://spacesearch.reddx.me",
    "https://spacesearch.reddx.me",
]
```

The browser sends the page origin (`http://spacesearch.reddx.me`) in the `Origin` header on every API request. If it is not in this list, FastAPI's CORS middleware rejects the response and the browser blocks it.

#### 5d. `neo-app/.env.example` — `NEXTAUTH_URL` (documentation only)

```env
# Before
NEXTAUTH_URL=http://reddx.me

# After
NEXTAUTH_URL=http://spacesearch.reddx.me
```

This file is not used at runtime but should match so anyone copying it to `.env` locally gets correct values.

> **Note:** `neo-app/.env` (local dev file) does **not** need to change — it keeps `NEXTAUTH_URL=http://localhost` for local development. The docker-compose `environment:` block overrides it at runtime inside the container.

> **Note:** `NEXT_PUBLIC_API_URL=/api` and `NEXT_PUBLIC_AIRFLOW_URL=/airflow` are already relative paths (fixed in TASK-06) and need no changes — they work on any domain automatically.

---

### Step 6 — Build and start the stack

```bash
cd ~/Space-Search

# Build all images (neo-app bundle gets baked with the correct env vars)
docker compose build

# Start all services in the background
docker compose up -d

# Check all containers are healthy
docker compose ps
```

All containers should show **Up** or **healthy**:
- `neo-database`
- `neo-nginx`
- `neo-app`
- `api-server`
- `airflow-webserver`
- `airflow-scheduler`

---

### Step 7 — Verify the deployment

| URL | Expected result |
|---|---|
| `http://spacesearch.reddx.me` | Next.js dashboard loads, API status dot turns green |
| `http://spacesearch.reddx.me/api/` | `{"message":"server is up and running","healthy":true}` |
| `http://spacesearch.reddx.me/airflow` | Redirects to `/airflow/` — Airflow login page loads |
| `http://spacesearch.reddx.me/predict` | Prediction form loads and returns results |

---

### Complete diff of all changed lines

| File | Line(s) | Old value | New value |
|---|---|---|---|
| `nginx.conf` | 26 | `server_name localhost;` | `server_name spacesearch.reddx.me;` |
| `docker-compose.yml` | 11 | `'http://reddx.me/airflow'` | `'http://spacesearch.reddx.me/airflow'` |
| `docker-compose.yml` | 79 | `http://reddx.me` | `http://spacesearch.reddx.me` |
| `api-server/app.py` | 49–55 | 4 origins | 6 origins (+ spacesearch variants) |
| `neo-app/.env.example` | 5 | `http://reddx.me` | `http://spacesearch.reddx.me` |

---

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Site unreachable after DNS change | DNS not propagated yet | Wait 5 min, check with `nslookup spacesearch.reddx.me` |
| Site unreachable — DNS resolves fine | Port 80 blocked by Security Group | Add inbound rule for TCP 80 from 0.0.0.0/0 |
| Airflow UI loads but CSS is broken | `AIRFLOW__WEBSERVER__BASE_URL` still set to old domain | Update docker-compose.yml and run `docker compose up -d` |
| Sign-in redirects to wrong URL | `NEXTAUTH_URL` still set to old domain | Update docker-compose.yml and run `docker compose up -d` |
| API calls fail with CORS error | `spacesearch.reddx.me` not in FastAPI `allow_origins` | Update `api-server/app.py`, rebuild: `docker compose build api-server && docker compose up -d` |
| `docker compose` command not found | Docker Compose plugin not installed | Run `sudo apt install docker-compose-plugin` |
| Containers exit immediately | Not enough RAM for ML models | Upgrade to t3.medium (4 GB) or larger |