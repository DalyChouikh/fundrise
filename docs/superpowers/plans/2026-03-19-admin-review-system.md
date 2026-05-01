# Admin Review System Implementation Plan

**Goal:** Add admin approve/reject flow for users with limited access for pending/rejected users, in-app + email notifications.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `backend/apps/users/models.py` | Add `approval_status`, `rejection_reason` to UserProfile |
| `backend/apps/users/serializers.py` | Add new fields to serializers |
| `backend/apps/users/views.py` | Add approve/reject endpoints, update UserListView |
| `backend/apps/users/urls.py` | Add approve/reject URL routes |
| `backend/apps/users/email.py` | New file — approval/rejection email templates |
| `backend/apps/notifications/models.py` | Add user_approved, user_rejected types |
| `backend/apps/startups/views.py` | Add approval guard to StartupViewSet.create, update InvitationAcceptView |
| `backend/apps/campaigns/views.py` | Add approval guard to CampaignViewSet.create |
| `backend/apps/investments/views.py` | Add approval guard to InvestmentViewSet.create |
| `backend/apps/core/views.py` | Add pending_users to admin dashboard stats |
| `frontend/src/types/index.ts` | Add approval fields to types |
| `frontend/src/components/layout/AppLayout.tsx` | Add approval status banner |
| `frontend/src/pages/dashboard/AdminDashboard.tsx` | Add pending users widget |
| `frontend/src/pages/admin/UsersPage.tsx` | Add status column, filters, approve/reject actions |
| `frontend/src/pages/startups/StartupsPage.tsx` | Guard Create Startup button |
| `frontend/src/pages/campaigns/CampaignsPage.tsx` | Guard Create Campaign button |
| `frontend/src/pages/campaigns/CampaignDetailPage.tsx` | Guard Invest button |
| `frontend/src/pages/notifications/NotificationsPage.tsx` | Add new notification type icons |

---

### Task 1: Backend Model Changes + Migration

**Files:** `backend/apps/users/models.py`, `backend/apps/notifications/models.py`

- [ ] **Step 1: Add approval fields to UserProfile**

Add after `linkedin_url`:

```python
class ApprovalStatus(models.TextChoices):
    PENDING = "pending_approval", "Pending Approval"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
```

Add fields:
```python
approval_status = models.CharField(
    max_length=20,
    choices=ApprovalStatus.choices,
    default=ApprovalStatus.PENDING,
)
rejection_reason = models.TextField(blank=True, default="")
```

- [ ] **Step 2: Add notification types**

In `backend/apps/notifications/models.py`, add to NotificationType:
```python
USER_APPROVED = "user_approved", "User Approved"
USER_REJECTED = "user_rejected", "User Rejected"
```

- [ ] **Step 3: Make and run migrations**

```bash
docker compose exec django-api python manage.py makemigrations users notifications
docker compose exec django-api python manage.py migrate
```

- [ ] **Step 4: Data migration — backfill approval_status**

```bash
docker compose exec django-api python manage.py makemigrations users --empty -n backfill_approval_status
```

Edit migration:
```python
def backfill_approval(apps, schema_editor):
    UserProfile = apps.get_model("users", "UserProfile")
    UserProfile.objects.filter(onboarding_completed=True).update(approval_status="approved")

class Migration(migrations.Migration):
    dependencies = [("users", "<prev>")]
    operations = [
        migrations.RunPython(backfill_approval, migrations.RunPython.noop),
    ]
```

Run: `docker compose exec django-api python manage.py migrate`

- [ ] **Step 5: Commit**

---

### Task 2: Backend Email Templates

**Files:** Create `backend/apps/users/email.py`

- [ ] **Step 1: Create email helper functions**

Follow same pattern as `backend/apps/startups/email.py`:
- `build_approval_html(user, dashboard_url)` — approval email template
- `build_rejection_html(user, reason)` — rejection email template with reason
- `send_approval_email(user)` — sends approval email
- `send_rejection_email(user, reason)` — sends rejection email with reason

Both use `django.core.mail.send_mail`, Funderaise branded HTML, plain text fallback.

- [ ] **Step 2: Commit**

---

### Task 3: Backend Serializers + Endpoints

**Files:** `backend/apps/users/serializers.py`, `backend/apps/users/views.py`, `backend/apps/users/urls.py`

- [ ] **Step 1: Update serializers**

Add `approval_status` and `rejection_reason` to both `UserProfileSerializer` and `AdminUserSerializer` fields lists.

- [ ] **Step 2: Add approve/reject views**

```python
class UserApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        user = get_object_or_404(UserProfile, pk=pk)
        user.approval_status = "approved"
        user.rejection_reason = ""
        user.save(update_fields=["approval_status", "rejection_reason"])
        create_notification(
            recipient=user,
            notification_type="user_approved",
            title="Account Approved",
            message="Your account has been approved! You now have full access to the platform.",
            related_object=user,
        )
        send_approval_email(user)
        return Response(AdminUserSerializer(user).data)


class UserRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        reason = request.data.get("reason", "").strip()
        if not reason:
            return Response({"detail": "Reason is required."}, status=status.HTTP_400_BAD_REQUEST)
        user = get_object_or_404(UserProfile, pk=pk)
        user.approval_status = "rejected"
        user.rejection_reason = reason
        user.save(update_fields=["approval_status", "rejection_reason"])
        create_notification(
            recipient=user,
            notification_type="user_rejected",
            title="Account Not Approved",
            message=f"Your account was not approved. Reason: {reason}",
            related_object=user,
        )
        send_rejection_email(user, reason)
        return Response(AdminUserSerializer(user).data)
```

- [ ] **Step 3: Update UserListView to support approval_status filter**

```python
approval_status = self.request.query_params.get("approval_status")
if approval_status:
    qs = qs.filter(approval_status=approval_status)
```

- [ ] **Step 4: Add URL routes**

```python
path("<uuid:pk>/approve/", views.UserApproveView.as_view(), name="user-approve"),
path("<uuid:pk>/reject/", views.UserRejectView.as_view(), name="user-reject"),
```

Place before the `<uuid:pk>/` catch-all.

- [ ] **Step 5: Commit**

---

### Task 4: Backend Access Guards + Dashboard Stats

**Files:** `backend/apps/startups/views.py`, `backend/apps/campaigns/views.py`, `backend/apps/investments/views.py`, `backend/apps/core/views.py`

- [ ] **Step 1: Guard startup creation**

In `StartupViewSet.create` (or `perform_create`), check:
```python
if request.user.approval_status != "approved":
    return Response({"detail": "Account not approved."}, status=403)
```

- [ ] **Step 2: Guard campaign creation**

Same pattern in `CampaignViewSet.create`.

- [ ] **Step 3: Guard investment creation**

Same pattern in `InvestmentViewSet.create`.

- [ ] **Step 4: Update InvitationAcceptView — set approval_status="approved"**

Add `request.user.approval_status = "approved"` alongside existing `onboarding_completed = True`.

- [ ] **Step 5: Update dashboard_stats — add pending_users count**

In admin block of `dashboard_stats`:
```python
pending_users = UserProfile.objects.filter(approval_status="pending_approval").count()
```
Add `"pending_users": pending_users` to response.

- [ ] **Step 6: Commit**

---

### Task 5: Frontend Type Updates

**Files:** `frontend/src/types/index.ts`

- [ ] **Step 1: Update types**

Add to `UserProfile`:
```typescript
approval_status: "pending_approval" | "approved" | "rejected";
rejection_reason: string;
```

Add to `DashboardStatsAdmin`:
```typescript
pending_users: number;
```

Add to `NotificationType`:
```typescript
| "user_approved"
| "user_rejected"
```

- [ ] **Step 2: Verify compile**
- [ ] **Step 3: Commit**

---

### Task 6: Approval Status Banner in AppLayout

**Files:** `frontend/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Add banner component**

Inside AppLayout, above the `<Outlet />`, render a banner when `profile.approval_status !== "approved"`:

- Pending: amber/yellow banner with Clock icon: "Your account is under review. Some features are limited until approved."
- Rejected: red banner with XCircle icon: "Your account was not approved: {reason}. Contact support for assistance."

Use `useAuth()` to get profile.

- [ ] **Step 2: Commit**

---

### Task 7: Admin Dashboard — Pending Users Widget

**Files:** `frontend/src/pages/dashboard/AdminDashboard.tsx`

- [ ] **Step 1: Fetch pending users**

Add `pendingUsers` state, fetch from `/api/users/?approval_status=pending_approval`.

- [ ] **Step 2: Add to Pending Approvals card**

Add pending users to the existing pending approvals list (alongside startups and campaigns). Show user avatar, name, role. Quick approve button + reject button (reject opens a simple prompt/modal for reason).

- [ ] **Step 3: Add pending_users stat**

Add "Pending Users" to the stats grid (or update "Total Users" to show pending count badge).

- [ ] **Step 4: Commit**

---

### Task 8: UsersPage — Status Column + Approve/Reject

**Files:** `frontend/src/pages/admin/UsersPage.tsx`

- [ ] **Step 1: Add approval_status filter**

Add a dropdown alongside the role filter: All Status, Pending, Approved, Rejected.

- [ ] **Step 2: Add Status column to table**

Show colored badge: pending (amber), approved (green), rejected (red).

- [ ] **Step 3: Add approve/reject actions**

Replace single "Edit Role" button with contextual actions:
- Pending users: Approve + Reject buttons
- Rejected users: Re-Approve button
- Approved users: keep Edit Role button
- Reject opens modal with reason textarea

- [ ] **Step 4: Commit**

---

### Task 9: Frontend Action Guards

**Files:** StartupsPage.tsx, CampaignsPage.tsx, CampaignDetailPage.tsx

- [ ] **Step 1: Guard Create Startup button**

In `StartupsPage.tsx`, disable "Create Startup" button when `profile.approval_status !== "approved"`. Show title tooltip.

- [ ] **Step 2: Guard Create Campaign button**

Same in `CampaignsPage.tsx`.

- [ ] **Step 3: Guard Invest button**

In `CampaignDetailPage.tsx`, disable invest button when not approved.

- [ ] **Step 4: Update NotificationsPage**

Add `user_approved` and `user_rejected` to the notification type icon/color mapping.

- [ ] **Step 5: Commit**

---

### Task 10: End-to-End Verification

- [ ] **Step 1: Django check passes**
- [ ] **Step 2: TypeScript compiles**
- [ ] **Step 3: Smoke test — new user lands in pending state after onboarding**
- [ ] **Step 4: Smoke test — admin can approve/reject from dashboard and users page**
- [ ] **Step 5: Smoke test — approved user has full access**
- [ ] **Step 6: Smoke test — pending user sees banner, can't create startup/campaign/invest**
- [ ] **Step 7: Smoke test — email sent on approve/reject (check Mailhog at localhost:8025)**
