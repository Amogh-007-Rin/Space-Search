from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
import json
import os
import shutil
import logging

PROCESSED_DIR = "/opt/airflow/dataset/Processed/"
PIPELINE_DIR = "/opt/airflow/dataset/mlops_pipeline/"
TUNED_DIR = "/opt/airflow/dataset/mlops_pipeline/tuned_models/"
ARTIFACTS_DIR = "/opt/airflow/models/artifacts/"


def verify_tuned_models():
    required = [
        f"{TUNED_DIR}tuned_classifier.joblib",
        f"{TUNED_DIR}tuned_regressor.joblib",
        f"{TUNED_DIR}best_clf_params.json",
        f"{TUNED_DIR}best_reg_params.json",
        f"{TUNED_DIR}tuned_test_metrics.json",
        f"{PROCESSED_DIR}scaler_clf.joblib",
        f"{PROCESSED_DIR}scaler_reg.joblib",
        f"{PROCESSED_DIR}X_train_clf.csv",
        f"{PROCESSED_DIR}X_train_reg.csv",
    ]
    missing = [p for p in required if not os.path.exists(p)]
    if missing:
        raise FileNotFoundError(f"Missing pipeline artifacts: {missing}")
    logging.info("All required pipeline files verified.")


def extract_artifacts():
    import pandas as pd
    import joblib
    from datetime import datetime as dt

    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    shutil.copy(f"{TUNED_DIR}tuned_classifier.joblib", f"{ARTIFACTS_DIR}classifier.joblib")
    shutil.copy(f"{TUNED_DIR}tuned_regressor.joblib",  f"{ARTIFACTS_DIR}regressor.joblib")
    shutil.copy(f"{PROCESSED_DIR}scaler_clf.joblib",   f"{ARTIFACTS_DIR}scaler_clf.joblib")
    shutil.copy(f"{PROCESSED_DIR}scaler_reg.joblib",   f"{ARTIFACTS_DIR}scaler_reg.joblib")
    logging.info("Copied model + scaler artifacts to %s", ARTIFACTS_DIR)

    clf_features = list(pd.read_csv(f"{PROCESSED_DIR}X_train_clf.csv").columns)
    reg_features = list(pd.read_csv(f"{PROCESSED_DIR}X_train_reg.csv").columns)
    feature_names = {"clf_features": clf_features, "reg_features": reg_features}
    with open(f"{ARTIFACTS_DIR}feature_names.json", "w") as f:
        json.dump(feature_names, f, indent=2)

    with open(f"{TUNED_DIR}best_clf_params.json") as f:
        best_clf_params = json.load(f)
    with open(f"{TUNED_DIR}best_reg_params.json") as f:
        best_reg_params = json.load(f)
    with open(f"{TUNED_DIR}tuned_test_metrics.json") as f:
        test_metrics = json.load(f)
    with open(f"{PIPELINE_DIR}model_selection.json") as f:
        selection = json.load(f)

    clf = joblib.load(f"{ARTIFACTS_DIR}classifier.joblib")
    reg = joblib.load(f"{ARTIFACTS_DIR}regressor.joblib")

    metadata = {
        "trained_at": dt.now().isoformat(),
        "classifier": {
            "model":           type(clf).__name__,
            "selected_from":   selection["best_classifier"],
            "hyperparams":     best_clf_params,
            "test_f1_weighted": test_metrics["classifier"]["f1_weighted"],
            "test_auc_roc":    test_metrics["classifier"]["auc_roc"],
            "test_accuracy":   test_metrics["classifier"]["accuracy"],
        },
        "regressor": {
            "model":         type(reg).__name__,
            "selected_from": selection["best_regressor"],
            "hyperparams":   best_reg_params,
            "test_r2":       test_metrics["regressor"]["r2"],
            "test_rmse_log": test_metrics["regressor"]["rmse_log"],
            "test_rmse_km":  test_metrics["regressor"]["rmse_km"],
        },
        "features":  feature_names,
        "pipeline":  "dataset_preprocesser → feature_transformer → model_training → final_model_selector → model_parameter_tunner → model_extractor",
    }
    with open(f"{ARTIFACTS_DIR}model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    logging.info(
        "Extraction complete — Classifier: %s (F1=%.4f) | Regressor: %s (R2=%.4f)",
        metadata["classifier"]["model"], metadata["classifier"]["test_f1_weighted"],
        metadata["regressor"]["model"],  metadata["regressor"]["test_r2"],
    )


def smoke_test_artifacts():
    import pandas as pd
    import numpy as np
    import joblib

    clf        = joblib.load(f"{ARTIFACTS_DIR}classifier.joblib")
    reg        = joblib.load(f"{ARTIFACTS_DIR}regressor.joblib")
    scaler_clf = joblib.load(f"{ARTIFACTS_DIR}scaler_clf.joblib")
    scaler_reg = joblib.load(f"{ARTIFACTS_DIR}scaler_reg.joblib")

    with open(f"{ARTIFACTS_DIR}feature_names.json") as f:
        feature_names = json.load(f)
    with open(f"{ARTIFACTS_DIR}model_metadata.json") as f:
        metadata = json.load(f)

    CLF_FEATURES = feature_names["clf_features"]
    REG_FEATURES = feature_names["reg_features"]

    est_diameter_min   = 0.12
    est_diameter_max   = 0.27
    relative_velocity  = 48000.0
    absolute_magnitude = 22.1
    miss_distance      = 14_500_000.0

    diameter_avg          = (est_diameter_min + est_diameter_max) / 2
    diameter_ratio        = est_diameter_max / est_diameter_min
    log_diameter_avg      = np.log1p(diameter_avg)
    log_diameter_ratio    = np.log1p(diameter_ratio)
    log_relative_velocity = np.log1p(relative_velocity)
    log_miss_distance     = np.log1p(miss_distance)

    clf_row = [log_diameter_avg, log_diameter_ratio, log_relative_velocity,
               log_miss_distance, absolute_magnitude, diameter_avg, diameter_ratio]
    reg_row = [log_diameter_avg, log_diameter_ratio, log_relative_velocity,
               absolute_magnitude, diameter_avg, diameter_ratio]

    clf_scaled = scaler_clf.transform(pd.DataFrame([clf_row], columns=CLF_FEATURES))
    reg_scaled = scaler_reg.transform(pd.DataFrame([reg_row], columns=REG_FEATURES))

    hazardous      = bool(clf.predict(clf_scaled)[0])
    hazardous_prob = float(clf.predict_proba(clf_scaled)[0, 1])
    miss_dist_km   = float(np.expm1(reg.predict(reg_scaled)[0]))

    assert 0.0 <= hazardous_prob <= 1.0
    assert miss_dist_km > 0

    logging.info(
        "Smoke test passed — hazardous=%s prob=%.4f miss_distance_km=%.0f",
        hazardous, hazardous_prob, miss_dist_km,
    )
    logging.info("Artifacts trained at: %s", metadata["trained_at"])


with DAG(
    dag_id="model_extractor",
    description="Copy tuned models to artifacts/, generate metadata, run end-to-end smoke test",
    schedule="@once",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["mlops", "neo", "artifacts"],
) as dag:

    verify_task = PythonOperator(
        task_id="verify_tuned_models",
        python_callable=verify_tuned_models,
    )

    extract_task = PythonOperator(
        task_id="extract_artifacts",
        python_callable=extract_artifacts,
    )

    smoke_task = PythonOperator(
        task_id="smoke_test_artifacts",
        python_callable=smoke_test_artifacts,
    )

    verify_task >> extract_task >> smoke_task
