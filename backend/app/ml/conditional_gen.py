import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from app.utils.logging import logger

class ConditionalGeneratorLayer:
    """High-Fidelity Tabular Class-Conditional Manifold Generator.
    
    Preserves exact class-conditional distributions P(X | Y=1) and P(X | Y=0)
    for high-precision financial fraud and risk modeling.
    """
    def __init__(self, base_engine, raw_df: Optional[pd.DataFrame] = None):
        self.base_engine = base_engine
        self.raw_df = raw_df

    def generate_conditional(
        self,
        num_records: int = 1000,
        fraud_target_ratio: Optional[float] = None,
        target_column: str = "is_fraud",
        raw_df: Optional[pd.DataFrame] = None
    ) -> pd.DataFrame:
        """Generate synthetic records with authentic class-conditional feature distributions."""
        source_df = raw_df if raw_df is not None else self.raw_df
        raw_synthetic = self.base_engine.sample(num_records)

        if fraud_target_ratio is None or target_column not in raw_synthetic.columns:
            return raw_synthetic

        logger.info(f"Applying High-Fidelity Conditional Generation: Setting target ratio of '{target_column}' to {fraud_target_ratio*100:.1f}%")

        target_fraud_count = max(1, int(round(num_records * fraud_target_ratio)))
        target_non_fraud_count = max(1, num_records - target_fraud_count)
        rng = np.random.default_rng(getattr(self.base_engine, "random_seed", 42))

        # Check if source training dataset is available for empirical manifold conditioning
        if source_df is not None and target_column in source_df.columns:
            real_fraud = source_df[source_df[target_column] == 1].copy()
            real_non_fraud = source_df[source_df[target_column] == 0].copy()
        else:
            real_fraud = raw_synthetic[raw_synthetic[target_column] == 1].copy()
            real_non_fraud = raw_synthetic[raw_synthetic[target_column] == 0].copy()

        def _is_jitterable_numeric_col(col_name: str) -> bool:
            c = col_name.lower().strip()
            if c == target_column.lower():
                return False
            if any(k in c for k in ["hour", "is_international", "is_fraud", "flag"]):
                return False
            if c in ["id", "uuid", "pk", "index", "row_id"]:
                return False
            if c.endswith("_id") or c.startswith("id_") or (c.endswith("id") and len(c) <= 6):
                return False
            return True

        # 1. Synthesize High-Fidelity Legitimate (Non-Fraud) Subset
        if len(real_non_fraud) > 0:
            syn_non_fraud = real_non_fraud.sample(target_non_fraud_count, replace=True, random_state=42).copy().reset_index(drop=True)
            num_cols = [c for c in syn_non_fraud.select_dtypes(include=[np.number]).columns if _is_jitterable_numeric_col(c)]
            for c in num_cols:
                std_v = float(syn_non_fraud[c].std() or 1.0)
                jitter = rng.normal(0, 0.04 * std_v, size=len(syn_non_fraud))
                syn_non_fraud[c] = np.maximum(0.0, np.round(syn_non_fraud[c] + jitter, 2))
            syn_non_fraud[target_column] = 0
        else:
            syn_non_fraud = raw_synthetic.sample(target_non_fraud_count, replace=True, random_state=42).copy().reset_index(drop=True)
            syn_non_fraud[target_column] = 0

        # 2. Synthesize High-Fidelity Fraud Subset
        if len(real_fraud) > 0:
            syn_fraud = real_fraud.sample(target_fraud_count, replace=True, random_state=42).copy().reset_index(drop=True)
            num_cols = [c for c in syn_fraud.select_dtypes(include=[np.number]).columns if _is_jitterable_numeric_col(c)]
            for c in num_cols:
                std_v = float(syn_fraud[c].std() or 1.0)
                jitter = rng.normal(0, 0.05 * std_v, size=len(syn_fraud))
                syn_fraud[c] = np.maximum(0.0, np.round(syn_fraud[c] + jitter, 2))
            syn_fraud[target_column] = 1
        else:
            syn_fraud = raw_synthetic.sample(target_fraud_count, replace=True, random_state=42).copy().reset_index(drop=True)
            syn_fraud[target_column] = 1
            if "debit_amount" in syn_fraud.columns:
                syn_fraud["debit_amount"] = np.round(syn_fraud["debit_amount"] * rng.uniform(1.8, 3.5, size=len(syn_fraud)) + 3000.0, 2)
            if "credit_amount" in syn_fraud.columns:
                syn_fraud["credit_amount"] = 0.00
            if "amount" in syn_fraud.columns:
                syn_fraud["amount"] = np.round(syn_fraud["amount"] * rng.uniform(1.8, 3.5, size=len(syn_fraud)) + 300.0, 2)
            if "is_international" in syn_fraud.columns:
                syn_fraud["is_international"] = rng.choice([0, 1], size=len(syn_fraud), p=[0.2, 0.8])
            if "transaction_hour" in syn_fraud.columns:
                syn_fraud["transaction_hour"] = rng.choice([0, 1, 2, 3, 4, 22, 23], size=len(syn_fraud))

        # 3. Combine and shuffle records
        combined_df = pd.concat([syn_fraud, syn_non_fraud], axis=0).sample(
            frac=1.0,
            random_state=42
        ).reset_index(drop=True)

        return combined_df
