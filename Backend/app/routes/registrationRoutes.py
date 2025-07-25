from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.extensions import db
from app.models.userModel import User, Gender, RegistrationStage
from app.utils.file_upload import save_uploaded_file

registration_bp = Blueprint('registration', __name__, url_prefix='/api/registration')

@registration_bp.route('/complete', methods=['POST'])
@jwt_required()
def complete_registration():
    """Complete user registration with all profile details"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update user with registration data
        if 'firstName' in data:
            user.first_name = data['firstName']
        if 'lastName' in data:
            user.last_name = data['lastName']
        if 'age' in data:
            try:
                age = int(data['age'])
                if age < 18:
                    return jsonify({'message': 'Age must be at least 18'}), 400
                if age > 100:
                    return jsonify({'message': 'Please enter a valid age'}), 400
                user.age = age
            except (ValueError, TypeError):
                return jsonify({'message': 'Age must be a valid number'}), 400
        
        if 'gender' in data:
            try:
                user.gender = Gender(data['gender'])
            except ValueError:
                return jsonify({'message': 'Invalid gender value'}), 400
        
        if 'county' in data:
            user.county = data['county']
        if 'town' in data:
            user.town = data['town']
        if 'levelOfEducation' in data:
            user.level_of_education = data['levelOfEducation']
        if 'profession' in data:
            user.profession = data['profession']
        if 'maritalStatus' in data:
            user.marital_status = data['maritalStatus']
        if 'religion' in data:
            user.religion = data['religion']
        if 'ethnicity' in data:
            user.ethnicity = data['ethnicity']
        if 'selfDescription' in data:
            user.self_description = data['selfDescription']
            user.bio = data['selfDescription']  # Also set bio for web users
        
        # Mark registration as completed
        user.registration_stage = RegistrationStage.COMPLETED
        user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Registration completed successfully',
            'user': user.to_auth_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Registration completion failed: {str(e)}'}), 500

@registration_bp.route('/upload-photos', methods=['POST'])
@jwt_required()
def upload_photos():
    """Upload multiple photos for user profile"""
    try:
        from app.models.userPhotoModel import UserPhoto
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        if 'photos' not in request.files:
            return jsonify({'message': 'No photos provided'}), 400
        
        files = request.files.getlist('photos')
        
        # Check current photo count
        current_photo_count = UserPhoto.count_user_photos(current_user_id)
        if current_photo_count + len(files) > 6:
            return jsonify({'message': f'Maximum 6 photos allowed. You currently have {current_photo_count} photos.'}), 400
        
        uploaded_photos = []
        
        for i, file in enumerate(files):
            if file.filename == '':
                continue
                
            # Validate file type
            allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
            if '.' not in file.filename:
                return jsonify({'message': f'Invalid file type for photo {i+1}'}), 400
            
            file_extension = file.filename.rsplit('.', 1)[1].lower()
            if file_extension not in allowed_extensions:
                return jsonify({'message': f'Invalid file type for photo {i+1}. Only PNG, JPG, JPEG, GIF, and WEBP are allowed'}), 400
            
            # Save file
            filename = save_uploaded_file(file, 'profile_photos')
            photo_url = f'/uploads/profile_photos/{filename}'
            
            # Create UserPhoto record
            is_primary = (current_photo_count == 0 and i == 0)  # First photo is primary if user has no photos
            upload_order = current_photo_count + i + 1
            
            user_photo = UserPhoto(
                user_id=current_user_id,
                photo_url=photo_url,
                is_primary=is_primary,
                upload_order=upload_order
            )
            user_photo.save()
            
            uploaded_photos.append(user_photo.to_dict())
            
            # Set first photo as profile picture if it's the primary photo
            if is_primary:
                user.profile_picture = photo_url
        
        # Update user's registration stage if they're on photos stage
        if user.registration_stage == RegistrationStage.STAGE_7_DESCRIPTION:
            user.registration_stage = RegistrationStage.STAGE_8_PHOTOS
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Get backend base URL from environment or use default
        import os
        backend_base_url = os.environ.get('BACKEND_BASE_URL', 'http://localhost:5000')
        
        # Convert relative photo URLs to full URLs in uploaded_photos
        photos_with_full_urls = []
        for photo_dict in uploaded_photos:
            if photo_dict['photoUrl'].startswith('/'):
                photo_dict['photoUrl'] = f"{backend_base_url}{photo_dict['photoUrl']}"
            photos_with_full_urls.append(photo_dict)
        
        # Convert profile picture URL to full URL if it exists
        profile_picture_url = user.profile_picture
        if profile_picture_url and profile_picture_url.startswith('/'):
            profile_picture_url = f"{backend_base_url}{profile_picture_url}"
        
        return jsonify({
            'message': 'Photos uploaded successfully',
            'photos': photos_with_full_urls,
            'profilePicture': profile_picture_url,
            'totalPhotos': UserPhoto.count_user_photos(current_user_id)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Photo upload failed: {str(e)}'}), 500

@registration_bp.route('/stage', methods=['GET'])
@jwt_required()
def get_registration_stage():
    """Get current registration stage for user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        stage_info = user.get_current_stage_info()
        
        return jsonify({
            'currentStage': user.registration_stage.value,
            'stageInfo': stage_info,
            'progress': user.get_registration_progress()
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get registration stage: {str(e)}'}), 500

@registration_bp.route('/advance', methods=['POST'])
@jwt_required()
def advance_registration_stage():
    """Advance to next registration stage with provided data"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        data = request.get_json()
        
        # Advance to next stage
        user.advance_registration_stage(data)
        
        return jsonify({
            'message': 'Registration stage advanced successfully',
            'currentStage': user.registration_stage.value,
            'stageInfo': user.get_current_stage_info(),
            'progress': user.get_registration_progress()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to advance registration stage: {str(e)}'}), 500

@registration_bp.route('/photos', methods=['GET'])
@jwt_required()
def get_user_photos():
    """Get all photos for the current user"""
    try:
        from app.models.userPhotoModel import UserPhoto
        import os
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        photos = UserPhoto.get_user_photos(current_user_id)
        
        # Get backend base URL from environment or use default
        backend_base_url = os.environ.get('BACKEND_BASE_URL', 'http://localhost:5000')
        
        # Convert relative photo URLs to full URLs
        photos_with_full_urls = []
        for photo in photos:
            photo_dict = photo.to_dict()
            if photo_dict['photoUrl'].startswith('/'):
                photo_dict['photoUrl'] = f"{backend_base_url}{photo_dict['photoUrl']}"
            photos_with_full_urls.append(photo_dict)
        
        # Convert profile picture URL to full URL if it exists
        profile_picture_url = user.profile_picture
        if profile_picture_url and profile_picture_url.startswith('/'):
            profile_picture_url = f"{backend_base_url}{profile_picture_url}"
        
        return jsonify({
            'photos': photos_with_full_urls,
            'totalPhotos': len(photos),
            'profilePicture': profile_picture_url
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get photos: {str(e)}'}), 500

@registration_bp.route('/photos/<int:photo_id>', methods=['DELETE'])
@jwt_required()
def delete_photo(photo_id):
    """Delete a specific photo"""
    try:
        from app.models.userPhotoModel import UserPhoto
        import os
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        photo = UserPhoto.query.filter_by(id=photo_id, user_id=current_user_id).first()
        
        if not photo:
            return jsonify({'message': 'Photo not found'}), 404
        
        was_primary = photo.is_primary
        photo_url = photo.photo_url
        
        # Delete the photo record
        photo.delete()
        
        # If this was the primary photo, set another photo as primary
        if was_primary:
            remaining_photos = UserPhoto.get_user_photos(current_user_id)
            if remaining_photos:
                remaining_photos[0].mark_as_primary()
                user.profile_picture = remaining_photos[0].photo_url
            else:
                user.profile_picture = None
        
        # Update user if this was their profile picture
        if user.profile_picture == photo_url:
            remaining_photos = UserPhoto.get_user_photos(current_user_id)
            user.profile_picture = remaining_photos[0].photo_url if remaining_photos else None
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Try to delete the actual file (optional, don't fail if it doesn't work)
        try:
            if photo_url.startswith('/uploads/'):
                file_path = os.path.join('uploads', photo_url.replace('/uploads/', ''))
                if os.path.exists(file_path):
                    os.remove(file_path)
        except Exception as file_error:
            print(f"Warning: Could not delete file {photo_url}: {file_error}")
        
        # Get backend base URL from environment or use default
        backend_base_url = os.environ.get('BACKEND_BASE_URL', 'http://localhost:5000')
        
        # Convert profile picture URL to full URL if it exists
        profile_picture_url = user.profile_picture
        if profile_picture_url and profile_picture_url.startswith('/'):
            profile_picture_url = f"{backend_base_url}{profile_picture_url}"
        
        return jsonify({
            'message': 'Photo deleted successfully',
            'profilePicture': profile_picture_url
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete photo: {str(e)}'}), 500

@registration_bp.route('/photos/<int:photo_id>/primary', methods=['POST'])
@jwt_required()
def set_primary_photo(photo_id):
    """Set a photo as the primary profile picture"""
    try:
        from app.models.userPhotoModel import UserPhoto
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        photo = UserPhoto.query.filter_by(id=photo_id, user_id=current_user_id).first()
        
        if not photo:
            return jsonify({'message': 'Photo not found'}), 404
        
        # Set this photo as primary
        photo.mark_as_primary()
        
        # Update user's profile picture
        user.profile_picture = photo.photo_url
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Get backend base URL from environment or use default
        import os
        backend_base_url = os.environ.get('BACKEND_BASE_URL', 'http://localhost:5000')
        
        # Convert profile picture URL to full URL if it exists
        profile_picture_url = user.profile_picture
        if profile_picture_url and profile_picture_url.startswith('/'):
            profile_picture_url = f"{backend_base_url}{profile_picture_url}"
        
        return jsonify({
            'message': 'Primary photo updated successfully',
            'profilePicture': profile_picture_url
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to set primary photo: {str(e)}'}), 500