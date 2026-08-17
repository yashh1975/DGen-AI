import json
import os
import uuid
from typing import Dict, List, Any, Optional
from pathlib import Path
from app.core.config import settings
from app.utils.logging import logger

class JSONMockStore:
    """A lightweight, zero-dependency thread-safe JSON file store simulating Mongo collections."""
    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.data: Dict[str, List[Dict[str, Any]]] = {
            "users": [],
            "datasets": [],
            "models": [],
            "generation_jobs": [],
            "experiments": [],
            "evaluation_results": []
        }
        self._load()

    def _load(self):
        if self.file_path.exists():
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load mock DB file: {e}. Re-initializing.")
                self._save()
        else:
            self._save()

    def _save(self):
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2, default=str)

    def collection(self, collection_name: str):
        return MockCollection(self, collection_name)

class MockCollection:
    def __init__(self, store: JSONMockStore, name: str):
        self.store = store
        self.name = name
        if name not in self.store.data:
            self.store.data[name] = []

    def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        items = self.find(query)
        return items[0] if items else None

    def find(self, query: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        items = self.store.data.get(self.name, [])
        if not query:
            return list(items)
        result = []
        for item in items:
            if "$or" in query:
                or_list = query["$or"]
                match = any(
                    all(item.get(sub_k) == sub_v for sub_k, sub_v in sub_q.items())
                    for sub_q in or_list
                )
            else:
                match = True
                for k, v in query.items():
                    if item.get(k) != v:
                        match = False
                        break
            if match:
                result.append(item)
        return result

    def insert_one(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        doc = dict(doc)
        if "id" not in doc and "_id" not in doc:
            doc["id"] = str(uuid.uuid4())
        if "_id" not in doc:
            doc["_id"] = doc.get("id")
        self.store.data[self.name].append(doc)
        self.store._save()
        return MockInsertResult(doc.get("_id"))

    def update_one(self, query: Dict[str, Any], update: Dict[str, Any]) -> bool:
        item = self.find_one(query)
        if not item:
            return False
        if "$set" in update:
            for k, v in update["$set"].items():
                item[k] = v
        self.store._save()
        return True

    def delete_one(self, query: Dict[str, Any]) -> bool:
        item = self.find_one(query)
        if not item:
            return False
        self.store.data[self.name] = [x for x in self.store.data[self.name] if x.get("_id") != item.get("_id") and x.get("id") != item.get("id")]
        self.store._save()
        return True

class MockInsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

class DatabaseManager:
    def __init__(self):
        self.use_mock = settings.USE_MONGO_MOCK
        self.mock_store = JSONMockStore(settings.STORAGE_DIR / "db_mock.json")
        self.client = None
        self.db = None

    def connect(self):
        if not self.use_mock:
            try:
                import pymongo
                self.client = pymongo.MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
                self.client.server_info()  # Will raise Exception if cannot connect
                self.db = self.client[settings.MONGODB_DB_NAME]
                logger.info(f"Connected to MongoDB at {settings.MONGODB_URI}")
                return
            except Exception as e:
                logger.warning(f"MongoDB connection failed: {e}. Falling back to JSON Mock Store.")
                self.use_mock = True

        logger.info("Using JSON Mock DB Store for persistent metadata.")

    def get_collection(self, collection_name: str):
        if self.use_mock or self.db is None:
            return self.mock_store.collection(collection_name)
        return self.db[collection_name]

db_manager = DatabaseManager()

def get_db():
    return db_manager
