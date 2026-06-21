"""Email utilities — gracefully no-ops if SMTP not configured"""

import os
import requests

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")
APP_URL = os.getenv("APP_URL", "http://localhost:5173")
APP_NAME = "Impact Grid"


def _send(to_email: str, subject: str, html_body: str):
    if not RESEND_API_KEY:
        print("\n" + "=" * 60)
        print(f"📧 [EMAIL SIMULATION] To: {to_email}")
        print(f"Subject: {subject}")
        print("-" * 60)
        print(html_body)
        print("=" * 60 + "\n")
        return

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "from": FROM_EMAIL,
        "to": to_email,
        "subject": subject,
        "html": html_body
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            print(f"[Email] Successfully sent '{subject}' to {to_email}")
            return True
        else:
            print(f"[Email] Failed to send email. Error: {response.text}")
            return False
    except Exception as e:
        print(f"[Email] An error occurred: {e}")
        return False


def send_verification_email(email: str, token: str):
    url = f"{APP_URL}/verify-email?token={token}"
    _send(
        email,
        f"Verify Your {APP_NAME} Account",
        f"<h2>Verify Your Email</h2>"
        f"<p><strong>Your verification code:</strong> <span style='font-size: 24px; font-weight: bold; color: #007bff;'>{token}</span></p>"
        f"<p>Or verify via link: <a href='{url}'>Verify email</a></p>"
        f"<p>Expires in 15 minutes.</p>",
    )


def send_password_reset_email(email: str, token: str):
    _send(
        email,
        f"Reset Your {APP_NAME} Password",
        f"<h2>Password Reset</h2>"
        f"<p><strong>Your reset code:</strong> {token}</p>"
        f"<p>Enter this code on the reset password page. Expires in 10 minutes.</p>",
    )


def send_welcome_email(email: str, name: str):
    _send(
        email,
        f"Welcome to {APP_NAME}!",
        f"<h2>Welcome, {name}!</h2><p>Your account is verified. <a href='{APP_URL}/login'>Login now</a>.</p>",
    )


def send_approval_email(email: str, change_id: int, description: str, risk_level: str):
    color = "red" if risk_level in ["high", "critical"] else "orange"
    _send(
        email,
        f"Action Required: Change Request #{change_id}",
        f"<h2>Approval Required</h2><p>{description}</p><p>Risk: <strong style='color:{color}'>{risk_level.upper()}</strong></p>"
        f"<p><a href='{APP_URL}/pm/approvals'>Review Now</a></p>",
    )


def send_decision_email(
    email: str, change_id: int, description: str, decision: str, comment: str = ""
):
    _send(
        email,
        f"Change Request #{change_id} — {decision.upper()}",
        f"<h2>Change Request {decision.upper()}</h2><p>{description}</p>"
        f"{'<p>Comment: ' + comment + '</p>' if comment else ''}"
        f"<p><a href='{APP_URL}/results/{change_id}'>View Details</a></p>",
    )
