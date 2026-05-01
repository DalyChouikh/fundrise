# SP3: Admin Review System — Design Spec

## Overview

After completing onboarding, users enter a `pending_approval` state. Admins can approve or reject users with reasons. Pending/rejected users get limited access (can browse but can't invest, create startups, or create campaigns). Both in-app notifications and email notifications are sent on approval/rejection. Admins can re-approve previously rejected users.

## User Flow

1. User completes onboarding → `approval_status` = `pending_approval`
2. Admin sees pending users on dashboard + Users page
3. Admin clicks Approve → `approval_status` = `approved`, user gets in-app notification + email
4. Admin clicks Reject → enters reason → `approval_status` = `rejected`, `rejection_reason` saved, user gets in-app notification + email with reason
5. Admin can re-approve a rejected user at any time

## Skips Approval

- `team_member` role: auto-approved (already set `onboarding_completed=True` by InvitationAcceptView)
- `admin` role: auto-approved
- Existing users: data migration sets `approval_status = "approved"` for all users with `onboarding_completed=True`

## Access Restrictions (Pending/Rejected Users)

Not hard-blocked from routes. Instead:
- **Banner**: Persistent banner at top of main content area:
  - Pending: "Your account is under review. Some features are limited until approved."
  - Rejected: "Your account was not approved: {reason}. Contact support for assistance."
- **Disabled actions**: Invest button, Create Startup button, Create Campaign button show tooltip "Account pending approval"
- Backend endpoints also enforce: POST /startups/, POST /campaigns/, POST /investments/ return 403 for non-approved users

## Model Changes

### UserProfile (backend/apps/users/models.py)

```python
class ApprovalStatus(models.TextChoices):
    PENDING = "pending_approval", "Pending Approval"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"

approval_status = models.CharField(
    max_length=20,
    choices=ApprovalStatus.choices,
    default=ApprovalStatus.PENDING,
)
rejection_reason = models.TextField(blank=True, default="")
```

### Notification model — add two new types

```python
USER_APPROVED = "user_approved", "User Approved"
USER_REJECTED = "user_rejected", "User Rejected"
```

### Data migration

- Existing users with `onboarding_completed=True` → `approval_status="approved"`
- Existing users with `onboarding_completed=False` and `role_selected=True` → `approval_status="pending_approval"` (in onboarding but not done yet — they'll complete and become pending)
- Existing users with `role_selected=False` → leave as `pending_approval` (default)

## Backend Endpoints

### Admin approve/reject (in users/views.py)

```
POST /api/users/<uuid>/approve/
- Admin only
- Sets approval_status="approved", clears rejection_reason
- Creates in-app notification (user_approved)
- Sends approval email
- Returns updated user

POST /api/users/<uuid>/reject/
- Admin only
- Body: { "reason": "..." } (required)
- Sets approval_status="rejected", saves rejection_reason
- Creates in-app notification (user_rejected)
- Sends rejection email with reason
- Returns updated user
```

### UserListView updates

- Add `approval_status` query param filter (e.g. `?approval_status=pending_approval`)

### Dashboard stats updates

- Add `pending_users` count to admin stats response

### Backend access guards

Add permission check to:
- `StartupCreateView` (POST /startups/)
- `CampaignViewSet.create` (POST /campaigns/)
- `InvestmentViewSet.create` (POST /investments/)

Check: `if request.user.approval_status != "approved": return 403`

## Email Templates

### Approval email
Subject: "Welcome to Funderaise — Your account is approved!"
Body: Congratulations, account approved, link to dashboard

### Rejection email
Subject: "Funderaise Account Update"
Body: Account not approved, reason provided, contact support info

Follow same HTML email template pattern as `startups/email.py`.

## Frontend Changes

### Types (frontend/src/types/index.ts)
- Add to UserProfile: `approval_status: "pending_approval" | "approved" | "rejected"`, `rejection_reason: string`
- Add to DashboardStatsAdmin: `pending_users: number`
- Add to NotificationType: `"user_approved" | "user_rejected"`

### AppLayout — Approval Banner
- In `frontend/src/components/layout/AppLayout.tsx` (or new component)
- Shows above main content when `profile.approval_status !== "approved"`
- Pending: amber banner with clock icon
- Rejected: red banner with reason text

### AdminDashboard — Pending Users Widget
- Fetch pending users from `/api/users/?approval_status=pending_approval`
- Show in existing Pending Approvals card alongside startups/campaigns
- Quick approve/reject buttons (reject opens reason modal)

### UsersPage Updates
- Add approval status column with colored badge
- Add approval_status filter dropdown alongside role filter
- Add approve/reject buttons in Actions column
- Reject button opens modal with textarea for reason
- Approve button for rejected users (re-approve)

### Action Button Guards
- StartupsPage: Create Startup button disabled + tooltip if not approved
- CampaignsPage: Create Campaign button disabled + tooltip
- CampaignDetailPage: Invest button disabled + tooltip
- Use `profile.approval_status !== "approved"` check

### NotificationsPage
- Add `user_approved` and `user_rejected` to notification type icons/colors

## InvitationAcceptView Update

Already sets `onboarding_completed=True`. Also set `approval_status="approved"` since team members skip review.

## CompleteOnboardingView

No change needed — `approval_status` defaults to `pending_approval`, which is correct. User completes onboarding and lands in pending state.
