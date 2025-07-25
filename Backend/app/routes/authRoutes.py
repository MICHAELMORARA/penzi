from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, 
    get_jwt_identity, get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import os
import uuid
from app.extensions import db
from app.models.userModel import User, Gender, RegistrationStage
from app.utils.validators import validate_email, validate_password, validate_phone_number
from app.utils.file_upload import save_uploaded_file

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Store blacklisted tokens (in production, use Redis)
blacklisted_tokens = set()

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user with email and password"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'firstName', 'lastName', 'username', 'age']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'{field} is required'}), 400
        
        # Convert and validate age FIRST to avoid type issues
        try:
            # Handle both string and number inputs from frontend
            age_value = data['age']
            if isinstance(age_value, str):
                age = int(age_value)
            else:
                age = int(age_value)
            
            if age < 18:
                return jsonify({'message': 'You must be at least 18 years old'}), 400
            if age > 100:
                return jsonify({'message': 'Please enter a valid age'}), 400
        except (ValueError, TypeError):
            return jsonify({'message': 'Age must be a valid number'}), 400
        
        # Validate email format
        if not validate_email(data['email']):
            return jsonify({'message': 'Invalid email format'}), 400
        
        # Validate password strength
        password_validation = validate_password(data['password'])
        if not password_validation['valid']:
            return jsonify({'message': password_validation['message']}), 400
        
        # Check if user already exists
        existing_user = User.query.filter(
            (User.email == data['email']) | 
            (User.username == data['username'])
        ).first()
        
        if existing_user:
            if existing_user.email == data['email']:
                return jsonify({'message': 'Email already registered'}), 409
            else:
                return jsonify({'message': 'Username already taken'}), 409
        
        # Create new user
        user = User(
            email=data['email'],
            username=data['username'],
            password_hash=generate_password_hash(data['password']),
            first_name=data['firstName'],
            last_name=data['lastName'],
            age=age,  # Use the converted integer age
            role=data.get('role', 'user'),
            is_verified=False,
            is_premium=False,
            registration_stage=RegistrationStage.COMPLETED,
            is_activated=True,
            created_at=datetime.utcnow()
        )
        
        # Add optional fields
        if data.get('bio'):
            user.bio = data['bio']
        if data.get('location'):
            user.location = data['location']
        if data.get('interests'):
            user.interests = ','.join(data['interests']) if isinstance(data['interests'], list) else data['interests']
        
        db.session.add(user)
        db.session.commit()
        
        # Create tokens
        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(days=7)
        )
        refresh_token = create_refresh_token(
            identity=str(user.id),
            expires_delta=timedelta(days=30)
        )
        
        return jsonify({
            'user': user.to_auth_dict(),
            'token': access_token,
            'refreshToken': refresh_token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Registration failed: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user with email and password"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('email') or not data.get('password'):
            return jsonify({'message': 'Email and password are required'}), 400
        
        # Find user by email
        user = User.query.filter_by(email=data['email']).first()
        
        if not user or not check_password_hash(user.password_hash, data['password']):
            return jsonify({'message': 'Invalid email or password'}), 401
        
        # Check if user is active
        if not user.is_active:
            return jsonify({'message': 'Account is deactivated'}), 401
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create tokens
        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(days=7)
        )
        refresh_token = create_refresh_token(
            identity=str(user.id),
            expires_delta=timedelta(days=30)
        )
        
        return jsonify({
            'user': user.to_auth_dict(),
            'token': access_token,
            'refreshToken': refresh_token
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Login failed: {str(e)}'}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active:
            return jsonify({'message': 'User not found or inactive'}), 404
        
        # Create new access token
        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(days=7)
        )
        
        return jsonify({'token': access_token}), 200
        
    except Exception as e:
        return jsonify({'message': f'Token refresh failed: {str(e)}'}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user information"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        return jsonify(user.to_auth_dict()), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get user: {str(e)}'}), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        allowed_fields = ['firstName', 'lastName', 'bio', 'age', 'location']
        for field in allowed_fields:
            if field in data:
                if field == 'firstName':
                    user.first_name = data[field]
                elif field == 'lastName':
                    user.last_name = data[field]
                elif field == 'bio':
                    user.bio = data[field]
                elif field == 'age':
                    try:
                        age_value = data[field]
                        age = int(age_value) if isinstance(age_value, (str, int, float)) else int(str(age_value))
                        if age < 18:
                            return jsonify({'message': 'Age must be at least 18'}), 400
                        if age > 100:
                            return jsonify({'message': 'Please enter a valid age'}), 400
                        user.age = age
                    except (ValueError, TypeError):
                        return jsonify({'message': 'Age must be a valid number'}), 400
                elif field == 'location':
                    user.location = data[field]
        
        # Handle interests
        if 'interests' in data:
            if isinstance(data['interests'], list):
                user.interests = ','.join(data['interests'])
            else:
                user.interests = data['interests']
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(user.to_auth_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Profile update failed: {str(e)}'}), 500

@auth_bp.route('/upload-profile-picture', methods=['POST'])
@jwt_required()
def upload_profile_picture():
    """Upload user profile picture"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        if 'profilePicture' not in request.files:
            return jsonify({'message': 'No file provided'}), 400
        
        file = request.files['profilePicture']
        
        # Check if file has a filename
        if not file.filename or file.filename == '':
            return jsonify({'message': 'No file selected'}), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        if '.' not in file.filename:
            return jsonify({'message': 'Invalid file type. Only PNG, JPG, JPEG, and GIF are allowed'}), 400
        
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        if file_extension not in allowed_extensions:
            return jsonify({'message': 'Invalid file type. Only PNG, JPG, JPEG, and GIF are allowed'}), 400
        
        # Save file
        filename = save_uploaded_file(file, 'profile_pictures')
        
        # Update user profile picture
        user.profile_picture = f'/uploads/profile_pictures/{filename}'
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'profilePicture': user.profile_picture}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'File upload failed: {str(e)}'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user and blacklist token"""
    try:
        jti = get_jwt()['jti']
        blacklisted_tokens.add(jti)
        return jsonify({'message': 'Successfully logged out'}), 200
    except Exception as e:
        return jsonify({'message': f'Logout failed: {str(e)}'}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset email"""
    try:
        data = request.get_json()
        
        if not data.get('email'):
            return jsonify({'message': 'Email is required'}), 400
        
        user = User.query.filter_by(email=data['email']).first()
        
        if not user:
            # Don't reveal if email exists or not for security
            return jsonify({'message': 'If the email exists, a reset link has been sent'}), 200
        
        # Generate reset token (in production, send email)
        reset_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(hours=1),
            additional_claims={'type': 'password_reset'}
        )
        
        # TODO: Send email with reset token
        # For now, just return success message
        return jsonify({'message': 'Password reset link sent to your email'}), 200
        
    except Exception as e:
        return jsonify({'message': f'Password reset failed: {str(e)}'}), 500

@auth_bp.route('/reset-password', methods=['POST'])
@jwt_required()
def reset_password():
    """Reset password with token"""
    try:
        data = request.get_json()
        
        if not data.get('password'):
            return jsonify({'message': 'New password is required'}), 400
        
        # Validate password strength
        password_validation = validate_password(data['password'])
        if not password_validation['valid']:
            return jsonify({'message': password_validation['message']}), 400
        
        # Verify token type
        claims = get_jwt()
        if claims.get('type') != 'password_reset':
            return jsonify({'message': 'Invalid reset token'}), 401
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Update password
        user.password_hash = generate_password_hash(data['password'])
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'message': 'Password reset successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Password reset failed: {str(e)}'}), 500

# JWT token blacklist checker
@auth_bp.before_app_request
def check_if_token_revoked():
    """Check if JWT token is blacklisted"""
    try:
        if request.endpoint and 'auth' in request.endpoint:
            return
        
        # This will be called for all JWT protected routes
        jti = get_jwt().get('jti')
        if jti in blacklisted_tokens:
            return jsonify({'message': 'Token has been revoked'}), 401
    except:
        pass

# Third-party authentication endpoints
@auth_bp.route('/google', methods=['POST'])
def google_auth():
    """Authenticate with Google OAuth"""
    try:
        data = request.get_json()
        
        if not data.get('token'):
            return jsonify({'message': 'Google token is required'}), 400
        
        # TODO: Verify Google token and get user info
        # For now, return placeholder response
        return jsonify({'message': 'Google authentication not yet implemented'}), 501
        
    except Exception as e:
        return jsonify({'message': f'Google authentication failed: {str(e)}'}), 500

@auth_bp.route('/facebook', methods=['POST'])
def facebook_auth():
    """Authenticate with Facebook OAuth"""
    try:
        data = request.get_json()
        
        if not data.get('token'):
            return jsonify({'message': 'Facebook token is required'}), 400
        
        # TODO: Verify Facebook token and get user info
        # For now, return placeholder response
        return jsonify({'message': 'Facebook authentication not yet implemented'}), 501
        
    except Exception as e:
        return jsonify({'message': f'Facebook authentication failed: {str(e)}'}), 500