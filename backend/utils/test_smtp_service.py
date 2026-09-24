"""
SMTP Service Isolated Verification Suite:
- SMTP configuration validation (missing vs present vs Gmail)
- Safe failure handling when SMTP is not configured
- HTML and plaintext email construction (branding, OTP, expiration, NO reset URL)
- Mocked SMTP transmission to verify zero credentials / OTP logging
"""
import os
import sys
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.utils.email_service import is_smtp_configured, get_smtp_config, send_password_reset_otp, send_password_reset_email

def test_smtp_configuration():
    print("--- TEST SMTP 1: Configuration Detection & Gmail Recognition ---")
    with patch.dict(os.environ, {}, clear=True):
        assert is_smtp_configured() is False, "Should be False when env vars are absent"
        print(" -> Correctly detected unconfigured SMTP")

    with patch.dict(os.environ, {
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_USERNAME": "test_analyst@gmail.com",
        "SMTP_PASSWORD": "abcd efgh ijkl mnop",
        "SMTP_FROM_EMAIL": "test_analyst@gmail.com",
    }, clear=True):
        cfg = get_smtp_config()
        assert is_smtp_configured() is True, "Should be True when required vars are present"
        assert cfg["password"] == "abcdefghijklmnop", "Spaces should be stripped from Gmail app passwords"
        print(" -> Correctly recognized Gmail SMTP configuration")

def test_smtp_template_otp_and_no_url():
    print("--- TEST SMTP 2: Email Template Contains OTP and NO Reset URL ---")
    with patch.dict(os.environ, {
        "SMTP_HOST": "smtp.test.com",
        "SMTP_PORT": "587",
        "SMTP_USERNAME": "test_user",
        "SMTP_PASSWORD": "secret_smtp_password",
        "SMTP_FROM_EMAIL": "security@trustguard.ai",
        "SMTP_FROM_NAME": "TrustGuard Security",
        "SMTP_USE_TLS": "true",
    }, clear=True):
        with patch("smtplib.SMTP") as mock_smtp_class:
            mock_server = MagicMock()
            mock_smtp_class.return_value = mock_server

            test_otp = "849201"
            success, msg = send_password_reset_otp(
                to_email="analyst@domain.com",
                username="analyst_jane",
                otp=test_otp,
            )
            assert success is True
            assert mock_server.sendmail.called
            call_args = mock_server.sendmail.call_args[0]
            raw_msg = call_args[2]
            import email
            parsed_msg = email.message_from_string(raw_msg)
            decoded_body = ""
            for part in parsed_msg.walk():
                payload = part.get_payload(decode=True)
                if payload:
                    decoded_body += payload.decode("utf-8", errors="ignore")

            assert test_otp in decoded_body, "Email must contain the 6-digit OTP"
            assert "10 minutes" in decoded_body, "Email must state 10-minute expiry"
            assert "Your Trust-Guard password reset code" in parsed_msg["Subject"], "Email must have proper subject"
            assert "reset_token" not in decoded_body, "Email must NOT contain reset_token"
            assert "?token=" not in decoded_body, "Email must NOT contain ?token="
            assert "http://" not in decoded_body and "https://" not in decoded_body, "Email must NOT contain any reset link/URL"
            print(" -> Email verified: Contains 6-digit OTP, 10m expiry notice, and NO reset URLs")

def test_smtp_unconfigured_safe_handling():
    print("--- TEST SMTP 3: Unconfigured Safe Handling (No OTP Leak) ---")
    with patch.dict(os.environ, {}, clear=True):
        success, msg = send_password_reset_otp(
            to_email="recipient@example.com",
            username="investigator_jane",
            otp="999888",
        )
        assert success is False
        assert "999888" not in msg, "Failure message must never leak the OTP"
        print(" -> Safely handled unconfigured SMTP without leaking OTP")

def test_smtp_failure_handling():
    print("--- TEST SMTP 4: SMTP Network / Auth Failure (No OTP Leak) ---")
    with patch.dict(os.environ, {
        "SMTP_HOST": "smtp.test.com",
        "SMTP_PORT": "587",
        "SMTP_USERNAME": "test_user",
        "SMTP_PASSWORD": "secret_smtp_password",
        "SMTP_FROM_EMAIL": "security@trustguard.ai",
        "SMTP_USE_TLS": "true",
    }, clear=True):
        with patch("smtplib.SMTP") as mock_smtp_class:
            mock_server = MagicMock()
            mock_server.login.side_effect = Exception("535 Authentication credentials invalid")
            mock_smtp_class.return_value = mock_server

            success, msg = send_password_reset_otp(
                to_email="analyst@domain.com",
                username="analyst_jane",
                otp="123456",
            )
            assert success is False
            assert "123456" not in msg, "Failure message must never leak the OTP"
            print(" -> SMTP failure safely handled without leaking OTP")

if __name__ == "__main__":
    test_smtp_configuration()
    test_smtp_template_otp_and_no_url()
    test_smtp_unconfigured_safe_handling()
    test_smtp_failure_handling()
    print("\nALL SMTP TESTS PASSED!")
