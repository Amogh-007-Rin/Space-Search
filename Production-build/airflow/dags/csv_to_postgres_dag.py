from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from datetime import datetime
import pandas as pd
import logging

CSV_PATH = "/opt/airflow/dataset/Raw/neo.csv"
POSTGRES_CONN_ID = "neo_postgres"


def load_csv_to_postgres():
    df = pd.read_csv(CSV_PATH)
    logging.info("Loaded CSV with %d rows.", len(df))

    df.columns = [c.strip().lower() for c in df.columns]
    df["sentry_object"] = df["sentry_object"].astype(str).str.lower().map({"true": True, "false": False})
    df["hazardous"] = df["hazardous"].astype(str).str.lower().map({"true": True, "false": False})

    hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
    conn = hook.get_conn()
    cursor = conn.cursor()

    insert_sql = """
        INSERT INTO "NearEarthObject" (
            id, name, est_diameter_min, est_diameter_max,
            relative_velocity, miss_distance, orbiting_body,
            sentry_object, absolute_magnitude, hazardous
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            est_diameter_min = EXCLUDED.est_diameter_min,
            est_diameter_max = EXCLUDED.est_diameter_max,
            relative_velocity = EXCLUDED.relative_velocity,
            miss_distance = EXCLUDED.miss_distance,
            orbiting_body = EXCLUDED.orbiting_body,
            sentry_object = EXCLUDED.sentry_object,
            absolute_magnitude = EXCLUDED.absolute_magnitude,
            hazardous = EXCLUDED.hazardous;
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
    dag_id="csv_to_postgres",
    description="Migrate NEO asteroid CSV data to PostgreSQL",
    schedule="@once",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["mlops", "neo", "postgres"],
) as dag:

    PythonOperator(
        task_id="load_csv_to_postgres",
        python_callable=load_csv_to_postgres,
    )
