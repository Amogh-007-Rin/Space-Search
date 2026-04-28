# Model-training.ipynb — Notebook Context

## Purpose
Takes the model selection decision from `Experimentation.ipynb` and performs rigorous hyperparameter optimisation using Optuna. Retrains the final models on the combined train+validation set, evaluates them once on the sealed test set, and saves all artifacts to `model/artifacts/` for deployment.

---

## Theory Summary

### Hyperparameter Tuning
A machine learning model has two types of parameters:
- **Learnable parameters** — weights learned from data during `model.fit()` (e.g., tree split thresholds)
- **Hyperparameters** — configuration values set before training that control the learning process (e.g., `n_estimators`, `learning_rate`, `max_depth`)

Hyperparameter tuning is the process of searching for the combination of hyperparameters that produces the best model performance on the validation set.

### Optuna and Bayesian Optimisation
**Optuna** is an automatic hyperparameter optimisation framework that uses **Tree-structured Parzen Estimator (TPE)** sampling by default.

Unlike grid search (exhaustive) or random search (uninformed), TPE is a form of **Bayesian optimisation**:
1. It builds a probabilistic model of which hyperparameter regions produce good results
2. After each trial, it updates this model
3. It uses the model to suggest the next hyperparameter combination, focusing exploration on promising regions

This makes Optuna significantly more efficient than random search — it finds good hyperparameters in fewer trials. For 50 trials on a dataset of 90K rows, Optuna typically outperforms 200+ random search trials.

**Key Optuna concepts:**
- **Study** — the optimisation session (one per model)
- **Trial** — a single evaluation with one set of hyperparameters
- **Objective function** — the function that takes a trial, trains a model, and returns a metric to optimise
- **Direction** — `maximize` for F1 (higher is better), `minimize` for RMSE (lower is better)

### Gradient Boosting Hyperparameters Being Tuned

| Hyperparameter | Search Range | Effect |
|---|---|---|
| `n_estimators` | 100–500 | Number of trees. More trees = more capacity, but slower and can overfit |
| `max_depth` | 3–8 | Maximum depth of each tree. Deeper trees learn more complex patterns but overfit more easily |
| `learning_rate` | 0.001–0.3 (log scale) | How much each tree's prediction contributes. Smaller = more conservative, more trees needed; larger = faster but less stable |
| `min_samples_split` | 2–20 | Minimum samples required to split a node. Higher values prevent learning from very small groups |
| `subsample` | 0.6–1.0 | Fraction of training samples used for each tree (stochastic gradient boosting). Values < 1.0 reduce overfitting and add randomness |

`learning_rate` is searched on a **log scale** because its effect is multiplicative — the difference between 0.001 and 0.01 is as significant as between 0.1 and 1.0.

### Train + Validation Final Training
After hyperparameter tuning, the best model is retrained on the combined training + validation set (85% of all data). The rationale:

- During tuning, the validation set was used to measure performance — this means the hyperparameters are "tuned to" the validation set to some degree
- By retraining on all available labelled data (excluding only the test set), the final model benefits from 15% more training examples
- The test set is still completely untouched and gives an unbiased estimate of generalisation performance

### The Sealed Test Set
The test set is evaluated **exactly once** — at the very end after all tuning decisions are made. This is a strict discipline in ML:
- If you evaluate on the test set multiple times while developing, you start unconsciously making decisions that improve test performance specifically, causing **optimistic bias** (the model appears to generalise better than it actually does)
- The one-time evaluation simulates what would happen when the model encounters completely new data in production

### Model Serialisation with joblib
`joblib` serialises Python objects to binary files. It is the standard tool for saving sklearn models because:
- It handles large NumPy arrays efficiently (sklearn models contain many arrays)
- Saved models can be loaded in any Python environment without re-training
- Loading is fast (milliseconds for a GBM model)

---

## Cell-by-Cell Explanation

### Cell 0 — Markdown: Notebook Title

### Cell 1 — Imports and Configuration
```python
import optuna
optuna.logging.set_verbosity(optuna.logging.WARNING)
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.metrics import f1_score, roc_auc_score, classification_report, ...

DATA_DIR     = '../Dataset/Processed-Dataset/'
ARTIFACT_DIR = 'artifacts/'
os.makedirs(ARTIFACT_DIR, exist_ok=True)
RANDOM_STATE = 42
N_TRIALS     = 50
```
**What it does:**
- Imports Optuna and the two selected model classes
- Suppresses Optuna's verbose per-trial logging (only warnings are shown; a progress bar is used instead)
- Sets `N_TRIALS = 50` — the number of Optuna trials per model
- Creates the `artifacts/` directory relative to the notebook location (`model/artifacts/`)

---

### Cell 2 — Markdown: Load Data
### Cell 3 — Load All Splits + Build Train+Val Combined
```python
X_train_clf = pd.read_csv(...)
...
X_trainval_clf = pd.concat([X_train_clf, X_val_clf], ignore_index=True)
y_trainval_clf = pd.concat([y_train_clf, y_val_clf], ignore_index=True)
```
**What it does:**
- Loads all 12 CSV files (train, val, test splits for both tasks)
- Creates `X_trainval_clf` and `X_trainval_reg` by concatenating train and validation sets — this is the dataset used to train the final model after tuning
- `ignore_index=True` resets the row index to 0, 1, 2... after concatenation (avoids duplicate index values)
- Prints shapes to confirm correctness before launching the expensive tuning step

---

### Cell 4 — Markdown: Classification Tuning
### Cell 5 — Optuna Tuning — Classifier
```python
def clf_objective(trial):
    params = {
        'n_estimators':      trial.suggest_int('n_estimators', 100, 500),
        'max_depth':         trial.suggest_int('max_depth', 3, 8),
        'learning_rate':     trial.suggest_float('learning_rate', 1e-3, 0.3, log=True),
        'min_samples_split': trial.suggest_int('min_samples_split', 2, 20),
        'subsample':         trial.suggest_float('subsample', 0.6, 1.0),
        'random_state':      RANDOM_STATE,
    }
    model = GradientBoostingClassifier(**params)
    model.fit(X_train_clf, y_train_clf)
    return f1_score(y_val_clf, model.predict(X_val_clf), average='weighted')

study_clf = optuna.create_study(direction='maximize',
                                sampler=optuna.samplers.TPESampler(seed=RANDOM_STATE))
study_clf.optimize(clf_objective, n_trials=N_TRIALS, show_progress_bar=True)

best_clf_params = {**study_clf.best_params, 'random_state': RANDOM_STATE}
```
**What it does:**

1. **`clf_objective(trial)`** — the function Optuna calls 50 times. Each call:
   - Asks the `trial` object to suggest values for each hyperparameter using the appropriate sampling method (`suggest_int`, `suggest_float`)
   - Trains a `GradientBoostingClassifier` with those parameters on the SMOTE-augmented training data
   - Returns the F1-weighted score on the validation set as the objective value

2. **`create_study(direction='maximize')`** — creates a study that tries to maximise the returned value (F1)

3. **`TPESampler(seed=RANDOM_STATE)`** — ensures reproducible tuning results

4. **`show_progress_bar=True`** — displays a tqdm progress bar showing trial count and best value so far

5. **`study_clf.best_params`** — a dict of the hyperparameter values that produced the highest validation F1 across all 50 trials

**Note on training data:** The objective function trains on `X_train_clf` (not `X_trainval_clf`). The validation set must remain unseen during tuning so it gives an unbiased measure of trial performance.

---

### Cell 6 — Markdown: Regression Tuning
### Cell 7 — Optuna Tuning — Regressor
```python
def reg_objective(trial):
    ...
    return np.sqrt(mean_squared_error(y_val_reg, model.predict(X_val_reg)))

study_reg = optuna.create_study(direction='minimize', ...)
```
**What it does:** Identical structure to the classifier tuning, but:
- Uses `GradientBoostingRegressor`
- Returns RMSE on the validation set as the objective (in log-space)
- `direction='minimize'` because lower RMSE = better regression

---

### Cell 8 — Markdown: Final Training
### Cell 9 — Final Training on Train + Validation Combined
```python
final_clf = GradientBoostingClassifier(**best_clf_params)
final_clf.fit(X_trainval_clf, y_trainval_clf)

final_reg = GradientBoostingRegressor(**best_reg_params)
final_reg.fit(X_trainval_reg, y_trainval_reg)
```
**What it does:**
- Instantiates fresh model objects with the best hyperparameters found by Optuna
- Trains on the combined train+val dataset (85% of all data)
- No tuning or evaluation happens here — pure training on maximum available data

---

### Cell 10 — Markdown: Test Evaluation
### Cell 11 — Classification Test Set Evaluation
```python
y_pred_clf  = final_clf.predict(X_test_clf)
y_proba_clf = final_clf.predict_proba(X_test_clf)[:, 1]

clf_test_f1  = f1_score(y_test_clf, y_pred_clf, average='weighted')
clf_test_auc = roc_auc_score(y_test_clf, y_proba_clf)
print(classification_report(y_test_clf, y_pred_clf, target_names=['Safe','Hazardous']))
```
**What it does:** Evaluates the final classifier on the sealed test set for the first (and only) time. Reports:
- F1-weighted score
- AUC-ROC score
- Full `classification_report` — per-class precision, recall, F1, and support (number of actual examples per class)

`classification_report` with `target_names=['Safe','Hazardous']` labels the rows by class name instead of 0/1.

### Cell 12 — Regression Test Set Evaluation
```python
y_pred_reg = final_reg.predict(X_test_reg)
reg_test_r2   = r2_score(y_test_reg, y_pred_reg)
reg_test_rmse = np.sqrt(mean_squared_error(y_test_reg, y_pred_reg))
reg_test_mae  = mean_absolute_error(y_test_reg, y_pred_reg)

# In original km scale
y_test_km = np.expm1(y_test_reg)
y_pred_km = np.expm1(y_pred_reg)
rmse_km   = np.sqrt(mean_squared_error(y_test_km, y_pred_km))
```
**What it does:**
- Evaluates the final regressor on the test set
- Reports metrics in log-space (the space the model trained in) AND in original km scale
- `np.expm1(x)` is the inverse of `np.log1p(x)` — converts log-transformed values back to km
- Reporting RMSE in km makes the error human-interpretable: "on average, the model's miss distance prediction is off by X km"

---

### Cell 13 — Markdown: Save Artifacts
### Cell 14 — Save All Artifacts
```python
joblib.dump(final_clf, f'{ARTIFACT_DIR}classifier.joblib')
joblib.dump(final_reg, f'{ARTIFACT_DIR}regressor.joblib')
shutil.copy(f'{DATA_DIR}scaler_clf.joblib', f'{ARTIFACT_DIR}scaler_clf.joblib')
shutil.copy(f'{DATA_DIR}scaler_reg.joblib', f'{ARTIFACT_DIR}scaler_reg.joblib')

feature_names = {
    'clf_features': list(X_train_clf.columns),
    'reg_features': list(X_train_reg.columns),
}
with open(f'{ARTIFACT_DIR}feature_names.json', 'w') as f:
    json.dump(feature_names, f, indent=2)

metadata = {
    'trained_at': datetime.now().isoformat(),
    'classifier': {'model': ..., 'hyperparams': best_clf_params, 'test_f1_weighted': ..., 'test_auc_roc': ...},
    'regressor':  {'model': ..., 'hyperparams': best_reg_params, 'test_r2': ..., 'test_rmse_log': ..., 'test_rmse_km': ...},
    'features': feature_names,
}
with open(f'{ARTIFACT_DIR}model_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)
```
**What it does:** Persists all deployment artifacts to `model/artifacts/`:

| Artifact | Description |
|---|---|
| `classifier.joblib` | Trained GradientBoostingClassifier (final, tuned) |
| `regressor.joblib` | Trained GradientBoostingRegressor (final, tuned) |
| `scaler_clf.joblib` | Fitted StandardScaler for classification inputs — **must be used at inference** |
| `scaler_reg.joblib` | Fitted StandardScaler for regression inputs — **must be used at inference** |
| `feature_names.json` | Ordered feature name lists for both tasks — ensures correct column order at inference |
| `model_metadata.json` | Training timestamp, best hyperparameters, and all test-set metrics |

**Why copy the scalers?** The scalers were originally saved to `Dataset/Processed-Dataset/`. Copying them to `model/artifacts/` co-locates everything the server needs so `app.py` only needs to know one directory path.

**Why save feature names?** At inference time, the server receives raw JSON input and constructs a pandas DataFrame. The feature name list ensures columns are assembled in exactly the same order the model was trained on. A column order mismatch would cause silently wrong predictions.

**Why save metadata?** The metadata file serves as a model card — it records exactly what was trained, when, with what configuration, and how it performed. This is critical for MLOps audit trails, debugging, and knowing when to retrain.

---

## Artifacts Produced

```
model/artifacts/
├── classifier.joblib       (~5-20 MB depending on n_estimators)
├── regressor.joblib        (~5-20 MB)
├── scaler_clf.joblib       (few KB)
├── scaler_reg.joblib       (few KB)
├── feature_names.json      (< 1 KB)
└── model_metadata.json     (< 2 KB)
```
