from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, HTTPException, Depends, status
from app.schemas.auth import UserRegister, UserLogin, UserResponse, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token, get_current_user_payload
from app.database.mongodb import db_manager

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserRegister):
    users_col = db_manager.get_collection("users")
    existing_user = users_col.find_one({"email": user_in.email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    user_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()
    hashed_pwd = hash_password(user_in.password)

    user_doc = {
        "id": user_id,
        "email": user_in.email.lower(),
        "hashed_password": hashed_pwd,
        "full_name": user_in.full_name,
        "organization": user_in.organization or "Academic Evaluation",
        "created_at": now_str
    }
    users_col.insert_one(user_doc)
    
    # Auto-seed private benchmark dataset exclusively for this user
    from app.services.dataset_service import dataset_service
    dataset_service.seed_user_sample_dataset(user_id)

    access_token = create_access_token({"sub": user_id, "email": user_in.email.lower()})
    user_response = UserResponse(
        id=user_id,
        email=user_in.email.lower(),
        full_name=user_in.full_name,
        organization=user_in.organization,
        created_at=now_str
    )
    return TokenResponse(access_token=access_token, user=user_response)

@router.post("/login", response_model=TokenResponse)
async def login_user(user_in: UserLogin):
    users_col = db_manager.get_collection("users")
    user = users_col.find_one({"email": user_in.email.lower()})
    if not user or not verify_password(user_in.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    access_token = create_access_token({"sub": user["id"], "email": user["email"]})
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        organization=user.get("organization"),
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=access_token, user=user_response)

@router.get("/me", response_model=UserResponse)
async def get_me(payload: dict = Depends(get_current_user_payload)):
    users_col = db_manager.get_collection("users")
    user = users_col.find_one({"id": payload.get("sub")})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        organization=user.get("organization"),
        created_at=user["created_at"]
    )
