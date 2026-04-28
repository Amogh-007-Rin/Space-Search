# Exploration.ipynb — Notebook Context

## Purpose
The first notebook in the ML pipeline. Performs an initial investigation of the raw NASA Near-Earth Object (NEO) dataset to understand its structure, data types, value ranges, and data quality before any transformation is applied.

---

## Theory Summary

**Exploratory Data Analysis (EDA)** is the practice of summarising the main characteristics of a dataset, often using visual and statistical methods. The goal at this stage is purely observational — understanding what the data looks like without modifying it. Key questions EDA answers:

- How many rows and columns are there?
- What data types are present (numeric, categorical, boolean)?
- Are there any missing values (nulls)?
- What are the value distributions (min, max, mean, std)?
- Are there obvious outliers or data quality issues?

EDA findings directly drive decisions in the Pre-processing notebook — which columns to drop, which need log-transformation, and what class imbalance exists.

---

## Cell-by-Cell Explanation

### Cell 0 — Markdown: `Dataset Exploration`
**Type:** Markdown heading  
**What it does:** Labels the notebook with a title. No computation performed.

---

### Cell 1 — Import Libraries
```python
import pandas as pd
```
**What it does:** Imports the `pandas` library, the primary tool for working with tabular data in Python. `pd` is the conventional alias.

**Why pandas?** pandas provides the `DataFrame` structure, which represents the dataset as a 2D table with named columns and row indices. It also provides all the methods used in subsequent cells (`read_csv`, `head`, `info`, `describe`, `isnull`).

---

### Cell 2 — Load Dataset
```python
DATASET_PATH = "Dataset/Raw-Dataset/neo.csv"
df = pd.read_csv(DATASET_PATH)
```
**What it does:**
- Sets the path to the raw CSV file (NASA NEO dataset, 9 MB, 90,836 rows)
- Reads the CSV file into a pandas DataFrame called `df`

**Dataset source:** NASA's Near-Earth Object (NEO) dataset. Contains records of asteroids and comets that have been tracked for their proximity to Earth.

**`read_csv`** parses the file, infers column data types, and loads everything into memory. With 90K rows this fits comfortably in RAM.

---

### Cell 3 — `df.head()`
```python
df.head()
```
**What it does:** Displays the first 5 rows of the DataFrame.

**Why?** Confirms the file loaded correctly. Lets you visually inspect column names, data values, and formatting. From this output you can see all 10 columns:
- `id`, `name` — asteroid identifiers
- `est_diameter_min`, `est_diameter_max` — diameter estimates in km
- `relative_velocity` — approach speed in km/s
- `miss_distance` — closest approach distance
- `orbiting_body` — always "Earth"
- `sentry_object` — boolean NASA internal flag
- `absolute_magnitude` — brightness
- `hazardous` — target label (True/False)

---

### Cell 4 — `df.tail()`
```python
df.tail()
```
**What it does:** Displays the last 5 rows of the DataFrame.

**Why?** Checks that the file was fully loaded without truncation. Also shows whether the later records follow the same format as the earlier ones (no footer rows, no formatting artifacts at end of file).

---

### Cell 5 — `df.info()`
```python
df.info()
```
**What it does:** Prints a concise summary of the DataFrame including:
- Total row count: 90,836
- Column names and their data types (`int64`, `float64`, `str`, `bool`)
- Non-null count per column (used to detect missing values)
- Total memory usage (~5.7 MB)

**Key finding:** All 90,836 rows are non-null across all 10 columns — zero missing values in the entire dataset. This means no imputation strategy is needed.

**Data types observed:**
- 5 float64 columns (numeric features)
- 1 int64 column (id)
- 2 str columns (name, orbiting_body)
- 2 bool columns (sentry_object, hazardous)

---

### Cell 6 — `df.describe()`
```python
df.describe()
```
**What it does:** Computes summary statistics for all numeric columns:
- `count` — number of non-null values
- `mean` — average
- `std` — standard deviation
- `min`, `25%`, `50%`, `75%`, `max` — percentile distribution

**Key findings from the output:**
| Column | Min | Median | Max | Implication |
|---|---|---|---|---|
| `est_diameter_min` | 0.0006 km | 0.048 km | 37.89 km | Massive right skew — log transform needed |
| `est_diameter_max` | 0.0014 km | 0.108 km | 84.73 km | Same right skew |
| `relative_velocity` | 203 km/s | 44,190 km/s | 236,990 km/s | Large range — log transform needed |
| `miss_distance` | 6,745 km | 37.8M km | 74.8M km | Wide range spanning orders of magnitude |
| `absolute_magnitude` | 9.23 | 23.70 | 33.20 | Relatively well-behaved distribution |

---

### Cell 7 — `df.isnull()` (first call)
```python
df.isnull()
```
**What it does:** Returns a boolean DataFrame of the same shape as `df`, where each cell is `True` if the original value is null/NaN and `False` otherwise.

**Output:** A 90,836 × 10 grid of all `False` values — confirming zero missing values across the entire dataset.

**Theory:** Missing value detection is a fundamental step in EDA. Missing values require either imputation (fill with mean/median/mode) or row removal. Since there are none here, this step simply validates data completeness.

---

### Cell 8 — `df.isnull()` (duplicate call)
```python
df.isnull()
```
**What it does:** Identical to Cell 7 — a duplicate null check.

**Note:** This is a redundant cell (same call made twice). It produces identical output to Cell 7 and can be treated as a double-confirmation of data completeness.

---

## Summary of Findings from EDA

| Finding | Detail | Action in Pre-processing |
|---|---|---|
| Zero missing values | All 90,836 rows complete | No imputation needed |
| `orbiting_body` = "Earth" always | Zero-variance categorical | Drop column |
| `sentry_object` is a NASA flag | Leaks the target variable | Drop column |
| Extreme right skew in diameters | Max 84 km vs median 0.1 km | Apply log1p transform |
| Large velocity range | 203 to 237,000 km/s | Apply log1p transform |
| `miss_distance` spans orders of magnitude | 6K km to 74M km | Apply log1p transform (also regression target) |
| `hazardous` is the classification target | Boolean, likely imbalanced | Cast to int, use SMOTE |
