from flask import Blueprint, request, jsonify
from app.services.matchRequestService import MatchRequestService
from functools import wraps
import logging

logger = logging.getLogger(__name__)

match_request_bp = Blueprint('match_requests', __name__, url_prefix='/api/match-requests')

def validate_json(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
        return f(*args, **kwargs)
    return decorated_function

def validate_required_fields(required_fields):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json()
            missing_fields = [field for field in required_fields if field not in data or data[field] is None]
            if missing_fields:
                return jsonify({
                    "error": f"Missing required fields: {', '.join(missing_fields)}"
                }), 400
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@match_request_bp.route('/', methods=['POST'])
@validate_json
@validate_required_fields(['user_id', 'age_min', 'age_max', 'town', 'gender'])
def create_match_request():
    try:
        data = request.get_json()
        
        # Extract and validate data
        user_id = data.get('user_id')
        age_min = data.get('age_min')
        age_max = data.get('age_max')
        town = data.get('town', '').strip()
        gender = data.get('gender', '').strip().lower()
        
        # Basic validation
        if not isinstance(user_id, int) or user_id <= 0:
            return jsonify({"error": "Invalid user_id"}), 400
        
        if not isinstance(age_min, int) or not isinstance(age_max, int):
            return jsonify({"error": "Age must be integers"}), 400
        
        if not town:
            return jsonify({"error": "Town cannot be empty"}), 400
            
        # Gender validation
        if gender not in ['male', 'female']:
            return jsonify({"error": "Gender must be 'male' or 'female'"}), 400
        
        gender = gender.capitalize()
        
        # Create match request
        result, status_code = MatchRequestService.create_match_request(
            user_id=user_id,
            age_min=age_min,
            age_max=age_max,
            preferred_town=town,
            gender=gender
        )
        
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Error in create_match_request endpoint: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@match_request_bp.route('/<int:request_id>', methods=['GET'])
def get_match_request(request_id):
    """Get match request by ID"""
    try:
        result, status_code = MatchRequestService.get_match_request_by_id(request_id)
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Error in get_match_request endpoint: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@match_request_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_match_requests(user_id):
    """Get all match requests for a user"""
    try:
        result, status_code = MatchRequestService.get_user_match_requests(user_id)
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Error in get_user_match_requests endpoint: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@match_request_bp.route('/user/<int:user_id>/active', methods=['GET'])
def get_active_match_request(user_id):
    """Get user's active match request"""
    try:
        result, status_code = MatchRequestService.get_active_match_request(user_id)
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Error in get_active_match_request endpoint: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@match_request_bp.route('/<int:request_id>/complete', methods=['PUT'])
def complete_match_request(request_id):
    """Mark a match request as completed"""
    try:
        result, status_code = MatchRequestService.complete_match_request(request_id)
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Error in complete_match_request endpoint: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@match_request_bp.route('/<int:request_id>', methods=['DELETE'])
@validate_json
@validate_required_fields(['user_id'])
def delete_match_request(request_id):
    """Delete a match request (only by owner)"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not isinstance(user_id, int) or user_id <= 0:
            return jsonify({"error": "Invalid user_id"}), 400
        
        result, status_code = MatchRequestService.delete_match_request(request_id, user_id)
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Error in delete_match_request endpoint: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@match_request_bp.route('/search', methods=['POST'])
@validate_json
@validate_required_fields(['age_min', 'age_max', 'town', 'user_id'])
def search_potential_matches():
    """Search for potential matches based on criteria and opposite gender"""
    try:
        data = request.get_json()
        
        age_min = data.get('age_min')
        age_max = data.get('age_max')
        town = data.get('town', '').strip()
        user_id = data.get('user_id')  # NEW: Required to determine opposite gender
        
        # Basic validation
        if not isinstance(age_min, int) or not isinstance(age_max, int):
            return jsonify({"error": "Age must be integers"}), 400
        
        if not isinstance(user_id, int) or user_id <= 0:
            return jsonify({"error": "Invalid user_id"}), 400
        
        if age_min > age_max:
            return jsonify({"error": "Minimum age cannot be greater than maximum age"}), 400
        
        if age_min < 18:
            return jsonify({"error": "Minimum age must be 18 or above"}), 400
        
        if not town:
            return jsonify({"error": "Town cannot be empty"}), 400
        
        from app.models.userModel import User, Gender, RegistrationStage
        from sqlalchemy import and_
        
        # Get the searching user to determine their gender
        searching_user = User.query.get(user_id)
        if not searching_user:
            return jsonify({"error": "User not found"}), 404
        
        # Determine opposite gender
        if searching_user.gender == Gender.MALE:
            target_gender = Gender.FEMALE
        elif searching_user.gender == Gender.FEMALE:
            target_gender = Gender.MALE
        else:
            return jsonify({"error": "User gender not properly set"}), 400
        
        # Find potential matches with proper filtering
        potential_matches = User.query.filter(
            and_(
                User.town == town,
                User.age >= age_min,
                User.age <= age_max,
                User.gender == target_gender,  # Only opposite gender
                User.registration_stage == RegistrationStage.COMPLETED,  # Only completed profiles
                User.id != user_id  # Exclude the searching user
            )
        ).all()
        
        # Get gender distribution for additional info
        gender_counts = {}
        for user in potential_matches:
            gender_str = target_gender.name.lower()
            gender_counts[gender_str] = gender_counts.get(gender_str, 0) + 1
        
        # Create detailed match profiles
        match_profiles = []
        for user in potential_matches:
            match_profiles.append({
                'id': user.id,
                'name': user.name,
                'age': user.age,
                'town': user.town,
                'gender': user.gender.name if hasattr(user.gender, 'name') else str(user.gender),
                'bio': getattr(user, 'bio', None),
                'interests': getattr(user, 'interests', None)
            })
        
        result = {
            "potential_matches": len(potential_matches),
            "search_criteria": {
                "age_min": age_min,
                "age_max": age_max,
                "town": town,
                "searching_user_gender": searching_user.gender.name,
                "target_gender": target_gender.name
            },
            "matches": match_profiles,
            "message": f"Found {len(potential_matches)} potential {target_gender.name.lower()} matches in {town} (ages {age_min}-{age_max})",
            "gender_distribution": gender_counts
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error in search_potential_matches endpoint: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

# Error handlers
@match_request_bp.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@match_request_bp.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405

@match_request_bp.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500