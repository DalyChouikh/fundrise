import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def build_invite_html(invitation, invite_url):
    startup_name = invitation.startup.name
    inviter_name = invitation.invited_by.full_name or "A team member"

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#FAF9F5;font-family:'Plus Jakarta Sans',-apple-system,system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF9F5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                <span style="color:#D97757;">Funde</span><span style="color:#141413;">raise</span>
              </span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#FFFFFF;border-radius:16px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <!-- Icon -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="width:56px;height:56px;background-color:#FEF3EE;border-radius:14px;line-height:56px;text-align:center;font-size:28px;">
                      &#9993;
                    </div>
                  </td>
                </tr>
                <!-- Heading -->
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <h1 style="margin:0;font-size:22px;font-weight:700;color:#141413;">
                      You've been invited!
                    </h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <p style="margin:0;font-size:15px;line-height:24px;color:#6B6A63;">
                      <strong style="color:#141413;">{inviter_name}</strong> has invited you to join
                      <strong style="color:#141413;">{startup_name}</strong> on Funderaise as a team member.
                    </p>
                  </td>
                </tr>
                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="{invite_url}"
                       style="display:inline-block;background-color:#D97757;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;line-height:1;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
                <!-- Link fallback -->
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:13px;color:#BBB9AF;line-height:20px;">
                      Or copy this link into your browser:<br>
                      <a href="{invite_url}" style="color:#2C84DB;text-decoration:none;word-break:break-all;">{invite_url}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#BBB9AF;line-height:18px;">
                This invitation was sent by {inviter_name} via Funderaise.<br>
                If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_invite_email(invitation):
    invite_url = f"{settings.FRONTEND_URL}/invite/{invitation.token}"
    html = build_invite_html(invitation, invite_url)
    startup_name = invitation.startup.name
    inviter_name = invitation.invited_by.full_name or "A team member"

    plain_text = (
        f"{inviter_name} has invited you to join {startup_name} on Funderaise.\n\n"
        f"Accept the invitation: {invite_url}"
    )

    try:
        send_mail(
            subject=f"You're invited to join {startup_name} on Funderaise",
            message=plain_text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invitation.email],
            html_message=html,
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception("Failed to send invite email to %s", invitation.email)
        return False
