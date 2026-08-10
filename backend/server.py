from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Header, Query, UploadFile, File, Depends
from fastapi.responses import Response as FastAPIResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import certifi
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
import asyncio
import resend
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO

# Register DejaVuSans font for Unicode support (₹ symbol)
try:
    pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
    UNICODE_FONT = 'DejaVuSans'
    UNICODE_FONT_BOLD = 'DejaVuSans-Bold'
except Exception:
    # Fallback to Helvetica if DejaVu not available
    UNICODE_FONT = 'Helvetica'
    UNICODE_FONT_BOLD = 'Helvetica-Bold'

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Safety net: some OpenSSL 3.x builds have a TLS 1.3 session-resumption bug
# that Atlas's shared-tier (M0/M2/M5) TLS proxy rejects with
# TLSV1_ALERT_INTERNAL_ERROR. Capping at TLS 1.2 avoids that code path entirely.
import ssl
ssl.SSLContext.maximum_version = ssl.TLSVersion.TLSv1_2

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
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

# Cookie security: since frontend and backend are served from the SAME origin
# in production (backend serves the built frontend), "lax" + secure-in-prod is enough.
# If you ever split them across two domains, switch to samesite="none" and keep secure=True.
IS_PRODUCTION = os.environ.get("ENVIRONMENT", "development") == "production"
COOKIE_SECURE = IS_PRODUCTION
COOKIE_SAMESITE = "lax"
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "noreply@botree.co.in")

# Initialize Resend
resend.api_key = RESEND_API_KEY

# File storage: MongoDB GridFS - lives in the same free MongoDB Atlas cluster,
# no external service or API key required.
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
fs_bucket = AsyncIOMotorGridFSBucket(db)

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

# Object storage functions - MongoDB GridFS (no external service needed)
async def put_object(path: str, data: bytes, content_type: str) -> dict:
    file_id = await fs_bucket.upload_from_stream(
        path, data, metadata={"content_type": content_type}
    )
    return {"path": str(file_id), "size": len(data)}

async def get_object(path: str) -> tuple:
    grid_out = await fs_bucket.open_download_stream(ObjectId(path))
    data = await grid_out.read()
    content_type = (grid_out.metadata or {}).get("content_type", "application/octet-stream")
    return data, content_type

# Email notification functions
async def send_workflow_notification(
    recipient_email: str, 
    recipient_name: str,
    proposal_title: str, 
    proposal_id: str,
    stage: str,
    action: str,  # "assigned", "approved", "rejected", "returned"
    comment: Optional[str] = None
):
    """Send email notification for workflow stage transitions"""
    try:
        if not RESEND_API_KEY:
            logger.warning("RESEND_API_KEY not configured, skipping email notification")
            return
        
        # TEMPORARY FOR TESTING: Route all emails to Resend account owner (sandbox mode restriction)
        # TODO: Remove this override after domain verification
        original_recipient = recipient_email
        recipient_email = "aakashv2304@gmail.com"
        logger.info(f"[TEST MODE] Routing email from {original_recipient} to {recipient_email}")
        
        # Build subject based on action
        if action == "assigned":
            subject = f"New Proposal Assigned: {proposal_title}"
            action_text = f"A new proposal has been assigned to you for {stage} review"
        elif action == "approved":
            subject = f"Proposal Approved: {proposal_title}"
            action_text = f"The proposal has been approved at {stage}"
        elif action == "rejected":
            subject = f"Proposal Rejected: {proposal_title}"
            action_text = f"The proposal has been rejected at {stage}"
        elif action == "returned":
            subject = f"Proposal Returned for Revision: {proposal_title}"
            action_text = f"The proposal has been returned for revision from {stage}"
        else:
            action_text = f"Update on proposal at {stage}"
        
        # Build HTML email
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #F72585 0%, #7209B7 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }}
                .footer {{ background: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }}
                .btn {{ display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #F72585 0%, #7209B7 100%); color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .comment-box {{ background: white; padding: 15px; border-left: 4px solid #7209B7; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">Botree Roots</h1>
                    <p style="margin: 5px 0 0 0;">Proposal Workflow Notification</p>
                </div>
                <div class="content">
                    <p style="background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin-bottom: 20px;"><strong>🧪 TEST MODE:</strong> This email was originally intended for <strong>{original_recipient}</strong></p>
                    <h2 style="color: #7209B7;">Hello {recipient_name},</h2>
                    <p><strong>{action_text}</strong></p>
                    <p><strong>Proposal:</strong> {proposal_title}</p>
                    <p><strong>Stage:</strong> {stage}</p>
                    {f'<div class="comment-box"><strong>Comment:</strong><br>{comment}</div>' if comment else ''}
                    <p>Please log in to Botree Roots to review and take action on this proposal.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2026 Botree Software Solutions. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        params = {
            "from": SENDER_EMAIL,
            "to": [recipient_email],
            "subject": subject,
            "html": html_content
        }
        
        # Send email asynchronously (non-blocking)
        email_result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {recipient_email} for proposal {proposal_id} - Email ID: {email_result.get('id')}")
        return email_result
        
    except Exception as e:
        logger.error(f"Failed to send email notification: {str(e)}")
        # Don't raise exception - email failures shouldn't block workflow
        return None

# Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    department: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    department: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    department: str
    created_at: str

class AdditionalFee(BaseModel):
    name: str
    value: float

class Product(BaseModel):
    product_name: str
    users: Optional[str] = None
    price_per_user: Optional[float] = None
    minimum_billing: Optional[float] = None
    training: Optional[float] = None

class ProposalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    file_id: str
    products: Optional[List[Product]] = []
    customer_name: Optional[str] = None
    industry: Optional[str] = None
    comments: Optional[str] = None
    deal_value: Optional[float] = None
    one_time_setup_fee: Optional[float] = None
    integration_fee: Optional[float] = None
    additional_fees: Optional[List[AdditionalFee]] = []
    contract_years: Optional[int] = None
    price_escalation_percent: Optional[float] = None
    change_note: Optional[str] = None

class ProposalAction(BaseModel):
    comment: Optional[str] = None

# ============ Profitability Analyzer: hardcoded rate card ============
# Fixed monthly cost per role. Not editable via API - change here only.
ROLE_RATE_CARD = {
    "L1": 45000,
    "L2": 60000,
    "L3": 91000,
    "QA": 67738,
    "Dev": 87500,
    "Training": 40000,
    "PM": 136667,
    "Technical Manager": 162500,
    "Service Manager": 250000,
}

# L2 and L3 are auto-calculated from distributor count, not manually picked
MANUAL_ROLE_OPTIONS = [r for r in ROLE_RATE_CARD.keys() if r not in ("L2", "L3")]

# Per-distributor-per-month costs. These are product-specific - only applied
# to a line item when explicitly selected there (a deal for SFA alone should
# not also carry DMS/FlexiDMS costs).
PER_DISTRIBUTOR_MONTHLY_COSTS = {
    "AWS Cost": 120,
    "DMS License": 240,
    "SFA License": 80,
    "FlexiDMS License": 0,  # TODO: placeholder - update once the real rate is provided
}

# Required headcount per distributor - drives automatic L2/L3 cost, no allocation
# slider. Unlike the per-distributor costs above, these apply to every line
# item with a distributor count regardless of which product it is.
STAFFING_RATIO_PER_DISTRIBUTOR = {
    "L2": 0.000333,
    "L3": 0.000667,
}

class ResourceLine(BaseModel):
    role_name: str  # must be one of MANUAL_ROLE_OPTIONS
    allocation_percent: float  # e.g. 10, 20, ... 100

class RevenueLineItem(BaseModel):
    label: str  # e.g. product name, or "One-Time Setup", or a custom line
    revenue: Optional[float] = None
    is_subscription: bool = False  # only subscription lines show the distributor/L2-L3/license section in the UI
    reference_note: Optional[str] = None  # display-only info, e.g. "50 users" - no effect on calculation
    distributor_count: Optional[float] = None
    selected_distributor_costs: List[str] = []  # subset of PER_DISTRIBUTOR_MONTHLY_COSTS keys that apply to this line
    resource_lines: List[ResourceLine] = []

class ProfitabilityAnalysisCreate(BaseModel):
    title: str
    proposal_id: Optional[str] = None
    revenue_line_items: List[RevenueLineItem] = []
    notes: Optional[str] = None

class FinanceDetailsUpdate(BaseModel):
    about_customer: Optional[str] = None
    profitability: Optional[str] = None

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
    # File storage is MongoDB GridFS - no separate init step needed

async def seed_users():
    # Admin (super admin)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@botree.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    
    users_to_seed = [
        {"email": "admin@botree.co.in", "password": "Admin@123", "name": "System Admin", "role": "Admin", "department": "Admin"},
        {"email": "sales@botree.co.in", "password": "Sales@123", "name": "Sales User", "role": "Sales", "department": "Sales"},
        {"email": "varun.gupta@botree.co.in", "password": "Varun@123", "name": "Varun Gupta", "role": "CGO", "department": "CGO"},
        {"email": "aakash.vimalanathan@botree.co.in", "password": "Aakash@123", "name": "Aakash Vimalanathan", "role": "Finance", "department": "Finance"},
        {"email": "anakha.sajikumar@botree.co.in", "password": "Anakha@123", "name": "Anakha Sajikumar", "role": "Legal", "department": "Legal"},
        {"email": "chandra.prakash@botree.co.in", "password": "CP@123", "name": "Chandra Prakash", "role": "CFO", "department": "CFO"},
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
                "department": user_data["department"],
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"Seeded user: {user_data['email']}")
        else:
            # Update existing users with department field if missing
            update_fields = {}
            if "department" not in existing:
                update_fields["department"] = user_data["department"]
            if not verify_password(user_data["password"], existing["password_hash"]):
                update_fields["password_hash"] = hash_password(user_data["password"])
            if update_fields:
                await db.users.update_one(
                    {"email": user_data["email"]},
                    {"$set": update_fields}
                )
                logger.info(f"Updated user: {user_data['email']}")
    
    # (Removed: this used to write all seeded users' plaintext passwords to a
    # debug file on every startup - a security risk, and also the cause of
    # this container's crash since that directory doesn't exist here.)

# Auth endpoints
@api_router.post("/auth/login")
async def login(request: LoginRequest, response: Response):
    user = await db.users.find_one({"email": request.email.lower()})
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, user["email"])
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=604800, path="/")
    
    return {
        "id": user_id,
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "department": user.get("department", "")
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
    return [{"id": str(u["_id"]), "email": u["email"], "name": u["name"], "role": u["role"], "department": u.get("department", ""), "created_at": u["created_at"]} for u in users]

@api_router.post("/users")
async def create_user(user_data: UserCreate, request: Request):
    current_user = await get_current_user(request)
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can create users")
    
    # Validate department
    valid_departments = ["Sales", "CGO", "Finance", "Legal", "CFO", "Admin"]
    if user_data.department not in valid_departments:
        raise HTTPException(status_code=400, detail=f"Invalid department. Must be one of: {', '.join(valid_departments)}")
    
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    hashed = hash_password(user_data.password)
    new_user = {
        "email": user_data.email.lower(),
        "password_hash": hashed,
        "name": user_data.name,
        "role": user_data.role,
        "department": user_data.department,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(new_user)
    
    return {
        "id": str(result.inserted_id),
        "email": new_user["email"],
        "name": new_user["name"],
        "role": new_user["role"],
        "department": new_user["department"],
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
    
    result = await put_object(path, data, file.content_type or "application/octet-stream")
    
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
    
    data, content_type = await get_object(file_doc["storage_path"])
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
    
    now = datetime.now(timezone.utc)
    version_label = f"v1_{now.strftime('%Y-%m-%d')}"
    
    # Create first version
    version_data = {
        "version_number": 1,
        "version_label": version_label,
        "title": proposal.title,
        "description": proposal.description,
        "file_info": {
            "id": file_doc["id"],
            "filename": file_doc["original_filename"],
            "size": file_doc["size"],
            "storage_path": file_doc["storage_path"]
        },
        "products": [p.dict() for p in proposal.products] if proposal.products else [],
        "customer_name": proposal.customer_name,
        "industry": proposal.industry,
        "comments": proposal.comments,
        "deal_value": proposal.deal_value,
        "one_time_setup_fee": proposal.one_time_setup_fee,
        "integration_fee": proposal.integration_fee,
        "additional_fees": [f.dict() for f in proposal.additional_fees] if proposal.additional_fees else [],
        "contract_years": proposal.contract_years,
        "price_escalation_percent": proposal.price_escalation_percent,
        "created_by": current_user["id"],
        "created_at": now.isoformat(),
        "change_note": "Initial version"
    }
    
    new_proposal = {
        "title": proposal.title,
        "description": proposal.description,
        "status": "sales_submitted",
        "current_stage": 1,
        "current_version": 1,
        "is_closed": False,
        "created_by": current_user["id"],
        "file_info": version_data["file_info"],
        "products": [p.dict() for p in proposal.products] if proposal.products else [],
        "customer_name": proposal.customer_name,
        "industry": proposal.industry,
        "comments": proposal.comments,
        "deal_value": proposal.deal_value,
        "one_time_setup_fee": proposal.one_time_setup_fee,
        "integration_fee": proposal.integration_fee,
        "additional_fees": [f.dict() for f in proposal.additional_fees] if proposal.additional_fees else [],
        "contract_years": proposal.contract_years,
        "price_escalation_percent": proposal.price_escalation_percent,
        "versions": [version_data],
        "history": [{
            "action": "created",
            "by": {"id": current_user["id"], "name": current_user["name"], "role": current_user["role"]},
            "comment": "Proposal submitted",
            "version": 1,
            "timestamp": now.isoformat()
        }],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    result = await db.proposals.insert_one(new_proposal)
    proposal_id = str(result.inserted_id)
    logger.info(f"[EMAIL] New proposal '{proposal.title}' created by {current_user['name']} - CGO should be notified")
    
    # Notify CGO (next stage after Sales submission)
    cgo_user = await db.users.find_one(
        {"department": "CGO"},
        {"_id": 0, "email": 1, "name": 1}
    )
    if cgo_user:
        await send_workflow_notification(
            recipient_email=cgo_user["email"],
            recipient_name=cgo_user["name"],
            proposal_title=proposal.title,
            proposal_id=proposal_id,
            stage="CGO Review",
            action="assigned",
            comment=None
        )
    
    response_proposal = {
        "id": proposal_id,
        "title": new_proposal["title"],
        "description": new_proposal["description"],
        "status": new_proposal["status"],
        "current_stage": new_proposal["current_stage"],
        "current_version": new_proposal["current_version"],
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
            "current_version": p.get("current_version", 1),
            "is_closed": p.get("is_closed", False),
            "created_by": {"id": str(creator["_id"]), "name": creator["name"], "role": creator["role"]},
            "file_info": p["file_info"],
            "products": p.get("products", []),
            "customer_name": p.get("customer_name"),
            "industry": p.get("industry"),
            "comments": p.get("comments"),
            "deal_value": p.get("deal_value"),
            "one_time_setup_fee": p.get("one_time_setup_fee"),
            "integration_fee": p.get("integration_fee"),
            "additional_fees": p.get("additional_fees", []),
            "contract_years": p.get("contract_years"),
            "price_escalation_percent": p.get("price_escalation_percent"),
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
    
    response = {
        "id": str(proposal["_id"]),
        "title": proposal["title"],
        "description": proposal["description"],
        "status": proposal["status"],
        "current_stage": proposal["current_stage"],
        "current_version": proposal.get("current_version", 1),
        "is_closed": proposal.get("is_closed", False),
        "created_by": {"id": str(creator["_id"]), "name": creator["name"], "role": creator["role"]},
        "file_info": proposal["file_info"],
        "products": proposal.get("products", []),
        "customer_name": proposal.get("customer_name"),
        "industry": proposal.get("industry"),
        "comments": proposal.get("comments"),
        "deal_value": proposal.get("deal_value"),
        "one_time_setup_fee": proposal.get("one_time_setup_fee"),
        "integration_fee": proposal.get("integration_fee"),
        "additional_fees": proposal.get("additional_fees", []),
        "contract_years": proposal.get("contract_years"),
        "price_escalation_percent": proposal.get("price_escalation_percent"),
        "versions": proposal.get("versions", []),
        "history": proposal["history"],
        "created_at": proposal["created_at"],
        "updated_at": proposal["updated_at"]
    }

    # About the Customer & Profitability: Finance-entered, visible only to
    # Finance/CFO/Admin. Everyone else simply never receives these keys.
    if current_user["role"] in ("Finance", "CFO", "Admin"):
        response["about_customer"] = proposal.get("about_customer")
        response["profitability"] = proposal.get("profitability")

    return response

@api_router.get("/proposals/{proposal_id}/versions")
async def get_proposal_versions(proposal_id: str, request: Request):
    await get_current_user(request)
    
    proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    versions = proposal.get("versions", [])
    
    # Enrich each version with creator info
    enriched_versions = []
    for v in versions:
        creator = await db.users.find_one({"_id": ObjectId(v["created_by"])})
        creator_info = {"name": "Unknown", "role": "Unknown"}
        if creator:
            creator_info = {"name": creator["name"], "role": creator["role"]}
        
        enriched_versions.append({
            **v,
            "created_by": creator_info
        })
    
    return {"versions": enriched_versions}

@api_router.post("/proposals/{proposal_id}/restore-version")
async def restore_version(proposal_id: str, version_number: int, request: Request):
    """Restore a previous version by creating a new version with old content"""
    current_user = await get_current_user(request)
    
    if current_user["role"] != "Sales":
        raise HTTPException(status_code=403, detail="Only Sales can restore versions")
    
    proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    if proposal["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only restore your own proposals")
    
    if proposal["status"] != "needs_revision":
        raise HTTPException(status_code=400, detail="Can only restore versions for proposals that need revision")
    
    if proposal.get("is_closed", False):
        raise HTTPException(status_code=400, detail="Cannot restore a closed/rejected proposal")
    
    # Find the version to restore
    versions = proposal.get("versions", [])
    version_to_restore = None
    for v in versions:
        if v["version_number"] == version_number:
            version_to_restore = v
            break
    
    if not version_to_restore:
        raise HTTPException(status_code=404, detail=f"Version {version_number} not found")
    
    now = datetime.now(timezone.utc)
    new_version_number = proposal.get("current_version", 1) + 1
    version_label = f"v{new_version_number}_{now.strftime('%Y-%m-%d')}"
    
    # Create new version from old version content
    new_version = {
        "version_number": new_version_number,
        "version_label": version_label,
        "title": version_to_restore["title"],
        "description": version_to_restore["description"],
        "file_info": version_to_restore["file_info"],
        "one_time": version_to_restore.get("one_time"),
        "product": version_to_restore.get("product"),
        "users": version_to_restore.get("users"),
        "rate": version_to_restore.get("rate"),
        "customer_name": version_to_restore.get("customer_name"),
        "industry": version_to_restore.get("industry"),
        "comments": version_to_restore.get("comments"),
        "deal_value": version_to_restore.get("deal_value"),
        "created_by": current_user["id"],
        "created_at": now.isoformat(),
        "change_note": f"Restored from {version_to_restore['version_label']}"
    }
    
    history_entry = {
        "action": "restored_version",
        "by": {"id": current_user["id"], "name": current_user["name"], "role": current_user["role"]},
        "comment": f"Restored from {version_to_restore['version_label']} to {version_label}",
        "version": new_version_number,
        "timestamp": now.isoformat()
    }
    
    # Update proposal with restored version and reset to first stage
    await db.proposals.update_one(
        {"_id": ObjectId(proposal_id)},
        {
            "$set": {
                "title": new_version["title"],
                "description": new_version["description"],
                "status": "sales_submitted",
                "current_stage": 1,
                "current_version": new_version_number,
                "file_info": new_version["file_info"],
                "one_time": new_version["one_time"],
                "product": new_version["product"],
                "users": new_version["users"],
                "rate": new_version["rate"],
                "customer_name": new_version["customer_name"],
                "industry": new_version["industry"],
                "comments": new_version["comments"],
                "deal_value": new_version["deal_value"],
                "updated_at": now.isoformat()
            },
            "$push": {
                "history": history_entry,
                "versions": new_version
            }
        }
    )
    
    logger.info(f"[EMAIL] Proposal '{new_version['title']}' restored to {version_label} by {current_user['name']}")
    
    return {"message": f"Version restored successfully as {version_label}", "version": version_label}

@api_router.get("/proposals/{proposal_id}/versions/{version_number}/download-pdf")
async def download_version_pdf(proposal_id: str, version_number: int, request: Request):
    """Generate and download a PDF of a specific proposal version"""
    current_user = await get_current_user(request)
    
    proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Find the specific version
    versions = proposal.get("versions", [])
    version = None
    for v in versions:
        if v["version_number"] == version_number:
            version = v
            break
    
    if not version:
        raise HTTPException(status_code=404, detail=f"Version {version_number} not found")
    
    # Get creator info
    creator = await db.users.find_one({"_id": ObjectId(version["created_by"])})
    creator_name = creator["name"] if creator else "Unknown"
    creator_role = creator["role"] if creator else "Unknown"
    
    # Create PDF in memory
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    # Container for PDF elements
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        fontName=UNICODE_FONT_BOLD,
        textColor=colors.HexColor('#1F2937'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        fontName=UNICODE_FONT_BOLD,
        textColor=colors.HexColor('#4B5563'),
        spaceAfter=12,
        spaceBefore=12
    )
    normal_style = styles['Normal']
    
    # Title
    elements.append(Paragraph("Proposal Document", title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Version Badge
    version_table = Table([[f"Version: {version['version_label']}"]], colWidths=[6*inch])
    version_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#6366F1')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(version_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Main content table
    data = [
        ['Field', 'Value'],
        ['Title', version['title']],
        ['Description', version.get('description') or 'N/A'],
        ['Customer Name', version.get('customer_name', 'N/A')],
        ['Industry', version.get('industry', 'N/A')],
        ['Deal Value (INR)', f"₹{version['deal_value']:,.2f}" if version.get('deal_value') else 'N/A'],
        ['One-Time Setup (INR)', f"₹{version['one_time_setup_fee']:,.2f}" if version.get('one_time_setup_fee') else 'N/A'],
        ['Integration (INR)', f"₹{version['integration_fee']:,.2f}" if version.get('integration_fee') else 'N/A'],
        ['Comments', version.get('comments', 'N/A')],
    ]
    
    table = Table(data, colWidths=[2*inch, 4*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E5E7EB')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1F2937')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), UNICODE_FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#F9FAFB')),
        ('FONTNAME', (0, 1), (0, -1), UNICODE_FONT_BOLD),
        ('FONTNAME', (1, 1), (1, -1), UNICODE_FONT),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#D1D5DB')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 0.3*inch))

    # Extra Charges section
    extra_charges = version.get('additional_fees', [])
    if extra_charges:
        elements.append(Paragraph("Extra Charges", heading_style))
        fee_data = [['Charge', 'Amount (INR)']] + [
            [f['name'], f"₹{f['value']:,.2f}"] for f in extra_charges
        ]
        fee_table = Table(fee_data, colWidths=[3*inch, 3*inch])
        fee_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E5E7EB')),
            ('FONTNAME', (0, 0), (-1, 0), UNICODE_FONT_BOLD),
            ('FONTNAME', (0, 1), (-1, -1), UNICODE_FONT),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#D1D5DB')),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(fee_table)
        elements.append(Spacer(1, 0.3*inch))

    # Products section
    products_list = version.get('products', [])
    if products_list:
        elements.append(Paragraph("Products", heading_style))
        product_data = [['Product', 'Users', 'Price/User/Month', 'Min. Billing/Month', 'Training']]
        for prod in products_list:
            product_data.append([
                prod.get('product_name', 'N/A'),
                prod.get('users') or 'N/A',
                f"₹{prod['price_per_user']:,.2f}" if prod.get('price_per_user') else 'N/A',
                f"₹{prod['minimum_billing']:,.2f}" if prod.get('minimum_billing') else 'N/A',
                f"₹{prod['training']:,.2f}" if prod.get('training') else 'N/A',
            ])
        product_table = Table(product_data, colWidths=[1.6*inch, 1*inch, 1.4*inch, 1.4*inch, 1*inch])
        product_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E5E7EB')),
            ('FONTNAME', (0, 0), (-1, 0), UNICODE_FONT_BOLD),
            ('FONTNAME', (0, 1), (-1, -1), UNICODE_FONT),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#D1D5DB')),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(product_table)
        elements.append(Spacer(1, 0.3*inch))
    
    # Metadata section
    elements.append(Paragraph("Version Metadata", heading_style))
    
    metadata_data = [
        ['Created By', f"{creator_name} ({creator_role})"],
        ['Created On', datetime.fromisoformat(version['created_at'].replace('Z', '+00:00')).strftime('%B %d, %Y at %I:%M %p')],
        ['Change Note', version.get('change_note', 'N/A')],
        ['File Name', version['file_info']['filename']],
    ]
    
    metadata_table = Table(metadata_data, colWidths=[2*inch, 4*inch])
    metadata_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F3F4F6')),
        ('FONTNAME', (0, 0), (0, -1), UNICODE_FONT_BOLD),
        ('FONTNAME', (1, 0), (1, -1), UNICODE_FONT),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#D1D5DB')),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(metadata_table)
    
    # Footer
    elements.append(Spacer(1, 0.5*inch))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#6B7280'),
        alignment=TA_CENTER
    )
    elements.append(Paragraph(f"Generated on {datetime.now(timezone.utc).strftime('%B %d, %Y at %I:%M %p UTC')}", footer_style))
    elements.append(Paragraph("Botree Software - Proposal Tracker", footer_style))
    
    # Build PDF
    doc.build(elements)
    
    # Get PDF content
    buffer.seek(0)
    pdf_content = buffer.getvalue()
    buffer.close()
    
    # Return as downloadable file
    filename = f"proposal_{version['version_label']}_{proposal['title'][:30].replace(' ', '_')}.pdf"
    
    return StreamingResponse(
        BytesIO(pdf_content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

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
        raise HTTPException(status_code=400, detail="Can only edit proposals that need revision")
    
    # Check if proposal is closed
    if existing_proposal.get("is_closed", False):
        raise HTTPException(status_code=400, detail="Cannot edit a closed/rejected proposal")
    
    # Verify new file if provided
    file_doc = await db.files.find_one({"id": proposal.file_id, "is_deleted": False})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    now = datetime.now(timezone.utc)
    new_version_number = existing_proposal.get("current_version", 1) + 1
    version_label = f"v{new_version_number}_{now.strftime('%Y-%m-%d')}"

    # The revision form doesn't resend products/fees - preserve whatever was
    # already on the proposal rather than wiping it out with empty defaults.
    products_data = [p.dict() for p in proposal.products] if proposal.products else existing_proposal.get("products", [])
    one_time_setup_fee = proposal.one_time_setup_fee if proposal.one_time_setup_fee is not None else existing_proposal.get("one_time_setup_fee")
    integration_fee = proposal.integration_fee if proposal.integration_fee is not None else existing_proposal.get("integration_fee")
    additional_fees_data = [f.dict() for f in proposal.additional_fees] if proposal.additional_fees else existing_proposal.get("additional_fees", [])
    contract_years = proposal.contract_years if proposal.contract_years is not None else existing_proposal.get("contract_years")
    price_escalation_percent = proposal.price_escalation_percent if proposal.price_escalation_percent is not None else existing_proposal.get("price_escalation_percent")

    # Create new version
    new_version = {
        "version_number": new_version_number,
        "version_label": version_label,
        "title": proposal.title,
        "description": proposal.description,
        "file_info": {
            "id": file_doc["id"],
            "filename": file_doc["original_filename"],
            "size": file_doc["size"],
            "storage_path": file_doc["storage_path"]
        },
        "products": products_data,
        "customer_name": proposal.customer_name,
        "industry": proposal.industry,
        "comments": proposal.comments,
        "deal_value": proposal.deal_value,
        "one_time_setup_fee": one_time_setup_fee,
        "integration_fee": integration_fee,
        "additional_fees": additional_fees_data,
        "contract_years": contract_years,
        "price_escalation_percent": price_escalation_percent,
        "created_by": current_user["id"],
        "created_at": now.isoformat(),
        "change_note": proposal.change_note or "Revised after review feedback"
    }
    
    history_entry = {
        "action": "updated",
        "by": {"id": current_user["id"], "name": current_user["name"], "role": current_user["role"]},
        "comment": f"Proposal updated to {version_label} and resubmitted",
        "version": new_version_number,
        "timestamp": now.isoformat()
    }
    
    # Update proposal with new version and reset to first stage
    await db.proposals.update_one(
        {"_id": ObjectId(proposal_id)},
        {
            "$set": {
                "title": proposal.title,
                "description": proposal.description,
                "status": "sales_submitted",
                "current_stage": 1,
                "current_version": new_version_number,
                "file_info": new_version["file_info"],
                "products": products_data,
                "customer_name": proposal.customer_name,
                "industry": proposal.industry,
                "comments": proposal.comments,
                "deal_value": proposal.deal_value,
                "one_time_setup_fee": one_time_setup_fee,
                "integration_fee": integration_fee,
                "additional_fees": additional_fees_data,
                "contract_years": contract_years,
                "price_escalation_percent": price_escalation_percent,
                "updated_at": now.isoformat()
            },
            "$push": {
                "history": history_entry,
                "versions": new_version
            }
        }
    )
    
    logger.info(f"[EMAIL] Proposal '{proposal.title}' updated to {version_label} by {current_user['name']} - CGO should be notified")
    
    return {"message": f"Proposal updated to {version_label} and resubmitted successfully", "version": version_label}

@api_router.patch("/proposals/{proposal_id}/finance-details")
async def update_finance_details(proposal_id: str, details: FinanceDetailsUpdate, request: Request):
    """Finance-only fields: About the Customer & Profitability.
    Only editable by Finance, and only while the proposal is sitting at the
    Finance review stage. Visible later to Finance/CFO/Admin only (see get_proposal)."""
    current_user = await get_current_user(request)

    if current_user["role"] != "Finance":
        raise HTTPException(status_code=403, detail="Only Finance can edit these fields")

    proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    finance_stage_index = next(i for i, s in enumerate(WORKFLOW_STAGES) if s["key"] == "finance_review")
    if proposal["current_stage"] != finance_stage_index:
        raise HTTPException(status_code=403, detail="These fields can only be edited while the proposal is at the Finance stage")

    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if details.about_customer is not None:
        update_fields["about_customer"] = details.about_customer
    if details.profitability is not None:
        update_fields["profitability"] = details.profitability

    await db.proposals.update_one({"_id": ObjectId(proposal_id)}, {"$set": update_fields})
    return {"message": "Finance details saved"}

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
    
    current_version = proposal.get("current_version", 1)
    
    history_entry = {
        "action": "approved",
        "by": {"id": current_user["id"], "name": current_user["name"], "role": current_user["role"]},
        "comment": action.comment or "Approved",
        "version": current_version,
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
    
    # Send email notification
    if new_status == "approved":
        logger.info(f"[EMAIL] Proposal '{proposal['title']}' fully approved by {current_user['name']}")
        # Notify proposal creator
        creator = await db.users.find_one({"_id": ObjectId(proposal["created_by"])}, {"_id": 0})
        if creator:
            await send_workflow_notification(
                recipient_email=creator["email"],
                recipient_name=creator["name"],
                proposal_title=proposal["title"],
                proposal_id=proposal_id,
                stage="Final Approval",
                action="approved",
                comment=action.comment
            )
    else:
        next_role = WORKFLOW_STAGES[next_stage]["role"]
        logger.info(f"[EMAIL] Proposal '{proposal['title']}' approved by {current_user['name']} - moving to {next_role}")
        
        # Find next approver by department/role
        next_approver = await db.users.find_one(
            {"department": next_role},
            {"_id": 0, "email": 1, "name": 1}
        )
        if next_approver:
            await send_workflow_notification(
                recipient_email=next_approver["email"],
                recipient_name=next_approver["name"],
                proposal_title=proposal["title"],
                proposal_id=proposal_id,
                stage=WORKFLOW_STAGES[next_stage]["label"],
                action="assigned",
                comment=action.comment
            )
    
    return {"message": "Proposal approved", "new_status": new_status}

@api_router.post("/proposals/{proposal_id}/reject")
async def reject_proposal(proposal_id: str, action: ProposalAction, request: Request):
    """Permanently close/reject a proposal - cannot be reopened"""
    current_user = await get_current_user(request)
    
    if not action.comment or not action.comment.strip():
        raise HTTPException(status_code=400, detail="Rejection comment is mandatory")
    
    proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    current_stage = proposal["current_stage"]
    stage_info = WORKFLOW_STAGES[current_stage]
    
    if stage_info["role"] != current_user["role"]:
        raise HTTPException(status_code=403, detail="Not your turn to reject")
    
    current_version = proposal.get("current_version", 1)
    
    history_entry = {
        "action": "rejected_closed",
        "by": {"id": current_user["id"], "name": current_user["name"], "role": current_user["role"]},
        "comment": action.comment,
        "version": current_version,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.proposals.update_one(
        {"_id": ObjectId(proposal_id)},
        {
            "$set": {
                "status": "rejected",
                "is_closed": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"history": history_entry}
        }
    )
    
    # Notify proposal creator
    creator = await db.users.find_one({"_id": ObjectId(proposal["created_by"])}, {"_id": 0})
    logger.info(f"[EMAIL] Proposal '{proposal['title']}' permanently rejected by {current_user['name']}")
    
    if creator:
        await send_workflow_notification(
            recipient_email=creator["email"],
            recipient_name=creator["name"],
            proposal_title=proposal["title"],
            proposal_id=proposal_id,
            stage=stage_info["label"],
            action="rejected",
            comment=action.comment
        )
    
    return {"message": "Proposal rejected and closed permanently", "new_status": "rejected"}

@api_router.post("/proposals/{proposal_id}/return-for-revision")
async def return_for_revision(proposal_id: str, action: ProposalAction, request: Request):
    """Return proposal to Sales for revision - can be edited and resubmitted"""
    current_user = await get_current_user(request)
    
    if not action.comment or not action.comment.strip():
        raise HTTPException(status_code=400, detail="Revision notes are mandatory when returning for revision")
    
    proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    current_stage = proposal["current_stage"]
    stage_info = WORKFLOW_STAGES[current_stage]
    
    if stage_info["role"] != current_user["role"]:
        raise HTTPException(status_code=403, detail="Not your turn to return for revision")
    
    current_version = proposal.get("current_version", 1)
    
    history_entry = {
        "action": "returned_for_revision",
        "by": {"id": current_user["id"], "name": current_user["name"], "role": current_user["role"]},
        "comment": action.comment,
        "version": current_version,
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
    
    # Notify proposal creator
    creator = await db.users.find_one({"_id": ObjectId(proposal["created_by"])}, {"_id": 0})
    logger.info(f"[EMAIL] Proposal '{proposal['title']}' returned for revision by {current_user['name']} to {creator['name']}")
    
    if creator:
        await send_workflow_notification(
            recipient_email=creator["email"],
            recipient_name=creator["name"],
            proposal_title=proposal["title"],
            proposal_id=proposal_id,
            stage=stage_info["label"],
            action="returned",
            comment=action.comment
        )
    
    return {"message": "Proposal returned to Sales for revision", "new_status": "needs_revision"}

@api_router.get("/proposals/{proposal_id}/download")
async def download_proposal_file(proposal_id: str, request: Request):
    await get_current_user(request)
    
    proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    file_info = proposal["file_info"]
    data, content_type = await get_object(file_info["storage_path"])
    
    return FastAPIResponse(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={file_info['filename']}"}
    )

# Analytics endpoints
@api_router.get("/analytics/stage-counts")
async def get_stage_counts(request: Request):
    await get_current_user(request)
    
    # Count proposals by stage
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    results = await db.proposals.aggregate(pipeline).to_list(None)
    
    # Map to readable counts
    counts = {
        "draft": 0,
        "sales_submitted": 0,
        "cgo_review": 0,
        "finance_review": 0,
        "legal_review": 0,
        "cfo_review": 0,
        "approved": 0,
        "needs_revision": 0
    }
    
    for r in results:
        if r["_id"] in counts:
            counts[r["_id"]] = r["count"]
    
    # Calculate active (non-approved, non-revision)
    active_count = sum(counts[key] for key in ["sales_submitted", "cgo_review", "finance_review", "legal_review", "cfo_review"])
    
    return {
        "draft": counts["draft"],
        "under_review": active_count,
        "approved": counts["approved"],
        "needs_revision": counts["needs_revision"],
        "by_stage": counts
    }

@api_router.get("/analytics/approval-rate")
async def get_approval_rate(request: Request):
    await get_current_user(request)
    
    total = await db.proposals.count_documents({})
    approved = await db.proposals.count_documents({"status": "approved"})
    
    approval_percentage = (approved / total * 100) if total > 0 else 0
    
    return {
        "total_proposals": total,
        "approved_count": approved,
        "approval_percentage": round(approval_percentage, 1)
    }

@api_router.get("/analytics/bottlenecks")
async def get_bottlenecks(request: Request):
    await get_current_user(request)
    
    # Find proposals that have been in the same stage for > 7 days
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    bottleneck_proposals = await db.proposals.find({
        "status": {"$nin": ["approved", "needs_revision"]},
        "updated_at": {"$lt": seven_days_ago}
    }).to_list(100)
    
    bottlenecks = []
    for p in bottleneck_proposals:
        creator = await db.users.find_one({"_id": ObjectId(p["created_by"])})
        if not creator:
            creator = {"name": "Unknown", "role": "Unknown"}
        
        # Calculate days stuck
        updated = datetime.fromisoformat(p["updated_at"].replace("Z", "+00:00"))
        days_stuck = (datetime.now(timezone.utc) - updated).days
        
        bottlenecks.append({
            "id": str(p["_id"]),
            "title": p["title"],
            "status": p["status"],
            "current_stage": p["current_stage"],
            "created_by": creator["name"],
            "days_stuck": days_stuck
        })
    
    return {"bottlenecks": bottlenecks}

@api_router.get("/analytics/activity-feed")
async def get_activity_feed(request: Request):
    await get_current_user(request)
    
    # Get recent 20 proposals with history
    proposals = await db.proposals.find({}).sort("updated_at", -1).limit(20).to_list(20)
    
    activities = []
    for p in proposals:
        # Get the most recent history entry
        if p.get("history") and len(p["history"]) > 0:
            latest_history = p["history"][-1]
            activities.append({
                "proposal_id": str(p["_id"]),
                "proposal_title": p["title"],
                "action": latest_history["action"],
                "by": latest_history["by"],
                "comment": latest_history.get("comment", ""),
                "timestamp": latest_history["timestamp"]
            })
    
    return {"activities": activities[:15]}

@api_router.get("/analytics/throughput")
async def get_throughput(request: Request):
    await get_current_user(request)
    
    # Count proposals approved in last 30 days
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    approved_count = await db.proposals.count_documents({
        "status": "approved",
        "updated_at": {"$gte": thirty_days_ago}
    })
    
    # Calculate proposals per day
    throughput_per_day = round(approved_count / 30, 1)
    
    # Generate sparkline data (last 30 days)
    sparkline = []
    for i in range(29, -1, -1):
        day_start = (datetime.now(timezone.utc) - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        day_end = (datetime.now(timezone.utc) - timedelta(days=i)).replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
        
        day_count = await db.proposals.count_documents({
            "status": "approved",
            "updated_at": {"$gte": day_start, "$lte": day_end}
        })
        sparkline.append(day_count)
    
    return {
        "approved_last_30_days": approved_count,
        "throughput_per_day": throughput_per_day,
        "sparkline": sparkline
    }

@api_router.get("/analytics/sla-health")
async def get_sla_health(request: Request):
    await get_current_user(request)
    
    # Find proposals in review for > 3 days (critical SLA)
    three_days_ago = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    one_day_ago = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    
    critical_count = await db.proposals.count_documents({
        "status": {"$nin": ["approved", "needs_revision"]},
        "updated_at": {"$lt": three_days_ago}
    })
    
    warning_count = await db.proposals.count_documents({
        "status": {"$nin": ["approved", "needs_revision"]},
        "updated_at": {"$gte": three_days_ago, "$lt": one_day_ago}
    })
    
    total_active = await db.proposals.count_documents({
        "status": {"$nin": ["approved", "needs_revision"]}
    })
    
    health_percentage = ((total_active - critical_count) / total_active * 100) if total_active > 0 else 100
    
    return {
        "critical_count": critical_count,
        "warning_count": warning_count,
        "total_active": total_active,
        "health_percentage": round(health_percentage, 1)
    }

@api_router.get("/analytics/deal-value-summary")
async def get_deal_value_summary(request: Request):
    await get_current_user(request)
    
    # Calculate total deal value for active proposals
    pipeline = [
        {"$match": {"status": {"$nin": ["approved", "needs_revision"]}, "deal_value": {"$ne": None}}},
        {"$group": {"_id": None, "total_value": {"$sum": "$deal_value"}}}
    ]
    
    result = await db.proposals.aggregate(pipeline).to_list(1)
    active_value = result[0]["total_value"] if result else 0
    
    # Calculate total approved value
    pipeline_approved = [
        {"$match": {"status": "approved", "deal_value": {"$ne": None}}},
        {"$group": {"_id": None, "total_value": {"$sum": "$deal_value"}}}
    ]
    
    result_approved = await db.proposals.aggregate(pipeline_approved).to_list(1)
    approved_value = result_approved[0]["total_value"] if result_approved else 0
    
    return {
        "active_pipeline_value": active_value,
        "approved_value": approved_value,
        "total_value": active_value + approved_value
    }

@api_router.get("/analytics/monthly-proposals")
async def get_monthly_proposals(request: Request, year: int = None, month: int = None):
    """Get proposal counts for a specific month"""
    await get_current_user(request)
    
    # Default to current month if not specified
    now = datetime.now(timezone.utc)
    target_year = year if year else now.year
    target_month = month if month else now.month
    
    # Calculate start and end of target month
    start_of_month = datetime(target_year, target_month, 1, tzinfo=timezone.utc)
    
    # Calculate end of month
    if target_month == 12:
        end_of_month = datetime(target_year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_of_month = datetime(target_year, target_month + 1, 1, tzinfo=timezone.utc)
    
    # If current month, use current date as end
    if target_year == now.year and target_month == now.month:
        end_of_month = now
    
    # Count proposals created in this month
    total_proposals = await db.proposals.count_documents({
        "created_at": {
            "$gte": start_of_month.isoformat(),
            "$lt": end_of_month.isoformat()
        }
    })
    
    # Count by status
    pipeline = [
        {
            "$match": {
                "created_at": {
                    "$gte": start_of_month.isoformat(),
                    "$lt": end_of_month.isoformat()
                }
            }
        },
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }
        }
    ]
    
    results = await db.proposals.aggregate(pipeline).to_list(None)
    
    status_counts = {
        "sales_submitted": 0,
        "cgo_review": 0,
        "finance_review": 0,
        "legal_review": 0,
        "cfo_review": 0,
        "approved": 0,
        "needs_revision": 0,
        "rejected": 0
    }
    
    for r in results:
        if r["_id"] in status_counts:
            status_counts[r["_id"]] = r["count"]
    
    # Calculate active proposals
    active_count = sum(status_counts[key] for key in ["sales_submitted", "cgo_review", "finance_review", "legal_review", "cfo_review"])
    
    return {
        "year": target_year,
        "month": target_month,
        "month_name": start_of_month.strftime("%B %Y"),
        "total_proposals": total_proposals,
        "active_proposals": active_count,
        "approved": status_counts["approved"],
        "rejected": status_counts["rejected"],
        "needs_revision": status_counts["needs_revision"],
        "by_status": status_counts,
        "is_current_month": (target_year == now.year and target_month == now.month)
    }

# ============ Profitability Analyzer ============
# Standalone tool, visible to every role by default. Not gated by the
# approval workflow. Can optionally attach to a proposal for reference.

def _compute_line_item(line_item: dict) -> dict:
    # Manual resource lines: role_name looked up against the fixed rate card,
    # allocation % still adjustable per line by the user
    resolved_lines = []
    manual_cost = 0.0
    for rl in line_item.get("resource_lines", []):
        role = rl.get("role_name")
        monthly_cost = ROLE_RATE_CARD.get(role, 0)
        pct = rl.get("allocation_percent") or 0
        line_cost = monthly_cost * pct / 100
        manual_cost += line_cost
        resolved_lines.append({
            "role_name": role,
            "monthly_cost": monthly_cost,
            "allocation_percent": pct,
            "cost": line_cost,
        })

    # Distributor-driven costs: L2/L3 are fully automatic (apply regardless of
    # which product this is), while AWS/DMS/SFA/FlexiDMS only apply if this
    # line item explicitly selected them - a deal for SFA alone shouldn't
    # also carry DMS or FlexiDMS costs.
    distributor_count = line_item.get("distributor_count") or 0
    selected_costs = line_item.get("selected_distributor_costs", []) or []
    auto_costs = None
    auto_total = 0.0
    if distributor_count:
        l2_required = distributor_count * STAFFING_RATIO_PER_DISTRIBUTOR["L2"]
        l3_required = distributor_count * STAFFING_RATIO_PER_DISTRIBUTOR["L3"]
        l2_cost = l2_required * ROLE_RATE_CARD["L2"]
        l3_cost = l3_required * ROLE_RATE_CARD["L3"]

        license_costs = {}
        license_total = 0.0
        for cost_name in selected_costs:
            if cost_name in PER_DISTRIBUTOR_MONTHLY_COSTS:
                cost_value = distributor_count * PER_DISTRIBUTOR_MONTHLY_COSTS[cost_name]
                license_costs[cost_name] = cost_value
                license_total += cost_value

        auto_total = l2_cost + l3_cost + license_total
        auto_costs = {
            "l2_required": round(l2_required, 4),
            "l2_cost": l2_cost,
            "l3_required": round(l3_required, 4),
            "l3_cost": l3_cost,
            "license_costs": license_costs,
        }

    total_cost = manual_cost + auto_total
    revenue = line_item.get("revenue")
    profit = (revenue - total_cost) if revenue is not None else None
    margin_percent = (profit / revenue * 100) if (revenue and profit is not None) else None

    return {
        "resource_lines": resolved_lines,
        "distributor_count": distributor_count if distributor_count else None,
        "selected_distributor_costs": selected_costs,
        "auto_costs": auto_costs,
        "cost": total_cost,
        "profit": profit,
        "margin_percent": margin_percent,
    }

def _compute_profitability(revenue_line_items: List[dict]) -> dict:
    items_out = []
    total_revenue = 0.0
    total_cost = 0.0
    any_revenue_set = False

    for item in revenue_line_items:
        computed = _compute_line_item(item)
        items_out.append({**item, **computed})
        total_cost += computed["cost"]
        if item.get("revenue") is not None:
            total_revenue += item["revenue"]
            any_revenue_set = True

    total_profit = (total_revenue - total_cost) if any_revenue_set else None
    total_margin_percent = (total_profit / total_revenue * 100) if (any_revenue_set and total_revenue) else None

    return {
        "line_items": items_out,
        "total_revenue": total_revenue if any_revenue_set else None,
        "total_cost": total_cost,
        "total_profit": total_profit,
        "total_margin_percent": total_margin_percent,
    }

@api_router.get("/profitability-analyses/rate-card")
async def get_rate_card(request: Request):
    await get_current_user(request)
    return {
        "roles": {role: ROLE_RATE_CARD[role] for role in MANUAL_ROLE_OPTIONS},
        "auto_roles": {"L2": ROLE_RATE_CARD["L2"], "L3": ROLE_RATE_CARD["L3"]},
        "per_distributor_costs": PER_DISTRIBUTOR_MONTHLY_COSTS,
        "staffing_ratios": STAFFING_RATIO_PER_DISTRIBUTOR,
    }

def _validate_resource_roles(revenue_line_items):
    for item in revenue_line_items:
        for rl in item.resource_lines:
            if rl.role_name not in MANUAL_ROLE_OPTIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"'{rl.role_name}' is not a valid role. Valid roles: {', '.join(MANUAL_ROLE_OPTIONS)}"
                )

@api_router.post("/profitability-analyses")
async def create_profitability_analysis(analysis: ProfitabilityAnalysisCreate, request: Request):
    current_user = await get_current_user(request)
    _validate_resource_roles(analysis.revenue_line_items)

    if analysis.proposal_id:
        proposal = await db.proposals.find_one({"_id": ObjectId(analysis.proposal_id)})
        if not proposal:
            raise HTTPException(status_code=404, detail="Linked proposal not found")

    line_items_data = [li.dict() for li in analysis.revenue_line_items]
    computed = _compute_profitability(line_items_data)
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "title": analysis.title,
        "proposal_id": analysis.proposal_id,
        "revenue_line_items": computed["line_items"],
        "notes": analysis.notes,
        "total_revenue": computed["total_revenue"],
        "total_cost": computed["total_cost"],
        "profit": computed["total_profit"],
        "margin_percent": computed["total_margin_percent"],
        "created_by": {"id": current_user["id"], "name": current_user["name"], "role": current_user["role"]},
        "created_at": now,
        "updated_at": now,
    }
    result = await db.profitability_analyses.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    del doc["_id"]
    return doc

@api_router.get("/profitability-analyses")
async def list_profitability_analyses(request: Request, proposal_id: Optional[str] = None):
    await get_current_user(request)  # any authenticated role can view

    query = {}
    if proposal_id:
        query["proposal_id"] = proposal_id

    items = await db.profitability_analyses.find(query).sort("created_at", -1).to_list(1000)
    for item in items:
        item["id"] = str(item["_id"])
        del item["_id"]
    return items

@api_router.get("/profitability-analyses/{analysis_id}")
async def get_profitability_analysis(analysis_id: str, request: Request):
    await get_current_user(request)

    item = await db.profitability_analyses.find_one({"_id": ObjectId(analysis_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Analysis not found")
    item["id"] = str(item["_id"])
    del item["_id"]
    return item

@api_router.put("/profitability-analyses/{analysis_id}")
async def update_profitability_analysis(analysis_id: str, analysis: ProfitabilityAnalysisCreate, request: Request):
    current_user = await get_current_user(request)
    _validate_resource_roles(analysis.revenue_line_items)

    existing = await db.profitability_analyses.find_one({"_id": ObjectId(analysis_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if existing["created_by"]["id"] != current_user["id"] and current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only the creator or an Admin can edit this analysis")

    if analysis.proposal_id:
        proposal = await db.proposals.find_one({"_id": ObjectId(analysis.proposal_id)})
        if not proposal:
            raise HTTPException(status_code=404, detail="Linked proposal not found")

    line_items_data = [li.dict() for li in analysis.revenue_line_items]
    computed = _compute_profitability(line_items_data)

    update_fields = {
        "title": analysis.title,
        "proposal_id": analysis.proposal_id,
        "revenue_line_items": computed["line_items"],
        "notes": analysis.notes,
        "total_revenue": computed["total_revenue"],
        "total_cost": computed["total_cost"],
        "profit": computed["total_profit"],
        "margin_percent": computed["total_margin_percent"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.profitability_analyses.update_one({"_id": ObjectId(analysis_id)}, {"$set": update_fields})
    return {"message": "Analysis updated"}

@api_router.delete("/profitability-analyses/{analysis_id}")
async def delete_profitability_analysis(analysis_id: str, request: Request):
    current_user = await get_current_user(request)

    existing = await db.profitability_analyses.find_one({"_id": ObjectId(analysis_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if existing["created_by"]["id"] != current_user["id"] and current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only the creator or an Admin can delete this analysis")

    await db.profitability_analyses.delete_one({"_id": ObjectId(analysis_id)})
    return {"message": "Analysis deleted"}

app.include_router(api_router)

_cors_origins_raw = os.environ.get('CORS_ORIGINS', 'http://localhost:3000')
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o.strip() for o in _cors_origins_raw.split(',') if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# --- Serve the built React frontend from this same app (same-origin: no CORS/cookie issues) ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

FRONTEND_BUILD_DIR = ROOT_DIR / "static"

if FRONTEND_BUILD_DIR.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_BUILD_DIR / "static"), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Never intercept API routes (already handled above by api_router)
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = FRONTEND_BUILD_DIR / full_path
        if full_path and candidate.exists() and candidate.is_file():
            return FileResponse(candidate)
        # Fallback to index.html for React Router (client-side routing)
        return FileResponse(FRONTEND_BUILD_DIR / "index.html")
