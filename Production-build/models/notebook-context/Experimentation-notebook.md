# Experimentation.ipynb — Notebook Context

## Purpose
Trains and compares multiple baseline ML models for both the classification task (hazardous prediction) and the regression task (miss distance prediction). Uses cross-validation to confirm stability, produces diagnostic visualisations, and concludes with a model selection decision that feeds into `Model-training.ipynb`.

---

## Theory Summary

### The Baseline Model Comparison Philosophy
Before tuning hyperparameters, it is important to compare several algorithm families on equal footing using default or near-default settings. This identifies which algorithm class is most suited to the data structure. Tuning an inferior algorithm wastes time.

### Classification Algorithms Used

**Logistic Regression**
A linear probabilistic classifier. Models the log-odds of the positive class as a linear combination of features:
```
log(P(y=1) / P(y=0)) = w₀ + w₁x₁ + ... + wₙxₙ
```
Fast to train, interpretable, but cannot capture non-linear feature interactions. `class_weight='balanced'` makes it weight minority-class errors more heavily during training.

**Random Forest Classifier**
An ensemble of decision trees trained on random subsets of features and data (bagging). Each tree makes an independent prediction; the forest votes by majority. Captures non-linear relationships and feature interactions naturally. The `feature_importances_` attribute reveals which features drive predictions most.

**Gradient Boosting Classifier**
Builds decision trees sequentially, where each new tree corrects the residual errors of the previous ensemble. More powerful than Random Forest on tabular data in practice, but slower to train and more sensitive to hyperparameters. SMOTE-augmented training data handles the class imbalance since GBM lacks a native `class_weight` parameter.

**Support Vector Classifier (SVC)**
Finds the maximum-margin hyperplane separating the two classes in a high-dimensional feature space. With `kernel='rbf'` (Radial Basis Function), it can capture non-linear boundaries by projecting data into a higher-dimensional space. `probability=True` enables `.predict_proba()` which is needed for AUC-ROC calculation.

### Regression Algorithms Used

**Linear Regression**
The simplest regression model — fits a straight line (hyperplane) through the data by minimising the sum of squared residuals. Used as a baseline to quantify how much non-linearity helps. If tree-based models significantly outperform linear regression, the target-feature relationship is non-linear.

**Random Forest Regressor**
Same ensemble mechanism as the classifier version, but predicts continuous values by averaging predictions across trees. Robust to outliers and non-linear relationships.

**Gradient Boosting Regressor**
Sequential residual correction using decision trees. Typically achieves the best performance on structured tabular regression tasks.

### Evaluation Metrics

**Classification metrics:**
- **Accuracy** — fraction of correct predictions. Misleading under class imbalance (reported but not used for ranking).
- **F1-score (weighted)** — harmonic mean of precision and recall, weighted by class support. The primary ranking metric.
- **AUC-ROC** — Area Under the Receiver Operating Characteristic curve. Measures the model's ability to distinguish classes across all classification thresholds. Value of 1.0 = perfect; 0.5 = random.
- **Precision** — of all predicted positives, what fraction are actually positive?
- **Recall** — of all actual positives, what fraction did the model catch?

**Regression metrics:**
- **R²** — coefficient of determination; fraction of variance in the target explained by the model. Ranges from -∞ to 1.0 (1.0 = perfect fit). Primary ranking metric.
- **RMSE** — Root Mean Squared Error. Penalises large errors more than small ones (due to squaring). Reported in log-space.
- **MAE** — Mean Absolute Error. Average magnitude of errors. Less sensitive to outliers than RMSE.

### Cross-Validation
K-Fold cross-validation splits the training data into K subsets (folds). The model is trained K times, each time leaving one fold out for validation and training on the remaining K-1 folds. The metric is averaged across all K runs.

This gives a more reliable estimate of generalisation performance than a single val-set evaluation, because it reduces dependence on the particular random split. **Stratified K-Fold** preserves class proportions in each fold — essential for imbalanced classification.

### Visualisation Theory

**Confusion Matrix:** A 2×2 table showing true positives, true negatives, false positives, and false negatives. Normalised by row so each cell shows the fraction of actual positives/negatives correctly/incorrectly classified. Reveals whether the model fails more on false positives or false negatives.

**ROC Curve:** Plots True Positive Rate vs. False Positive Rate as the classification threshold varies. A curve hugging the top-left corner indicates high performance. AUC (area under the curve) summarises the whole curve in one number.

**Precision-Recall Curve:** More informative than ROC under severe class imbalance. Plots precision vs. recall as the threshold varies. A model that achieves high precision AND high recall is ideal.

**Residual Plot (Regression):** Plots predicted values vs. residuals (actual − predicted). Ideally, residuals should scatter randomly around zero. Patterns in residuals (fan shapes, curves) indicate that the model is missing some structure in the data.

**Feature Importance:** Tree-based models compute importance as the total reduction in impurity (Gini for classifiers, MSE for regressors) achieved by splits on each feature, averaged across all trees. Higher importance = feature contributes more to predictions.

---

## Cell-by-Cell Explanation

### Cell 0 — Markdown: Notebook Title

### Cell 1 — Imports and Configuration
```python
import time, matplotlib.pyplot as plt, seaborn as sns
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.svm import SVC
from sklearn.model_selection import StratifiedKFold, KFold, cross_val_score
from sklearn.metrics import (accuracy_score, f1_score, roc_auc_score, ...)

DATA_DIR = '../Dataset/Processed-Dataset/'
RANDOM_STATE = 42
```
**What it does:** Imports all model classes, metric functions, and visualisation libraries. Sets the data directory to load from `Pre-processing.ipynb` outputs. `warnings.filterwarnings('ignore')` suppresses non-critical sklearn convergence warnings that would clutter output.

---

### Cell 2 — Markdown: Load Data
### Cell 3 — Load Processed Data
```python
X_train_clf = pd.read_csv(f'{DATA_DIR}X_train_clf.csv')
...
```
**What it does:** Loads all 8 CSV files (train + val splits for classification and regression) from the processed dataset directory. Prints shapes to confirm the data loaded correctly.

`.squeeze()` on the label files converts a single-column DataFrame into a pandas Series — the format sklearn expects for target arrays.

---

### Cell 4 — Markdown: Classification Baselines
### Cell 5 — Train and Evaluate Classification Baselines
```python
clf_models = {
    'LogisticRegression': LogisticRegression(max_iter=1000, class_weight='balanced', ...),
    'RandomForestClassifier': RandomForestClassifier(n_estimators=100, class_weight='balanced', ...),
    'GradientBoostingClassifier': GradientBoostingClassifier(n_estimators=100, ...),
    'SVC': SVC(kernel='rbf', class_weight='balanced', probability=True, ...),
}

for name, model in clf_models.items():
    t0 = time.time()
    model.fit(X_train_clf, y_train_clf)      # Train on SMOTE-augmented data
    y_pred  = model.predict(X_val_clf)        # Hard predictions
    y_proba = model.predict_proba(X_val_clf)[:, 1]  # Probability of class 1
    # Compute all metrics and store in clf_results
```
**What it does:**
- Defines a dictionary of 4 classifier instances with chosen configurations
- Loops through each model: trains, times the training, predicts on validation, computes 5 metrics
- Stores results in a list of dicts, converts to a DataFrame sorted by F1
- Keeps trained model objects in `trained_clf` dict for later visualisation use

**`[:, 1]` in `predict_proba`** — `predict_proba` returns a (n_samples, 2) array where column 0 = P(class=0) and column 1 = P(class=1). We take column 1 as the positive-class probability for AUC calculation.

---

### Cell 6 — Markdown: Regression Baselines
### Cell 7 — Train and Evaluate Regression Baselines
```python
reg_models = {
    'LinearRegression': LinearRegression(),
    'RandomForestRegressor': RandomForestRegressor(n_estimators=100, ...),
    'GradientBoostingRegressor': GradientBoostingRegressor(n_estimators=100, ...),
}
```
**What it does:** Same loop structure as classification baselines but for regression. Computes R², RMSE, and MAE for each model on the validation set. The targets are in log-space (`log_miss_distance`), so all metrics are in log-space too.

---

### Cell 8 — Markdown: Cross-Validation
### Cell 9 — Classification Cross-Validation
```python
top2_clf = clf_df['Model'].head(2).tolist()   # Top 2 by F1
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

for name in top2_clf:
    scores = cross_val_score(clf_models[name], X_train_clf, y_train_clf,
                             cv=skf, scoring='f1_weighted', n_jobs=-1)
    print(f'{name}: CV F1 = {scores.mean():.4f} +/- {scores.std():.4f}')
```
**What it does:**
- Identifies the top 2 classifiers from the results table
- Creates a `StratifiedKFold` splitter with 5 folds
- `cross_val_score` trains and evaluates each model 5 times on different folds, returns an array of 5 F1 scores
- Reports mean ± std — a high std indicates the model's performance varies too much across folds (unstable)
- `n_jobs=-1` uses all CPU cores in parallel for speed

### Cell 10 — Regression Cross-Validation
Same logic as Cell 9 but uses `KFold` (not stratified, since regression has no classes) and R² as the scoring metric.

---

### Cell 11 — Markdown: Visualisations
### Cell 12 — Confusion Matrices
```python
fig, axes = plt.subplots(1, 4, figsize=(20, 4))
for ax, (name, model) in zip(axes, trained_clf.items()):
    cm = confusion_matrix(y_val_clf, model.predict(X_val_clf), normalize='true')
    sns.heatmap(cm, annot=True, fmt='.2f', cmap='Blues', ax=ax,
                xticklabels=['Safe','Hazardous'], yticklabels=['Safe','Hazardous'])
```
**What it does:** Creates a 1×4 grid of normalised confusion matrix heatmaps, one per classifier. `normalize='true'` means each row sums to 1, showing the fraction of each actual class that was predicted correctly vs. incorrectly.

The `seaborn.heatmap` colours cells by value (Blues colormap) and annotates each cell with its numeric value to 2 decimal places.

---

### Cell 13 — ROC and Precision-Recall Curves
```python
for name, model in trained_clf.items():
    y_proba = model.predict_proba(X_val_clf)[:, 1]
    fpr, tpr, _ = roc_curve(y_val_clf, y_proba)
    ax1.plot(fpr, tpr, label=f'{name} (AUC={roc_auc_score(y_val_clf, y_proba):.3f})')
    prec, rec, _ = precision_recall_curve(y_val_clf, y_proba)
    ax2.plot(rec, prec, label=name)
```
**What it does:** Plots both curves for all 4 classifiers on two side-by-side axes. All models are overlaid on the same plot for direct comparison. The diagonal dashed line on the ROC plot represents random classification (AUC = 0.5).

---

### Cell 14 — Feature Importance (Tree Models)
```python
tree_clfs = {k: v for k, v in trained_clf.items() if hasattr(v, 'feature_importances_')}
```
**What it does:** Filters to only tree-based classifiers (RandomForest, GradientBoosting) since LogReg and SVC don't have `feature_importances_`. Plots a horizontal bar chart of importance scores per feature, sorted ascending so the most important feature is at the top.

---

### Cell 15 — Regression Residual Plots
```python
for ax, (name, model) in zip(axes, trained_reg.items()):
    y_pred = model.predict(X_val_reg)
    ax.scatter(y_pred, y_val_reg.values - y_pred, alpha=0.3, s=5)
    ax.axhline(0, color='red', linestyle='--')
```
**What it does:** For each regressor, plots a scatter of predicted values (x-axis) vs. residuals (y-axis). The red horizontal line at 0 is the ideal reference. Alpha transparency (0.3) and small marker size (s=5) prevent overplotting with 13,000+ validation points.

---

### Cell 16 — Markdown: Model Selection Decision
**What it does:** A documentation cell that records which models are chosen and why, based on the numerical results above. Expected winners:

| Task | Expected Winner | Rationale |
|---|---|---|
| Classification | `GradientBoostingClassifier` | Non-linear boundaries, sequential error correction, robust on tabular data |
| Regression | `GradientBoostingRegressor` | Same reasons; log-space target aligns well with its leaf-value prediction |

This decision is carried forward to `Model-training.ipynb` where the chosen models are tuned with Optuna.

---

## Output
- No files are saved by this notebook
- `trained_clf` and `trained_reg` dicts hold baseline model objects (in memory only)
- The model selection decision (in the final markdown cell) is communicated to the next notebook through documentation
