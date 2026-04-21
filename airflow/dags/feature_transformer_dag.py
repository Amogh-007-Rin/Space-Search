from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from datetime import datetime
import logging

RAW_PATH = "/opt/airflow/dataset/Raw/neo.csv"
POSTGRES_CONN_ID = "neo_postgres"
BATCH_SIZE = 1000


def create_features_table():
    hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
    hook.run("""
        CREATE TABLE IF NOT EXISTS "NearEarthObjectNewFeatures" (
            "featureId"             SERIAL PRIMARY KEY,
            "diameter_avg"          FLOAT   NOT NULL,
            "diameter_ratio"        FLOAT   NOT NULL,
            "log_diameter_avg"      FLOAT   NOT NULL,
            "log_diameter_ratio"    FLOAT   NOT NULL,
            "log_relative_velocity" FLOAT   NOT NULL,
            "log_miss_distance"     FLOAT   NOT NULL,
            "absolute_magnitude"    FLOAT   NOT NULL,
            "hazardous"             INTEGER NOT NULL,
            "sourceNeoId"           INTEGER REFERENCES "NearEarthObject"(id)
        );
    """)
    logging.info("NearEarthObjectNewFeatures table ensured.")


def transform_and_store_features():
    import pandas as pd
    import numpy as np

    df = pd.read_csv(RAW_PATH)
    df.columns = [c.strip().lower() for c in df.columns]
    logging.info("Loaded raw dataset: %d rows", len(df))

    assert (df["est_diameter_min"] > 0).all(), "Non-positive est_diameter_min found"

    df["diameter_avg"] = (df["est_diameter_min"] + df["est_diameter_max"]) / 2
    df["diameter_ratio"] = df["est_diameter_max"] / df["est_diameter_min"]
    df["log_diameter_avg"] = np.log1p(df["diameter_avg"])
    df["log_diameter_ratio"] = np.log1p(df["diameter_ratio"])
    df["log_relative_velocity"] = np.log1p(df["relative_velocity"])
    df["log_miss_distance"] = np.log1p(df["miss_distance"])

    df["hazardous"] = (
        df["hazardous"].astype(str).str.lower().map({"true": 1, "false": 0}).astype(int)
    )

    hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
    conn = hook.get_conn()
    cursor = conn.cursor()

    insert_sql = """
        INSERT INTO "NearEarthObjectNewFeatures" (
            "diameter_avg", "diameter_ratio",
            "log_diameter_avg", "log_diameter_ratio",
            "log_relative_velocity", "log_miss_distance",
            "absolute_magnitude", "hazardous", "sourceNeoId"
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    rows = [
        (
            float(row["diameter_avg"]),
            float(row["diameter_ratio"]),
            float(row["log_diameter_avg"]),
            float(row["log_diameter_ratio"]),
            float(row["log_relative_velocity"]),
            float(row["log_miss_distance"]),
            float(row["absolute_magnitude"]),
            int(row["hazardous"]),
            int(row["id"]),
        )
        for _, row in df.iterrows()
    ]

    total = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        cursor.executemany(insert_sql, batch)
        conn.commit()
        total += len(batch)
        logging.info("Inserted batch: %d / %d rows", total, len(rows))

    cursor.close()
    logging.info("Feature transformation complete. %d rows stored.", total)


with DAG(
    dag_id="feature_transformer",
    description="Engineer features from raw NEO data and store in NearEarthObjectNewFeatures table",
    schedule="@once",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["mlops", "neo", "features"],
) as dag:

    create_table = PythonOperator(
        task_id="create_features_table",
        python_callable=create_features_table,
    )

    transform_store = PythonOperator(
        task_id="transform_and_store_features",
        python_callable=transform_and_store_features,
    )

    create_table >> transform_store
