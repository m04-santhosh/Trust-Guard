"""
TrustGuard SMTP Email Service
Dispatches account recovery and notification emails via standard SMTP.
Reads configuration from environment variables or .env file.
"""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Tuple


def _load_env_file():
    """Load key-value pairs from .env if present in root directory."""
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
    use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
    use_ssl = os.environ.get("SMTP_USE_SSL", "false").lower() in ("true", "1", "yes") or port == 465

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
        "use_tls": use_tls,
        "use_ssl": use_ssl,
        "is_configured": is_configured,
    }


def send_password_reset_email(to_email: str, username: str, reset_code: str) -> Tuple[bool, str]:
    """
    Send password recovery email containing the 6-digit recovery code.
    If SMTP is not configured, logs to console and returns dev mode info.
    """
    cfg = get_smtp_config()

    subject = f"TrustGuard Password Recovery Code: {reset_code}"
    
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0e1a; color: #f1f5f9; margin: 0; padding: 30px; }}
        .card {{ max-width: 520px; margin: 0 auto; background: #111827; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 32px; }}
        .header {{ font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; margin-bottom: 8px; }}
        .code-box {{ margin: 24px 0; background: #1a2035; border: 1px solid rgba(99,102,241,0.4); border-radius: 8px; padding: 16px; text-align: center; }}
        .code {{ font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #22d3ee; font-family: monospace; }}
        .footer {{ font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; }}
    </style>
</head>
<body>
    <div class="card">
        <div class="header">TrustGuard Forensic Security</div>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">
            Account recovery request for <strong>@{username}</strong>.
        </p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
            Use the following single-use verification code to reset your password. This code expires in 15 minutes:
        </p>
        <div class="code-box">
            <span class="code">{reset_code}</span>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">
            If you did not request this recovery code, you can safely ignore this email.
        </p>
        <div class="footer">
            TrustGuard Multi-Modal Forensic Dossier System · Autonomous Contradiction Detection
        </div>
    </div>
</body>
</html>"""

    text_content = f"""TrustGuard Password Recovery

Hello @{username},

Your password recovery code is: {reset_code}

This code expires in 15 minutes. Enter it in the recovery prompt to set your new password.

If you did not request this code, ignore this email.
"""

    if not cfg["is_configured"]:
        # Development fallback mode
        print(f"\n[TRUSTGUARD SMTP DEV] Password reset requested for {to_email} (@{username})")
        print(f"[TRUSTGUARD SMTP DEV] Recovery Code: {reset_code}")
        print(f"[TRUSTGUARD SMTP DEV] Tip: Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD in .env for live email delivery.\n")
        return False, f"SMTP not yet configured in .env. Dev Recovery Code: {reset_code}"

    # Real SMTP Delivery
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = cfg["from_email"]
        msg["To"] = to_email
        msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        if cfg["use_ssl"]:
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=12)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=12)
            if cfg["use_tls"]:
                server.starttls()

        server.login(cfg["user"], cfg["password"])
        server.sendmail(cfg["from_email"], [to_email], msg.as_string())
        server.quit()
        return True, "Recovery email dispatched successfully via SMTP."
    except Exception as e:
        err_str = str(e)
        print(f"[TRUSTGUARD SMTP ERROR] Failed to send email to {to_email}: {err_str}")
        if "535" in err_str or "BadCredentials" in err_str or "Username and Password not accepted" in err_str:
            friendly_err = (
                "Google SMTP Authentication Failed (535 BadCredentials): "
                "Google requires a 16-character 'App Password' (not your personal Gmail password). "
                "Enable 2FA at https://myaccount.google.com/security and generate an App Password at https://myaccount.google.com/apppasswords"
            )
            return False, friendly_err
        return False, f"SMTP dispatch error: {err_str}"
