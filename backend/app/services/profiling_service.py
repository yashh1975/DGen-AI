import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from app.services.dataset_service import dataset_service
from app.utils.logging import logger

class ProfilingService:
    def profile_dataset(self, dataset_id: str) -> Dict[str, Any]:
        """Generate a complete statistical profile of an uploaded dataset."""
        df = dataset_service.get_dataset_dataframe(dataset_id)
        dataset_meta = dataset_service.get_dataset(dataset_id)

        total_rows = len(df)
        total_cols = len(df.columns)
        missing_cells = int(df.isna().sum().sum())
        total_cells = total_rows * total_cols
        missing_pct = round((missing_cells / total_cells) * 100.0, 2) if total_cells > 0 else 0.0
        dup_rows = int(df.duplicated().sum())
        mem_usage_mb = round(df.memory_usage(deep=True).sum() / (1024 * 1024), 3)

        num_df = df.select_dtypes(include=["number"])
        cat_df = df.select_dtypes(include=["object", "category", "bool"])

        # Numerical feature analysis
        num_analysis = {}
        for col in num_df.columns:
            series = num_df[col].dropna()
            if len(series) > 0:
                num_analysis[col] = {
                    "mean": float(np.round(series.mean(), 4)),
                    "std": float(np.round(series.std(), 4)),
                    "min": float(np.round(series.min(), 4)),
                    "max": float(np.round(series.max(), 4)),
                    "median": float(np.round(series.median(), 4)),
                    "q25": float(np.round(series.quantile(0.25), 4)),
                    "q75": float(np.round(series.quantile(0.75), 4))
                }

        # Categorical feature analysis
        cat_analysis = {}
        for col in cat_df.columns:
            series = cat_df[col].dropna().astype(str)
            if len(series) > 0:
                val_counts = series.value_counts()
                top_freqs = {str(k): int(v) for k, v in val_counts.head(8).items()}
                cat_analysis[col] = {
                    "unique_count": int(series.nunique()),
                    "most_frequent": str(val_counts.index[0]) if len(val_counts) > 0 else "N/A",
                    "top_frequencies": top_freqs
                }

        # Correlation matrix for numerical features
        corr_matrix = {}
        if len(num_df.columns) >= 2:
            corr_df = num_df.corr().fillna(0.0)
            for r_col in corr_df.columns:
                corr_matrix[r_col] = {
                    c_col: float(np.round(corr_df.loc[r_col, c_col], 4))
                    for c_col in corr_df.columns
                }

        # Missing values breakdown per column
        missing_breakdown = {str(col): int(val) for col, val in df.isna().sum().items()}

        profile = {
            "dataset_id": dataset_id,
            "summary": {
                "total_rows": total_rows,
                "total_columns": total_cols,
                "missing_cells_percentage": missing_pct,
                "duplicate_rows_count": dup_rows,
                "memory_usage_mb": mem_usage_mb
            },
            "numerical_analysis": num_analysis,
            "categorical_analysis": cat_analysis,
            "correlation_matrix": corr_matrix,
            "detected_target_column": dataset_meta.get("target_fraud_column"),
            "missing_values_breakdown": missing_breakdown,
            "duplicate_rows_count": dup_rows
        }
        return profile

profiling_service = ProfilingService()
