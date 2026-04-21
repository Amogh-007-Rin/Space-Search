# Final-model.ipynb — Notebook Context

## Purpose
The final stage of the ML pipeline. Loads all trained artifacts, verifies them with a smoke test, builds and documents the unified `predict_asteroid` inference function, produces publication-quality final visualisations, defines the FastAPI integration interface, and presents a summary metrics table. This notebook is the bridge between the trained models and the production API.

---

## Theory Summary

### Model Inference Pipeline
At deployment time, the model receives raw input values and must produce predictions. The inference pipeline must exactly replicate every transformation applied during training — in the same order, using the same fitted parameters (scaler means, stds). Any deviation produces wrong predictions.

The `predict_asteroid` function encapsulates this pipeline end-to-end:
```
raw inputs → feature engineering → scale → predict → inverse transform
```

### Inverse Log Transform
The regression model was trained to predict `log_miss_distance = log1p(miss_distance)`. The model's output is therefore in log-space. To convert back to km:
```python
miss_distance_km = np.expm1(log_miss_distance_prediction)
```
`np.expm1(x)` computes `eˣ - 1`, which is the exact inverse of `np.log1p(x) = log(1 + x)`. This gives the predicted miss distance in the original unit (km), which is human-interpretable.

### Probability Calibration Consideration
The classifier's `predict_proba` outputs a probability score between 0 and 1. Gradient Boosting classifiers are generally not perfectly calibrated (the raw probability may not equal the true empirical frequency of that class). However, for this application — risk assessment and visualisation — the probability is used as a relative confidence score, not a precisely calibrated probability, so this is acceptable.

### FastAPI Lifespan Pattern
Loading ML models takes 100ms–2s depending on model size. Loading them on every prediction request would be catastrophically slow. The **lifespan context manager** pattern in FastAPI loads models once at application startup and stores them in a shared dict:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    models['clf'] = joblib.load(...)   # Runs once at startup
    yield                              # App handles requests here
    models.clear()                     # Runs once at shutdown
```
All subsequent prediction requests read from `models` directly from memory — microseconds vs. seconds.

### Confusion Matrix Display
`ConfusionMatrixDisplay` (sklearn) renders a confusion matrix with labelled axes directly onto a matplotlib Axes object. Unlike `seaborn.heatmap` (used in Experimentation), `ConfusionMatrixDisplay` shows raw counts (not normalised fractions), giving the absolute number of predictions in each cell, which is more meaningful for final reporting.

### Predicted vs. Actual Scatter Plot
For regression evaluation, plotting predicted values (y-axis) vs. actual values (x-axis) shows how closely the model's predictions track reality. The diagonal line `y = x` (perfect fit) acts as a reference. Points clustering tightly around this line indicate high accuracy. Systematic deviations (all points above or below the line in certain ranges) indicate bias.

The km-scale version of this plot is more interpretable than the log-scale version, but the R² metric should be calculated in log-space (the trained space) for comparability with training metrics.

---

## Cell-by-Cell Explanation

### Cell 0 — Markdown: Notebook Title

### Cell 1 — Imports
```python
import pandas as pd, numpy as np, json, joblib, warnings
import matplotlib.pyplot as plt, seaborn as sns
from sklearn.metrics import (confusion_matrix, ConfusionMatrixDisplay,
                              roc_curve, roc_auc_score, mean_squared_error, r2_score)

ARTIFACT_DIR = 'artifacts/'
DATA_DIR     = '../Dataset/Processed-Dataset/'
```
**What it does:** Imports all required libraries. Both artifact and data directories are set as constants. The test set CSVs are needed for the visualisation cells.

---

### Cell 2 — Markdown: Load Artifacts
### Cell 3 — Load and Verify Artifacts
```python
clf        = joblib.load(f'{ARTIFACT_DIR}classifier.joblib')
reg        = joblib.load(f'{ARTIFACT_DIR}regressor.joblib')
scaler_clf = joblib.load(f'{ARTIFACT_DIR}scaler_clf.joblib')
scaler_reg = joblib.load(f'{ARTIFACT_DIR}scaler_reg.joblib')

with open(f'{ARTIFACT_DIR}feature_names.json') as f:
    feature_names = json.load(f)
with open(f'{ARTIFACT_DIR}model_metadata.json') as f:
    metadata = json.load(f)

CLF_FEATURES = feature_names['clf_features']
REG_FEATURES = feature_names['reg_features']

print(f'Classifier: {metadata["classifier"]["model"]}')
print(f'Test F1:    {metadata["classifier"]["test_f1_weighted"]}')
...
```
**What it does:**
- Loads all 6 artifacts from `model/artifacts/` using `joblib.load` and `json.load`
- Extracts the feature name lists from `feature_names.json` into two Python lists
- Prints a summary from the metadata to confirm the correct models were loaded and display their performance

**Verification principle:** Always confirm artifacts load correctly before building the inference function. If a file is missing or corrupted, this cell fails immediately with a clear error rather than producing silent wrong predictions later.

---

### Cell 4 — Markdown: Prediction Function Description
### Cell 5 — `predict_asteroid` Function + Smoke Test
```python
def predict_asteroid(
    est_diameter_min: float,
    est_diameter_max: float,
    relative_velocity: float,
    absolute_magnitude: float,
    miss_distance: float,
) -> dict:
    # 1. Feature engineering
    diameter_avg          = (est_diameter_min + est_diameter_max) / 2
    diameter_ratio        = est_diameter_max / est_diameter_min
    log_diameter_avg      = np.log1p(diameter_avg)
    log_diameter_ratio    = np.log1p(diameter_ratio)
    log_relative_velocity = np.log1p(relative_velocity)
    log_miss_distance     = np.log1p(miss_distance)

    # 2. Build feature DataFrames in training order
    clf_input = pd.DataFrame([[...]], columns=CLF_FEATURES)
    reg_input = pd.DataFrame([[...]], columns=REG_FEATURES)

    # 3. Scale (using same fitted scalers from training)
    clf_scaled = scaler_clf.transform(clf_input)
    reg_scaled = scaler_reg.transform(reg_input)

    # 4. Predict
    hazardous_label       = bool(clf.predict(clf_scaled)[0])
    hazardous_probability = float(clf.predict_proba(clf_scaled)[0, 1])
    miss_distance_km      = float(np.expm1(reg.predict(reg_scaled)[0]))

    # 5. Return structured output
    return {
        'hazardous':             hazardous_label,
        'hazardous_probability': round(hazardous_probability, 4),
        'miss_distance_km':      round(miss_distance_km, 2),
    }

# Smoke test
result = predict_asteroid(
    est_diameter_min=0.12, est_diameter_max=0.27,
    relative_velocity=48000.0, absolute_magnitude=22.1,
    miss_distance=14_500_000.0,
)
```
**What it does:**

**The function itself** implements the full inference pipeline as a single callable:

1. **Feature engineering** — replicates all transformations from `Pre-processing.ipynb` exactly. If this step diverged from training, predictions would be wrong even if the model is correct.

2. **DataFrame construction with named columns** — creates DataFrames using `CLF_FEATURES` and `REG_FEATURES` (loaded from `feature_names.json`). Named columns ensure the features are in the exact order the scaler and model expect.

3. **`.transform()` (not `.fit_transform()`)** — applies the scaler's pre-fitted mean and std. Never re-fit on inference data.

4. **`clf.predict()[0]`** — returns the hard label (0 or 1); `[0]` extracts the scalar from the single-row prediction array. `bool()` converts 0/1 to Python True/False.

5. **`clf.predict_proba()[0, 1]`** — probability of the positive class (hazardous=1). `[0]` is the first (only) row; `[1]` is the second column (positive class probability).

6. **`np.expm1(reg.predict()[0])`** — inverse log-transform to convert the regressor's log-space output back to km.

**The smoke test** runs `predict_asteroid` with a concrete example to verify the entire pipeline works end-to-end. If any step fails (wrong feature order, missing scaler, etc.), it surfaces here rather than in production.

---

### Cell 6 — Markdown: Final Visualisations
### Cell 7 — Three-Panel Final Evaluation Plot
```python
# Panel 1: Confusion Matrix
cm = confusion_matrix(y_test_clf, y_pred_clf)
ConfusionMatrixDisplay(cm, display_labels=['Safe','Hazardous']).plot(ax=axes[0], cmap='Blues')

# Panel 2: ROC Curve
fpr, tpr, _ = roc_curve(y_test_clf, y_proba_clf)
auc = roc_auc_score(y_test_clf, y_proba_clf)
axes[1].plot(fpr, tpr, label=f'AUC = {auc:.3f}')
axes[1].plot([0,1],[0,1], 'k--')

# Panel 3: Predicted vs. Actual miss distance (km)
y_test_km = np.expm1(y_test_reg.values)
y_pred_km = np.expm1(y_pred_reg)
axes[2].scatter(y_test_km / 1e6, y_pred_km / 1e6, alpha=0.2, s=5)
axes[2].plot([0, max_km], [0, max_km], 'r--', label='Perfect fit')
```
**What it does:** Creates a 3-panel figure (18×5 inches) for final model reporting:

**Panel 1 — Confusion Matrix (test set, raw counts):**
Shows the absolute count of:
- True Negatives (top-left): correctly predicted safe
- False Positives (top-right): predicted hazardous but actually safe
- False Negatives (bottom-left): predicted safe but actually hazardous ← most dangerous error
- True Positives (bottom-right): correctly predicted hazardous

**Panel 2 — ROC Curve:**
The ROC curve on the held-out test set with the AUC annotation. The closer the curve to the top-left corner, the better the classifier at all thresholds.

**Panel 3 — Predicted vs. Actual Miss Distance:**
- X-axis: actual miss distance (million km)
- Y-axis: predicted miss distance (million km)
- Dividing by `1e6` converts km to million km for readability
- `alpha=0.2, s=5` — semi-transparent tiny dots prevent overplotting with 13K+ test points
- Red diagonal: perfect prediction line
- Title includes the R² value for the test set

---

### Cell 8 — Feature Importance Comparison
```python
pd.Series(clf.feature_importances_, index=CLF_FEATURES).sort_values().plot(kind='barh', color='steelblue')
pd.Series(reg.feature_importances_, index=REG_FEATURES).sort_values().plot(kind='barh', color='coral')
```
**What it does:** Side-by-side horizontal bar charts comparing feature importance between the classifier and regressor. Both plots are sorted ascending so the most important feature appears at the top.

**What to look for:**
- Features important to both models are fundamental physical drivers
- Features important to only one model reveal task-specific signals (e.g., `log_miss_distance` is only in the classifier)
- Very low importance features could be candidates for removal in future model iterations

---

### Cell 9 — Markdown: FastAPI Integration Reference
**What it does:** A documentation cell containing the complete `server/app.py` implementation as a Python code block. This cell is **not executable** — it serves as a reference showing exactly how the deployed API uses the prediction function. Key components documented:

- `AsteroidInput` Pydantic model — validates and parses the JSON request body
- `PredictionOutput` Pydantic model — defines the response schema with type annotations
- `lifespan` context manager — loads all 5 artifacts at startup, clears on shutdown
- `POST /api/predict` endpoint — calls the feature engineering and prediction logic

The FastAPI endpoint mirrors `predict_asteroid()` but operates on a `body: AsteroidInput` object and returns a `PredictionOutput` object.

---

### Cell 10 — Markdown: Metrics Summary
### Cell 11 — Final Metrics Table
```python
summary = pd.DataFrame([
    {'Task': 'Classification', 'Metric': 'F1 (weighted)',  'Value': metadata['classifier']['test_f1_weighted']},
    {'Task': 'Classification', 'Metric': 'AUC-ROC',        'Value': metadata['classifier']['test_auc_roc']},
    {'Task': 'Regression',     'Metric': 'R2',             'Value': metadata['regressor']['test_r2']},
    {'Task': 'Regression',     'Metric': 'RMSE (log)',     'Value': metadata['regressor']['test_rmse_log']},
    {'Task': 'Regression',     'Metric': 'RMSE (km)',      'Value': f"{int(metadata['regressor']['test_rmse_km']):,}"},
])
print(summary.to_string(index=False))
```
**What it does:** Reads all key test-set metrics from the `model_metadata.json` file (populated during `Model-training.ipynb`) and presents them in a clean tabular format. This acts as the official model card metrics table.

The values come from `metadata` rather than being recomputed — this ensures the summary always reflects the same evaluation that was recorded when the models were saved, providing a stable reference.

---

## End-to-End Output of this Notebook

**No new files are saved** — all artifacts were already written by `Model-training.ipynb`. This notebook's outputs are:

1. Verified artifact loading (console confirmation)
2. `predict_asteroid()` function defined in memory (used as the API function)
3. Three final evaluation plots
4. Feature importance comparison plots
5. FastAPI reference implementation (documentation)
6. Final metrics summary table

---

## API Contract Summary

| Field | Direction | Type | Description |
|---|---|---|---|
| `est_diameter_min` | Input | float | Minimum estimated diameter in km |
| `est_diameter_max` | Input | float | Maximum estimated diameter in km |
| `relative_velocity` | Input | float | Approach velocity in km/s |
| `absolute_magnitude` | Input | float | Brightness magnitude |
| `miss_distance` | Input | float | Observed/estimated closest approach in km |
| `hazardous` | Output | bool | Whether the asteroid is classified as hazardous |
| `hazardous_probability` | Output | float | Classifier confidence (0–1) |
| `miss_distance_km` | Output | float | Predicted closest approach distance in km |
