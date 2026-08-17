import numpy as np
import pandas as pd
from typing import Dict, Any, List
from scipy.stats import ks_2samp, wasserstein_distance
from app.utils.logging import logger

class StatisticalFidelityEngine:
    def evaluate_fidelity(self, real_df: pd.DataFrame, synthetic_df: pd.DataFrame) -> Dict[str, Any]:
        """Compute statistical fidelity metrics comparing Real vs Synthetic datasets."""
        # Align common columns
        common_cols = [c for c in real_df.columns if c in synthetic_df.columns]
        num_cols = list(real_df[common_cols].select_dtypes(include=["number"]).columns)
        cat_cols = list(real_df[common_cols].select_dtypes(include=["object", "category", "bool"]).columns)

        numerical_metrics = {}
        ks_scores = []
        wasserstein_scores = []

        for col in num_cols:
            real_series = real_df[col].dropna()
            synth_series = synthetic_df[col].dropna()

            if len(real_series) > 0 and len(synth_series) > 0:
                ks_res = ks_2samp(real_series, synth_series)
                ks_stat = float(np.round(ks_res.statistic, 4))
                ks_pvalue = float(np.round(ks_res.pvalue, 4))
                w_dist = float(np.round(wasserstein_distance(real_series, synth_series), 4))

                real_mean = 0.0 if np.isnan(real_series.mean()) else float(real_series.mean())
                synth_mean = 0.0 if np.isnan(synth_series.mean()) else float(synth_series.mean())
                
                real_std_raw = real_series.std()
                synth_std_raw = synth_series.std()
                real_std = 0.0 if np.isnan(real_std_raw) else float(real_std_raw)
                synth_std = 0.0 if np.isnan(synth_std_raw) else float(synth_std_raw)

                real_med = 0.0 if np.isnan(real_series.median()) else float(real_series.median())
                synth_med = 0.0 if np.isnan(synth_series.median()) else float(synth_series.median())

                ks_scores.append(1.0 - ks_stat)
                wasserstein_scores.append(w_dist)

                numerical_metrics[col] = {
                    "ks_statistic": ks_stat,
                    "ks_pvalue": ks_pvalue,
                    "wasserstein_distance": w_dist,
                    "real_mean": round(real_mean, 2),
                    "synthetic_mean": round(synth_mean, 2),
                    "mean_delta": round(abs(real_mean - synth_mean), 2),
                    "real_std": round(real_std, 2),
                    "synthetic_std": round(synth_std, 2),
                    "std_delta": round(abs(real_std - synth_std), 2),
                    "real_median": round(real_med, 2),
                    "synthetic_median": round(synth_med, 2)
                }

        # Categorical metrics
        categorical_metrics = {}
        cat_scores = []
        for col in cat_cols:
            real_vc = real_df[col].value_counts(normalize=True)
            synth_vc = synthetic_df[col].value_counts(normalize=True)

            all_cats = list(set(real_vc.index).union(set(synth_vc.index)))
            real_probs = np.array([real_vc.get(cat, 0.0) for cat in all_cats])
            synth_probs = np.array([synth_vc.get(cat, 0.0) for cat in all_cats])

            # Total Variation Distance
            tvd = float(np.round(0.5 * np.sum(np.abs(real_probs - synth_probs)), 4))
            similarity_score = max(0.0, 1.0 - tvd)
            cat_scores.append(similarity_score)

            categorical_metrics[col] = {
                "tvd": tvd,
                "similarity_score": round(similarity_score * 100.0, 2),
                "unique_real": int(real_df[col].nunique()),
                "unique_synthetic": int(synthetic_df[col].nunique())
            }

        # Pearson Correlation Matrix Delta
        corr_delta = 0.0
        if len(num_cols) >= 2:
            real_corr = real_df[num_cols].corr().fillna(0.0)
            synth_corr = synthetic_df[num_cols].corr().fillna(0.0)
            corr_diff = np.abs(real_corr.values - synth_corr.values)
            corr_delta = float(np.round(np.mean(corr_diff), 4))

        # Compute Real vs Synthetic Distribution Overlays for Recharts visualizations
        distribution_overlays = {}
        for col in num_cols:
            real_series = real_df[col].dropna()
            synth_series = synthetic_df[col].dropna()
            if len(real_series) > 0 and len(synth_series) > 0:
                min_v = min(float(real_series.min()), float(synth_series.min()))
                max_v = max(float(real_series.max()), float(synth_series.max()))
                if min_v == max_v:
                    max_v = min_v + 1.0
                bin_edges = np.linspace(min_v, max_v, 9)

                h_real, _ = np.histogram(real_series, bins=bin_edges)
                h_synth, _ = np.histogram(synth_series, bins=bin_edges)

                bins = []
                for i in range(8):
                    b_start = bin_edges[i]
                    b_end = bin_edges[i+1]
                    label = f"{round(b_start, 1)}-{round(b_end, 1)}" if (b_end - b_start) < 10 else f"{int(round(b_start))}-{int(round(b_end))}"
                    bins.append({
                        "binLabel": label,
                        "Real": round(float(h_real[i] / max(len(real_series), 1)) * 100.0, 1),
                        "Synthetic": round(float(h_synth[i] / max(len(synth_series), 1)) * 100.0, 1)
                    })
                distribution_overlays[col] = {
                    "featureName": col,
                    "bins": bins
                }

        # Overall Statistical Fidelity Score (0.0 to 100.0)
        avg_ks = np.mean(ks_scores) if ks_scores else 0.85
        avg_cat = np.mean(cat_scores) if cat_scores else 0.85
        corr_similarity = max(0.0, 1.0 - corr_delta)

        fidelity_score = round((0.4 * avg_ks + 0.3 * avg_cat + 0.3 * corr_similarity) * 100.0, 2)

        return {
            "statistical_fidelity_score": fidelity_score,
            "correlation_matrix_delta": corr_delta,
            "average_ks_similarity": round(float(avg_ks) * 100.0, 2),
            "numerical_metrics": numerical_metrics,
            "categorical_metrics": categorical_metrics,
            "distribution_overlays": distribution_overlays
        }

statistical_fidelity_engine = StatisticalFidelityEngine()
