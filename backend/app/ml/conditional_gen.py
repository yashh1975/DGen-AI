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
                oversampled_fraud = fraud_subset.sample(target_fraud_count, replace=True, random_state=42)
            else:
                # Construct realistic high-risk fraud records
                oversampled_fraud = raw_synthetic.sample(target_fraud_count, replace=True, random_state=42).copy()
                oversampled_fraud[target_column] = 1
                if "amount" in oversampled_fraud.columns:
                    oversampled_fraud["amount"] = np.round(oversampled_fraud["amount"] * 2.5 + 300.0, 2)
                if "is_international" in oversampled_fraud.columns:
                    oversampled_fraud["is_international"] = 1
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
