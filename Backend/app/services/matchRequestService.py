from app.extensions import db
from app.models.matchRequestModel import MatchRequest
from app.models.userModel import User
from sqlalchemy import and_, or_
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

class MatchRequestService:
    
    @staticmethod
    def create_match_request(user_id, age_min, age_max, preferred_town, gender=None):
        """Create a new match request and find potential matches"""
        try:
            # Validate input
            if age_min > age_max:
                return {"error": "Minimum age cannot be greater than maximum age"}, 400
            
            if age_min < 18:
                return {"error": "Minimum age must be 18 or above"}, 400
                
            # Check if user exists and is active
            user = User.query.filter(User.id == user_id, User.is_active.is_(True)).first()
            if not user:
                return {"error": "User not found or inactive"}, 404
            
            # Check for existing active match request
            existing_request = MatchRequest.query.filter_by(
                user_id=user_id, 
                status='active'
            ).first()
            
            if existing_request:
                return {"error": "You already have an active match request"}, 400
            
            # Create the match request
            match_request = MatchRequest(
                user_id=user_id,
                age_min=age_min,
                age_max=age_max,
                preferred_town=preferred_town
            )
            
            # If gender is provided and the match request model supports it, set it
            if gender and hasattr(match_request, 'preferred_gender'):
                match_request.preferred_gender = gender
            
            db.session.add(match_request)
            db.session.commit()
            
            result = {
                "match_request": match_request.to_dict(),
                "message": f"Match request created for {preferred_town}"
            }
            
            logger.info(f"Created match request {match_request.id} for user {user_id}")
            return result, 201
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error creating match request: {str(e)}")
            return {"error": "Database error occurred"}, 500
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating match request: {str(e)}")
            return {"error": "An unexpected error occurred"}, 500
    
    @staticmethod
    def _find_matches(match_request, requesting_user):
        """Find potential matches based on criteria (placeholder, no match storage)"""
        try:
            # Determine opposite gender
            opposite_gender = 'Female' if requesting_user.gender == 'Male' else 'Male'
            
            # Build query for potential matches
            query = User.query.filter(
                User.id != requesting_user.id,  # Not the requesting user
                User.gender == opposite_gender,
                User.age >= match_request.age_min,
                User.age <= match_request.age_max,
                User.town.ilike(f'%{match_request.preferred_town}%'),
                User.is_active.is_(True),
                User.registration_stage == 'completed'
            )
            
            matches = query.all()
            logger.info(f"Found {len(matches)} potential matches for request")
            return matches  # Return matches but don't store them
            
        except Exception as e:
            logger.error(f"Error finding matches: {str(e)}")
            return []
    
    @staticmethod
    def get_match_request_by_id(request_id):
        """Get match request by ID"""
        try:
            match_request = MatchRequest.query.get(request_id)
            if not match_request:
                return {"error": "Match request not found"}, 404
            
            return {"match_request": match_request.to_dict()}, 200
            
        except Exception as e:
            logger.error(f"Error getting match request {request_id}: {str(e)}")
            return {"error": "An error occurred"}, 500
    
    @staticmethod
    def get_user_match_requests(user_id):
        """Get all match requests for a user"""
        try:
            match_requests = MatchRequest.query.filter_by(user_id=user_id).all()
            
            result = {
                "match_requests": [req.to_dict() for req in match_requests],
                "total": len(match_requests)
            }
            
            return result, 200
            
        except Exception as e:
            logger.error(f"Error getting match requests for user {user_id}: {str(e)}")
            return {"error": "An error occurred"}, 500
    
    @staticmethod
    def get_active_match_request(user_id):
        """Get user's active match request"""
        try:
            match_request = MatchRequest.query.filter_by(
                user_id=user_id, 
                status='active'
            ).first()
            
            if not match_request:
                return {"message": "No active match request found"}, 404
            
            return {"match_request": match_request.to_dict()}, 200
            
        except Exception as e:
            logger.error(f"Error getting active match request for user {user_id}: {str(e)}")
            return {"error": "An error occurred"}, 500
    
    @staticmethod
    def complete_match_request(request_id):
        """Mark a match request as completed"""
        try:
            match_request = MatchRequest.query.get(request_id)
            if not match_request:
                return {"error": "Match request not found"}, 404
            
            match_request.status = 'completed'
            db.session.commit()
            
            logger.info(f"Completed match request {request_id}")
            return {"message": "Match request completed successfully"}, 200
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error completing match request: {str(e)}")
            return {"error": "Database error occurred"}, 500
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error completing match request {request_id}: {str(e)}")
            return {"error": "An error occurred"}, 500
    
    @staticmethod
    def delete_match_request(request_id, user_id):
        """Delete a match request (only by owner)"""
        try:
            match_request = MatchRequest.query.filter_by(
                id=request_id, 
                user_id=user_id
            ).first()
            
            if not match_request:
                return {"error": "Match request not found or unauthorized"}, 404
            
            db.session.delete(match_request)
            db.session.commit()
            
            logger.info(f"Deleted match request {request_id}")
            return {"message": "Match request deleted successfully"}, 200
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error deleting match request: {str(e)}")
            return {"error": "Database error occurred"}, 500
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting match request {request_id}: {str(e)}")
            return {"error": "An error occurred"}, 500