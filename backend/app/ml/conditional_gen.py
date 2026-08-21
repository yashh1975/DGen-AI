import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from app.utils.logging import logger

class ConditionalGeneratorLayer:
    def __init__(self, base_engine):
        self.base_engine = base_engine

    def generate_conditional(
        self,
        num_records: int = 1000,
        fraud_target_ratio: Optional[float] = None,
        target_column: str = "is_fraud"
    ) -> pd.DataFrame:
        """Generate synthetic records with controlled target class proportions."""
        raw_synthetic = self.base_engine.sample(num_records)

        if fraud_target_ratio is None or target_column not in raw_synthetic.columns:
            return raw_synthetic

        logger.info(f"Applying Conditional Generation: Setting target ratio of '{target_column}' to {fraud_target_ratio*100:.1f}%")

        # Ensure target column is integer 0 or 1
        raw_synthetic[target_column] = np.clip(
            np.round(pd.to_numeric(raw_synthetic[target_column], errors="coerce").fillna(0)),
            0,
            1
        ).astype(int)

        target_fraud_count = max(1, int(round(num_records * fraud_target_ratio)))
        target_non_fraud_count = max(1, num_records - target_fraud_count)

        fraud_subset = raw_synthetic[raw_synthetic[target_column] == 1]
        non_fraud_subset = raw_synthetic[raw_synthetic[target_column] == 0]

        # Resample or synthesize matching distributions for fraud subset
        if len(fraud_subset) < target_fraud_count:
            if len(fraud_subset) > 0:
                base_fraud = fraud_subset.sample(target_fraud_count, replace=True, random_state=42).copy()
                rng = np.random.default_rng(42)
                # Perturb continuous numeric features slightly to create diverse, realistic synthetic fraud
                num_cols = list(base_fraud.select_dtypes(include=[np.number]).columns)
                for c in num_cols:
                    if c != target_column and "id" not in c.lower() and "hour" not in c.lower():
                        std_val = max(1.0, float(base_fraud[c].std() or 1.0))
                        jitter = rng.normal(0, 0.08 * std_val, size=len(base_fraud))
                        base_fraud[c] = np.maximum(0.0, np.round(base_fraud[c] + jitter, 2))
                oversampled_fraud = base_fraud
            else:
                # Construct realistic high-risk fraud records
                base_fraud = raw_synthetic.sample(target_fraud_count, replace=True, random_state=42).copy()
                base_fraud[target_column] = 1
                rng = np.random.default_rng(42)
                if "amount" in base_fraud.columns:
                    base_fraud["amount"] = np.round(base_fraud["amount"] * rng.uniform(1.8, 3.5, size=len(base_fraud)) + 250.0, 2)
                if "is_international" in base_fraud.columns:
                    base_fraud["is_international"] = rng.choice([0, 1], size=len(base_fraud), p=[0.2, 0.8])
                if "transaction_hour" in base_fraud.columns:
                    base_fraud["transaction_hour"] = rng.choice([0, 1, 2, 3, 4, 22, 23], size=len(base_fraud))
                oversampled_fraud = base_fraud
        else:
            oversampled_fraud = fraud_subset.sample(target_fraud_count, replace=False, random_state=42)

        # Resample or synthesize matching distributions for non-fraud subset
        if len(non_fraud_subset) < target_non_fraud_count:
            if len(non_fraud_subset) > 0:
                oversampled_non_fraud = non_fraud_subset.sample(target_non_fraud_count, replace=True, random_state=42)
            else:
                oversampled_non_fraud = raw_synthetic.sample(target_non_fraud_count, replace=True, random_state=42).copy()
                oversampled_non_fraud[target_column] = 0
        else:
            oversampled_non_fraud = non_fraud_subset.sample(target_non_fraud_count, replace=False, random_state=42)

        combined_df = pd.concat([oversampled_fraud, oversampled_non_fraud], axis=0).sample(
            frac=1.0,
            random_state=42
        ).reset_index(drop=True)

        return combined_df
