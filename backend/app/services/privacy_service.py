import numpy as np
import pandas as pd
from typing import Dict, Any
from scipy.spatial.distance import cdist
from sklearn.preprocessing import MinMaxScaler
from app.utils.logging import logger

class PrivacyAssessmentEngine:
    def evaluate_privacy(self, real_df: pd.DataFrame, synthetic_df: pd.DataFrame) -> Dict[str, Any]:
        """Perform academic privacy risk assessment (DCR & Exact Overlap)."""
        common_cols = [c for c in real_df.columns if c in synthetic_df.columns]
        num_cols = list(real_df[common_cols].select_dtypes(include=["number"]).columns)

        # 1. Exact Duplicate Overlap Check
        real_tuples = set(tuple(x) for x in real_df[common_cols].values)
        synth_tuples = [tuple(x) for x in synthetic_df[common_cols].values]

        exact_matches = sum(1 for t in synth_tuples if t in real_tuples)
        exact_overlap_pct = round((exact_matches / len(synthetic_df)) * 100.0, 2) if len(synthetic_df) > 0 else 0.0

        # 2. Distance to Closest Record (DCR)
        dcr_metrics = {"mean_dcr": 0.5, "median_dcr": 0.5, "p5_dcr": 0.2}
        if len(num_cols) > 0:
            scaler = MinMaxScaler()
            # Fit on real data, transform both
            real_scaled = scaler.fit_transform(real_df[num_cols].fillna(0.0))
            synth_scaled = scaler.transform(synthetic_df[num_cols].fillna(0.0))

            # Sample subset for speed if datasets are large
            sub_real = real_scaled[:250]
            sub_synth = synth_scaled[:200]

            # Pairwise distances
            dist_matrix = cdist(sub_synth, sub_real, metric="euclidean")
            min_distances = np.min(dist_matrix, axis=1)

            dcr_metrics = {
                "mean_dcr": round(float(np.mean(min_distances)), 4),
                "median_dcr": round(float(np.median(min_distances)), 4),
                "p5_dcr": round(float(np.percentile(min_distances, 5)), 4)
            }

        # 3. Privacy Risk Level Determination
        risk_level = "LOW_RISK"
        if exact_overlap_pct > 1.0 or dcr_metrics["mean_dcr"] < 0.05:
            risk_level = "HIGH_RISK"
        elif exact_overlap_pct > 0.0 or dcr_metrics["mean_dcr"] < 0.15:
            risk_level = "MEDIUM_RISK"

        privacy_score = round(max(0.0, min(100.0, (1.0 - (exact_overlap_pct / 100.0)) * 100.0 - (0.1 / max(dcr_metrics["mean_dcr"], 0.01)))), 2)

        return {
            "privacy_risk_level": risk_level,
            "privacy_score": privacy_score,
            "exact_duplicate_matches": exact_matches,
            "exact_duplicate_overlap_pct": exact_overlap_pct,
            "distance_to_closest_record": dcr_metrics,
            "memorization_risk_flag": exact_matches > 0
        }

privacy_engine = PrivacyAssessmentEngine()
