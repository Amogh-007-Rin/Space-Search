# Pre-processing.ipynb — Notebook Context

## Purpose
Transforms the raw NASA NEO CSV into clean, engineered, split, and scaled datasets ready for model training. All transformation decisions are derived from the EDA findings in `Exploration.ipynb`. Outputs 12 CSV files and 2 scaler artifacts to `Dataset/Processed-Dataset/`.

---

## Theory Summary

### Feature Engineering
Raw features often don't represent the underlying physical relationships in a form that ML models can exploit efficiently. Engineered features:
- **Log-transforms** correct right-skewed distributions by compressing the upper tail, making distributions more symmetric and closer to Gaussian. Models that rely on distance metrics (SVM, KNN) and gradient-based updates (logistic regression) perform better on near-normal features.
- **Derived ratio/average features** encode domain knowledge — the ratio of max to min diameter represents estimation uncertainty; the average diameter is a single size representative.

### Train/Validation/Test Split
The dataset is divided into three non-overlapping subsets:
- **Training set (70%)** — the model learns from this data
- **Validation set (15%)** — used for model selection and hyperparameter tuning without touching the test set
- **Test set (15%)** — evaluated once at the very end to estimate real-world performance

**Stratification** ensures each split has the same proportion of hazardous vs. non-hazardous objects as the full dataset. Without stratification, random chance could produce a val/test set with very few hazardous examples, making metrics unreliable.

### Class Imbalance and SMOTE
The `hazardous` column is imbalanced (~16-20% positive). A naive classifier that always predicts "not hazardous" would achieve ~80% accuracy while being useless. 

**SMOTE (Synthetic Minority Oversampling Technique)** generates synthetic examples of the minority class by interpolating between existing minority samples in feature space. This forces the model to learn the minority-class boundary rather than ignoring it.

**Critical rule:** SMOTE is applied only to the training set. The validation and test sets must reflect the real-world class distribution — inflating them would produce optimistic, misleading metrics.

### Feature Scaling (StandardScaler)
StandardScaler transforms each feature to zero mean and unit variance:
```
x_scaled = (x - mean) / std
```
This is essential for:
- **Logistic Regression and SVM** — directly sensitive to feature magnitude
- **Distance-based algorithms** — features with larger ranges dominate Euclidean distances

The scaler is **fit only on the training data**, then applied (transformed) to validation and test sets. Fitting on all data would constitute data leakage — the model would have seen information from the test set during training.

---

## Cell-by-Cell Explanation

### Cell 0 — Markdown: Notebook Title
**What it does:** Introductory heading describing the notebook's overall purpose.

---

### Cell 1 — Imports and Configuration
```python
import pandas as pd, numpy as np, joblib, os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import SMOTE

DATASET_PATH = '../Dataset/Raw-Dataset/neo.csv'
OUTPUT_DIR   = '../Dataset/Processed-Dataset/'
os.makedirs(OUTPUT_DIR, exist_ok=True)
RANDOM_STATE = 42
```
**What it does:**
- Imports all required libraries
- Sets the path to the raw dataset and output directory
- Creates the output directory if it doesn't exist (`exist_ok=True` prevents errors if it already exists)
- Sets `RANDOM_STATE = 42` — a fixed seed that makes all random operations (splits, SMOTE) reproducible across runs

**Libraries:**
- `joblib` — serialises Python objects (scalers, models) to disk as `.joblib` files
- `train_test_split` — splits arrays into random train/test subsets
- `StandardScaler` — zero-mean, unit-variance normalisation
- `SMOTE` — synthetic oversampling from `imbalanced-learn`

---

### Cell 2 — Markdown: Section Header

### Cell 3 — Load and Validate Raw Data
```python
df = pd.read_csv(DATASET_PATH)
assert df.shape == (90836, 10)
assert df.isnull().sum().sum() == 0
print(df['orbiting_body'].value_counts())
print(df['sentry_object'].value_counts())
```
**What it does:**
- Loads the raw CSV into a DataFrame
- Uses `assert` statements as defensive guards — if the data changes or the wrong file is loaded, the notebook fails immediately with a clear error rather than silently producing wrong results
- Prints `orbiting_body` value counts to document that it is entirely "Earth" (justifies dropping it)
- Prints `sentry_object` value counts to document its near-constant distribution (justifies dropping it)

---

### Cell 4 — Markdown: Drop Column Rationale
Documents the reason for dropping each column before the code runs.

### Cell 5 — Drop Irrelevant and Leaky Columns
```python
df.drop(columns=['id', 'name', 'orbiting_body', 'sentry_object'], inplace=True)
```
**What it does:** Removes 4 columns from the DataFrame permanently (`inplace=True`).

**Why each column is dropped:**
| Column | Reason |
|---|---|
| `id` | Database identifier — random number with no predictive signal |
| `name` | Free-text asteroid name — no numerical meaning, cannot be used as a feature without complex NLP encoding |
| `orbiting_body` | All values are "Earth" — zero variance means it adds no information and only noise |
| `sentry_object` | NASA's Sentry program flag is set based on the same hazard assessment criteria as the `hazardous` label — including it would constitute **target leakage** (the model would learn to predict the label from a feature that directly encodes the label) |

---

### Cell 6 — Markdown: Feature Engineering Theory
### Cell 7 — Feature Engineering
```python
assert (df['est_diameter_min'] > 0).all()

df['diameter_avg']          = (est_diameter_min + est_diameter_max) / 2
df['diameter_ratio']        = est_diameter_max / est_diameter_min
df['log_diameter_avg']      = np.log1p(diameter_avg)
df['log_diameter_ratio']    = np.log1p(diameter_ratio)
df['log_relative_velocity'] = np.log1p(relative_velocity)
df['log_miss_distance']     = np.log1p(miss_distance)

df.drop(columns=['est_diameter_min', 'est_diameter_max', 'relative_velocity', 'miss_distance'], inplace=True)

assert not df.isnull().any().any()
assert not np.isinf(df.select_dtypes('number').values).any()
```
**What it does:**

1. **Assertion guard** — verifies `est_diameter_min > 0` for all rows. This is required because `diameter_ratio = max/min` would produce infinity if any min value is zero. The guard makes the notebook fail fast if data quality degrades.

2. **`diameter_avg`** — arithmetic mean of min and max diameter. Represents a single best-estimate size of the asteroid. Simpler for the model to learn from than two separate correlated columns.

3. **`diameter_ratio`** — `max / min`. Represents how uncertain the diameter estimate is. A ratio close to 1 means the min and max estimates agree; a high ratio indicates wide estimation uncertainty. This is physically meaningful — poorly-constrained objects might be larger than expected.

4. **`log1p` transforms** — `np.log1p(x)` computes `log(1 + x)`, which handles zero values safely (pure `log(0)` is undefined). Applied to:
   - `diameter_avg` — right-skewed
   - `diameter_ratio` — right-skewed (ratios cluster near 2-3 but extend to ~140)
   - `relative_velocity` — spans 203 to 236,990 km/s; log-transform compresses this range
   - `miss_distance` — spans 3 orders of magnitude; **this becomes the regression target**

5. **Drop raw columns** — removes the original `est_diameter_min`, `est_diameter_max`, `relative_velocity`, `miss_distance` since they've been replaced by the engineered features. Keeping both would cause multicollinearity.

6. **Post-engineering assertions** — checks that no NaN or Inf values were accidentally introduced (edge cases like division by zero or log of negative numbers).

---

### Cell 8 — Markdown: Encode Targets
### Cell 9 — Encode Target Variables
```python
df['hazardous'] = df['hazardous'].astype(int)
print(df['hazardous'].value_counts())
print(f'Hazardous ratio: {df["hazardous"].mean():.2%}')
```
**What it does:**
- Converts the boolean `hazardous` column (True/False) to integer (1/0). scikit-learn's classifiers work with numeric arrays, not Python booleans
- Prints the class distribution and imbalance ratio to quantify how much oversampling SMOTE will need to do

---

### Cell 10 — Markdown: Feature Sets
### Cell 11 — Define Feature Sets
```python
CLF_FEATURES = ['log_diameter_avg', 'log_diameter_ratio', 'log_relative_velocity',
                 'log_miss_distance', 'absolute_magnitude', 'diameter_avg', 'diameter_ratio']

REG_FEATURES = ['log_diameter_avg', 'log_diameter_ratio', 'log_relative_velocity',
                 'absolute_magnitude', 'diameter_avg', 'diameter_ratio']
```
**What it does:** Defines two separate feature lists:

- **Classification features (7):** Includes `log_miss_distance` because the asteroid's closest approach distance is physically relevant to whether it's classified as hazardous. The model is allowed to use this signal.

- **Regression features (6):** `log_miss_distance` is excluded because it IS the target — a model cannot predict something using itself as a feature. Instead, the regressor learns to estimate miss distance from physical characteristics alone (size, velocity, brightness).

`absolute_magnitude` is kept as-is since its distribution is already well-behaved (range 9–33).

---

### Cell 12 — Markdown: Split Strategy
### Cell 13 — Stratified Train-Validation-Test Split
```python
# Split 1: 70% train, 30% temp
X_clf_train, X_clf_temp, y_clf_train, y_clf_temp = train_test_split(
    X_clf, y_clf, test_size=0.30, random_state=42, stratify=y_clf
)
# Split 2: 50/50 of temp → val and test
X_clf_val, X_clf_test, y_clf_val, y_clf_test = train_test_split(
    X_clf_temp, y_clf_temp, test_size=0.50, random_state=42, stratify=y_clf_temp
)

# Regression splits use same row indices
X_reg_train = X_reg.loc[X_clf_train.index]
...
```
**What it does:**

**Two-step split strategy** to achieve 70/15/15:
1. First split extracts 70% for training, leaving 30% as a temporary pool
2. Second split divides the 30% pool equally into validation (15%) and test (15%)

`stratify=y_clf` is passed to both splits. This tells `train_test_split` to maintain the class proportion of `y_clf` in each resulting subset. Without this, random chance could yield an unrepresentative test set.

**Regression splits share the same row indices as classification splits.** This ensures the same rows are seen together in training vs. test for both tasks, which is important for fair evaluation and consistency.

---

### Cell 14 — Markdown: SMOTE
### Cell 15 — Apply SMOTE
```python
smote = SMOTE(random_state=42)
X_clf_train_sm, y_clf_train_sm = smote.fit_resample(X_clf_train, y_clf_train)
```
**What it does:**
- Creates a SMOTE instance with fixed random seed
- Calls `fit_resample` on the training data — this generates synthetic minority-class examples and returns a new, balanced training set
- The original `X_clf_train` and `y_clf_train` are replaced by the SMOTE-augmented versions

**How SMOTE works:** For each minority-class sample, SMOTE:
1. Finds its k nearest neighbours in feature space (default k=5)
2. Randomly selects one of those neighbours
3. Creates a new synthetic point on the line segment between the original sample and the chosen neighbour

This is superior to simple duplication (which doesn't add new information) and to random undersampling (which discards majority-class data we've already collected).

SMOTE is **never** applied to validation or test sets.

---

### Cell 16 — Markdown: Scaling Strategy
### Cell 17 — Feature Scaling
```python
scaler_clf = StandardScaler()
X_clf_train_sm_scaled = pd.DataFrame(scaler_clf.fit_transform(X_clf_train_sm), columns=CLF_FEATURES)
X_clf_val_scaled      = pd.DataFrame(scaler_clf.transform(X_clf_val), columns=CLF_FEATURES)
X_clf_test_scaled     = pd.DataFrame(scaler_clf.transform(X_clf_test), columns=CLF_FEATURES)

scaler_reg = StandardScaler()
X_reg_train_scaled = pd.DataFrame(scaler_reg.fit_transform(X_reg_train), columns=REG_FEATURES)
...
```
**What it does:**

- **`fit_transform` on training data** — calculates mean and std of each feature from the training set, then scales it
- **`transform` on val/test** — applies the *same* mean and std computed from training. This is the correct approach — val/test data must be scaled using training statistics to simulate what happens at inference time

**Two separate scalers:**
- `scaler_clf` — for classification (7 features)
- `scaler_reg` — for regression inputs (6 features)

The regression target (`log_miss_distance`) is NOT scaled because it is already near-normally distributed after the log transform, simplifying inverse-transformation at inference.

Results are wrapped back into DataFrames with named columns for readability.

---

### Cell 18 — Markdown: Save
### Cell 19 — Save Processed Data and Scalers
```python
X_clf_train_sm_scaled.to_csv(f'{OUTPUT_DIR}X_train_clf.csv', index=False)
...
joblib.dump(scaler_clf, f'{OUTPUT_DIR}scaler_clf.joblib')
joblib.dump(scaler_reg, f'{OUTPUT_DIR}scaler_reg.joblib')
```
**What it does:** Persists all processed data to disk so downstream notebooks can load it without re-running this notebook.

**Files saved (14 total):**

| File | Description |
|---|---|
| `X_train_clf.csv` | SMOTE-augmented scaled classification training features |
| `X_val_clf.csv` | Scaled classification validation features |
| `X_test_clf.csv` | Scaled classification test features (sealed) |
| `y_train_clf.csv` | Classification training labels (post-SMOTE) |
| `y_val_clf.csv` | Classification validation labels |
| `y_test_clf.csv` | Classification test labels (sealed) |
| `X_train_reg.csv` | Scaled regression training features |
| `X_val_reg.csv` | Scaled regression validation features |
| `X_test_reg.csv` | Scaled regression test features (sealed) |
| `y_train_reg.csv` | Regression training targets (`log_miss_distance`) |
| `y_val_reg.csv` | Regression validation targets |
| `y_test_reg.csv` | Regression test targets (sealed) |
| `scaler_clf.joblib` | Fitted StandardScaler for classification features |
| `scaler_reg.joblib` | Fitted StandardScaler for regression features |

`index=False` prevents pandas from writing the row index as an extra column in the CSV.

---

## Data Flow Summary

```
neo.csv (90,836 rows, 10 cols)
    → Drop 4 cols → 6 cols remain
    → Engineer 6 new features → drop 4 raw → 7 cols total
    → Encode hazardous bool → int
    → Split 70/15/15 (stratified)
    → SMOTE on train only
    → StandardScaler (fit on train, transform all)
    → Save 12 CSVs + 2 scalers
```
