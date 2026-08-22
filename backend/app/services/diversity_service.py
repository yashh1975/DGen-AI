import pandas as pd
import numpy as np
from typing import Dict, Any
from app.utils.logging import logger

class DiversityEvaluationEngine:
    def evaluate_diversity(self, synthetic_df: pd.DataFrame) -> Dict[str, Any]:
        """Compute diversity metrics on synthetic banking records."""
        n_rows = len(synthetic_df)
        if n_rows == 0:
            return {
                "diversity_score": 100.0,
                "duplicate_rows_count": 0,
                "duplicate_pct": 0.0,
                "unique_rows_ratio": 1.0
            }

        feature_cols = [c for c in synthetic_df.columns if not any(k in c.lower() for k in ["id", "timestamp", "date", "created"])]
        if feature_cols:
            dup_rows = int(synthetic_df.duplicated(subset=feature_cols).sum())
        else:
            dup_rows = int(synthetic_df.duplicated().sum())

        dup_pct = round((dup_rows / n_rows) * 100.0, 2)
        unique_ratio = round((n_rows - dup_rows) / n_rows, 4)

        # Diversity score penalizes exact duplicate synthetic rows
        diversity_score = round(unique_ratio * 100.0, 2)

        return {
            "diversity_score": diversity_score,
            "duplicate_rows_count": dup_rows,
            "duplicate_pct": dup_pct,
            "unique_rows_ratio": unique_ratio,
            "total_synthetic_records": n_rows
        }

diversity_engine = DiversityEvaluationEngine()
