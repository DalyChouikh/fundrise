import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def build_approval_html(user, dashboard_url):
    full_name = user.full_name or "there"

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
                    <div style="width:56px;height:56px;background-color:#E8F5E9;border-radius:14px;line-height:56px;text-align:center;font-size:28px;">
                      &#10003;
                    </div>
                  </td>
                </tr>
                <!-- Heading -->
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <h1 style="margin:0;font-size:22px;font-weight:700;color:#141413;">
                      Account Approved!
                    </h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <p style="margin:0;font-size:15px;line-height:24px;color:#6B6A63;">
                      Congratulations <strong style="color:#141413;">{full_name}</strong>!
                      Your account has been reviewed and approved. You now have full access
                      to explore startups, invest, and more.
                    </p>
                  </td>
                </tr>
                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="{dashboard_url}"
                       style="display:inline-block;background-color:#D97757;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;line-height:1;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
                <!-- Link fallback -->
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:13px;color:#BBB9AF;line-height:20px;">
                      Or copy this link into your browser:<br>
                      <a href="{dashboard_url}" style="color:#2C84DB;text-decoration:none;word-break:break-all;">{dashboard_url}</a>
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
                You're receiving this email because your Funderaise account was approved.<br>
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def build_rejection_html(user, reason):
    full_name = user.full_name or "there"

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
                      &#9432;
                    </div>
                  </td>
                </tr>
                <!-- Heading -->
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <h1 style="margin:0;font-size:22px;font-weight:700;color:#141413;">
                      Account Update
                    </h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <p style="margin:0;font-size:15px;line-height:24px;color:#6B6A63;">
                      Hi <strong style="color:#141413;">{full_name}</strong>,
                      after reviewing your account, we were unable to approve it at this time.
                    </p>
                  </td>
                </tr>
                <!-- Reason box -->
                <tr>
                  <td style="padding-bottom:32px;">
                    <div style="background-color:#FAF9F5;border-left:4px solid #D97757;border-radius:8px;padding:16px 20px;">
                      <p style="margin:0;font-size:14px;line-height:22px;color:#141413;">
                        {reason}
                      </p>
                    </div>
                  </td>
                </tr>
                <!-- Support note -->
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:14px;line-height:22px;color:#6B6A63;">
                      If you believe this was a mistake, please contact our support team.
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
                You're receiving this email because you signed up for Funderaise.<br>
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_approval_email(user):
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"
    html = build_approval_html(user, dashboard_url)
    full_name = user.full_name or "there"

    plain_text = (
        f"Congratulations {full_name}! Your Funderaise account has been approved.\n\n"
        f"You now have full access to explore startups, invest, and more.\n\n"
        f"Go to your dashboard: {dashboard_url}"
    )

    try:
        send_mail(
            subject="Welcome to Funderaise \u2014 Your account is approved!",
            message=plain_text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html,
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception("Failed to send approval email to %s", user.email)
        return False


def send_rejection_email(user, reason):
    html = build_rejection_html(user, reason)
    full_name = user.full_name or "there"

    plain_text = (
        f"Hi {full_name},\n\n"
        f"After reviewing your account, we were unable to approve it at this time.\n\n"
        f"Reason: {reason}\n\n"
        f"If you believe this was a mistake, please contact our support team."
    )

    try:
        send_mail(
            subject="Funderaise \u2014 Account Update",
            message=plain_text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html,
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception("Failed to send rejection email to %s", user.email)
        return False
