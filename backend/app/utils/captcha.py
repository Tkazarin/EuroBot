"""Yandex SmartCaptcha verification utility."""
import httpx
from typing import Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)

SMARTCAPTCHA_VERIFY_URL = "https://smartcaptcha.yandexcloud.net/validate"


async def verify_captcha(token: str, ip: Optional[str] = None) -> bool:
    """
    Verify Yandex SmartCaptcha token.
    
    Args:
        token: The captcha token from frontend
        ip: User's IP address (optional, improves accuracy)
    
    Returns:
        True if verification passed, False otherwise
    """
    # If no server key configured, skip verification (development mode)
    if not settings.SMARTCAPTCHA_SERVER_KEY:
        logger.warning("SmartCaptcha server key not configured, skipping verification")
        return True
    
    try:
        params = {
            "secret": settings.SMARTCAPTCHA_SERVER_KEY,
            "token": token
        }
        
        if ip:
            params["ip"] = ip
        
        async with httpx.AsyncClient() as client:
            response = await client.get(SMARTCAPTCHA_VERIFY_URL, params=params)
            result = response.json()
            
            # Check status
            status = result.get("status")
            
            if status == "ok":
                logger.info("SmartCaptcha verification passed")
                return True
            else:
                logger.warning(f"SmartCaptcha verification failed: {result.get('message', 'unknown')}")
                return False
            
    except Exception as e:
        logger.error(f"SmartCaptcha verification error: {e}")
        # In case of error, fail open in development, fail closed in production
        return not settings.SMARTCAPTCHA_SERVER_KEY

