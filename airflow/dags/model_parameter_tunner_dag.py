from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
import json
import os
import logging

PROCESSED_DIR = "/opt/airflow/dataset/Processed/"
PIPELINE_DIR = "/opt/airflow/dataset/mlops_pipeline/"
TUNED_DIR = "/opt/airflow/dataset/mlops_pipeline/tuned_models/"
RANDOM_STATE = 42
N_TRIALS = 50

# Gradient Boosting is the expected winner; if another family wins, baseline is copied as-is.
TUNABLE_MODELS = {"GradientBoostingClassifier", "GradientBoostingRegressor"}


def tune_classifier():
    import pandas as pd
    import joblib
    import optuna
    from sklearn.ensemble import GradientBoostingClassifier
    from sklearn.metrics import f1_score

    optuna.logging.set_verbosity(optuna.logging.WARNING)
    os.makedirs(TUNED_DIR, exist_ok=True)

    with open(f"{PIPELINE_DIR}model_selection.json") as f:
        selection = json.load(f)
    best_clf_name = selection["best_classifier"]

    X_train = pd.read_csv(f"{PROCESSED_DIR}X_train_clf.csv")
    X_val   = pd.read_csv(f"{PROCESSED_DIR}X_val_clf.csv")
    y_train = pd.read_csv(f"{PROCESSED_DIR}y_train_clf.csv").squeeze()
    y_val   = pd.read_csv(f"{PROCESSED_DIR}y_val_clf.csv").squeeze()

    if best_clf_name not in TUNABLE_MODELS:
        logging.info("Selected classifier %s is not tunable — copying baseline.", best_clf_name)
        baseline = joblib.load(f"{PIPELINE_DIR}baseline_models/{best_clf_name}_clf.joblib")
        joblib.dump(baseline, f"{TUNED_DIR}tuned_classifier.joblib")
        best_params = {}
    else:
        def objective(trial):
            params = {
                "n_estimators":      trial.suggest_int("n_estimators", 100, 500),
                "max_depth":         trial.suggest_int("max_depth", 3, 8),
                "learning_rate":     trial.suggest_float("learning_rate", 1e-3, 0.3, log=True),
                "min_samples_split": trial.suggest_int("min_samples_split", 2, 20),
                "subsample":         trial.suggest_float("subsample", 0.6, 1.0),
                "random_state":      RANDOM_STATE,
            }
            model = GradientBoostingClassifier(**params)
            model.fit(X_train, y_train)
            return f1_score(y_val, model.predict(X_val), average="weighted")

        study = optuna.create_study(
            direction="maximize",
            sampler=optuna.samplers.TPESampler(seed=RANDOM_STATE),
        )
        study.optimize(objective, n_trials=N_TRIALS)
        best_params = {**study.best_params, "random_state": RANDOM_STATE}
        logging.info("Best clf params: %s | Val F1=%.4f", best_params, study.best_value)

        X_trainval = pd.concat([X_train, X_val], ignore_index=True)
        y_trainval = pd.concat([y_train, y_val], ignore_index=True)
        final_clf = GradientBoostingClassifier(**best_params)
        final_clf.fit(X_trainval, y_trainval)
        joblib.dump(final_clf, f"{TUNED_DIR}tuned_classifier.joblib")

    with open(f"{TUNED_DIR}best_clf_params.json", "w") as f:
        json.dump(best_params, f, indent=2)

    logging.info("Classifier tuning complete.")


def tune_regressor():
    import pandas as pd
    import numpy as np
    import joblib
    import optuna
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.metrics import mean_squared_error

    optuna.logging.set_verbosity(optuna.logging.WARNING)
    os.makedirs(TUNED_DIR, exist_ok=True)

    with open(f"{PIPELINE_DIR}model_selection.json") as f:
        selection = json.load(f)
    best_reg_name = selection["best_regressor"]

    X_train = pd.read_csv(f"{PROCESSED_DIR}X_train_reg.csv")
    X_val   = pd.read_csv(f"{PROCESSED_DIR}X_val_reg.csv")
    y_train = pd.read_csv(f"{PROCESSED_DIR}y_train_reg.csv").squeeze()
    y_val   = pd.read_csv(f"{PROCESSED_DIR}y_val_reg.csv").squeeze()

    if best_reg_name not in TUNABLE_MODELS:
        logging.info("Selected regressor %s is not tunable — copying baseline.", best_reg_name)
        baseline = joblib.load(f"{PIPELINE_DIR}baseline_models/{best_reg_name}_reg.joblib")
        joblib.dump(baseline, f"{TUNED_DIR}tuned_regressor.joblib")
        best_params = {}
    else:
        def objective(trial):
            params = {
                "n_estimators":      trial.suggest_int("n_estimators", 100, 500),
                "max_depth":         trial.suggest_int("max_depth", 3, 8),
                "learning_rate":     trial.suggest_float("learning_rate", 1e-3, 0.3, log=True),
                "min_samples_split": trial.suggest_int("min_samples_split", 2, 20),
                "subsample":         trial.suggest_float("subsample", 0.6, 1.0),
                "random_state":      RANDOM_STATE,
            }
            model = GradientBoostingRegressor(**params)
            model.fit(X_train, y_train)
            return float(np.sqrt(mean_squared_error(y_val, model.predict(X_val))))

        study = optuna.create_study(
            direction="minimize",
            sampler=optuna.samplers.TPESampler(seed=RANDOM_STATE),
        )
        study.optimize(objective, n_trials=N_TRIALS)
        best_params = {**study.best_params, "random_state": RANDOM_STATE}
        logging.info("Best reg params: %s | Val RMSE=%.4f", best_params, study.best_value)

        X_trainval = pd.concat([X_train, X_val], ignore_index=True)
        y_trainval = pd.concat([y_train, y_val], ignore_index=True)
        final_reg = GradientBoostingRegressor(**best_params)
        final_reg.fit(X_trainval, y_trainval)
        joblib.dump(final_reg, f"{TUNED_DIR}tuned_regressor.joblib")

    with open(f"{TUNED_DIR}best_reg_params.json", "w") as f:
        json.dump(best_params, f, indent=2)

    logging.info("Regressor tuning complete.")


def evaluate_tuned_models():
    import pandas as pd
    import numpy as np
    import joblib
    from sklearn.metrics import (
        f1_score, roc_auc_score, accuracy_score,
        r2_score, mean_squared_error, mean_absolute_error,
        classification_report,
    )

    clf = joblib.load(f"{TUNED_DIR}tuned_classifier.joblib")
    reg = joblib.load(f"{TUNED_DIR}tuned_regressor.joblib")

    X_test_clf = pd.read_csv(f"{PROCESSED_DIR}X_test_clf.csv")
    y_test_clf = pd.read_csv(f"{PROCESSED_DIR}y_test_clf.csv").squeeze()
    X_test_reg = pd.read_csv(f"{PROCESSED_DIR}X_test_reg.csv")
    y_test_reg = pd.read_csv(f"{PROCESSED_DIR}y_test_reg.csv").squeeze()

    y_pred_clf  = clf.predict(X_test_clf)
    y_proba_clf = clf.predict_proba(X_test_clf)[:, 1]

    clf_metrics = {
        "accuracy":    round(accuracy_score(y_test_clf, y_pred_clf), 4),
        "f1_weighted": round(f1_score(y_test_clf, y_pred_clf, average="weighted"), 4),
        "auc_roc":     round(roc_auc_score(y_test_clf, y_proba_clf), 4),
    }
    logging.info("[TUNED CLF] F1=%.4f AUC=%.4f", clf_metrics["f1_weighted"], clf_metrics["auc_roc"])
    logging.info("\n%s", classification_report(y_test_clf, y_pred_clf, target_names=["Safe", "Hazardous"]))

    y_pred_reg = reg.predict(X_test_reg)
    rmse_km    = float(np.sqrt(mean_squared_error(np.expm1(y_test_reg), np.expm1(y_pred_reg))))
    reg_metrics = {
        "r2":       round(r2_score(y_test_reg, y_pred_reg), 4),
        "rmse_log": round(float(np.sqrt(mean_squared_error(y_test_reg, y_pred_reg))), 4),
        "mae_log":  round(float(mean_absolute_error(y_test_reg, y_pred_reg)), 4),
        "rmse_km":  round(rmse_km, 2),
    }
    logging.info("[TUNED REG] R2=%.4f RMSE(km)=%.0f", reg_metrics["r2"], reg_metrics["rmse_km"])

    with open(f"{TUNED_DIR}tuned_test_metrics.json", "w") as f:
        json.dump({"classifier": clf_metrics, "regressor": reg_metrics}, f, indent=2)

    logging.info("Tuned model evaluation complete.")


with DAG(
    dag_id="model_parameter_tunner",
    description="Optuna hyperparameter tuning on selected best models, retrain on train+val, evaluate on test",
    schedule="@once",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["mlops", "neo", "tuning"],
) as dag:

    tune_clf_task = PythonOperator(
        task_id="tune_classifier",
        python_callable=tune_classifier,
    )

    tune_reg_task = PythonOperator(
        task_id="tune_regressor",
        python_callable=tune_regressor,
    )

    evaluate_task = PythonOperator(
        task_id="evaluate_tuned_models",
        python_callable=evaluate_tuned_models,
    )

    # Sequential to avoid OOM from two tuning tasks competing on limited RAM
    tune_clf_task >> tune_reg_task >> evaluate_task
