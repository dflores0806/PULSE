# 🌐 FastAPI & related
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# 🔧 Pydantic
from pydantic import BaseModel

# 📊 Machine Learning & Data
import pandas as pd
import numpy as np
import tensorflow as tf
import faiss
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score
from sentence_transformers import SentenceTransformer
from threading import Lock

# 📚 Utilities & system
import os
import glob
import json
import shutil
import tempfile
import zipfile
import requests
from datetime import datetime
from pathlib import Path
from langdetect import detect
from typing import List
import json
import uuid
import time
import matplotlib.pyplot as plt
import io
import base64

CONFIG_PATH = Path(".config/config.json")

DATASETS_FOLDER = Path("datasets")
MODEL_FOLDER = Path("models")
SUMMARY_FOLDER = Path("summaries")

DATASETS_FOLDER.mkdir(parents=True, exist_ok=True)
MODEL_FOLDER.mkdir(parents=True, exist_ok=True)
SUMMARY_FOLDER.mkdir(parents=True, exist_ok=True)

app = FastAPI()
app.mount("/models", StaticFiles(directory=MODEL_FOLDER), name="models")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_model(model_name):
    if model_name not in loaded_models:
        model_path = Path(MODEL_FOLDER, f'{model_name}.h5')
        loaded_models[model_name] = tf.keras.models.load_model(model_path)
    return loaded_models[model_name]

# Create default .config if not exists
os.makedirs(".config", exist_ok=True)

if not os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, "w") as f:
        json.dump({"default_model": None}, f)
        
# LOGIN
USERNAME = os.getenv("LOGIN_USERNAME", "admin")
PASSWORD = os.getenv("LOGIN_PASSWORD", "admin")

@app.post("/auth/login", tags=["Login"])
def login(username: str = Form(...), password: str = Form(...)):
    if username == USERNAME and password == PASSWORD:
        return JSONResponse(content={"success": True})
    raise HTTPException(status_code=401, detail="Invalid credentials")

# PREDICTIONS
stored_data = {}
model_lock = Lock()
loaded_models = {}

class FeatureSelection(BaseModel):
    features: list[str]
    epochs: int
    test_size: float

class PredictionInput(BaseModel):
    values: dict

@app.post("/pulse/generator/upload_data", tags=["PUEModelGenerator"])
async def upload_data(model_name: str = Form(...), file: UploadFile = File(...)):
    file_location = os.path.abspath(Path(DATASETS_FOLDER, f"{model_name}.csv"))
    with open(file_location, "wb") as f:
        f.write(await file.read())

    df = pd.read_csv(file_location, sep=';')
    df.columns = [col.lower() for col in df.columns]
        
    return {"message": "File uploaded successfully", "columns": df.columns.tolist()}

@app.post("/pulse/generator/load_sample", tags=["PUEModelGenerator"])
def load_sample(model_name: str = Form(...)):
    sample_path = os.path.abspath(Path(DATASETS_FOLDER, "sample.csv"))
    dest_path = os.path.abspath(Path(DATASETS_FOLDER, f"{model_name}.csv"))

    if not Path(sample_path):
        return {"error": "Sample file not found."}

    df = pd.read_csv(sample_path, sep=';')
    df.columns = [col.lower() for col in df.columns]
    df.to_csv(dest_path, index=False)

    return {"message": "Sample loaded successfully.", "columns": df.columns.tolist()}

@app.post("/pulse/generator/suggest_features", tags=["PUEModelGenerator"])
def suggest_features(model_name: str = Form(...)):
    file_location = os.path.abspath(Path(DATASETS_FOLDER, f"{model_name}.csv"))
    if not Path(file_location):
        return {"error": "No CSV uploaded yet."}

    df = pd.read_csv(file_location, sep=';')
    df.columns = [col.lower() for col in df.columns]

    if 'pue' not in df.columns:
        return {"error": "'pue' column not found in uploaded data."}

    corrs = df.corr(numeric_only=True)['pue'].abs().dropna().sort_values(ascending=False)
    
    threshold = 0.3
    suggested = corrs[(corrs.index != 'pue') & (corrs > threshold)].index.tolist()
    return {"suggested_features": suggested, "correlations": corrs.to_dict()}

@app.post("/pulse/generator/train_model", tags=["PUEModelGenerator"])
def train_model(
    model_name: str = Form(...),
    features: str = Form(...),
    epochs: int = Form(...),
    test_size: float = Form(...)
):
    features = json.loads(features)
    file_location = os.path.abspath(Path(DATASETS_FOLDER, f"{model_name}.csv"))
    df = pd.read_csv(file_location, sep=';')
    df.columns = [col.lower() for col in df.columns]
    X = df[features].values
    y = df['pue'].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=test_size / 100, random_state=42)

    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=(X.shape[1],)),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dense(1)
    ])

    model.compile(optimizer='adam', loss='mse')
    history = model.fit(X_train, y_train, epochs=epochs, batch_size=16, verbose=0)

    # Remove old version from cache if it exists
    if model_name in loaded_models:
        del loaded_models[model_name]

    model.save(Path(MODEL_FOLDER, f'{model_name}.h5'), include_optimizer=False)
    joblib.dump(scaler, Path(MODEL_FOLDER, f'{model_name}_scaler.gz'))
    stored_data[model_name] = features

    with model_lock:
        model = get_model(model_name)
        y_pred = model.predict(X_test).flatten()
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    loss = history.history['loss'][-1]

    SUMMARY_FOLDER.mkdir(parents=True, exist_ok=True)
    summary_path = Path(SUMMARY_FOLDER, f"{model_name}.json")
    with open(summary_path, "w") as f:
        json.dump({
            "model_name": model_name,
            "features": features,
            "epochs": epochs,
            "test_size": test_size,
            "metrics": {
                "loss": float(loss),
                "mae": float(mae),
                "r2": float(r2)
            }
        }, f, indent=2)

    return {"message": "Model trained successfully.", "loss": float(loss), "mae": float(mae), "r2": float(r2)}

@app.post("/pulse/generator/predict", tags=["PUEModelGenerator"])
def predict_pue(
    input: str = Form(...),
    model_name: str = Form(...),
    save_simulation: bool = Form(False)
):
    input_data = json.loads(input)
    model_path = Path(MODEL_FOLDER, f'{model_name}.h5')
    scaler_path = Path(MODEL_FOLDER, f'{model_name}_scaler.gz')

    if not model_path.exists() or not scaler_path.exists():
        return {"error": "Model not trained yet."}

    model = tf.keras.models.load_model(model_path)
    if not hasattr(model, 'predict'):
        raise RuntimeError("Model loaded is not ready for prediction.")

    scaler = joblib.load(scaler_path)

    summary_path = Path(SUMMARY_FOLDER, f"{model_name}.json")
    if not summary_path.exists():
        return {"error": "Summary not found."}

    with open(summary_path) as f:
        summary = json.load(f)

    features = summary.get("features")
    if not features:
        return {"error": "Features not defined in summary."}

    values = [input_data['values'][feat] for feat in features]
    X = scaler.transform([values])
    with model_lock:
        model = get_model(model_name)
        prediction = model.predict(X)[0][0]
    prediction = round(float(prediction), 4)

    update_prediction_stats()

    # Save if required
    if save_simulation:
        simulations = summary.get("simulations", [])
        next_id = max((s.get("id", 0) for s in simulations), default=0) + 1

        simulations.append({
            "id": next_id,
            "timestamp": datetime.now().isoformat(),
            "inputs": input_data['values'],
            "pue": prediction
        })

        summary["simulations"] = simulations

        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)

    return {"pue_prediction": prediction}

def update_prediction_stats():
    
    stats_path = Path(".config", "statistics.json")
    Path(".config").mkdir(parents=True, exist_ok=True)

    stats = {
        "predictions_per_month": {},
        "llm_questions": 0
    }

    if Path(stats_path):
        try:
            with open(stats_path, "r") as f:
                content = f.read()
                if content.strip(): 
                    stats = json.loads(content)
        except Exception:
            pass  

    now = datetime.now()
    key = f"{now.year}-{now.month:02}"
    stats["predictions_per_month"][key] = stats["predictions_per_month"].get(key, 0) + 1

    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2)

@app.post("/pulse/generator/example_input", tags=["PUEModelGenerator"])
def get_example_input(
    features: str = Form(...),
    model_name: str = Form(...)
):
    features = json.loads(features)
    file_location = os.path.abspath(Path(DATASETS_FOLDER, f"{model_name}.csv"))
    if not Path(file_location):
        return {"error": "No CSV uploaded."}

    df = pd.read_csv(file_location, sep=';')
    df.columns = [col.lower() for col in df.columns]

    missing = [f for f in features if f not in df.columns]
    if missing:
        return {"error": f"Missing features in data: {missing}"}

    row = df[features].dropna().sample(1).iloc[0]
    return {"example": row.to_dict()}

@app.post("/pulse/generator/automl_train", tags=["PUEModelGenerator"])
async def automl_train_streaming(
    model_name: str = Form(...),
    features: str = Form(...),
    epochs_options: str = Form(...),
    test_size_options: str = Form(...)
):
    features = json.loads(features)
    epochs_options = json.loads(epochs_options)
    test_size_options = json.loads(test_size_options)

    file_location = Path(DATASETS_FOLDER) / f"{model_name}.csv"
    if not file_location.exists():
        return {"error": "Dataset not found."}

    df = pd.read_csv(file_location, sep=';')
    df.columns = [col.lower() for col in df.columns]

    X = df[features].values
    y = df['pue'].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    async def model_generator():
        for test_size in test_size_options:
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y, test_size=test_size/100, random_state=42
            )

            for epochs in epochs_options:
                model = tf.keras.Sequential([
                    tf.keras.layers.Dense(64, activation='relu', input_shape=(X.shape[1],)),
                    tf.keras.layers.Dense(32, activation='relu'),
                    tf.keras.layers.Dense(1)
                ])
                
                #with model_lock:
                    #model = get_model(model_name)
                    
                
                model.compile(optimizer='adam', loss='mse')
                history = model.fit(X_train, y_train, epochs=epochs, batch_size=16, verbose=0)

                y_pred = model.predict(X_test).flatten()
                loss = history.history['loss'][-1]
                mae = mean_absolute_error(y_test, y_pred)
                r2 = r2_score(y_test, y_pred)

                temp_id = str(uuid.uuid4())
                temp_folder = Path("temp_models") / temp_id
                temp_folder.mkdir(parents=True, exist_ok=True)

                model.save(temp_folder / "model.h5", include_optimizer=False)
                joblib.dump(scaler, temp_folder / "scaler.gz")

                summary = {
                    "model_name": model_name,
                    "features": features,
                    "epochs": epochs,
                    "test_size": test_size,
                    "metrics": {
                        "loss": float(loss),
                        "mae": float(mae),
                        "r2": float(r2)
                    }
                }
                with open(temp_folder / "summary.json", "w") as f:
                    json.dump(summary, f, indent=2)

                yield json.dumps({
                    "temp_id": temp_id,
                    "epochs": epochs,
                    "test_size": test_size,
                    "loss": round(float(loss), 6),
                    "mae": round(float(mae), 6),
                    "r2": round(float(r2), 6)
                }) + "\n"

    return StreamingResponse(model_generator(), media_type="application/json")


class SaveAutoMLRequest(BaseModel):
    model_temp_id: str
    final_model_name: str

@app.post("/pulse/generator/save_automl_model", tags=["PUEModelGenerator"])
async def save_automl_model(payload: SaveAutoMLRequest):
    temp_id = payload.model_temp_id
    final_name = payload.final_model_name

    temp_folder = Path("temp_models") / temp_id
    if not temp_folder.exists():
        return {"error": "Temporary model not found."}

    model_path = temp_folder / "model.h5"
    scaler_path = temp_folder / "scaler.gz"
    summary_path = temp_folder / "summary.json"

    if not model_path.exists() or not scaler_path.exists() or not summary_path.exists():
        return {"error": "Incomplete model files."}

    model_dest = Path(MODEL_FOLDER) / f"{final_name}.h5"
    scaler_dest = Path(MODEL_FOLDER) / f"{final_name}_scaler.gz"
    summary_dest = Path(SUMMARY_FOLDER) / f"{final_name}.json"

    os.makedirs(MODEL_FOLDER, exist_ok=True)
    os.makedirs(SUMMARY_FOLDER, exist_ok=True)
    
    # Remove old version from cache if it exists
    if final_name in loaded_models:
        del loaded_models[final_name]

    shutil.copy(model_path, model_dest)
    shutil.copy(scaler_path, scaler_dest)

    with open(summary_path) as f:
        summary = json.load(f)
    summary["model_name"] = final_name
    with open(summary_dest, "w") as f:
        json.dump(summary, f, indent=2)

    original_csv_path = Path(DATASETS_FOLDER) / f"{summary['model_name'].split('-')[0]}.csv"
    final_csv_path = Path(DATASETS_FOLDER) / f"{final_name}.csv"
    if original_csv_path.exists():
        shutil.copy(original_csv_path, final_csv_path)

    shutil.rmtree(temp_folder)

    return {"message": "Model saved successfully!"}

@app.post("/pulse/generator/simulation/delete", tags=["PUEModelGenerator"])
async def simulation_delete(model_name: str = Form(...), sim_id: int = Form(...)):
    summary_path = Path(SUMMARY_FOLDER) / f"{model_name}.json"

    if not summary_path.exists():
        return {"error": "Summary not found."}

    with open(summary_path, "r", encoding="utf-8") as f:
        summary = json.load(f)

    simulations = summary.get("simulations", [])
    initial_count = len(simulations)

    summary["simulations"] = [s for s in simulations if s.get("id") != sim_id]

    if len(summary["simulations"]) == initial_count:
        return {"error": f"Simulation with id {sim_id} not found."}

    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    return {"message": f"Simulation {sim_id} deleted successfully."}

@app.post("/pulse/explorer/simulations/clear", tags=["PUEModelExplorer"])
async def simulations_clear(model_name: str = Form(...)):
    summary_path = Path(SUMMARY_FOLDER) / f"{model_name}.json"

    if not summary_path.exists():
        return {"error": "Summary not found."}

    with open(summary_path, "r", encoding="utf-8") as f:
        summary = json.load(f)

    if "simulations" in summary:
        summary["simulations"] = []

        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)

    return {"message": "All simulations cleared."}


@app.get("/pulse/explorer/models", tags=["PUEModelExplorer"])
def list_models():
    if not MODEL_FOLDER.exists():
        return {"models": []}
    model_names = [f.stem for f in MODEL_FOLDER.iterdir() if f.suffix == ".h5"]
    return {"models": model_names}

@app.get("/pulse/explorer/summary/{model_name}", tags=["PUEModelExplorer"])
def get_model_summary(model_name: str):
    summary_file = Path(SUMMARY_FOLDER, f"{model_name}.json")
    if not Path(summary_file):
        return {"error": "Summary not found"}
    with open(summary_file, "r") as f:
        return json.load(f)

@app.delete("/pulse/explorer/delete/{model_name}", tags=["PUEModelExplorer"])
def delete_model(model_name: str):
    deleted = []
    errors = []

    files_to_delete = (
        list(MODEL_FOLDER.glob(f"{model_name}*")) +
        list(SUMMARY_FOLDER.glob(f"{model_name}.json")) +
        list(DATASETS_FOLDER.glob(f"{model_name}.csv"))
    )

    for path in files_to_delete:
        if path.exists():
            try:
                path.unlink()
                deleted.append(str(path))
            except Exception as e:
                errors.append(f"Error deleting {path}: {str(e)}")

    return {"deleted": deleted, "errors": errors}

@app.get("/pulse/explorer/download/{model_name}.zip", tags=["PUEModelExplorer"])
def download_model_zip(model_name: str):
    model_path = Path(MODEL_FOLDER, f"{model_name}.h5")
    scaler_path = Path(MODEL_FOLDER, f"{model_name}_scaler.gz")
    csv_path = Path(DATASETS_FOLDER, f"{model_name}.csv")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
        with zipfile.ZipFile(tmp.name, 'w') as zipf:
            if Path(model_path):
                zipf.write(model_path, arcname=f"{model_name}.h5")
            if Path(scaler_path):
                zipf.write(scaler_path, arcname=f"{model_name}_scaler.gz")
            if Path(csv_path):
                zipf.write(csv_path, arcname=f"{model_name}.csv")
        zip_path = tmp.name

    tasks = BackgroundTasks()
    tasks.add_task(os.remove, zip_path)
    return FileResponse(zip_path, filename=f"{model_name}.zip", media_type="application/zip", background=tasks)     

# DATASETS
@app.get("/pulse/datasets/list", tags=["PUEDatasets"])
async def list_datasets():
    datasets = [f.name for f in DATASETS_FOLDER.glob("*.csv")]
    return {"datasets": datasets}

@app.get("/pulse/datasets/load/{dataset_name}", tags=["PUEDatasets"])
async def load_dataset(dataset_name: str):
    dataset_path = DATASETS_FOLDER / dataset_name
    if not dataset_path.exists():
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Leer el dataset completo
    df = pd.read_csv(dataset_path, sep=';')

    # Determinar el modelo asociado (sin extensión)
    model_name = dataset_name.rsplit('.', 1)[0]
    summary_path = Path("summaries") / f"{model_name}.json"

    if not summary_path.exists():
        raise HTTPException(status_code=404, detail="Model summary not found")

    # Leer features desde el JSON
    with open(summary_path, "r") as f:
        summary_data = json.load(f)
    features = summary_data.get("features", [])

    # Filtrar solo las columnas que están en las features
    filtered_df = df[[col for col in features if col in df.columns]]

    sample = filtered_df.head(100).to_dict(orient="records")
    summary = filtered_df.describe().to_dict()

    return {
        "sample": sample,
        "summary": summary,
        "columns": filtered_df.columns.tolist()
    }
	
class FilterRequest(BaseModel):
    dataset_name: str
    filters: List[dict]  # Cada filtro: {"column": "temp", "operator": ">", "value": 25}

@app.post("/pulse/datasets/filter", tags=["PUEDatasets"])
async def filter_dataset(request: FilterRequest):
    dataset_path = DATASETS_FOLDER / request.dataset_name
    if not dataset_path.exists():
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = pd.read_csv(dataset_path, sep=';')

    for f in request.filters:
        column, operator, value = f["column"], f["operator"], f["value"]
        if operator == ">":
            df = df[df[column] > value]
        elif operator == "<":
            df = df[df[column] < value]
        elif operator == "==":
            df = df[df[column] == value]
        elif operator == ">=":
            df = df[df[column] >= value]
        elif operator == "<=":
            df = df[df[column] <= value]
        elif operator == "!=":
            df = df[df[column] != value]
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported operator {operator}")

    filtered_sample = df.head(100).to_dict(orient="records")
    return {
        "filtered_sample": filtered_sample,
        "total_rows": len(df)
    }

@app.get("/pulse/datasets/plots/{dataset_name}", tags=["PUEDatasets"])
async def generate_plots(dataset_name: str):
    dataset_path = Path("datasets") / dataset_name
    if not dataset_path.exists():
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Leer el CSV
    df = pd.read_csv(dataset_path, sep=';')

    # Determinar el modelo asociado (mismo nombre sin extensión)
    model_name = dataset_name.rsplit('.', 1)[0]
    summary_path = Path("summaries") / f"{model_name}.json"

    if not summary_path.exists():
        raise HTTPException(status_code=404, detail="Model summary not found")

    # Leer JSON y extraer las features
    with open(summary_path, "r") as f:
        summary_data = json.load(f)
    features = summary_data.get("features", [])

    # Seleccionar solo las variables numéricas que están en features
    numeric_df = df.select_dtypes(include=['number'])
    numeric_df = numeric_df[[col for col in features if col in numeric_df.columns]]

    buf = io.BytesIO()

    if numeric_df.empty:
        fig, ax = plt.subplots(figsize=(15, 15))
        ax.text(0.5, 0.5, 'No numerical columns available to plot.', 
                horizontalalignment='center', verticalalignment='center', 
                fontsize=12, transform=ax.transAxes)
        ax.set_axis_off()
        plt.tight_layout()
    else:
        axes = numeric_df.hist(figsize=(15, 15))
        plt.tight_layout(pad=2.0)

    plt.savefig(buf, format='png')
    buf.seek(0)
    histogram_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close('all')

    return {"histogram": histogram_base64}

# LLM
# Global cache
df = None
precomputed_correlation = ""
descriptions = []
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
index = None
active_model_name = None

def load_dataset_once():
    global df, precomputed_correlation, descriptions, index, active_model_name

    if not CONFIG_PATH.exists():
        raise ValueError("No model selected. Please configure one in Settings.")

    with open(CONFIG_PATH) as f:
        config = json.load(f)

    model_name = config.get("default_model")
    if not model_name:
        raise ValueError("No default model set in configuration.")

    if model_name == active_model_name:
        return  # Already loaded

    dataset_path = DATASETS_FOLDER / f"{model_name}.csv"
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset file '{dataset_path}' not found.")

    df_local = pd.read_csv(dataset_path, sep=";")

    # Precompute correlation and descriptions
    precomputed = df_local.corr(numeric_only=True)['pue'].sort_values(ascending=False).to_string()
    descs = []
    for col in df_local.columns:
        if col != "timestamp":
            values = df_local[col].describe().to_dict()
            desc = f"Column '{col}' has mean {values.get('mean', 0):.2f}, std {values.get('std', 0):.2f}, min {values.get('min', 0):.2f}, max {values.get('max', 0):.2f}"
            descs.append(desc)

    embeds = embedding_model.encode(descs, show_progress_bar=True)
    idx = faiss.IndexFlatL2(embeds.shape[1])
    idx.add(np.array(embeds))

    # Cache globally
    df = df_local
    precomputed_correlation = precomputed
    descriptions[:] = descs
    index = idx
    active_model_name = model_name

# Request structure
class AskRequest(BaseModel):
    query: str
    model: str = "phi"
    stream: bool = False
    model_name: str

# Main endpoint
@app.post("/pulse/llm/ask", tags=["PUELLM"])
async def ask_question(body: AskRequest, stream: bool = True):
    try:
        load_dataset_once()
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

    query = body.query
    model = body.model
    stream = body.stream
    model_name = body.model_name

    try:
        lang = detect(query)
    except:
        lang = "en"

    language_instruction = "Respond in English." if lang != "es" else "Responde en español."

    question_embedding = embedding_model.encode([query])
    distances, indices = index.search(np.array(question_embedding), 3)
    retrieved_chunks = [descriptions[i] for i in indices[0]]
    context = "\n".join(retrieved_chunks)

    analysis_context = "\nCORRELATION WITH PUE:\n" + precomputed_correlation

    # Add custom context based on query keywords
    if "outlier" in query.lower():
        for col in df.columns:
            if col.lower() in query.lower():
                q1 = df[col].quantile(0.25)
                q3 = df[col].quantile(0.75)
                iqr = q3 - q1
                outliers = df[(df[col] < q1 - 1.5 * iqr) | (df[col] > q3 + 1.5 * iqr)]
                analysis_context += f"\nOUTLIERS IN {col.upper()}:\n" + outliers[["timestamp", col]].head(10).to_string()
                break

    if "trend" in query.lower():
        for col in df.columns:
            if col.lower() in query.lower():
                trend = df[["timestamp", col]].copy()
                trend['timestamp'] = pd.to_datetime(trend['timestamp'])
                trend = trend.set_index('timestamp').resample('D').mean().dropna()
                analysis_context += f"\nDAILY TREND FOR {col.upper()}:\n" + trend.tail(10).to_string()
                break

    if "moving average" in query.lower() or "ma" in query.lower():
        for col in df.columns:
            if col.lower() in query.lower():
                ma = df[["timestamp", col]].copy()
                ma['timestamp'] = pd.to_datetime(ma['timestamp'])
                ma = ma.set_index('timestamp').resample('H').mean().dropna()
                ma['MA_6'] = ma[col].rolling(window=6).mean()
                analysis_context += f"\nMOVING AVERAGE FOR {col.upper()}:\n" + ma[[col, 'MA_6']].tail(10).to_string()
                break

    full_context = context + "\n" + analysis_context

    prompt = f"""You are an expert assistant in data center energy efficiency. You have access to real data and statistical summaries.

CONTEXT:
{full_context}

Please answer the following question:
{query}

{language_instruction}
"""

    def generate():
        full_response = "" 
        try:
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={"model": model, "prompt": prompt, "stream": True},
                stream=True,
                timeout=120
            )
            update_llm_stats()
            for line in response.iter_lines():
                if line:
                    try:
                        json_line = json.loads(line.decode("utf-8"))
                        if json_line.get("response"):
                            chunk = json_line["response"]
                            full_response += chunk
                            yield json.dumps({"response": chunk}) + "\n"
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            yield json.dumps({"response": f"[Error]: {str(e)}"}) + "\n"
        finally:
            # Register the interaction
            log_llm_interaction_to_summary(query, full_response, model, model_name)


    if not stream:
        chunks = []
        for chunk in generate():
            try:
                json_obj = json.loads(chunk)
                if 'response' in json_obj:
                    chunks.append(json_obj['response'])
            except Exception:
                continue
        full_response = ''.join(chunks)
    
        # Register the interaction
        log_llm_interaction_to_summary(query, full_response, model, model_name)
        
        return JSONResponse(content={"response": ''.join(chunks)})

    return StreamingResponse(generate(), media_type="application/json")

def log_llm_interaction_to_summary(query: str, response: str, model: str, model_name: str):
    summary_path = Path(SUMMARY_FOLDER) / f"{model_name}.json"
    if not summary_path.exists():
        return

    try:
        with open(summary_path, "r", encoding="utf-8") as f:
            summary = json.load(f)
    except Exception:
        summary = {}

    entry = {
        "timestamp": datetime.now().isoformat(),
        "query": query,
        "response": response,
        "ollama_model": model
    }

    summary.setdefault("llm_history", []).append(entry)

    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)


# Statistics update
def update_llm_stats():
    stats_path = Path(".config", "statistics.json")
    Path(".config").mkdir(parents=True, exist_ok=True)

    stats = {
        "predictions_per_month": {},
        "llm_questions": 0
    }

    if Path(stats_path):
        try:
            with open(stats_path, "r") as f:
                content = f.read()
                if content.strip():
                    stats = json.loads(content)
        except Exception:
            pass

    stats["llm_questions"] = stats.get("llm_questions", 0) + 1

    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2)
  
@app.get("/pulse/llm/history", tags=["PUELLM"])
def get_llm_history():
    history_path = Path(".config/llm_history.json")
    if history_path.exists():
        try:
            with open(history_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

# History
@app.get("/pulse/history/{model_name}", tags=["PUEHistory"])
def get_model_history(model_name: str):
    summary_path = SUMMARY_FOLDER / f"{model_name}.json"

    if not summary_path.exists():
        raise HTTPException(status_code=404, detail="Model summary not found")

    with open(summary_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    simulations = data.get("simulations", [])
    llm_questions = data.get("llm_questions", []) or data.get("llm_history", [])

    return {
        "simulations": simulations,
        "llm_questions": llm_questions,
    }

@app.delete("/pulse/history/clear_llm/{model_name}", tags=["PUEHistory"])
def clear_llm_history(model_name: str):
    summary_path = Path(SUMMARY_FOLDER) / f"{model_name}.json"

    if not summary_path.exists():
        raise HTTPException(status_code=404, detail="Model summary not found.")

    with open(summary_path, "r", encoding="utf-8") as f:
        summary = json.load(f)

    if "llm_history" in summary:
        summary["llm_history"] = []

    if "llm_questions" in summary:
        summary["llm_questions"] = []

    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    return {"message": f"LLM history cleared for model '{model_name}'."}

@app.delete("/pulse/history/clear_simulations/{model_name}", tags=["PUEHistory"])
def clear_simulations_history(model_name: str):
    summary_path = Path(SUMMARY_FOLDER) / f"{model_name}.json"

    if not summary_path.exists():
        raise HTTPException(status_code=404, detail="Model summary not found.")

    with open(summary_path, "r", encoding="utf-8") as f:
        summary = json.load(f)

    if "simulations" in summary:
        summary["simulations"] = []

    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    return {"message": f"Simulations cleared for model '{model_name}'."}

@app.delete("/pulse/history/delete_item", tags=["PUEHistory"])
def delete_history_item(
    payload: dict = Body(...)
):
    model = payload.get("model")
    action_type = payload.get("type")
    timestamp = payload.get("timestamp")

    if not all([model, action_type, timestamp]):
        raise HTTPException(status_code=400, detail="Missing required fields.")

    summary_path = Path(SUMMARY_FOLDER) / f"{model}.json"
    if not summary_path.exists():
        raise HTTPException(status_code=404, detail="Model summary not found.")

    with open(summary_path, "r", encoding="utf-8") as f:
        summary = json.load(f)

    key_map = {
        "Simulation": "simulations",
        "LLM": "llm_history" if "llm_history" in summary else "llm_questions"
    }

    key = key_map.get(action_type)
    if key not in summary or not isinstance(summary[key], list):
        raise HTTPException(status_code=404, detail=f"No {action_type} entries found.")

    original_len = len(summary[key])
    summary[key] = [entry for entry in summary[key] if entry.get("timestamp") != timestamp]

    if len(summary[key]) == original_len:
        raise HTTPException(status_code=404, detail="Item not found.")

    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    return {"message": f"{action_type} item deleted from model '{model}'."}

# SETTINGS
@app.post("/pulse/settings/default_model", tags=["PUESettings"])
def set_default_model(model_name: str = Form(...)):
    config_path = Path(".config", "config.json")
    Path(".config").mkdir(parents=True, exist_ok=True)
    with open(config_path, "w") as f:
        json.dump({"default_model": model_name}, f)
    return {"message": f"Default model set to '{model_name}'"}

@app.get("/pulse/settings/default_model", tags=["PUESettings"])
def get_default_model():
    config_path = Path(".config", "config.json")
    if not Path(config_path):
        return {"default_model": ""}
    with open(config_path, "r") as f:
        config = json.load(f)
    return {"default_model": config.get("default_model", "")}

@app.delete("/pulse/settings/delete_all", tags=["PUESettings"])
def delete_all_models():
    deleted = []
    errors = []

    folders = [
        (MODEL_FOLDER, "*"),
        (DATASETS_FOLDER, "*.csv"),
        (SUMMARY_FOLDER, "*.json")
    ]

    for folder, pattern in folders:
        for file in folder.glob(pattern):
            try:
                file.unlink()
                deleted.append(str(file))
            except Exception as e:
                errors.append(f"Error deleting {file}: {str(e)}")

    config_path = CONFIG_PATH
    if config_path.exists():
        try:
            with open(config_path, "w") as f:
                json.dump({"default_model": ""}, f)
            deleted.append(str(config_path))
        except Exception as e:
            errors.append(f"Error resetting config: {str(e)}")

    return {"deleted": deleted, "errors": errors}

@app.get("/pulse/settings/download_all", tags=["PUESettings"])
def download_all_models():
    folders = [
        (MODEL_FOLDER, "*"),
        (DATASETS_FOLDER, "*.csv"),
        (SUMMARY_FOLDER, "*.json"),
    ]

    with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
        with zipfile.ZipFile(tmp.name, "w") as zipf:
            for folder, pattern in folders:
                for file in folder.glob(pattern):
                    arcname = folder / file.name
                    zipf.write(file, arcname=arcname)

        zip_path = tmp.name

    tasks = BackgroundTasks()
    tasks.add_task(os.remove, zip_path)
    return FileResponse(zip_path, filename="all_models.zip", media_type="application/zip", background=tasks)


# STATS
@app.get("/pulse/statistics", tags=["PUEStatistics"])
def get_statistics():
    stats_path = Path(".config", "statistics.json")
    if Path(stats_path):
        with open(stats_path, "r") as f:
            return json.load(f)
    else:
        return {"predictions_per_month": {}, "llm_questions": 0}
    
@app.get("/pulse/statistics/dashboard", tags=["PUEStatistics"])
def get_dashboard_statistics():
    stats_path = Path(".config", "statistics.json")

    models = []
    r2_list = []

    # Read model summaries
    if Path(SUMMARY_FOLDER).exists():
        for file in Path(SUMMARY_FOLDER).iterdir():
            if file.suffix == ".json":
                try:
                    with open(file) as f:
                        data = json.load(f)
                        model_name = file.stem
                        r2 = data.get("metrics", {}).get("r2", 0)
                        models.append(model_name)
                        r2_list.append(r2)
                except Exception:
                    continue

    # Load global usage statistics
    stats = {
        "predictions_per_month": {},
        "llm_questions": 0
    }
    if Path(stats_path):
        try:
            with open(stats_path, "r") as f:
                stats = json.load(f)
        except Exception:
            pass

    # Calculate total predictions across all months
    total_predictions = sum(stats.get("predictions_per_month", {}).values())

    return {
        "models_count": len(models),
        "avg_accuracy": round(sum(r2_list) / len(r2_list), 4) if r2_list else 0.0,
        "accuracy_by_model": [
            {"model": model, "r2": round(r2_list[i], 4)} for i, model in enumerate(models)
        ],
        "total_predictions": total_predictions,
        "predictions_by_month": stats.get("predictions_per_month", {}),
        "llm_questions": stats.get("llm_questions", 0)
    }

@app.delete("/pulse/settings/purge", tags=["PUESettings"])
def purge_orphan_files():
    deleted_files = []
    errors = []
    
    # Temp files
    tmp_folder = Path("temp_models")
    if tmp_folder.exists():
        for file in tmp_folder.glob("**/*"):
            try:
                if file.is_file():
                    file.unlink()
                    deleted_files.append(str(file))
                elif file.is_dir() and not any(file.iterdir()):
                    deleted_files.append(str(file))
                    file.rmdir()
            except Exception as e:
                errors.append(f"Error deleting {file}: {str(e)}")

    # Load valid models from summaries
    valid_models = set()
    if Path(SUMMARY_FOLDER).exists():
        for summary_file in Path(SUMMARY_FOLDER).glob("*.json"):
            model_name = summary_file.stem
            valid_models.add(model_name)

    # Check datasets folder
    if Path(DATASETS_FOLDER).exists():
        for csv_file in Path(DATASETS_FOLDER).glob("*.csv"):
            model_name = csv_file.stem
            if model_name not in valid_models:
                try:
                    csv_file.unlink()
                    deleted_files.append(str(csv_file))
                except Exception as e:
                    errors.append(f"Error deleting {csv_file}: {str(e)}")

    # Check models folder (.h5 and .gz)
    if Path(MODEL_FOLDER).exists():
        for model_file in Path(MODEL_FOLDER).glob("*"):
            if model_file.suffix in [".h5", ".gz"]:
                base_name = model_file.stem.replace("_scaler", "")
                if base_name not in valid_models:
                    try:
                        model_file.unlink()
                        deleted_files.append(str(model_file))
                    except Exception as e:
                        errors.append(f"Error deleting {model_file}: {str(e)}")

    return {
        "message": f"Purged orphaned files.",
        "deleted": deleted_files,
        "errors": errors
    }
