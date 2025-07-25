from flask import Blueprint, request, jsonify
from app.services.userInterestService import UserInterestService
from app.utils.validators import validate_phone_number, normalize_phone_number
from app.utils.response_helper import success_response, error_response
import logging

logger = logging.getLogger(__name__)
user_interest_bp = Blueprint('user_interests', __name__, url_prefix='/api/interests')

# Helper function
def clean_and_validate_phone(phone: str) -> str:
    if not phone:
        return None
    normalized = normalize_phone_number(phone)
    return normalized if validate_phone_number(normalized) else None

@user_interest_bp.route('/express', methods=['POST'])
def express_interest():
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        interested_phone = clean_and_validate_phone(data.get('interested_phone'))
        target_phone = clean_and_validate_phone(data.get('target_phone'))
        interest_type = data.get('interest_type', 'details')

        if not interested_phone or not target_phone:
            return error_response("Invalid phone number format", 400)

        if interest_type not in ['details', 'describe']:
            return error_response("Interest type must be 'details' or 'describe'", 400)

        if interested_phone == target_phone:
            return error_response("Cannot express interest in yourself", 400)

        from app.models.userModel import User
        interested_user = User.find_by_phone(interested_phone)
        target_user = User.find_by_phone(target_phone)

        if not interested_user or not target_user:
            return error_response("One or both users not found", 404)

        user_interest = UserInterestService.create_interest(
            interested_user.id, 
            target_user.id, 
            interest_type
        )

        response_data = {
            'interest': user_interest.to_dict(),
            'message': f"Interest expressed. Notification will be sent to {target_user.name}"
        }

        return success_response(response_data, "Interest expressed successfully")

    except Exception as e:
        logger.error(f"Error expressing interest: {str(e)}")
        return error_response("Internal server error", 500)

@user_interest_bp.route('/respond', methods=['POST'])
def respond_to_interest():
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        phone_number = clean_and_validate_phone(data.get('phone_number'))
        interest_id = data.get('interest_id')
        response = data.get('response')

        if not phone_number:
            return error_response("Invalid phone number format", 400)

        if not interest_id or response not in ['YES', 'NO']:
            return error_response("Interest ID and valid response (YES/NO) are required", 400)

        from app.models.userModel import User
        user = User.find_by_phone(phone_number)
        if not user:
            return error_response("User not found", 404)

        from app.models.userInterestModel import UserInterest
        user_interest = UserInterest.query.filter_by(
            id=interest_id,
            target_user_id=user.id
        ).first()

        if not user_interest:
            return error_response("Interest not found or unauthorized", 404)

        if user_interest.response_received:
            return error_response("Interest has already been responded to", 400)

        updated_interest = UserInterestService.respond_to_interest(interest_id, response)

        response_data = {
            'interest': updated_interest.to_dict(),
            'message': f"Response '{response}' recorded successfully"
        }

        return success_response(response_data, "Response recorded successfully")

    except Exception as e:
        logger.error(f"Error responding to interest: {str(e)}")
        return error_response("Internal server error", 500)
@user_interest_bp.route('/received', methods=['GET'])
def get_interests_received():
    try:
        # Debug: Print all query parameters
        print(f"DEBUG: All request args: {dict(request.args)}")
        print(f"DEBUG: Request URL: {request.url}")
        print(f"DEBUG: Request query string: {request.query_string}")
        
        # Get the raw parameter
        raw_phone = request.args.get('phone_number')
        print(f"DEBUG: Raw phone_number parameter: '{raw_phone}' (type: {type(raw_phone)})")
        
        # Handle URL encoding issue where + becomes space
        if raw_phone and raw_phone.startswith(' ') and len(raw_phone) > 1:
            # Likely a + that got converted to space during URL parsing
            raw_phone = '+' + raw_phone[1:]
            print(f"DEBUG: Fixed URL encoding issue, corrected to: '{raw_phone}'")
        
        # Also check if the old parameter name is being used
        old_param = request.args.get('interested_phone')
        print(f"DEBUG: Old interested_phone parameter: '{old_param}' (type: {type(old_param)})")
        
        # Clean and validate
        phone_number = clean_and_validate_phone(raw_phone)
        print(f"DEBUG: After clean_and_validate_phone: '{phone_number}'")
        
        status = request.args.get('status', 'all')
        print(f"DEBUG: Status parameter: '{status}'")

        if not phone_number:
            print("DEBUG: Phone number validation failed, returning error")
            return error_response("Invalid phone number format", 400)

        from app.models.userModel import User
        user = User.find_by_phone(phone_number)
        if not user:
            return error_response("User not found", 404)

        interests = UserInterestService.get_interests_received(user.id, status)

        response_data = {
            'interests': [interest.to_dict() for interest in interests],  # Removed include_user_details=True
            'total': len(interests),
            'status_filter': status
        }

        return success_response(response_data, "Interests retrieved successfully")

    except Exception as e:
        logger.error(f"Error getting user interests: {str(e)}")
        print(f"DEBUG: Exception occurred: {str(e)}")
        import traceback
        print(f"DEBUG: Traceback: {traceback.format_exc()}")
        return error_response("Internal server error", 500)

@user_interest_bp.route('/sent', methods=['GET'])
def get_interests_sent():
    try:
        phone_number = clean_and_validate_phone(request.args.get('phone_number'))
        status = request.args.get('status', 'all')

        if not phone_number:
            return error_response("Invalid phone number format", 400)

        from app.models.userModel import User
        user = User.find_by_phone(phone_number)
        if not user:
            return error_response("User not found", 404)

        interests = UserInterestService.get_interests_sent(user.id, status)

        response_data = {
            'interests': [interest.to_dict() for interest in interests],  # Removed include_user_details=True
            'total': len(interests),
            'status_filter': status
        }

        return success_response(response_data, "Sent interests retrieved successfully")

    except Exception as e:
        logger.error(f"Error getting sent interests: {str(e)}")
        return error_response("Internal server error", 500)

@user_interest_bp.route('/pending-notifications', methods=['GET'])
def get_pending_notifications():
    try:
        pending_interests = UserInterestService.get_pending_notifications()

        response_data = {
            'interests': [interest.to_dict() for interest in pending_interests],  # Removed include_user_details=True
            'total': len(pending_interests)
        }

        return success_response(response_data, "Pending notifications retrieved successfully")

    except Exception as e:
        logger.error(f"Error getting pending notifications: {str(e)}")
        return error_response("Internal server error", 500)

@user_interest_bp.route('/pending-feedback', methods=['GET'])
def get_pending_feedback():
    try:
        pending_interests = UserInterestService.get_pending_feedback()

        response_data = {
            'interests': [interest.to_dict() for interest in pending_interests],  # Removed include_user_details=True
            'total': len(pending_interests)
        }

        return success_response(response_data, "Pending feedback retrieved successfully")

    except Exception as e:
        logger.error(f"Error getting pending feedback: {str(e)}")
        return error_response("Internal server error", 500)

@user_interest_bp.route('/mutual-matches', methods=['GET'])
def get_mutual_matches():
    try:
        phone_number = clean_and_validate_phone(request.args.get('phone_number'))

        if not phone_number:
            return error_response("Invalid phone number format", 400)

        from app.models.userModel import User
        user = User.find_by_phone(phone_number)
        if not user:
            return error_response("User not found", 404)

        mutual_matches = UserInterestService.get_mutual_matches(user.id)

        response_data = {
            'matches': mutual_matches,
            'total': len(mutual_matches)
        }

        return success_response(response_data, "Mutual matches retrieved successfully")

    except Exception as e:
        logger.error(f"Error getting mutual matches: {str(e)}")
        return error_response("Internal server error", 500)

@user_interest_bp.route('/<int:interest_id>', methods=['GET'])
def get_interest_details():
    try:
        interest_id = request.view_args['interest_id']
        interest = UserInterestService.get_interest_by_id(interest_id)

        if not interest:
            return error_response("Interest not found", 404)

        response_data = {
            'interest': interest.to_dict()  # Removed include_user_details=True
        }

        return success_response(response_data, "Interest details retrieved successfully")

    except Exception as e:
        logger.error(f"Error getting interest details: {str(e)}")
        return error_response("Internal server error", 500)