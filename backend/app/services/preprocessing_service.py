import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple, Optional
from sklearn.preprocessing import MinMaxScaler, StandardScaler, LabelEncoder
from app.services.dataset_service import dataset_service
from app.database.mongodb import db_manager
from app.utils.logging import logger

class PreprocessingService:
    def preprocess_dataset(
        self,
        dataset_id: str,
        impute_strategy: str = "median",
        scaling_strategy: str = "minmax",
        encode_categorical: bool = True
    ) -> Dict[str, Any]:
        """Preprocess dataset for generative model input and store preprocessor parameters."""
        df = dataset_service.get_dataset_dataframe(dataset_id)
        original_rows, original_cols = len(df), len(df.columns)

        num_cols = list(df.select_dtypes(include=["number"]).columns)
        cat_cols = list(df.select_dtypes(include=["object", "category", "bool"]).columns)

        # Imputation
        imputed_values = {}
        for col in num_cols:
            if df[col].isnull().any():
                val = df[col].median() if impute_strategy == "median" else df[col].mean()
                df[col] = df[col].fillna(val)
                imputed_values[col] = float(val)

        for col in cat_cols:
            if df[col].isnull().any():
                val = str(df[col].mode()[0]) if not df[col].mode().empty else "Unknown"
                df[col] = df[col].fillna(val)
                imputed_values[col] = val

        # Encoding
        encoders_meta = {}
        if encode_categorical:
            for col in cat_cols:
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
                encoders_meta[col] = [str(cls) for cls in le.classes_]

        # Scaling
        scaler_meta = {}
        if scaling_strategy in ["minmax", "standard"]:
            scaler = MinMaxScaler() if scaling_strategy == "minmax" else StandardScaler()
            if len(num_cols) > 0:
                df[num_cols] = scaler.fit_transform(df[num_cols])
                scaler_meta = {
                    "strategy": scaling_strategy,
                    "columns": num_cols
                }

        config = {
            "dataset_id": dataset_id,
            "original_rows": original_rows,
            "original_columns": original_cols,
            "impute_strategy": impute_strategy,
            "scaling_strategy": scaling_strategy,
            "encode_categorical": encode_categorical,
            "imputed_values": imputed_values,
            "encoders": encoders_meta,
            "scaler": scaler_meta,
            "processed_shape": [int(df.shape[0]), int(df.shape[1])]
        }

        # Store preprocessing configuration
        col = db_manager.get_collection("datasets")
        col.update_one({"id": dataset_id}, {"$set": {"preprocessing_config": config}})
        logger.info(f"Preprocessed dataset '{dataset_id}' with shape {df.shape}")
        return config

preprocessing_service = PreprocessingService()
