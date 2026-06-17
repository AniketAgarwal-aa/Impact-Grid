"""Email utilities — gracefully no-ops if SMTP not configured"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@impactgrid.com")
APP_URL = os.getenv("APP_URL", "http://localhost:5173")
APP_NAME = "Impact Grid"


def _send(to_email: str, subject: str, html_body: str):
    if not SMTP_USER or not SMTP_PASSWORD:
        print("\n" + "=" * 60)
        print(f"📧 [EMAIL SIMULATION] To: {to_email}")
        print(f"Subject: {subject}")
        print("-" * 60)
        print(html_body)
        print("=" * 60 + "\n")
        return
    try:
        msg = MIMEMultipart()
        msg["From"] = FROM_EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        print(f"[Email] Send failed: {e}")


def send_verification_email(email: str, token: str):
    url = f"{APP_URL}/verify-email?token={token}"
    _send(
        email,
        f"Verify Your {APP_NAME} Account",
        f"<h2>Verify Your Email</h2>"
        f"<p><strong>Your verification code:</strong> {token}</p>"
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
