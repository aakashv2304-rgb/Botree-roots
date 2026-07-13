from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Header, Query, UploadFile, File, Depends
from fastapi.responses import Response as FastAPIResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET")
APP_NAME = "proposal-tracker"
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")

# Storage key (module-level)
storage_key = None

# Workflow stages
WORKFLOW_STAGES = [
    {"key": "sales_submitted", "role": "Sales", "label": "Sales Submitted"},
    {"key": "cgo_review", "role": "CGO", "label": "CGO Review"},
    {"key": "finance_review", "role": "Finance", "label": "Finance Review"},
    {"key": "legal_review", "role": "Legal", "label": "Legal Review"},
    {"key": "cfo_review", "role": "CFO", "label": "CFO Review"},
    {"key": "approved", "role": None, "label": "Approved"}
]

# Password hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT tokens
def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# Auth helper
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user["id"] = user["_id"]
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Object storage functions
def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        raise

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str

class ProposalCreate(BaseModel):
    title: str
    description: str
    file_id: str

class ProposalAction(BaseModel):
    comment: Optional[str] = None

class ProposalResponse(BaseModel):
    id: str
    title: str
    description: str
    status: str
    current_stage: int
    created_by: Dict[str, str]
    file_info: Dict[str, Any]
    history: List[Dict[str, Any]]
    created_at: str
    updated_at: str

# Startup event
@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.proposals.create_index("created_by")
    await db.proposals.create_index("status")
    await db.proposals.create_index("current_stage")
    
    # Seed users
    await seed_users()
    
    # Initialize storage
    try:
        init_storage()
    except Exception as e:
        logger.error(f"Storage initialization failed: {e}")

async def seed_users():
    # Admin (super admin)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@botree.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    
    users_to_seed = [
        {"email": admin_email, "password": admin_password, "name": "System Admin", "role": "Admin"},
        {"email": "finance@botree.com", "password": "Finance@123", "name": "Finance User", "role": "Finance"},
        {"email": "sales@botree.com", "password": "Sales@123", "name": "Sales User", "role": "Sales"},
        {"email": "cgo@botree.com", "password": "CGO@123", "name": "CGO User", "role": "CGO"},
        {"email": "legal@botree.com", "password": "Legal@123", "name": "Legal User", "role": "Legal"},
        {"email": "cfo@botree.com", "password": "CFO@123", "name": "CFO User", "role": "CFO"},
    ]
    
    for user_data in users_to_seed:
        existing = await db.users.find_one({"email": user_data["email"]})
        if existing is None:
            hashed = hash_password(user_data["password"])
            await db.users.insert_one({
                "email": user_data["email"],
                "password_hash": hashed,
                "name": user_data["name"],
                "role": user_data["role"],
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"Seeded user: {user_data['email']}")
        elif not verify_password(user_data["password"], existing["password_hash"]):
            await db.users.update_one(
                {"email": user_data["email"]},
                {"$set": {"password_hash": hash_password(user_data["password"])}}
            )
    
    # Write test credentials
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        for user_data in users_to_seed:
            f.write(f"- **{user_data['role']}**: {user_data['email']} / {user_data['password']}\n")
        f.write("\n## Auth Endpoints\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/logout\n")
        f.write("- GET /api/auth/me\n")

# Auth endpoints
@api_router.post("/auth/login")
async def login(request: LoginRequest, response: Response):
    user = await db.users.find_one({"email": request.email.lower()})
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, user["email"])
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "email": user["email"],
        "name": user["name"],
        "role": user["role"]
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

# User management (Admin only)
@api_router.get("/users")
async def get_users(request: Request):
    current_user = await get_current_user(request)
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can manage users")
    
    users = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    return [{"id": str(u["_id"]), "email": u["email"], "name": u["name"], "role": u["role"], "created_at": u["created_at"]} for u in users]

@api_router.post("/users")
async def create_user(user_data: UserCreate, request: Request):
    current_user = await get_current_user(request)
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can create users")
    
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    hashed = hash_password(user_data.password)
    new_user = {
        "email": user_data.email.lower(),
        "password_hash": hashed,
        "name": user_data.name,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(new_user)
    
    return {
        "id": str(result.inserted_id),
        "email": new_user["email"],
        "name": new_user["name"],
        "role": new_user["role"],
        "created_at": new_user["created_at"]
    }

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    current_user = await get_current_user(request)
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can delete users")
    
    # Prevent deleting yourself
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, request: Request):
    current_user = await get_current_user(request)
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can update roles")
    
    # Prevent changing your own role
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    valid_roles = ["Admin", "Finance", "Sales", "CGO", "Legal", "CFO"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": role}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Role updated successfully"}

# File upload
@api_router.post("/proposals/upload")
async def upload_proposal_file(file: UploadFile, request: Request):
    current_user = await get_current_user(request)
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    path = f"{APP_NAME}/proposals/{current_user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    
    result = put_object(path, data, file.content_type or "application/octet-stream")
    
    file_doc = {
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result["size"],
        "uploaded_by": current_user["id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.files.insert_one(file_doc)
    
    return {
        "id": file_doc["id"],
        "filename": file.filename,
        "size": result["size"],
        "path": result["path"]
    }

# File download
@api_router.get("/files/{file_id}")
async def download_file(file_id: str, request: Request):
    await get_current_user(request)
    
    file_doc = await db.files.find_one({"id": file_id, "is_deleted": False})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    data, content_type = get_object(file_doc["storage_path"])
    return FastAPIResponse(content=data, media_type=file_doc.get("content_type", content_type))

# Proposal endpoints
@api_router.post("/proposals")
async def create_proposal(proposal: ProposalCreate, request: Request):
    current_user = await get_current_user(request)
    
    if current_user["role"] != "Sales":
        raise HTTPException(status_code=403, detail="Only Sales can create proposals")
    
    file_doc = await db.files.find_one({"id": proposal.file_id, "is_deleted": False})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    new_proposal = {
        "title": proposal.title,
        "description": proposal.description,
        "status": "sales_submitted",
        "current_stage": 1,
        "created_by": current_user["id"],
        "file_info": {
            "id": file_doc["id"],
            "filename": file_doc["original_filename"],
            "size": file_doc["size"],
            "storage_path": file_doc["storage_path"]
        },
        "history": [{
            "action": "created",
            "by": {"id": current_user["id"], "name": current_user["name"], "role": current_user["role"]},
            "comment": "Proposal submitted",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.proposals.insert_one(new_proposal)
    logger.info(f"[EMAIL] New proposal '{proposal.title}' created by {current_user['name']} - CGO should be notified")
    
    response_proposal = {
        "id": str(result.inserted_id),
        "title": new_proposal["title"],
        "description": new_proposal["description"],
        "status": new_proposal["status"],
        "current_stage": new_proposal["current_stage"],
        "created_by": current_user,
        "file_info": new_proposal["file_info"],
        "history": new_proposal["history"],
        "created_at": new_proposal["created_at"],
        "updated_at": new_proposal["updated_at"]
    }
    return response_proposal

@api_router.get("/proposals")
async def get_proposals(request: Request, status: Optional[str] = None, search: Optional[str] = None):
    current_user = await get_current_user(request)
    
    query = {}
    if status:
        if status == "pending":
            query["status"] = {"$ne": "approved"}
        else:
            query["status"] = status
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    proposals = await db.proposals.find(query).sort("created_at", -1).to_list(1000)
    
    result = []
    for p in proposals:
        creator = await db.users.find_one({"_id": ObjectId(p["created_by"])})
        if not creator:
            # Handle deleted user
            creator = {"_id": p["created_by"], "name": "Deleted User", "role": "Unknown"}
        result.append({
            "id": str(p["_id"]),
            "title": p["title"],
            "description": p["description"],
            "status": p["status"],
            "current_stage": p["current_stage"],
            "created_by": {"id": str(creator["_id"]), "name": creator["name"], "role": creator["role"]},
            "file_info": p["file_info"],
            "history": p["history"],
            "created_at": p["created_at"],
            "updated_at": p["updated_at"]
        })
    
    return result

@api_router.get("/proposals/{proposal_id}")
async def get_proposal(proposal_id: str, request: Request):
    current_user = await get_current_user(request)
    
    proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    creator = await db.users.find_one({"_id": ObjectId(proposal["created_by"])})
    if not creator:
        creator = {"_id": proposal["created_by"], "name": "Deleted User", "role": "Unknown"}
    
    return {
        "id": str(proposal["_id"]),
        "title": proposal["title"],
        "description": proposal["description"],
        "status": proposal["status"],
        "current_stage": proposal["current_stage"],
        "created_by": {"id": str(creator["_id"]), "name": creator["name"], "role": creator["role"]},
        "file_info": proposal["file_info"],
        "history": proposal["history"],
        "created_at": proposal["created_at"],
        "updated_at": proposal["updated_at"]
    }

@api_router.put("/proposals/{proposal_id}")
async def update_proposal(proposal_id: str, proposal: ProposalCreate, request: Request):
    current_user = await get_current_user(request)
    
    if current_user["role"] != "Sales":
        raise HTTPException(status_code=403, detail="Only Sales can edit proposals")
    
    existing_proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not existing_proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Only allow editing if proposal is rejected (needs_revision) and created by this user
    if existing_proposal["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only edit your own proposals")
    
    if existing_proposal["status"] != "needs_revision":
        raise HTTPException(status_code=400, detail="Can only edit rejected proposals")
    
    # Verify new file if provided
    file_doc = await db.files.find_one({"id": proposal.file_id, "is_deleted": False})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    history_entry = {
        "action": "updated",
        "by": {"id": current_user["id"], "name": current_user["name"], "role": current_user["role"]},
        "comment": "Proposal updated and resubmitted",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Update proposal and reset to first stage
    await db.proposals.update_one(
        {"_id": ObjectId(proposal_id)},
        {
            "$set": {
                "title": proposal.title,
                "description": proposal.description,
                "status": "sales_submitted",
                "current_stage": 1,
                "file_info": {
                    "id": file_doc["id"],
                    "filename": file_doc["original_filename"],
                    "size": file_doc["size"],
                    "storage_path": file_doc["storage_path"]
                },
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"history": history_entry}
        }
    )
    
    logger.info(f"[EMAIL] Proposal '{proposal.title}' updated and resubmitted by {current_user['name']} - CGO should be notified")
    
    return {"message": "Proposal updated and resubmitted successfully"}

@api_router.post("/proposals/{proposal_id}/approve")
async def approve_proposal(proposal_id: str, action: ProposalAction, request: Request):
    current_user = await get_current_user(request)
    
    proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    current_stage = proposal["current_stage"]
    stage_info = WORKFLOW_STAGES[current_stage]
    
    if stage_info["role"] != current_user["role"]:
        raise HTTPException(status_code=403, detail="Not your turn to approve")
    
    history_entry = {
        "action": "approved",
        "by": {"id": current_user["id"], "name": current_user["name"], "role": current_user["role"]},
        "comment": action.comment or "Approved",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    next_stage = current_stage + 1
    new_status = WORKFLOW_STAGES[next_stage]["key"] if next_stage < len(WORKFLOW_STAGES) else "approved"
    
    await db.proposals.update_one(
        {"_id": ObjectId(proposal_id)},
        {
            "$set": {
                "current_stage": next_stage,
                "status": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"history": history_entry}
        }
    )
    
    if new_status == "approved":
        logger.info(f"[EMAIL] Proposal '{proposal['title']}' fully approved by {current_user['name']}")
    else:
        next_role = WORKFLOW_STAGES[next_stage]["role"]
        logger.info(f"[EMAIL] Proposal '{proposal['title']}' approved by {current_user['name']} - moving to {next_role}")
    
    return {"message": "Proposal approved", "new_status": new_status}

@api_router.post("/proposals/{proposal_id}/reject")
async def reject_proposal(proposal_id: str, action: ProposalAction, request: Request):
    current_user = await get_current_user(request)
    
    proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    current_stage = proposal["current_stage"]
    stage_info = WORKFLOW_STAGES[current_stage]
    
    if stage_info["role"] != current_user["role"]:
        raise HTTPException(status_code=403, detail="Not your turn to reject")
    
    history_entry = {
        "action": "rejected",
        "by": {"id": current_user["id"], "name": current_user["name"], "role": current_user["role"]},
        "comment": action.comment or "Sent back to Sales for revision",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.proposals.update_one(
        {"_id": ObjectId(proposal_id)},
        {
            "$set": {
                "current_stage": 0,
                "status": "needs_revision",
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"history": history_entry}
        }
    )
    
    creator = await db.users.find_one({"_id": ObjectId(proposal["created_by"])})
    logger.info(f"[EMAIL] Proposal '{proposal['title']}' rejected by {current_user['name']} - sent back to {creator['name']}")
    
    return {"message": "Proposal sent back to Sales", "new_status": "needs_revision"}

@api_router.get("/proposals/{proposal_id}/download")
async def download_proposal_file(proposal_id: str, request: Request):
    await get_current_user(request)
    
    proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    file_info = proposal["file_info"]
    data, content_type = get_object(file_info["storage_path"])
    
    return FastAPIResponse(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={file_info['filename']}"}
    )

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()