from flask import Blueprint, request, jsonify
from app.services.matchService import MatchService
from app.utils.validators import validate_phone_number, validate_search_criteria
from app.utils.response_helper import success_response, error_response
from app.models.userModel import User
import logging

logger = logging.getLogger(__name__)

match_bp = Blueprint('matches', __name__, url_prefix='/api/matches')

@match_bp.route('/search', methods=['POST'])
def create_match_search():
   
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return error_response("Request body is required", 400)
        
        user_id = data.get('user_id')
        age_min = data.get('age_min')
        age_max = data.get('age_max')
        preferred_town = data.get('preferred_town')
        
        # Validate user_id is provided
        if not user_id:
            return error_response("user_id is required to determine opposite gender matches", 400)
        
        # Validate user exists
        user = User.find_by_id(user_id)
        if not user:
            return error_response("User not found", 404)
        
        # Check if user can search for matches
        if not user.can_search_matches():
            return error_response("User must complete registration to search for matches", 400)
        
        # Validate search criteria
        if not validate_search_criteria(age_min, age_max, preferred_town):
            return error_response("Invalid search criteria", 400)
        
        # Search criteria
        search_criteria = {
            'age_min': age_min,
            'age_max': age_max,
            'preferred_town': preferred_town
        }
        
        potential_matches = MatchService.find_matches_for_user(user_id, search_criteria)
        
        response_data = {
            'search_criteria': search_criteria,
            'total_matches': len(potential_matches),
            'matches': [match.to_detailed_profile() for match in potential_matches],
            'message': f"Found {len(potential_matches)} potential matches"
        }
        
        return success_response(response_data, "Match search completed successfully")
        
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        logger.error(f"Error searching for matches: {str(e)}")
        return error_response("Internal server error", 500)

# Keep your other routes unchanged
@match_bp.route('/browse', methods=['GET'])
def browse_matches():
   
    try:
        # Get query parameters
        age_min = request.args.get('age_min', type=int)
        age_max = request.args.get('age_max', type=int)
        preferred_town = request.args.get('preferred_town')
        limit = int(request.args.get('limit', 10))
        page = int(request.args.get('page', 1))
        
        # Search criteria if filters are provided
        search_criteria = {}
        if age_min is not None and age_max is not None and preferred_town:
            if not validate_search_criteria(age_min, age_max, preferred_town):
                return error_response("Invalid search criteria", 400)
            
            search_criteria = {
                'age_min': age_min,
                'age_max': age_max,
                'preferred_town': preferred_town
            }
        
        # Matches with pagination
        if search_criteria:
            matches = MatchService.find_matches_by_criteria_paginated(search_criteria, page, limit)
        else:
            matches = MatchService.get_all_matches_paginated(page, limit)
        
        response_data = {
            'matches': [match.to_dict() for match in matches['items']],
            'pagination': {
                'page': page,
                'per_page': limit,
                'total': matches['total'],
                'pages': matches['pages']
            },
            'search_criteria': search_criteria if search_criteria else None
        }
        
        return success_response(response_data, "Matches retrieved successfully")
        
    except Exception as e:
        logger.error(f"Error browsing matches: {str(e)}")
        return error_response("Internal server error", 500)