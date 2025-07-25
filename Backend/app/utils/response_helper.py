from flask import jsonify
from typing import Any, Dict, Optional

def success_response(data: Any = None, message: str = "Success", status_code: int = 200):
    """
    Create a standardized success response
    """
    response = {
        "success": True,
        "message": message,
        "data": data,
        "status_code": status_code
    }
    return jsonify(response), status_code

def error_response(message: str, status_code: int = 400, error_code: Optional[str] = None):
    """
    Create a standardized error response
    """
    response = {
        "success": False,
        "message": message,
        "status_code": status_code,
        "data": None
    }
    
    if error_code:
        response["error_code"] = error_code
    
    return jsonify(response), status_code

def paginated_response(data: list, page: int, per_page: int, total: int, message: str = "Success"):
    """
    Create a paginated response
    """
    total_pages = (total + per_page - 1) // per_page  
    
    response = {
        "success": True,
        "message": message,
        "data": data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        },
        "status_code": 200
    }
    
    return jsonify(response), 200

def validation_error_response(errors: Dict[str, str]):
    """
    Create a validation error response with field-specific errors
    """
    response = {
        "success": False,
        "message": "Validation failed",
        "errors": errors,
        "status_code": 422
    }
    
    return jsonify(response), 422

# Common error responses
def unauthorized_response(message: str = "Unauthorized access"):
    return error_response(message, 401, "UNAUTHORIZED")

def forbidden_response(message: str = "Forbidden"):
    return error_response(message, 403, "FORBIDDEN")

def not_found_response(message: str = "Resource not found"):
    return error_response(message, 404, "NOT_FOUND")

def conflict_response(message: str = "Resource conflict"):
    return error_response(message, 409, "CONFLICT")

def server_error_response(message: str = "Internal server error"):
    return error_response(message, 500, "INTERNAL_ERROR")

def bad_request_response(message: str = "Bad request"):
    return error_response(message, 400, "BAD_REQUEST")

def rate_limit_response(message: str = "Rate limit exceeded"):
    return error_response(message, 429, "RATE_LIMIT")

# SMS specific responses
def sms_response(message: str, success: bool = True):
    """
    Create SMS-friendly response format
    """
    if success:
        return success_response({"sms_message": message}, "SMS ready")
    else:
        return error_response(message)

def match_found_response(match_data: Dict, position: int, total_matches: int):
    """
    Create response for when a match is found
    """
    data = {
        "match": match_data,
        "position": position,
        "total_matches": total_matches,
        "has_more": position < total_matches
    }
    
    return success_response(data, f"Match {position} of {total_matches} found")

def no_matches_response():
    """
    Response when no matches are found
    """
    return success_response(
        {"matches": [], "total": 0}, 
        "No matches found. Try adjusting your search criteria."
    )

def registration_progress_response(stage: str, next_step: str):
    """
    Response for registration progress
    """
    data = {
        "current_stage": stage,
        "next_step": next_step,
        "completed": stage == "completed"
    }
    
    return success_response(data, f"Registration stage: {stage}")

def interest_notification_response(interested_user: str, target_user: str):
    """
    Response for interest notifications
    """
    data = {
        "notification_sent": True,
        "interested_user": interested_user,
        "target_user": target_user
    }
    
    return success_response(data, "Interest notification sent successfully")