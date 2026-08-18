import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
from fastapi import UploadFile, HTTPException, status
from app.utils.file_storage import storage_service
from app.database.mongodb import db_manager
from app.utils.logging import logger

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB

class DatasetService:
    def __init__(self):
        pass

    async def upload_dataset(self, file: UploadFile, user_id: str) -> Dict[str, Any]:
        """Validate, store, and register an uploaded CSV dataset strictly for this user."""
        if not file.filename.endswith(".csv"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only CSV (.csv) files are supported."
            )

        content = await file.read()
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded CSV file is empty."
            )

        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum limit of {MAX_FILE_SIZE_BYTES // (1024*1024)}MB."
            )

        file_id, file_path = storage_service.save_dataset_file(content, file.filename)

        # Inspect dataframe
        try:
            df = pd.read_csv(file_path)
        except Exception as e:
            storage_service.delete_file(str(file_path))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not parse CSV file: {str(e)}"
            )

        row_count, column_count = len(df), len(df.columns)
        
        # Classify column types dynamically
        num_cols = list(df.select_dtypes(include=["number"]).columns)
        cat_cols = list(df.select_dtypes(include=["object", "category", "bool"]).columns)
        dt_cols = list(df.select_dtypes(include=["datetime"]).columns)

        # Auto-detect potential target/fraud/risk classification column
        target_col = None
        risk_keywords = [
            "fraud", "chargeback", "ischargeback", "default", "loandefault",
            "suspicious", "issuspicious", "aml", "anomaly", "risk", "target", "class", "label", "flag"
        ]
        for kw in risk_keywords:
            for col in df.columns:
                if kw in col.lower():
                    target_col = col
                    break
            if target_col:
                break

        # Fallback to any binary column if not found by keyword
        if not target_col:
            for col in df.columns:
                vals = set(pd.to_numeric(df[col], errors="coerce").dropna().unique())
                if vals.issubset({0, 1, 0.0, 1.0}) and len(vals) <= 2 and len(vals) > 0:
                    target_col = col
                    break

        now_str = datetime.now(timezone.utc).isoformat()
        dataset_doc = {
            "id": file_id,
            "user_id": user_id,
            "filename": file.filename,
            "file_path": str(file_path),
            "file_size_bytes": len(content),
            "row_count": row_count,
            "column_count": column_count,
            "upload_timestamp": now_str,
            "target_fraud_column": target_col,
            "columns": list(df.columns),
            "numerical_columns": num_cols,
            "categorical_columns": cat_cols,
            "datetime_columns": dt_cols
        }

        col = db_manager.get_collection("datasets")
        # Remove any existing dataset uploaded by this user with identical filename
        existing = col.find({"filename": file.filename, "user_id": user_id})
        for ex in existing:
            col.delete_one({"id": ex["id"]})

        col.insert_one(dataset_doc)
        logger.info(f"Registered dataset '{file.filename}' (ID: {file_id}) for user {user_id}")
        return dataset_doc

    def _create_sample_banking_dataframe(self, n: int = 1000) -> pd.DataFrame:
        """Programmatically synthesize a baseline authentic banking transactions dataframe."""
        import random
        random.seed(42)
        types = ['POS_DEBIT', 'ATM_WITHDRAWAL', 'UPI_TRANSFER', 'SALARY_CREDIT', 'INTEREST_CREDIT', 'NET_BANKING_DEBIT']
        cats = ['GROCERY', 'ELECTRONICS', 'DINING', 'ENTERTAINMENT', 'TRAVEL', 'HEALTHCARE', 'UTILITIES', 'INVESTMENT']
        channels = ['MOBILE_APP', 'WEB_PORTAL', 'POS_TERMINAL', 'ATM_KIOSK', 'BRANCH']
        cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad']

        rows = []
        for i in range(1, n + 1):
            ttype = random.choice(types)
            is_credit = 'CREDIT' in ttype
            amount = round(random.uniform(5000, 75000) if is_credit else random.uniform(50, 15000), 2)
            debit = 0.00 if is_credit else amount
            credit = amount if is_credit else 0.00
            is_fraud = 1 if (not is_credit and (debit > 10000 or random.random() < 0.04)) else 0
            balance = round(random.uniform(15000, 250000), 2)
            rows.append({
                'transaction_id': f'TXN{i:06d}',
                'timestamp': f'2026-03-{random.randint(1, 28):02d} {random.randint(0, 23):02d}:{random.randint(0, 59):02d}:{random.randint(0, 59):02d}',
                'customer_id': f'CUST{random.randint(1000, 1999)}',
                'account_number': f'ACC{random.randint(100000, 999999)}',
                'transaction_type': ttype,
                'debit_amount': debit,
                'credit_amount': credit,
                'merchant_category': random.choice(cats),
                'channel': random.choice(channels),
                'city': random.choice(cities),
                'balance': balance,
                'is_fraud': is_fraud
            })
        return pd.DataFrame(rows)

    def seed_user_sample_dataset(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Seed a private, independent benchmark dataset for a specific user."""
        col = db_manager.get_collection("datasets")
        existing_sample = col.find_one({"filename": "sample_banking_transactions.csv", "user_id": user_id})
        if existing_sample:
            # Verify file exists on disk, if not recreate
            fp = existing_sample.get("file_path", "")
            if fp and os.path.exists(fp):
                return existing_sample

        # Check candidate locations for official benchmark dataset
        candidates = [
            Path(__file__).resolve().parent.parent.parent.parent / "data" / "sample_banking_transactions.csv",
            Path(__file__).resolve().parent.parent.parent / "data" / "sample_banking_transactions.csv",
            Path.cwd() / "data" / "sample_banking_transactions.csv",
            Path.cwd() / "backend" / "data" / "sample_banking_transactions.csv",
            Path.cwd().parent / "data" / "sample_banking_transactions.csv"
        ]
        sample_path = next((p for p in candidates if p.exists()), None)

        try:
            if sample_path and sample_path.exists():
                with open(sample_path, "rb") as f:
                    content = f.read()
                file_id, file_path = storage_service.save_dataset_file(content, "sample_banking_transactions.csv")
                df = pd.read_csv(file_path)
            else:
                df = self._create_sample_banking_dataframe(1000)
                csv_bytes = df.to_csv(index=False, float_format='%.2f').encode('utf-8')
                file_id, file_path = storage_service.save_dataset_file(csv_bytes, "sample_banking_transactions.csv")

            now_str = datetime.now(timezone.utc).isoformat()
            dataset_doc = {
                "id": file_id,
                "user_id": user_id,
                "filename": "sample_banking_transactions.csv",
                "file_path": str(file_path),
                "file_size_bytes": os.path.getsize(file_path),
                "row_count": len(df),
                "column_count": len(df.columns),
                "upload_timestamp": now_str,
                "target_fraud_column": "is_fraud" if "is_fraud" in df.columns else None,
                "columns": list(df.columns),
                "numerical_columns": list(df.select_dtypes(include=["number"]).columns),
                "categorical_columns": list(df.select_dtypes(include=["object", "category", "bool"]).columns),
                "datetime_columns": list(df.select_dtypes(include=["datetime"]).columns)
            }
            if existing_sample:
                col.update_one({"id": existing_sample["id"]}, {"$set": dataset_doc})
            else:
                col.insert_one(dataset_doc)
            return dataset_doc
        except Exception as e:
            logger.warning(f"Could not seed benchmark dataset for user {user_id}: {e}")
            return None

    def list_datasets(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List datasets strictly belonging to the requesting user with auto-seed if empty."""
        col = db_manager.get_collection("datasets")
        docs = list(col.find({"user_id": user_id})) if user_id else list(col.find({}))

        if not docs and user_id:
            seeded = self.seed_user_sample_dataset(user_id)
            if seeded:
                docs = [seeded]

        # Ensure all docs have the columns list
        for d in docs:
            if "columns" not in d or not d["columns"]:
                all_cols = d.get("numerical_columns", []) + d.get("categorical_columns", []) + d.get("datetime_columns", [])
                d["columns"] = all_cols
        return docs

    def get_dataset(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        col = db_manager.get_collection("datasets")
        return col.find_one({"id": dataset_id})

    def get_dataset_meta(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        return self.get_dataset(dataset_id)

    def get_dataset_dataframe(self, dataset_id: str, limit: Optional[int] = None) -> pd.DataFrame:
        doc = self.get_dataset(dataset_id)
        if not doc:
            raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")
        file_path = doc.get("file_path", "")
        if not file_path or not os.path.exists(file_path):
            # Self-heal sample dataset on ephemeral cloud disk
            if "sample_banking_transactions" in doc.get("filename", ""):
                df = self._create_sample_banking_dataframe(1000)
                csv_bytes = df.to_csv(index=False, float_format='%.2f').encode('utf-8')
                file_id, new_file_path = storage_service.save_dataset_file(csv_bytes, "sample_banking_transactions.csv")
                col = db_manager.get_collection("datasets")
                col.update_one({"id": dataset_id}, {"$set": {"file_path": str(new_file_path)}})
                file_path = str(new_file_path)
            else:
                raise HTTPException(status_code=404, detail="Dataset file missing on disk.")
        if limit:
            return pd.read_csv(file_path, nrows=limit)
        return pd.read_csv(file_path)

    def get_dataset_sample(self, dataset_id: str, rows: int = 50) -> Dict[str, Any]:
        df = self.get_dataset_dataframe(dataset_id, limit=rows)
        records = df.where(pd.notnull(df), None).to_dict(orient="records")
        return {
            "dataset_id": dataset_id,
            "columns": list(df.columns),
            "total_rows_previewed": len(records),
            "rows": records
        }

    def delete_dataset(self, dataset_id: str, user_id: Optional[str] = None) -> bool:
        """Delete dataset with user ownership verification."""
        col = db_manager.get_collection("datasets")
        doc = col.find_one({"id": dataset_id})
        if not doc:
            return False

        if user_id and doc.get("user_id") != user_id:
            return False

        file_path = doc.get("file_path", "")
        # Only delete physical file if it's in the dynamic storage directory
        if file_path and "storage" in file_path and os.path.exists(file_path):
            try:
                storage_service.delete_file(file_path)
            except Exception:
                pass

        col.delete_one({"id": dataset_id})
        return True

dataset_service = DatasetService()
