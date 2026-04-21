from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
import json
import logging

PROCESSED_DIR = "/opt/airflow/dataset/Processed/"
BASELINE_DIR = "/opt/airflow/dataset/mlops_pipeline/baseline_models/"
PIPELINE_DIR = "/opt/airflow/dataset/mlops_pipeline/"


def evaluate_classifiers_on_test():
    import gc
    import pandas as pd
    import joblib
    from sklearn.metrics import f1_score, roc_auc_score, accuracy_score, classification_report

    X_test = pd.read_csv(f"{PROCESSED_DIR}X_test_clf.csv")
    y_test = pd.read_csv(f"{PROCESSED_DIR}y_test_clf.csv").squeeze()

    model_names = [
        "LogisticRegression",
        "RandomForestClassifier",
        "GradientBoostingClassifier",
    ]

    results = []
    for name in model_names:
        model  = joblib.load(f"{BASELINE_DIR}{name}_clf.joblib")
        y_pred  = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]

        metrics = {
            "model":       name,
            "accuracy":    round(accuracy_score(y_test, y_pred), 4),
            "f1_weighted": round(f1_score(y_test, y_pred, average="weighted"), 4),
            "auc_roc":     round(roc_auc_score(y_test, y_proba), 4),
        }
        results.append(metrics)
        logging.info(
            "[CLF TEST] %s — F1=%.4f AUC=%.4f Acc=%.4f",
            name, metrics["f1_weighted"], metrics["auc_roc"], metrics["accuracy"],
        )
        logging.info("\n%s", classification_report(y_test, y_pred, target_names=["Safe", "Hazardous"]))

        # Free model memory before loading the next one
        del model, y_pred, y_proba
        gc.collect()

    results.sort(key=lambda x: (x["f1_weighted"] + x["auc_roc"]) / 2, reverse=True)
    with open(f"{PIPELINE_DIR}clf_test_metrics.json", "w") as f:
        json.dump(results, f, indent=2)

    logging.info("Best classifier on test: %s", results[0]["model"])


def evaluate_regressors_on_test():
    import gc
    import pandas as pd
    import numpy as np
    import joblib
    from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

    X_test = pd.read_csv(f"{PROCESSED_DIR}X_test_reg.csv")
    y_test = pd.read_csv(f"{PROCESSED_DIR}y_test_reg.csv").squeeze()

    model_names = [
        "LinearRegression",
        "GradientBoostingRegressor",
    ]

    results = []
    for name in model_names:
        model  = joblib.load(f"{BASELINE_DIR}{name}_reg.joblib")
        y_pred = model.predict(X_test)

        rmse_km = float(np.sqrt(mean_squared_error(np.expm1(y_test), np.expm1(y_pred))))
        metrics = {
            "model":    name,
            "r2":       round(r2_score(y_test, y_pred), 4),
            "rmse_log": round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
            "mae_log":  round(float(mean_absolute_error(y_test, y_pred)), 4),
            "rmse_km":  round(rmse_km, 2),
        }
        results.append(metrics)
        logging.info(
            "[REG TEST] %s — R2=%.4f RMSE(log)=%.4f RMSE(km)=%.0f",
            name, metrics["r2"], metrics["rmse_log"], metrics["rmse_km"],
        )

        # Free model memory before loading the next one
        del model, y_pred
        gc.collect()

    results.sort(key=lambda x: x["r2"], reverse=True)
    with open(f"{PIPELINE_DIR}reg_test_metrics.json", "w") as f:
        json.dump(results, f, indent=2)

    logging.info("Best regressor on test: %s", results[0]["model"])


def select_best_models():
    with open(f"{PIPELINE_DIR}clf_test_metrics.json") as f:
        clf_results = json.load(f)
    with open(f"{PIPELINE_DIR}reg_test_metrics.json") as f:
        reg_results = json.load(f)

    selection = {
        "best_classifier":         clf_results[0]["model"],
        "best_classifier_metrics": clf_results[0],
        "best_regressor":          reg_results[0]["model"],
        "best_regressor_metrics":  reg_results[0],
        "all_clf_results":         clf_results,
        "all_reg_results":         reg_results,
    }

    with open(f"{PIPELINE_DIR}model_selection.json", "w") as f:
        json.dump(selection, f, indent=2)

    logging.info(
        "Model selection complete — Classifier: %s (F1=%.4f) | Regressor: %s (R2=%.4f)",
        selection["best_classifier"], clf_results[0]["f1_weighted"],
        selection["best_regressor"],  reg_results[0]["r2"],
    )


with DAG(
    dag_id="final_model_selector",
    description="Evaluate all baseline models on the test set and select the best classifier and regressor",
    schedule="@once",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["mlops", "neo", "selection"],
) as dag:

    eval_clf_task = PythonOperator(
        task_id="evaluate_classifiers_on_test",
        python_callable=evaluate_classifiers_on_test,
    )

    eval_reg_task = PythonOperator(
        task_id="evaluate_regressors_on_test",
        python_callable=evaluate_regressors_on_test,
    )

    select_task = PythonOperator(
        task_id="select_best_models",
        python_callable=select_best_models,
    )

    eval_clf_task >> eval_reg_task >> select_task
