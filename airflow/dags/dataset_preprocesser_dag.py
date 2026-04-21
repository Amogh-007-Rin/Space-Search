from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
import os
import logging

RAW_PATH = "/opt/airflow/dataset/Raw/neo.csv"
PROCESSED_DIR = "/opt/airflow/dataset/Processed/"
POSTGRES_CONN_ID = "neo_postgres"
RANDOM_STATE = 42


def preprocess_dataset():
    import pandas as pd
    import numpy as np
    import joblib
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    from imblearn.over_sampling import SMOTE

    os.makedirs(PROCESSED_DIR, exist_ok=True)

    df = pd.read_csv(RAW_PATH)
    assert df.shape == (90836, 10), f"Unexpected CSV shape: {df.shape}"
    assert df.isnull().sum().sum() == 0, "Null values found in raw dataset"
    logging.info("Loaded raw dataset: %d rows", len(df))

    df.drop(columns=["id", "name", "orbiting_body", "sentry_object"], inplace=True)

    assert (df["est_diameter_min"] > 0).all(), "Non-positive diameter_min found"
    df["diameter_avg"] = (df["est_diameter_min"] + df["est_diameter_max"]) / 2
    df["diameter_ratio"] = df["est_diameter_max"] / df["est_diameter_min"]
    df["log_diameter_avg"] = np.log1p(df["diameter_avg"])
    df["log_diameter_ratio"] = np.log1p(df["diameter_ratio"])
    df["log_relative_velocity"] = np.log1p(df["relative_velocity"])
    df["log_miss_distance"] = np.log1p(df["miss_distance"])
    df.drop(
        columns=["est_diameter_min", "est_diameter_max", "relative_velocity", "miss_distance"],
        inplace=True,
    )

    assert not df.isnull().any().any(), "NaN introduced during feature engineering"
    assert not np.isinf(df.select_dtypes("number").values).any(), "Inf introduced during feature engineering"

    df["hazardous"] = df["hazardous"].astype(int)

    CLF_FEATURES = [
        "log_diameter_avg", "log_diameter_ratio", "log_relative_velocity",
        "log_miss_distance", "absolute_magnitude", "diameter_avg", "diameter_ratio",
    ]
    REG_FEATURES = [
        "log_diameter_avg", "log_diameter_ratio", "log_relative_velocity",
        "absolute_magnitude", "diameter_avg", "diameter_ratio",
    ]

    X_clf = df[CLF_FEATURES]
    y_clf = df["hazardous"]
    X_reg = df[REG_FEATURES]
    y_reg = df["log_miss_distance"]

    X_clf_train, X_clf_temp, y_clf_train, y_clf_temp = train_test_split(
        X_clf, y_clf, test_size=0.30, random_state=RANDOM_STATE, stratify=y_clf
    )
    X_clf_val, X_clf_test, y_clf_val, y_clf_test = train_test_split(
        X_clf_temp, y_clf_temp, test_size=0.50, random_state=RANDOM_STATE, stratify=y_clf_temp
    )

    X_reg_train = X_reg.loc[X_clf_train.index]
    X_reg_val = X_reg.loc[X_clf_val.index]
    X_reg_test = X_reg.loc[X_clf_test.index]
    y_reg_train = y_reg.loc[X_clf_train.index]
    y_reg_val = y_reg.loc[X_clf_val.index]
    y_reg_test = y_reg.loc[X_clf_test.index]

    smote = SMOTE(random_state=RANDOM_STATE)
    X_clf_train_sm, y_clf_train_sm = smote.fit_resample(X_clf_train, y_clf_train)
    logging.info("SMOTE applied: training set expanded to %d rows", len(X_clf_train_sm))

    scaler_clf = StandardScaler()
    X_clf_train_scaled = pd.DataFrame(
        scaler_clf.fit_transform(X_clf_train_sm), columns=CLF_FEATURES
    )
    X_clf_val_scaled = pd.DataFrame(scaler_clf.transform(X_clf_val), columns=CLF_FEATURES)
    X_clf_test_scaled = pd.DataFrame(scaler_clf.transform(X_clf_test), columns=CLF_FEATURES)

    scaler_reg = StandardScaler()
    X_reg_train_scaled = pd.DataFrame(
        scaler_reg.fit_transform(X_reg_train), columns=REG_FEATURES
    )
    X_reg_val_scaled = pd.DataFrame(scaler_reg.transform(X_reg_val), columns=REG_FEATURES)
    X_reg_test_scaled = pd.DataFrame(scaler_reg.transform(X_reg_test), columns=REG_FEATURES)

    X_clf_train_scaled.to_csv(f"{PROCESSED_DIR}X_train_clf.csv", index=False)
    X_clf_val_scaled.to_csv(f"{PROCESSED_DIR}X_val_clf.csv", index=False)
    X_clf_test_scaled.to_csv(f"{PROCESSED_DIR}X_test_clf.csv", index=False)
    pd.Series(y_clf_train_sm, name="hazardous").to_csv(f"{PROCESSED_DIR}y_train_clf.csv", index=False)
    y_clf_val.reset_index(drop=True).to_csv(f"{PROCESSED_DIR}y_val_clf.csv", index=False)
    y_clf_test.reset_index(drop=True).to_csv(f"{PROCESSED_DIR}y_test_clf.csv", index=False)

    X_reg_train_scaled.to_csv(f"{PROCESSED_DIR}X_train_reg.csv", index=False)
    X_reg_val_scaled.to_csv(f"{PROCESSED_DIR}X_val_reg.csv", index=False)
    X_reg_test_scaled.to_csv(f"{PROCESSED_DIR}X_test_reg.csv", index=False)
    y_reg_train.reset_index(drop=True).to_csv(f"{PROCESSED_DIR}y_train_reg.csv", index=False)
    y_reg_val.reset_index(drop=True).to_csv(f"{PROCESSED_DIR}y_val_reg.csv", index=False)
    y_reg_test.reset_index(drop=True).to_csv(f"{PROCESSED_DIR}y_test_reg.csv", index=False)

    joblib.dump(scaler_clf, f"{PROCESSED_DIR}scaler_clf.joblib")
    joblib.dump(scaler_reg, f"{PROCESSED_DIR}scaler_reg.joblib")

    logging.info("Preprocessing complete. Saved 12 CSVs + 2 scalers to %s", PROCESSED_DIR)


def load_raw_to_postgres():
    """Load raw neo.csv into the NearEarthObject table directly — no cross-DAG trigger needed."""
    import pandas as pd
    from airflow.providers.postgres.hooks.postgres import PostgresHook

    df = pd.read_csv(RAW_PATH)
    logging.info("Loaded CSV with %d rows.", len(df))

    df.columns = [c.strip().lower() for c in df.columns]
    df["sentry_object"] = df["sentry_object"].astype(str).str.lower().map({"true": True, "false": False})
    df["hazardous"] = df["hazardous"].astype(str).str.lower().map({"true": True, "false": False})

    hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
    conn = hook.get_conn()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS "NearEarthObject" (
            id                 BIGINT PRIMARY KEY,
            name               TEXT,
            est_diameter_min   FLOAT,
            est_diameter_max   FLOAT,
            relative_velocity  FLOAT,
            miss_distance      FLOAT,
            orbiting_body      TEXT,
            sentry_object      BOOLEAN,
            absolute_magnitude FLOAT,
            hazardous          BOOLEAN
        );
    """)
    conn.commit()

    insert_sql = """
        INSERT INTO "NearEarthObject" (
            id, name, est_diameter_min, est_diameter_max,
            relative_velocity, miss_distance, orbiting_body,
            sentry_object, absolute_magnitude, hazardous
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            name               = EXCLUDED.name,
            est_diameter_min   = EXCLUDED.est_diameter_min,
            est_diameter_max   = EXCLUDED.est_diameter_max,
            relative_velocity  = EXCLUDED.relative_velocity,
            miss_distance      = EXCLUDED.miss_distance,
            orbiting_body      = EXCLUDED.orbiting_body,
            sentry_object      = EXCLUDED.sentry_object,
            absolute_magnitude = EXCLUDED.absolute_magnitude,
            hazardous          = EXCLUDED.hazardous;
    """

    rows = [
        (
            int(row["id"]), row["name"], row["est_diameter_min"], row["est_diameter_max"],
            row["relative_velocity"], row["miss_distance"], row["orbiting_body"],
            row["sentry_object"], row["absolute_magnitude"], row["hazardous"],
        )
        for _, row in df.iterrows()
    ]

    cursor.executemany(insert_sql, rows)
    conn.commit()
    cursor.close()
    logging.info("Inserted/updated %d rows into NearEarthObject.", len(rows))


with DAG(
    dag_id="dataset_preprocesser",
    description="Preprocess raw NEO dataset, save processed splits, load raw data into PostgreSQL",
    schedule="@once",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["mlops", "neo", "preprocessing"],
) as dag:

    preprocess_task = PythonOperator(
        task_id="preprocess_dataset",
        python_callable=preprocess_dataset,
    )

    load_postgres_task = PythonOperator(
        task_id="load_raw_to_postgres",
        python_callable=load_raw_to_postgres,
    )

    preprocess_task >> load_postgres_task
