# 🔐 Botree Proposal Tracker - All User Credentials

## Demo User Accounts

### 👤 Sales User
- **Email**: `sales@botree.com`
- **Password**: `Sales@123`
- **Role**: Sales
- **Permissions**: Create proposals, Edit own proposals (when returned), View own proposals

### 👤 CGO User
- **Email**: `cgo@botree.com`
- **Password**: `CGO@123`
- **Role**: CGO (Chief Growth Officer)
- **Permissions**: Approve/Return/Reject proposals at CGO stage

### 👤 Finance User (Super Admin)
- **Email**: `finance@botree.com`
- **Password**: `Finance@123`
- **Role**: Finance
- **Permissions**: 
  - Approve/Return/Reject proposals at Finance stage
  - **User Management**: Create and manage users (Admin capability)

### 👤 Legal User
- **Email**: `legal@botree.com`
- **Password**: `Legal@123`
- **Role**: Legal
- **Permissions**: Approve/Return/Reject proposals at Legal stage

### 👤 CFO User (Final Approver)
- **Email**: `cfo@botree.com`
- **Password**: `CFO@123`
- **Role**: CFO (Chief Financial Officer)
- **Permissions**: Final approval at CFO stage (moves to approved folder)

### 👤 Admin User
- **Email**: `admin@botree.com`
- **Password**: `Admin@123`
- **Role**: Admin
- **Permissions**: Full system access, User management

---

## Workflow Stages

**Proposal Flow**: Sales → CGO → Finance → Legal → CFO → ✅ Approved

Each stage can:
1. **Approve** → Move to next stage
2. **Return for Revision** → Send back to Sales (resubmittable with new version)
3. **Reject Permanently** → Close proposal (cannot be reopened)

---

## Quick Login Access

The login page now includes **one-click demo credential buttons** for easy testing!

Simply click on any role button (Sales, CGO, Finance, Legal, CFO, Admin) to auto-fill credentials.

---

## API Endpoints

- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/logout` - User logout
- **GET** `/api/auth/me` - Get current user info
- **GET** `/api/proposals` - List proposals
- **POST** `/api/proposals` - Create proposal (Sales only)
- **GET** `/api/proposals/{id}` - Get proposal details
- **PUT** `/api/proposals/{id}` - Edit proposal (Sales only, when needs_revision)
- **POST** `/api/proposals/{id}/approve` - Approve proposal
- **POST** `/api/proposals/{id}/reject` - Reject permanently
- **POST** `/api/proposals/{id}/return-for-revision` - Return to Sales
- **GET** `/api/proposals/{id}/versions` - Get version history
- **POST** `/api/proposals/{id}/restore-version` - Restore old version
- **GET** `/api/proposals/{id}/versions/{n}/download-pdf` - Download version as PDF

---

## Features

✅ Version Control (v1_YYYY-MM-DD format)
✅ Version Comparison (side-by-side diff)
✅ Version Restore
✅ PDF Export for each version
✅ Real-time Analytics Dashboard
✅ Deal Value Tracking (INR ₹)
✅ Complete Audit Trail
✅ Role-based Access Control

---

**Generated**: 2026-07-27
**System**: Botree Proposal Tracker
**Environment**: Demo/Testing
