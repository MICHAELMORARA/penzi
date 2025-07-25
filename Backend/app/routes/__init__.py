# app/routes/__init__.py
from .userRoutes import user_bp
from .matchRoutes import match_bp
from .matchRequestRoutes import match_request_bp
from .userInterestRoutes import user_interest_bp
from .smsRoutes import sms_bp

# Export all blueprints
__all__ = ['user_bp', 'match_bp', 'match_request_bp', 'user_interest_bp', 'sms_bp']