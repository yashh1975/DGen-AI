import re
import uuid
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import pandas as pd
from typing import List, Optional, Dict, Any, Tuple
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from app.utils.logging import logger

class TabularGenerator(nn.Module):
    def __init__(self, latent_dim: int, output_dim: int, hidden_dim: int = 128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim),
            nn.Sigmoid()
        )

    def forward(self, z: torch.Tensor) -> torch.Tensor:
        return self.net(z)

class TabularDiscriminator(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int = 128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, hidden_dim),
            nn.LeakyReLU(0.2),
            nn.Linear(hidden_dim, 1)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)

class CTGANModelEngine:
    """High-Performance PyTorch Tabular Conditional Generative Adversarial Network (CTGAN).
    
    Strictly preserves original schema ordering, entity pools (Accounts, Devices, Merchants, IPs),
    sequence ID formats (e.g. TX000001, TXN-100001), date timestamps, and float/integer dtypes.
    """
    def __init__(
        self,
        latent_dim: int = 32,
        epochs: int = 8,
        batch_size: int = 128,
        lr: float = 1e-3,
        random_seed: int = 42
    ):
        self.latent_dim = latent_dim
        self.epochs = epochs
        self.batch_size = batch_size
        self.lr = lr
        self.random_seed = random_seed
        self.generator: Optional[TabularGenerator] = None
        self.discriminator: Optional[TabularDiscriminator] = None
        self.scaler = MinMaxScaler()
        self.encoders: Dict[str, LabelEncoder] = {}
        self.original_columns: List[str] = []
        self.train_column_names: List[str] = []
        self.column_dtypes: Dict[str, Any] = {}
        self.discrete_columns: List[str] = []
        
        # Specialized column handling registry
        self.sequence_id_cols: List[str] = []
        self.sequence_id_samples: Dict[str, str] = {}
        self.pool_sample_cols: List[str] = []
        self.column_value_pools: Dict[str, List[Any]] = {}

    def fit(self, df: pd.DataFrame, discrete_columns: Optional[List[str]] = None):
        """Fit Tabular GAN model while accurately distinguishing unique sequence IDs from entity/categorical features."""
        torch.manual_seed(self.random_seed)
        np.random.seed(self.random_seed)

        self.original_columns = list(df.columns)
        self.column_dtypes = {col: df[col].dtype for col in self.original_columns}
        df_train = df.copy()
        n_rows = len(df_train)

        self.sequence_id_cols = []
        self.sequence_id_samples = {}
        self.pool_sample_cols = []
        self.column_value_pools = {}

        cols_to_drop_from_training = []

        for col in df_train.columns:
            s = df_train[col].dropna()
            if len(s) == 0:
                continue
            n_unique = s.nunique()
            first_val = str(s.iloc[0])
            col_lower = col.lower()

            # 1. Detect Primary Unique Transaction Sequence IDs (e.g. TransactionID, TX_ID, ID where uniqueness > 85%)
            is_seq_id = (
                n_unique >= max(10, int(0.85 * n_rows))
                and any(k in col_lower for k in ["trans", "tx", "pk", "uuid", "index"])
                and not any(k in col_lower for k in ["account", "customer", "device", "merchant", "card", "date", "time", "amount", "duration", "age"])
            ) or (col_lower in ["transactionid", "transaction_id", "tx_id", "txid", "row_id"])

            # 2. Detect Date / Timestamp Columns
            is_date = (
                any(k in col_lower for k in ["date", "time", "timestamp", "created"])
                and not any(k in col_lower for k in ["duration", "hour", "attempt", "type", "count"])
                and s.dtype == "object"
            )

            # 3. Detect IP Address Columns
            is_ip = (
                ("ip" in col_lower and "equip" not in col_lower)
                or bool(re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}", first_val))
            )

            # 4. Detect High-Cardinality Entity IDs (e.g. AccountID, CustomerID, DeviceID with > 1500 unique values)
            is_high_card_entity = (
                n_unique > 1500
                and any(k in col_lower for k in ["account", "customer", "device", "merchant", "card", "user"])
                and s.dtype == "object"
            )

            if is_seq_id:
                self.sequence_id_cols.append(col)
                self.sequence_id_samples[col] = first_val
                cols_to_drop_from_training.append(col)
            elif is_date or is_ip or is_high_card_entity:
                self.pool_sample_cols.append(col)
                # Store sample pool preserving realistic empirical frequency distribution
                self.column_value_pools[col] = list(s.sample(min(len(s), 5000), replace=False, random_state=self.random_seed).values)
                cols_to_drop_from_training.append(col)

        if cols_to_drop_from_training:
            logger.info(f"[CTGAN] Excluding sequence IDs and high-cardinality pool columns from neural network matrix: {cols_to_drop_from_training}")
            df_train = df_train.drop(columns=cols_to_drop_from_training)

        self.train_column_names = list(df_train.columns)

        # Encode categorical columns in df_train
        cat_cols = list(df_train.select_dtypes(include=["object", "category", "bool"]).columns)
        self.discrete_columns = cat_cols
        self.encoders = {}

        processed_df = df_train.copy()
        for col in cat_cols:
            le = LabelEncoder()
            processed_df[col] = le.fit_transform(processed_df[col].astype(str))
            self.encoders[col] = le

        # Ensure all training features are numeric float32
        for col in processed_df.columns:
            processed_df[col] = pd.to_numeric(processed_df[col], errors="coerce").fillna(0.0)

        # MinMax Scale to [0, 1] tensor space
        norm_data = self.scaler.fit_transform(processed_df)
        tensor_data = torch.tensor(norm_data, dtype=torch.float32)

        input_dim = norm_data.shape[1]
        self.generator = TabularGenerator(self.latent_dim, input_dim, hidden_dim=128)
        self.discriminator = TabularDiscriminator(input_dim, hidden_dim=128)

        g_opt = optim.Adam(self.generator.parameters(), lr=self.lr, betas=(0.5, 0.999))
        d_opt = optim.Adam(self.discriminator.parameters(), lr=self.lr, betas=(0.5, 0.999))

        dataset = torch.utils.data.TensorDataset(tensor_data)
        loader = torch.utils.data.DataLoader(
            dataset,
            batch_size=min(self.batch_size, max(16, len(df_train))),
            shuffle=True
        )

        logger.info(f"Training Fast PyTorch CTGAN engine for {self.epochs} epochs on {len(df_train)} rows across {input_dim} features.")

        self.generator.train()
        self.discriminator.train()

        for epoch in range(self.epochs):
            for (batch_x,) in loader:
                b_size = batch_x.size(0)
                if b_size <= 1:
                    continue

                # Train Discriminator
                d_opt.zero_grad()
                z = torch.randn(b_size, self.latent_dim)
                fake_x = self.generator(z).detach()

                d_real = self.discriminator(batch_x)
                d_fake = self.discriminator(fake_x)
                d_loss = -torch.mean(d_real) + torch.mean(d_fake)
                d_loss.backward()
                d_opt.step()

                # Train Generator
                g_opt.zero_grad()
                z = torch.randn(b_size, self.latent_dim)
                gen_fake = self.generator(z)
                g_loss = -torch.mean(self.discriminator(gen_fake))
                g_loss.backward()
                g_opt.step()

        logger.info("Fast PyTorch CTGAN model training completed successfully.")

    def _synthesize_sequence_id_list(self, sample_val: str, count: int) -> List[str]:
        """Synthesize sequentially unique IDs matching the exact prefix, separator, and zero-padding of sample_val."""
        # Match Prefix + Digits (e.g. TX000001, TXN-100000, TXN_100000, CUST0012)
        match = re.match(r"^([A-Za-z_-]+)(\d+)$", sample_val)
        if match:
            prefix = match.group(1)
            digits_str = match.group(2)
            digit_len = len(digits_str)
            try:
                start_num = int(digits_str)
            except Exception:
                start_num = 1
            return [f"{prefix}{str(start_num + i).zfill(digit_len)}" for i in range(count)]
        elif sample_val.isdigit():
            digit_len = len(sample_val)
            start_num = int(sample_val)
            return [str(start_num + i).zfill(digit_len) for i in range(count)]
        else:
            return [f"TX_{str(i + 1).zfill(6)}" for i in range(count)]

    def sample(self, num_records: int = 1000) -> pd.DataFrame:
        """Sample synthetic records with strict original schema structure and entity fidelity."""
        if self.generator is None:
            raise ValueError("CTGAN model has not been trained yet. Call fit() first.")

        self.generator.eval()
        with torch.no_grad():
            z = torch.randn(num_records, self.latent_dim)
            syn_norm = self.generator(z).numpy()

        # 1. Inverse scale continuous features
        syn_raw = self.scaler.inverse_transform(syn_norm)
        synthetic_df = pd.DataFrame(syn_raw, columns=self.train_column_names)

        # 2. Decode discrete categoricals
        for col, le in self.encoders.items():
            if col in synthetic_df.columns:
                n_classes = len(le.classes_)
                indices = np.clip(np.round(synthetic_df[col].values), 0, n_classes - 1).astype(int)
                synthetic_df[col] = le.inverse_transform(indices)

        # 3. Restore original numeric dtypes, bounds, and strict 2-decimal rounding
        for col, dtype in self.column_dtypes.items():
            if col in synthetic_df.columns and col not in self.encoders:
                col_lower = col.lower()
                if col_lower in ["is_fraud", "isfraud", "is_international"]:
                    synthetic_df[col] = np.clip(np.round(synthetic_df[col].values), 0, 1).astype(int)
                elif col_lower in ["transaction_hour", "hour", "customerage", "age", "loginattempts", "transactionduration"]:
                    synthetic_df[col] = np.clip(np.round(synthetic_df[col].values), 0, 10000).astype(int)
                elif np.issubdtype(dtype, np.integer):
                    synthetic_df[col] = np.round(synthetic_df[col].values).astype(int)
                elif np.issubdtype(dtype, np.floating):
                    synthetic_df[col] = synthetic_df[col].round(2)

        # 4. Inject synthesized Sequence IDs matching exact original format
        for col in self.sequence_id_cols:
            sample_val = self.sequence_id_samples.get(col, "TX000001")
            synthetic_df[col] = self._synthesize_sequence_id_list(sample_val, num_records)

        # 5. Inject realistic samples for entity pools (AccountID, DeviceID, MerchantID, IP Address, TransactionDate)
        rng = np.random.default_rng(self.random_seed)
        for col in self.pool_sample_cols:
            pool = self.column_value_pools.get(col, [])
            if pool and len(pool) > 0:
                synthetic_df[col] = rng.choice(pool, size=num_records, replace=True)
            else:
                synthetic_df[col] = [f"ENT_{i+1}" for i in range(num_records)]

        # 6. STRICT SCHEMA ALIGNMENT: Order columns EXACTLY as in the original uploaded dataset
        ordered_cols = [c for c in self.original_columns if c in synthetic_df.columns]
        extra_cols = [c for c in synthetic_df.columns if c not in self.original_columns]
        synthetic_df = synthetic_df[ordered_cols + extra_cols]

        return synthetic_df
