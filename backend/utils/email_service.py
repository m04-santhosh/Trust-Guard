"""
TrustGuard SMTP Email Service
Dispatches account recovery and notification emails via standard SMTP.
Reads configuration from environment variables or .env file.
"""
import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Tuple


_ENV_LOADED = False

def _load_env_file(force: bool = False):
    """Load key-value pairs from .env if present in root directory."""
    global _ENV_LOADED
    if _ENV_LOADED and not force:
        return
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    env_path = os.path.join(root_dir, ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k not in os.environ:
                            os.environ[k] = v
            _ENV_LOADED = True
        except Exception:
            pass


_load_env_file()


def get_smtp_config():
    """Retrieve SMTP settings from environment."""
    _load_env_file()
    host = os.environ.get("SMTP_HOST", "").strip()
    port_str = os.environ.get("SMTP_PORT", "587").strip()
    try:
        port = int(port_str)
    except ValueError:
        port = 587
    user = os.environ.get("SMTP_USERNAME", "").strip()
    password = os.environ.get("SMTP_PASSWORD", "").strip()
    if "gmail.com" in host or "google" in host:
        password = password.replace(" ", "")
    from_email = os.environ.get("SMTP_FROM_EMAIL", "").strip() or user or "noreply@trustguard.ai"
    from_name = os.environ.get("SMTP_FROM_NAME", "TrustGuard Forensic Security").strip()
    use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
    use_ssl = os.environ.get("SMTP_USE_SSL", "false").lower() in ("true", "1", "yes") or port == 465
    frontend_base_url = os.environ.get("FRONTEND_BASE_URL", "http://localhost:5173").strip().rstrip("/")

    is_placeholder = (
        not user
        or not password
        or user in ("your_email@gmail.com", "example@gmail.com", "user@domain.com")
        or password in ("your_16_char_app_password", "your_password", "password")
    )
    is_configured = bool(host and user and password and not is_placeholder)
    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "from_email": from_email,
        "from_name": from_name,
        "use_tls": use_tls,
        "use_ssl": use_ssl,
        "frontend_base_url": frontend_base_url,
        "is_configured": is_configured,
    }


def is_smtp_configured() -> bool:
    """Return True if valid SMTP credentials are configured in environment."""
    return get_smtp_config().get("is_configured", False)


def send_password_reset_otp(to_email: str, username: str, otp: str) -> Tuple[bool, str]:
    """
    Send password recovery email containing the secure 6-digit OTP verification code.
    Never exposes or logs the OTP code.
    No reset links or URLs are included.
    """
    cfg = get_smtp_config()

    subject = "Your Trust-Guard password reset code"
    sender_header = f"{cfg['from_name']} <{cfg['from_email']}>"

    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F1E9; color: #3A3632; margin: 0; padding: 32px 16px; }}
        .container {{ max-width: 520px; margin: 0 auto; background: #FFFFFF; border: 1px solid #D1CDC1; border-radius: 12px; padding: 36px 32px; box-shadow: 0 4px 14px rgba(74, 71, 66, 0.08); }}
        .header {{ border-bottom: 2px solid #EE692E; padding-bottom: 16px; margin-bottom: 24px; }}
        .brand {{ font-size: 24px; font-weight: 900; color: #3A3632; letter-spacing: -0.02em; margin: 0; }}
        .subtitle {{ font-size: 13px; color: #6E6860; margin-top: 4px; font-weight: 500; }}
        .greeting {{ font-size: 16px; font-weight: 600; color: #3A3632; margin-bottom: 12px; }}
        .text {{ font-size: 14px; line-height: 1.6; color: #6E6860; margin-bottom: 20px; }}
        .otp-box {{ text-align: center; margin: 28px 0; background: #FAF7F2; border: 2px dashed #EE692E; border-radius: 10px; padding: 20px; }}
        .otp-code {{ font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #EE692E; margin: 0; }}
        .otp-sub {{ font-size: 12px; color: #948D83; margin-top: 8px; text-transform: uppercase; font-weight: 600; }}
        .warning {{ font-size: 12px; color: #6E6860; border-top: 1px solid #E8E3DA; padding-top: 18px; margin-top: 24px; line-height: 1.5; }}
        .footer {{ font-size: 11px; color: #948D83; text-align: center; margin-top: 24px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="brand">TrustGuard</h1>
            <div class="subtitle">Forensic Multi-Modal Media Verification</div>
        </div>
        <div class="greeting">Hello @{username},</div>
        <p class="text">
            We received a request to reset your Trust-Guard account password. Use the verification code below to proceed:
        </p>
        <div class="otp-box">
            <div class="otp-code">{otp}</div>
            <div class="otp-sub">Verification Code</div>
        </div>
        <p class="text" style="font-size: 13px;">
            This verification code is valid for <strong>10 minutes</strong>. For your security, it can only be used once.
        </p>
        <div class="warning">
            <strong>Security Warning:</strong> If you did not request this, ignore this email. Never share this code with anyone. Trust-Guard staff will never ask for your verification code.
        </div>
    </div>
    <div class="footer">
        TrustGuard Forensic Platform &middot; "We don't return a verdict. We return a case file."
    </div>
</body>
</html>"""

    text_content = f"""TrustGuard Password Reset Verification Code

Hello @{username},

We received a request to reset your Trust-Guard account password.

Your verification code: {otp}

This code is valid for 10 minutes.
If you did not request this, ignore this email.

--
TrustGuard Forensic Platform
"We don't return a verdict. We return a case file."
"""

    if not cfg["is_configured"]:
        # Log safe diagnostic without exposing OTP codes or passwords
        print(f"[TRUSTGUARD SMTP] SMTP not configured in environment. Password reset OTP could not be dispatched to {to_email}.")
        return False, "SMTP email delivery is currently unconfigured or unavailable."

    # Real SMTP Delivery
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = sender_header
        msg["To"] = to_email
        msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        if cfg["use_ssl"]:
            context = ssl.create_default_context()
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], context=context, timeout=12)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=12)
            server.ehlo()
            if cfg["use_tls"]:
                context = ssl.create_default_context()
                server.starttls(context=context)
                server.ehlo()

        server.login(cfg["user"], cfg["password"])
        server.sendmail(cfg["from_email"], [to_email], msg.as_string())
        server.quit()
        return True, "Recovery verification code dispatched successfully via SMTP."
    except Exception as e:
        # Safe diagnostic without credentials, stack trace, or OTP exposure
        err_type = type(e).__name__
        print(f"[TRUSTGUARD SMTP ERROR] Failed to send email to {to_email}. Error: {err_type}")
        return False, "Failed to dispatch email due to mail server communication error."


def send_registration_otp(to_email: str, username: str, otp: str) -> Tuple[bool, str]:
    """
    Send registration verification email containing the secure 6-digit OTP verification code.
    Never exposes or logs the OTP code.
    No reset links, tokens, or passwords are included.
    """
    cfg = get_smtp_config()

    subject = "Verify your Trust-Guard account"
    sender_header = f"{cfg['from_name']} <{cfg['from_email']}>"

    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F1E9; color: #3A3632; margin: 0; padding: 32px 16px; }}
        .container {{ max-width: 520px; margin: 0 auto; background: #FFFFFF; border: 1px solid #D1CDC1; border-radius: 12px; padding: 36px 32px; box-shadow: 0 4px 14px rgba(74, 71, 66, 0.08); }}
        .header {{ border-bottom: 2px solid #EE692E; padding-bottom: 16px; margin-bottom: 24px; }}
        .brand {{ font-size: 24px; font-weight: 900; color: #3A3632; letter-spacing: -0.02em; margin: 0; }}
        .subtitle {{ font-size: 13px; color: #6E6860; margin-top: 4px; font-weight: 500; }}
        .greeting {{ font-size: 16px; font-weight: 600; color: #3A3632; margin-bottom: 12px; }}
        .text {{ font-size: 14px; line-height: 1.6; color: #6E6860; margin-bottom: 20px; }}
        .otp-box {{ text-align: center; margin: 28px 0; background: #FAF7F2; border: 2px dashed #EE692E; border-radius: 10px; padding: 20px; }}
        .otp-code {{ font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #EE692E; margin: 0; }}
        .otp-sub {{ font-size: 12px; color: #948D83; margin-top: 8px; text-transform: uppercase; font-weight: 600; }}
        .warning {{ font-size: 12px; color: #6E6860; border-top: 1px solid #E8E3DA; padding-top: 18px; margin-top: 24px; line-height: 1.5; }}
        .footer {{ font-size: 11px; color: #948D83; text-align: center; margin-top: 24px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="brand">TrustGuard</h1>
            <div class="subtitle">Forensic Multi-Modal Media Verification</div>
        </div>
        <div class="greeting">Welcome @{username},</div>
        <p class="text">
            Thank you for creating an account with TrustGuard. Please use the verification code below to verify your email address and activate your account:
        </p>
        <div class="otp-box">
            <div class="otp-code">{otp}</div>
            <div class="otp-sub">Account Verification Code</div>
        </div>
        <p class="text" style="font-size: 13px;">
            This verification code is valid for <strong>10 minutes</strong>. For your security, it can only be used once.
        </p>
        <div class="warning">
            <strong>Security Notice:</strong> If you did not create a Trust-Guard account, ignore this email. Never share this code with anyone. Trust-Guard staff will never ask for your verification code.
        </div>
    </div>
    <div class="footer">
        TrustGuard Forensic Platform &middot; "We don't return a verdict. We return a case file."
    </div>
</body>
</html>"""

    text_content = f"""TrustGuard Account Verification Code

Welcome @{username},

Thank you for creating an account with TrustGuard. Please use the verification code below to verify your email address and activate your account:

Your verification code: {otp}

This code is valid for 10 minutes.
If you did not create a Trust-Guard account, ignore this email.

--
TrustGuard Forensic Platform
"We don't return a verdict. We return a case file."
"""

    if not cfg["is_configured"]:
        print(f"[TRUSTGUARD SMTP] SMTP not configured in environment. Registration OTP could not be dispatched to {to_email}.")
        return False, "SMTP email delivery is currently unconfigured or unavailable."

    # Real SMTP Delivery
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = sender_header
        msg["To"] = to_email
        msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        if cfg["use_ssl"]:
            context = ssl.create_default_context()
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], context=context, timeout=12)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=12)
            server.ehlo()
            if cfg["use_tls"]:
                context = ssl.create_default_context()
                server.starttls(context=context)
                server.ehlo()

        server.login(cfg["user"], cfg["password"])
        server.sendmail(cfg["from_email"], [to_email], msg.as_string())
        server.quit()
        return True, "Registration verification code dispatched successfully via SMTP."
    except Exception as e:
        err_type = type(e).__name__
        print(f"[TRUSTGUARD SMTP ERROR] Failed to send registration email to {to_email}. Error: {err_type}")
        return False, "Failed to dispatch email due to mail server communication error."


def send_password_reset_email(to_email: str, username: str, reset_link_or_otp: str = "", reset_link: str = "") -> Tuple[bool, str]:
    """Compatibility wrapper redirecting to send_password_reset_otp."""
    code = reset_link_or_otp or reset_link
    return send_password_reset_otp(to_email, username, code)


