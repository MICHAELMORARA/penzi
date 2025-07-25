from flask import Blueprint, request, jsonify
from app.services.userService import UserService
from functools import wraps
import logging

# Constants
ALLOWED_GENDERS = ['male', 'female']
MIN_AGE = 18
MAX_AGE = 100

# Blueprint
user_bp = Blueprint('users', __name__, url_prefix='/api/users')

# logger
logger = logging.getLogger(__name__)

# Decorators
def validate_json(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        return f(*args, **kwargs)
    return decorated_function


def validate_required_fields(required_fields):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json()
            missing_fields = [
                field for field in required_fields if field not in data or not data[field]]
            if missing_fields:
                return jsonify({
                    'error': 'Missing required fields',
                    'missing_fields': missing_fields
                }), 422
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Routes
@user_bp.route('/register', methods=['POST'])
@validate_json
@validate_required_fields([
    'phone_number', 'name', 'age', 'gender', 'county', 'town',
    'level_of_education', 'profession', 'marital_status', 'religion',
    'ethnicity', 'self_description'
])
def register_user():
    try:
        data = request.get_json()
        age = data.get('age')
        gender = data.get('gender', '').strip().lower()
        self_description = data.get('self_description')

        if not isinstance(age, int) or age < MIN_AGE or age > MAX_AGE:
            return jsonify({'success': False, 'message': f'Age must be between {MIN_AGE} and {MAX_AGE}'}), 422

        if gender not in ALLOWED_GENDERS:
            return jsonify({'success': False, 'message': 'Gender must be either Male or Female'}), 422

        gender = gender.capitalize()

        if len(self_description) < 20:
            return jsonify({'success': False, 'message': 'Description must be at least 20 characters long'}), 422
        if len(self_description) > 1000:
            return jsonify({'success': False, 'message': 'Description must not exceed 1000 characters'}), 422

        phone_number = data.get('phone_number')
        user, message = UserService.get_user_by_phone(phone_number)
        if user:
            return jsonify({
                'success': True,
                'message': 'User already exists',
                'user': user.to_dict(),
                'registration_stage': user.registration_stage.value,
                'missing_fields': user.get_missing_fields()
            }), 200

        user, message = UserService.create_user(
            phone_number=phone_number,
            name=data.get('name'),
            age=age,
            gender=gender,
            county=data.get('county'),
            town=data.get('town'),
            level_of_education=data.get('level_of_education'),
            profession=data.get('profession'),
            marital_status=data.get('marital_status'),
            religion=data.get('religion'),
            ethnicity=data.get('ethnicity'),
            self_description=self_description
        )

        if not user:
            return jsonify({'success': False, 'message': message}), 400

        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'user': user.to_dict(),
            'registration_stage': user.registration_stage.value,
            'missing_fields': user.get_missing_fields()
        }), 201

    except Exception as e:
        logger.exception("Registration failed")
        return jsonify({'success': False, 'message': f'Registration failed: {str(e)}'}), 500


@user_bp.route('/complete-basic', methods=['POST'])
@validate_json
@validate_required_fields(['phone_number', 'name', 'age', 'gender', 'county', 'town'])
def complete_basic_registration():
    try:
        data = request.get_json()
        logger.info(f"Received complete-basic request with data: {data}")
        
        age = data.get('age')
        gender = data.get('gender', '').strip().lower()
        
        logger.info(f"Processing age: {age} (type: {type(age)}), gender: {gender}")

        # Age validation
        if not isinstance(age, int) or age < MIN_AGE or age > MAX_AGE:
            logger.warning(f"Age validation failed: {age}")
            return jsonify({'success': False, 'message': f'Age must be between {MIN_AGE} and {MAX_AGE}'}), 422

        # Gender validation  
        if gender not in ALLOWED_GENDERS:
            logger.warning(f"Gender validation failed: {gender}")
            return jsonify({'success': False, 'message': 'Gender must be either Male or Female'}), 422

        gender = gender.capitalize()
        logger.info(f"Validation passed. Calling UserService with gender: {gender}")

        # Call UserService
        user, message = UserService.complete_basic_registration(
            phone_number=data.get('phone_number'),
            name=data.get('name'),
            age=age,
            gender=gender,
            county=data.get('county'),
            town=data.get('town')
        )
        
        logger.info(f"UserService returned: user={user is not None}, message='{message}'")

        if not user:
            logger.warning(f"UserService failed: {message}")
            return jsonify({'success': False, 'message': message}), 400

        logger.info("Registration successful")
        return jsonify({
            'success': True,
            'message': message,
            'user': user.to_dict(),
            'registration_stage': user.registration_stage.value,
            'missing_fields': user.get_missing_fields()
        }), 200

    except Exception as e:
        logger.exception("Basic registration failed with exception")
        return jsonify({'success': False, 'message': f'Basic registration failed: {str(e)}'}), 500

@user_bp.route('/complete-details', methods=['POST'])
@validate_json
@validate_required_fields(['user_id', 'level_of_education', 'profession', 'marital_status', 'religion', 'ethnicity'])
def complete_detailed_registration():
    try:
        data = request.get_json()
        user, message = UserService.complete_detailed_registration(
            user_id=data.get('user_id'),
            level_of_education=data.get('level_of_education'),
            profession=data.get('profession'),
            marital_status=data.get('marital_status'),
            religion=data.get('religion'),
            ethnicity=data.get('ethnicity')
        )

        if not user:
            return jsonify({'success': False, 'message': message}), 400

        return jsonify({
            'success': True,
            'message': message,
            'user': user.to_dict(),
            'registration_stage': user.registration_stage.value,
            'missing_fields': user.get_missing_fields()
        }), 200

    except Exception as e:
        logger.exception("Detailed registration failed")
        return jsonify({'success': False, 'message': f'Detailed registration failed: {str(e)}'}), 500

@user_bp.route('/add-description', methods=['POST'])
@validate_json
@validate_required_fields(['user_id', 'self_description'])
def add_user_description():
    try:
        data = request.get_json()
        description = data.get('self_description')

        if len(description) < 10:
            return jsonify({'success': False, 'message': 'Description must be at least 10 characters long'}), 422
        if len(description) > 1000:
            return jsonify({'success': False, 'message': 'Description must not exceed 1000 characters'}), 422

        user, message = UserService.add_user_description(
            user_id=data.get('user_id'),
            description=description
        )

        if not user:
            return jsonify({'success': False, 'message': message}), 400

        return jsonify({
            'success': True,
            'message': message,
            'user': user.to_dict(),
            'registration_stage': user.registration_stage.value
        }), 200

    except Exception as e:
        logger.exception("Adding description failed")
        return jsonify({'success': False, 'message': f'Adding description failed: {str(e)}'}), 500

@user_bp.route('/profile/<int:user_id>', methods=['GET'])
def get_user_profile(user_id):
    try:
        user, message = UserService.get_user_by_id(user_id)

        if not user:
            return jsonify({'success': False, 'message': message}), 404

        return jsonify({'success': True, 'user': user.to_dict()}), 200

    except Exception as e:
        logger.exception("Get profile failed")
        return jsonify({'success': False, 'message': f'Failed to get profile: {str(e)}'}), 500

@user_bp.route('/profile/phone', methods=['POST'])
@validate_json
@validate_required_fields(['phone_number'])
def get_user_by_phone():
    try:
        data = request.get_json()
        phone_number = data.get('phone_number')
        user, message = UserService.get_user_by_phone(phone_number)

        if not user:
            return jsonify({'success': False, 'message': message}), 404

        return jsonify({
            'success': True,
            'user': user.to_dict(include_sensitive=True),
            'registration_stage': user.registration_stage.value,
            'missing_fields': user.get_missing_fields()
        }), 200

    except Exception as e:
        logger.exception("Get profile by phone failed")
        return jsonify({'success': False, 'message': f'Failed to get profile: {str(e)}'}), 500

@user_bp.route('/update/<int:user_id>', methods=['PUT'])
@validate_json
def update_user(user_id):
    try:
        data = request.get_json()
        update_data = {k: v for k, v in data.items() if v is not None and v != ''}

        if not update_data:
            return jsonify({'success': False, 'message': 'No valid data provided for update'}), 400

        user, message = UserService.update_user_details(user_id, **update_data)

        if not user:
            return jsonify({'success': False, 'message': message}), 400

        return jsonify({
            'success': True,
            'message': message,
            'user': user.to_dict(),
            'registration_stage': user.registration_stage.value
        }), 200

    except Exception as e:
        logger.exception("Update failed")
        return jsonify({'success': False, 'message': f'Update failed: {str(e)}'}), 500

@user_bp.route('/search', methods=['POST'])
@validate_json
def search_users():
    try:
        data = request.get_json()
        users, message = UserService.search_users(
            county=data.get('county'),
            town=data.get('town'),
            gender=data.get('gender'),
            age_min=data.get('age_min'),
            age_max=data.get('age_max'),
            exclude_user_id=data.get('exclude_user_id')
        )

        return jsonify({
            'success': True,
            'message': message,
            'users': [user.to_dict() for user in users],
            'count': len(users)
        }), 200

    except Exception as e:
        logger.exception("Search failed")
        return jsonify({'success': False, 'message': f'Search failed: {str(e)}'}), 500

@user_bp.route('/deactivate/<int:user_id>', methods=['PUT'])
def deactivate_user(user_id):
    try:
        user, message = UserService.deactivate_user(user_id)

        if not user:
            return jsonify({'success': False, 'message': message}), 404

        return jsonify({'success': True, 'message': message}), 200

    except Exception as e:
        logger.exception("Deactivation failed")
        return jsonify({'success': False, 'message': f'Deactivation failed: {str(e)}'}), 500

@user_bp.route('/activate/<int:user_id>', methods=['PUT'])
def activate_user(user_id):
    try:
        user, message = UserService.activate_user(user_id)

        if not user:
            return jsonify({'success': False, 'message': message}), 404

        return jsonify({'success': True, 'message': message}), 200

    except Exception as e:
        logger.exception("Activation failed")
        return jsonify({'success': False, 'message': f'Activation failed: {str(e)}'}), 500

@user_bp.route('/delete/<int:user_id>', methods=['DELETE', 'OPTIONS'])
def delete_user(user_id):
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200
        
    try:
        logger.info(f"Attempting to delete user with ID: {user_id}")
        success, message = UserService.delete_user(user_id)
        
        logger.info(f"Delete operation result: success={success}, message='{message}'")

        if not success:
            if "not found" in message.lower():
                return jsonify({'success': False, 'message': message}), 404
            else:
                return jsonify({'success': False, 'message': message}), 400

        return jsonify({'success': True, 'message': message}), 200

    except Exception as e:
        logger.exception("Deletion failed")
        return jsonify({'success': False, 'message': f'Deletion failed: {str(e)}'}), 500

@user_bp.route('/stats', methods=['GET'])
def get_user_stats():
    try:
        stats, message = UserService.get_user_stats()

        if not stats:
            return jsonify({'success': False, 'message': message}), 500

        return jsonify({'success': True, 'message': message, 'data': stats}), 200

    except Exception as e:
        logger.exception("Stats retrieval failed")
        return jsonify({'success': False, 'message': f'Failed to get stats: {str(e)}'}), 500

# Error handlers
@user_bp.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Endpoint not found'}), 404

@user_bp.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'success': False, 'message': 'Method not allowed'}), 405

@user_bp.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'message': 'Internal server error'}), 500
