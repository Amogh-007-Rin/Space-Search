from contextlib import asynccontextmanager
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR     = Path(__file__).parent
ARTIFACT_DIR = (BASE_DIR / "../models/artifacts").resolve()
DATASET_PATH = (BASE_DIR / "../Dataset/Raw/neo.csv").resolve()

# ── Global state ──────────────────────────────────────────────────────────────
models: dict = {}
neo_df: pd.DataFrame = None


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global neo_df
    models["clf"]        = joblib.load(ARTIFACT_DIR / "classifier.joblib")
    models["reg"]        = joblib.load(ARTIFACT_DIR / "regressor.joblib")
    models["scaler_clf"] = joblib.load(ARTIFACT_DIR / "scaler_clf.joblib")
    models["scaler_reg"] = joblib.load(ARTIFACT_DIR / "scaler_reg.joblib")
    with open(ARTIFACT_DIR / "feature_names.json") as f:
        models["features"] = json.load(f)
    with open(ARTIFACT_DIR / "model_metadata.json") as f:
        models["metadata"] = json.load(f)
    neo_df = pd.read_csv(DATASET_PATH)
    yield
    models.clear()


app = FastAPI(
    title="NEO Prediction API",
    description="Near Earth Object hazard classification and miss distance prediction API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost",
        "http://reddx.me",
        "https://reddx.me",
        "http://spacesearch.reddx.me",
        "https://spacesearch.reddx.me",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────
class AsteroidInput(BaseModel):
    est_diameter_min:   float = Field(..., gt=0, description="Minimum estimated diameter (km)")
    est_diameter_max:   float = Field(..., gt=0, description="Maximum estimated diameter (km)")
    relative_velocity:  float = Field(..., gt=0, description="Relative velocity (km/h)")
    absolute_magnitude: float = Field(..., description="Absolute magnitude (H)")
    miss_distance:      float = Field(..., gt=0, description="Miss distance from Earth (km)")


class PredictionOutput(BaseModel):
    hazardous:             bool
    hazardous_probability: float
    miss_distance_km:      float


# ── Inference helper ──────────────────────────────────────────────────────────
def _run_inference(body: AsteroidInput) -> PredictionOutput:
    diameter_avg          = (body.est_diameter_min + body.est_diameter_max) / 2
    diameter_ratio        = body.est_diameter_max / body.est_diameter_min
    log_diameter_avg      = np.log1p(diameter_avg)
    log_diameter_ratio    = np.log1p(diameter_ratio)
    log_relative_velocity = np.log1p(body.relative_velocity)
    log_miss_distance     = np.log1p(body.miss_distance)

    clf_features = models["features"]["clf_features"]
    reg_features = models["features"]["reg_features"]

    clf_input = pd.DataFrame([[
        log_diameter_avg, log_diameter_ratio, log_relative_velocity,
        log_miss_distance, body.absolute_magnitude, diameter_avg, diameter_ratio,
    ]], columns=clf_features)

    reg_input = pd.DataFrame([[
        log_diameter_avg, log_diameter_ratio, log_relative_velocity,
        body.absolute_magnitude, diameter_avg, diameter_ratio,
    ]], columns=reg_features)

    clf_scaled = pd.DataFrame(models["scaler_clf"].transform(clf_input), columns=clf_features)
    reg_scaled = pd.DataFrame(models["scaler_reg"].transform(reg_input), columns=reg_features)

    return PredictionOutput(
        hazardous=bool(models["clf"].predict(clf_scaled)[0]),
        hazardous_probability=round(float(models["clf"].predict_proba(clf_scaled)[0, 1]), 4),
        miss_distance_km=round(float(np.expm1(models["reg"].predict(reg_scaled)[0])), 2),
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def health_check():
    """Server health check."""
    return JSONResponse(content={"message": "server is up and running", "healthy": True})


@app.get("/model/info", tags=["Model"])
async def model_info():
    """Return trained model metadata — hyperparameters, test metrics, feature names."""
    return JSONResponse(content=models["metadata"])


@app.post("/predict", response_model=PredictionOutput, tags=["Prediction"])
async def predict(body: AsteroidInput):
    """Predict whether an asteroid is hazardous and estimate its miss distance."""
    if body.est_diameter_max < body.est_diameter_min:
        raise HTTPException(
            status_code=422,
            detail="est_diameter_max must be greater than or equal to est_diameter_min",
        )
    return _run_inference(body)


@app.post("/neo/predict-batch", tags=["Prediction"])
async def predict_batch(bodies: list[AsteroidInput]):
    """Run hazard prediction on a batch of asteroids (max 100 per request)."""
    if len(bodies) == 0:
        raise HTTPException(status_code=422, detail="Request body must contain at least one asteroid")
    if len(bodies) > 100:
        raise HTTPException(status_code=422, detail="Batch size cannot exceed 100")
    results = []
    for i, body in enumerate(bodies):
        if body.est_diameter_max < body.est_diameter_min:
            raise HTTPException(
                status_code=422,
                detail=f"Item {i}: est_diameter_max must be >= est_diameter_min",
            )
        results.append(_run_inference(body).model_dump())
    return JSONResponse(content={"count": len(results), "predictions": results})


@app.get("/neo/info/all", tags=["NEO Data"])
async def neo_info_all(
    limit:  int = Query(100, ge=1, le=1000, description="Number of records to return"),
    offset: int = Query(0,   ge=0,          description="Number of records to skip"),
):
    """Return paginated list of all NEO records from the dataset."""
    slice_ = neo_df.iloc[offset: offset + limit]
    return JSONResponse(content={
        "total":  len(neo_df),
        "offset": offset,
        "limit":  limit,
        "count":  len(slice_),
        "data":   slice_.to_dict(orient="records"),
    })


@app.get("/neo/info/{neo_id}", tags=["NEO Data"])
async def neo_by_id(neo_id: int):
    """Return a single NEO record by its ID."""
    row = neo_df[neo_df["id"] == neo_id]
    if row.empty:
        raise HTTPException(status_code=404, detail=f"NEO with id {neo_id} not found")
    return JSONResponse(content=row.iloc[0].to_dict())


@app.get("/neo/hazardous", tags=["NEO Data"])
async def neo_hazardous(
    limit:  int = Query(100, ge=1, le=1000),
    offset: int = Query(0,   ge=0),
):
    """Return paginated list of all hazardous NEOs."""
    filtered = neo_df[neo_df["hazardous"] == True]
    slice_ = filtered.iloc[offset: offset + limit]
    return JSONResponse(content={
        "total":  len(filtered),
        "offset": offset,
        "limit":  limit,
        "count":  len(slice_),
        "data":   slice_.to_dict(orient="records"),
    })


@app.get("/neo/safe", tags=["NEO Data"])
async def neo_safe(
    limit:  int = Query(100, ge=1, le=1000),
    offset: int = Query(0,   ge=0),
):
    """Return paginated list of all safe (non-hazardous) NEOs."""
    filtered = neo_df[neo_df["hazardous"] == False]
    slice_ = filtered.iloc[offset: offset + limit]
    return JSONResponse(content={
        "total":  len(filtered),
        "offset": offset,
        "limit":  limit,
        "count":  len(slice_),
        "data":   slice_.to_dict(orient="records"),
    })


@app.get("/neo/stats", tags=["NEO Data"])
async def neo_stats():
    """Return summary statistics about the NEO dataset."""
    return JSONResponse(content={
        "total_records":          len(neo_df),
        "hazardous_count":        int(neo_df["hazardous"].sum()),
        "safe_count":             int((~neo_df["hazardous"]).sum()),
        "hazardous_percentage":   round(float(neo_df["hazardous"].mean() * 100), 2),
        "velocity_avg_kmph":      round(float(neo_df["relative_velocity"].mean()), 2),
        "velocity_max_kmph":      round(float(neo_df["relative_velocity"].max()), 2),
        "miss_distance_avg_km":   round(float(neo_df["miss_distance"].mean()), 2),
        "miss_distance_min_km":   round(float(neo_df["miss_distance"].min()), 2),
        "diameter_min_avg_km":    round(float(neo_df["est_diameter_min"].mean()), 6),
        "diameter_max_avg_km":    round(float(neo_df["est_diameter_max"].mean()), 6),
        "absolute_magnitude_avg": round(float(neo_df["absolute_magnitude"].mean()), 3),
    })


@app.get("/neo/search", tags=["NEO Data"])
async def neo_search(
    name:  str = Query(..., min_length=1, description="Partial or full name to search"),
    limit: int = Query(50, ge=1, le=500),
):
    """Search NEOs by name (case-insensitive partial match)."""
    results = neo_df[neo_df["name"].str.contains(name, case=False, na=False)]
    return JSONResponse(content={
        "query":  name,
        "total":  len(results),
        "count":  min(len(results), limit),
        "data":   results.head(limit).to_dict(orient="records"),
    })
