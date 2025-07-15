import time
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense
from tensorflow.keras.optimizers import Adam

# Load dataset
df = pd.read_csv("trends_computaex_data.csv", sep=';')

# Select features and target
X = df.drop(columns=["timestamp", "pue"]).values
y = df["pue"].values

# Normalize features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Split into training and test sets
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

# Evaluation function
def evaluate_model(name, model, X_train, X_test, y_train, y_test, fit_kwargs=None):
    start = time.time()
    if fit_kwargs:
        model.fit(X_train, y_train, **fit_kwargs)
    else:
        model.fit(X_train, y_train)
    duration = time.time() - start
    y_pred = model.predict(X_test)
    if hasattr(y_pred, "flatten"):
        y_pred = y_pred.flatten()
    return {
        "Model": name,
        "R²": r2_score(y_test, y_pred),
        "MAE": mean_absolute_error(y_test, y_pred),
        "RMSE": np.sqrt(mean_squared_error(y_test, y_pred)),
        "Training Time (s)": duration
    }

# Define and train ANN
def build_ann(input_dim):
    model = Sequential([
        Dense(64, activation='relu', input_dim=input_dim),
        Dense(32, activation='relu'),
        Dense(1)
    ])
    model.compile(optimizer=Adam(learning_rate=0.001), loss='mse')
    return model

# Create and evaluate models
results = []

# 1. ANN
ann = build_ann(X_train.shape[1])
results.append(evaluate_model("ANN", ann, X_train, X_test, y_train, y_test,
                              fit_kwargs={"epochs": 100, "batch_size": 16, "verbose": 0}))

# 2. Random Forest
rf = RandomForestRegressor(n_estimators=100, random_state=42)
results.append(evaluate_model("Random Forest", rf, X_train, X_test, y_train, y_test))

# 3. Gradient Boosting
gb = GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, random_state=42)
results.append(evaluate_model("Gradient Boosting", gb, X_train, X_test, y_train, y_test))

# Convert to DataFrame
results_df = pd.DataFrame(results)
print("\nModel Comparison:")
print(results_df)

# Plot R² scores
plt.figure(figsize=(8, 5))
plt.bar(results_df["Model"], results_df["R²"], edgecolor='black')
plt.ylabel("R² Score")
plt.title("Model Comparison: R²")
plt.grid(axis='y')
plt.tight_layout()
plt.show()

# Plot MAE
plt.figure(figsize=(8, 5))
plt.bar(results_df["Model"], results_df["MAE"], color='orange', edgecolor='black')
plt.ylabel("MAE")
plt.title("Model Comparison: Mean Absolute Error")
plt.grid(axis='y')
plt.tight_layout()
plt.show()

# Plot RMSE
plt.figure(figsize=(8, 5))
plt.bar(results_df["Model"], results_df["RMSE"], color='green', edgecolor='black')
plt.ylabel("RMSE")
plt.title("Model Comparison: Root Mean Squared Error")
plt.grid(axis='y')
plt.tight_layout()
plt.show()

# Plot training time
plt.figure(figsize=(8, 5))
plt.bar(results_df["Model"], results_df["Training Time (s)"], color='red', edgecolor='black')
plt.ylabel("Training Time (s)")
plt.title("Model Comparison: Training Time")
plt.grid(axis='y')
plt.tight_layout()
plt.show()
