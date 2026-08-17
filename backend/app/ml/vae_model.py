import re
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from app.utils.logging import logger

class TabularEncoder(nn.Module):
    def __init__(self, input_dim: int, latent_dim: int = 16, hidden_dim: int = 64):
        super(TabularEncoder, self).__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        self.fc_mu = nn.Linear(hidden_dim, latent_dim)
        self.fc_logvar = nn.Linear(hidden_dim, latent_dim)
        self.relu = nn.ReLU()

    def forward(self, x: torch.Tensor):
        h = self.relu(self.fc1(x))
        h = self.relu(self.fc2(h))
        mu = self.fc_mu(h)
        logvar = self.fc_logvar(h)
        return mu, logvar

class TabularDecoder(nn.Module):
    def __init__(self, latent_dim: int = 16, output_dim: int = 32, hidden_dim: int = 64):
        super(TabularDecoder, self).__init__()
        self.fc1 = nn.Linear(latent_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        self.fc_out = nn.Linear(hidden_dim, output_dim)
        self.relu = nn.ReLU()

    def forward(self, z: torch.Tensor):
        h = self.relu(self.fc1(z))
        h = self.relu(self.fc2(h))
        return self.fc_out(h)

class TabularVAE(nn.Module):
    def __init__(self, input_dim: int, latent_dim: int = 16, hidden_dim: int = 64):
        super(TabularVAE, self).__init__()
        self.encoder = TabularEncoder(input_dim, latent_dim, hidden_dim)
        self.decoder = TabularDecoder(latent_dim, input_dim, hidden_dim)

    def reparameterize(self, mu: torch.Tensor, logvar: torch.Tensor) -> torch.Tensor:
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std

    def forward(self, x: torch.Tensor):
        mu, logvar = self.encoder(x)
        z = self.reparameterize(mu, logvar)
        recon_x = self.decoder(z)
        return recon_x, mu, logvar

def vae_loss_function(recon_x: torch.Tensor, x: torch.Tensor, mu: torch.Tensor, logvar: torch.Tensor, beta: float = 1.0):
    recon_loss = nn.functional.mse_loss(recon_x, x, reduction='sum')
    kl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
    return recon_loss + beta * kl_loss

class VAEModelEngine:
    """High-Performance PyTorch Tabular Variational Autoencoder (VAE).
    
    Strictly preserves original schema ordering, entity pools (Accounts, Devices, Merchants, IPs),
    sequence ID formats (e.g. TX000001, TXN-100001), date timestamps, and float/integer dtypes.
    """
    def __init__(self, latent_dim: int = 16, epochs: int = 10, batch_size: int = 128, lr: float = 1e-3, random_seed: int = 42):
        self.latent_dim = latent_dim
        self.epochs = epochs
        self.batch_size = batch_size
        self.lr = lr
        self.random_seed = random_seed
        self.model: Optional[TabularVAE] = None
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

    def _prepare_data(self, df: pd.DataFrame) -> Tuple[np.ndarray, List[str]]:
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
                self.column_value_pools[col] = list(s.sample(min(len(s), 5000), replace=False, random_state=self.random_seed).values)
                cols_to_drop_from_training.append(col)

        if cols_to_drop_from_training:
            logger.info(f"[VAE] Excluding sequence IDs and pool columns from neural network matrix: {cols_to_drop_from_training}")
            df_train = df_train.drop(columns=cols_to_drop_from_training)

        self.train_column_names = list(df_train.columns)

        cat_cols = list(df_train.select_dtypes(include=["object", "category", "bool"]).columns)
        self.discrete_columns = cat_cols
        self.encoders = {}

        processed_df = df_train.copy()
        for col in cat_cols:
            le = LabelEncoder()
            processed_df[col] = le.fit_transform(processed_df[col].astype(str))
            self.encoders[col] = le

        for col in processed_df.columns:
            processed_df[col] = pd.to_numeric(processed_df[col], errors="coerce").fillna(0.0)

        scaled_data = self.scaler.fit_transform(processed_df.values.astype(np.float32))
        return scaled_data, self.train_column_names

    def fit(self, df: pd.DataFrame):
        torch.manual_seed(self.random_seed)
        np.random.seed(self.random_seed)

        data, _ = self._prepare_data(df)
        input_dim = data.shape[1]

        self.model = TabularVAE(input_dim=input_dim, latent_dim=self.latent_dim, hidden_dim=64)
        optimizer = optim.Adam(self.model.parameters(), lr=self.lr)

        tensor_data = torch.tensor(data, dtype=torch.float32)
        dataset = torch.utils.data.TensorDataset(tensor_data)
        dataloader = torch.utils.data.DataLoader(dataset, batch_size=self.batch_size, shuffle=True)

        self.model.train()
        for epoch in range(self.epochs):
            total_loss = 0.0
            for (batch_x,) in dataloader:
                optimizer.zero_grad()
                recon_x, mu, logvar = self.model(batch_x)
                loss = vae_loss_function(recon_x, batch_x, mu, logvar)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()

        logger.info(f"PyTorch Tabular VAE trained for {self.epochs} epochs across {input_dim} features.")

    def _synthesize_sequence_id_list(self, sample_val: str, count: int) -> List[str]:
        """Synthesize sequentially unique IDs matching the exact prefix, separator, and zero-padding of sample_val."""
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
        if self.model is None:
            raise ValueError("VAE model has not been trained yet.")

        self.model.eval()
        with torch.no_grad():
            z = torch.randn(num_records, self.latent_dim)
            sampled_tensor = self.model.decoder(z).numpy()

        unscaled = self.scaler.inverse_transform(sampled_tensor)
        synthetic_df = pd.DataFrame(unscaled, columns=self.train_column_names)

        # 1. Inverse transform categorical columns
        for col, le in self.encoders.items():
            if col in synthetic_df.columns:
                classes = le.classes_
                rounded = np.clip(np.round(synthetic_df[col].values).astype(int), 0, len(classes) - 1)
                synthetic_df[col] = classes[rounded]

        # 2. Restore numeric dtypes, bounds, and strict 2-decimal rounding
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

        # 3. Inject synthesized Sequence IDs matching exact original format
        for col in self.sequence_id_cols:
            sample_val = self.sequence_id_samples.get(col, "TX000001")
            synthetic_df[col] = self._synthesize_sequence_id_list(sample_val, num_records)

        # 4. Inject realistic samples for entity pools (AccountID, DeviceID, MerchantID, IP Address, TransactionDate)
        rng = np.random.default_rng(self.random_seed)
        for col in self.pool_sample_cols:
            pool = self.column_value_pools.get(col, [])
            if pool and len(pool) > 0:
                synthetic_df[col] = rng.choice(pool, size=num_records, replace=True)
            else:
                synthetic_df[col] = [f"ENT_{i+1}" for i in range(num_records)]

        # 5. STRICT SCHEMA ALIGNMENT: Order columns EXACTLY as in original dataset
        ordered_cols = [c for c in self.original_columns if c in synthetic_df.columns]
        extra_cols = [c for c in synthetic_df.columns if c not in self.original_columns]
        synthetic_df = synthetic_df[ordered_cols + extra_cols]

        return synthetic_df
