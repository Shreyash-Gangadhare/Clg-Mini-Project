"""
QR token generation and verification using HMAC-SHA256.
Format: campuseats:order:{id}:{token}
Token = HMAC(secret, f'{order_id}:{slot_id}:{user_id}')
"""
import hmac
import hashlib
import base64
from django.conf import settings


def _secret():
    return settings.QR_HMAC_SECRET.encode()


def generate_qr_token(order_id: int, slot_id: int, user_id: int) -> str:
    msg = f'{order_id}:{slot_id}:{user_id}'.encode()
    token = hmac.new(_secret(), msg, hashlib.sha256).hexdigest()[:16]
    return token


def generate_qr_data(order) -> str:
    token = generate_qr_token(order.id, order.slot_id, order.user_id)
    return f'campuseats:order:{order.id}:{token}'


def verify_qr_token(order_id: int, token: str, slot_id: int, user_id: int) -> bool:
    expected = generate_qr_token(order_id, slot_id, user_id)
    return hmac.compare_digest(token, expected)


def generate_qr_image_base64(data: str) -> str | None:
    """Generate a QR code image and return as base64 PNG data URI."""
    try:
        import qrcode
        import io
        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=4)
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill_color='#FF6B35', back_color='#1A1A1A')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        b64 = base64.b64encode(buf.getvalue()).decode()
        return f'data:image/png;base64,{b64}'
    except Exception:
        return None
