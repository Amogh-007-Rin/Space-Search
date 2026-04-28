from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
import json
import os
import logging

PROCESSED_DIR = "/opt/airflow/dataset/Processed/"
BASELINE_DIR = "/opt/airflow/dataset/mlops_pipeline/baseline_models/"
PIPELINE_DIR = "/opt/airflow/dataset/mlops_pipeline/"
RANDOM_STATE = 42


def _load_splits():
    import pandas as pd
    X_train_clf = pd.read_csv(f"{PROCESSED_DIR}X_train_clf.csv")
    X_val_clf   = pd.read_csv(f"{PROCESSED_DIR}X_val_clf.csv")
    y_train_clf = pd.read_csv(f"{PROCESSED_DIR}y_train_clf.csv").squeeze()
    y_val_clf   = pd.read_csv(f"{PROCESSED_DIR}y_val_clf.csv").squeeze()
    X_train_reg = pd.read_csv(f"{PROCESSED_DIR}X_train_reg.csv")
    X_val_reg   = pd.read_csv(f"{PROCESSED_DIR}X_val_reg.csv")
    y_train_reg = pd.read_csv(f"{PROCESSED_DIR}y_train_reg.csv").squeeze()
    y_val_reg   = pd.read_csv(f"{PROCESSED_DIR}y_val_reg.csv").squeeze()
    return (
        X_train_clf, X_val_clf, y_train_clf, y_val_clf,
        X_train_reg, X_val_reg, y_train_reg, y_val_reg,
    )


def train_classifiers():
    """Train baseline classifiers. SVC excluded — infeasible on 120K SMOTE rows with limited RAM."""
    import gc
    import time
    import joblib
    from sklearn.linear_model import LogisticRegression
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.metrics import f1_score, roc_auc_score, accuracy_score

    os.makedirs(BASELINE_DIR, exist_ok=True)

    X_train_clf, X_val_clf, y_train_clf, y_val_clf, *_ = _load_splits()

    clf_models = {
        "LogisticRegression": LogisticRegression(
            max_iter=1000, class_weight="balanced", random_state=RANDOM_STATE
        ),
        "RandomForestClassifier": RandomForestClassifier(
            n_estimators=20, class_weight="balanced",
            random_state=RANDOM_STATE, n_jobs=1
        ),
        "GradientBoostingClassifier": GradientBoostingClassifier(
            n_estimators=100, random_state=RANDOM_STATE
        ),
    }

    results = []
    for name, model in clf_models.items():
        t0 = time.time()
        model.fit(X_train_clf, y_train_clf)
        elapsed = time.time() - t0

        y_pred  = model.predict(X_val_clf)
        y_proba = model.predict_proba(X_val_clf)[:, 1]

        metrics = {
            "model":       name,
            "accuracy":    round(accuracy_score(y_val_clf, y_pred), 4),
            "f1_weighted": round(f1_score(y_val_clf, y_pred, average="weighted"), 4),
            "auc_roc":     round(roc_auc_score(y_val_clf, y_proba), 4),
            "train_time_s": round(elapsed, 2),
        }
        results.append(metrics)
        logging.info(
            "Classifier %s — F1=%.4f AUC=%.4f (%.1fs)",
            name, metrics["f1_weighted"], metrics["auc_roc"], elapsed,
        )
        joblib.dump(model, f"{BASELINE_DIR}{name}_clf.joblib")
        del model, y_pred, y_proba
        gc.collect()

    results.sort(key=lambda x: x["f1_weighted"], reverse=True)
    with open(f"{PIPELINE_DIR}clf_baseline_metrics.json", "w") as f:
        json.dump(results, f, indent=2)

    logging.info("Best classifier: %s (F1=%.4f)", results[0]["model"], results[0]["f1_weighted"])


def train_regressors():
    import gc
    import time
    import numpy as np
    import joblib
    from sklearn.linear_model import LinearRegression
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

    *_, X_train_reg, X_val_reg, y_train_reg, y_val_reg = _load_splits()

    reg_models = {
        "LinearRegression": LinearRegression(),
        "RandomForestRegressor": RandomForestRegressor(
            n_estimators=20, random_state=RANDOM_STATE, n_jobs=1
        ),
        "GradientBoostingRegressor": GradientBoostingRegressor(
            n_estimators=100, random_state=RANDOM_STATE
        ),
    }

    results = []
    for name, model in reg_models.items():
        t0 = time.time()
        model.fit(X_train_reg, y_train_reg)
        elapsed = time.time() - t0

        y_pred = model.predict(X_val_reg)
        metrics = {
            "model":  name,
            "r2":     round(r2_score(y_val_reg, y_pred), 4),
            "rmse":   round(float(np.sqrt(mean_squared_error(y_val_reg, y_pred))), 4),
            "mae":    round(float(mean_absolute_error(y_val_reg, y_pred)), 4),
            "train_time_s": round(elapsed, 2),
        }
        results.append(metrics)
        logging.info(
            "Regressor %s — R2=%.4f RMSE=%.4f (%.1fs)",
            name, metrics["r2"], metrics["rmse"], elapsed,
        )
        joblib.dump(model, f"{BASELINE_DIR}{name}_reg.joblib")
        del model, y_pred
        gc.collect()

    results.sort(key=lambda x: x["r2"], reverse=True)
    with open(f"{PIPELINE_DIR}reg_baseline_metrics.json", "w") as f:
        json.dump(results, f, indent=2)

    logging.info("Best regressor: %s (R2=%.4f)", results[0]["model"], results[0]["r2"])


def run_cross_validation():
    from sklearn.linear_model import LogisticRegression, LinearRegression
    from sklearn.ensemble import (
        RandomForestClassifier, GradientBoostingClassifier,
        RandomForestRegressor, GradientBoostingRegressor,
    )
    from sklearn.model_selection import StratifiedKFold, KFold, cross_val_score

    X_train_clf, _, y_train_clf, _, X_train_reg, _, y_train_reg, _ = _load_splits()

    with open(f"{PIPELINE_DIR}clf_baseline_metrics.json") as f:
        clf_results = json.load(f)
    with open(f"{PIPELINE_DIR}reg_baseline_metrics.json") as f:
        reg_results = json.load(f)

    clf_model_map = {
        "LogisticRegression": LogisticRegression(
            max_iter=1000, class_weight="balanced", random_state=RANDOM_STATE
        ),
        "RandomForestClassifier": RandomForestClassifier(
            n_estimators=50, class_weight="balanced", random_state=RANDOM_STATE, n_jobs=1
        ),
        "GradientBoostingClassifier": GradientBoostingClassifier(
            n_estimators=100, random_state=RANDOM_STATE
        ),
    }
    reg_model_map = {
        "LinearRegression": LinearRegression(),
        "RandomForestRegressor": RandomForestRegressor(
            n_estimators=50, random_state=RANDOM_STATE, n_jobs=1
        ),
        "GradientBoostingRegressor": GradientBoostingRegressor(
            n_estimators=100, random_state=RANDOM_STATE
        ),
    }

    cv_results = {"classifiers": {}, "regressors": {}}

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    for name in [r["model"] for r in clf_results[:2]]:
        scores = cross_val_score(
            clf_model_map[name], X_train_clf, y_train_clf,
            cv=skf, scoring="f1_weighted", n_jobs=1,
        )
        cv_results["classifiers"][name] = {
            "cv_f1_mean": round(float(scores.mean()), 4),
            "cv_f1_std":  round(float(scores.std()), 4),
        }
        logging.info("CV [%s]: F1=%.4f ±%.4f", name, scores.mean(), scores.std())

    kf = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    for name in [r["model"] for r in reg_results[:2]]:
        scores = cross_val_score(
            reg_model_map[name], X_train_reg, y_train_reg,
            cv=kf, scoring="r2", n_jobs=1,
        )
        cv_results["regressors"][name] = {
            "cv_r2_mean": round(float(scores.mean()), 4),
            "cv_r2_std":  round(float(scores.std()), 4),
        }
        logging.info("CV [%s]: R2=%.4f ±%.4f", name, scores.mean(), scores.std())

    with open(f"{PIPELINE_DIR}cv_results.json", "w") as f:
        json.dump(cv_results, f, indent=2)

    logging.info("Cross-validation complete.")


with DAG(
    dag_id="model_training",
    description="Train baseline classifiers and regressors, run cross-validation on top models",
    schedule="@once",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["mlops", "neo", "training"],
) as dag:

    train_clf_task = PythonOperator(
        task_id="train_classifiers",
        python_callable=train_classifiers,
    )

    train_reg_task = PythonOperator(
        task_id="train_regressors",
        python_callable=train_regressors,
    )

    cv_task = PythonOperator(
        task_id="run_cross_validation",
        python_callable=run_cross_validation,
    )

    # Sequential to avoid OOM from two memory-heavy tasks competing on limited RAM
    train_clf_task >> train_reg_task >> cv_task
