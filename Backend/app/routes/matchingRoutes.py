from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.userModel import User
from app.models.matchRequestModel import MatchRequest
from app.models.matchModel import Match
from app.models.userInterestModel import UserInterest
from datetime import datetime

matching_bp = Blueprint('matching', __name__, url_prefix='/api/matching')

@matching_bp.route('/request', methods=['POST'])
@jwt_required()
def create_match_request():
    """Create a new match request (equivalent to match#20-25#town SMS command)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['ageMin', 'ageMax', 'preferredTown']
        for field in required_fields:
            if field not in data:
                return jsonify({'message': f'{field} is required'}), 400
        
        age_min = int(data['ageMin'])
        age_max = int(data['ageMax'])
        preferred_town = data['preferredTown'].strip()
        
        # Validate age range
        if age_min < 18 or age_max > 100:
            return jsonify({'message': 'Age must be between 18 and 100'}), 400
        
        if age_min >= age_max:
            return jsonify({'message': 'Minimum age must be less than maximum age'}), 400
        
        # Create or update match request
        existing_request = MatchRequest.query.filter_by(user_id=current_user_id).first()
        
        if existing_request:
            # Update existing request
            existing_request.age_min = age_min
            existing_request.age_max = age_max
            existing_request.preferred_town = preferred_town
            existing_request.created_at = datetime.utcnow()
        else:
            # Create new request
            match_request = MatchRequest(
                user_id=current_user_id,
                age_min=age_min,
                age_max=age_max,
                preferred_town=preferred_town
            )
            db.session.add(match_request)
        
        db.session.commit()
        
        # Find potential matches
        potential_matches = User.get_potential_matches(
            requester_id=current_user_id,
            age_min=age_min,
            age_max=age_max,
            preferred_town=preferred_town
        )
        
        return jsonify({
            'message': 'Match request created successfully',
            'matchCount': len(potential_matches),
            'request': {
                'ageMin': age_min,
                'ageMax': age_max,
                'preferredTown': preferred_town
            }
        }), 200
        
    except ValueError as e:
        return jsonify({'message': 'Invalid age values'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to create match request: {str(e)}'}), 500

@matching_bp.route('/profiles', methods=['GET'])
@jwt_required()
def get_match_profiles():
    """Get profiles for swiping based on user's match request"""
    try:
        current_user_id = get_jwt_identity()
        print(f"Getting profiles for user ID: {current_user_id}")
        
        # Check if user wants to include already swiped profiles
        include_swiped = request.args.get('include_swiped', 'false').lower() == 'true'
        print(f"Include swiped profiles: {include_swiped}")
        
        user = User.query.get(current_user_id)
        
        if not user:
            print(f"User not found: {current_user_id}")
            return jsonify({'message': 'User not found'}), 404
        
        print(f"User found: {user.first_name} {user.last_name}")
        
        # Get user's match request
        match_request = MatchRequest.query.filter_by(user_id=current_user_id).first()
        
        if not match_request:
            print("No match request found")
            return jsonify({'message': 'No match request found. Please create a match request first.'}), 400
        
        print(f"Match request found: age {match_request.age_min}-{match_request.age_max}, town: {match_request.preferred_town}")
        
        # Get potential matches
        try:
            potential_matches = User.get_potential_matches(
                requester_id=current_user_id,
                age_min=match_request.age_min,
                age_max=match_request.age_max,
                preferred_town=match_request.preferred_town
            )
            print(f"Found {len(potential_matches)} potential matches")
        except Exception as e:
            print(f"Error getting potential matches: {str(e)}")
            return jsonify({'message': f'Error finding matches: {str(e)}'}), 500
        
        # Get users that have already been swiped on
        swiped_user_ids = set()
        swiped_user_info = {}
        
        try:
            # Get existing interests (swipes)
            existing_interests = UserInterest.query.filter_by(interested_user_id=current_user_id).all()
            for interest in existing_interests:
                swiped_user_ids.add(interest.target_user_id)
                swiped_user_info[interest.target_user_id] = {
                    'action': 'like' if interest.interest_type == 'details' else 'pass',
                    'swipedAt': interest.created_at.isoformat()
                }
            print(f"User has already swiped on {len(swiped_user_ids)} users")
        except Exception as e:
            print(f"Error getting existing interests: {str(e)}")
            # Continue without filtering swiped users
        
        # Filter profiles based on include_swiped parameter
        if include_swiped:
            # Include all profiles, but mark which ones were swiped
            filtered_matches = potential_matches
            print(f"Including all {len(filtered_matches)} profiles (swiped and unswiped)")
        else:
            # Only include unswiped profiles (default behavior)
            filtered_matches = [
                match for match in potential_matches 
                if match.id not in swiped_user_ids
            ]
            print(f"Found {len(filtered_matches)} unswiped matches")
        
        # Convert to swipe profile format
        profiles = []
        for match in filtered_matches[:20]:  # Limit to 20 profiles
            try:
                profile = match.to_swipe_profile()
                
                # Add swipe history if profile was previously swiped
                if match.id in swiped_user_info:
                    profile['previousSwipe'] = swiped_user_info[match.id]
                    profile['isRevisit'] = True
                else:
                    profile['isRevisit'] = False
                
                profiles.append(profile)
                status = "(revisit)" if profile.get('isRevisit') else "(new)"
                print(f"Added profile: {profile.get('firstName', 'Unknown')} {profile.get('lastName', '')} {status}")
            except Exception as e:
                print(f"Error converting user {match.id} to swipe profile: {str(e)}")
                # Skip this user and continue
                continue
        
        print(f"Returning {len(profiles)} profiles")
        
        return jsonify({
            'profiles': profiles,
            'total': len(profiles),
            'hasMore': len(filtered_matches) > 20,
            'includeSwiped': include_swiped,
            'totalSwiped': len(swiped_user_ids),
            'totalUnswiped': len(potential_matches) - len(swiped_user_ids)
        }), 200
        
    except Exception as e:
        print(f"Error in get_match_profiles: {str(e)}")
        import traceback
        traceback.print_exc()
        # Rollback any pending transaction
        db.session.rollback()
        return jsonify({'message': f'Failed to get profiles: {str(e)}'}), 500

@matching_bp.route('/swipe', methods=['POST'])
@jwt_required()
def record_swipe():
    """Record a swipe action (like or pass)"""
    try:
        current_user_id = get_jwt_identity()
        print(f"Recording swipe for user ID: {current_user_id}")
        
        user = User.query.get(current_user_id)
        
        if not user:
            print(f"User not found: {current_user_id}")
            return jsonify({'message': 'User not found'}), 404
        
        data = request.get_json()
        print(f"Swipe data received: {data}")
        
        # Validate required fields
        if 'targetUserId' not in data or 'action' not in data:
            print("Missing required fields: targetUserId or action")
            return jsonify({'message': 'targetUserId and action are required'}), 400
        
        try:
            target_user_id = int(data['targetUserId'])
        except (ValueError, TypeError) as e:
            print(f"Invalid targetUserId: {data.get('targetUserId')} - {str(e)}")
            return jsonify({'message': 'Invalid target user ID'}), 400
            
        action = data['action']  # 'like' or 'pass'
        print(f"Action: {action}, Target User ID: {target_user_id}")
        
        if action not in ['like', 'pass']:
            print(f"Invalid action: {action}")
            return jsonify({'message': 'Action must be "like" or "pass"'}), 400
        
        # Check if target user exists
        target_user = User.query.get(target_user_id)
        if not target_user:
            print(f"Target user not found: {target_user_id}")
            return jsonify({'message': 'Target user not found'}), 404
        
        print(f"Target user found: {target_user.first_name or target_user.name} (ID: {target_user_id})")
        
        # Check if already swiped on this user
        existing_interest = UserInterest.query.filter_by(
            interested_user_id=current_user_id,
            target_user_id=target_user_id
        ).first()
        
        if existing_interest:
            print(f"User {current_user_id} already swiped on user {target_user_id}, updating existing swipe")
            # Update existing swipe instead of creating new one
            old_interest_type = existing_interest.interest_type
            new_interest_type = 'details' if action == 'like' else 'describe'
            
            # If changing from like to pass, remove any existing match
            if old_interest_type == 'details' and new_interest_type == 'describe':
                existing_match = Match.query.filter(
                    ((Match.requester_id == current_user_id) & (Match.matched_user_id == target_user_id)) |
                    ((Match.requester_id == target_user_id) & (Match.matched_user_id == current_user_id))
                ).first()
                if existing_match:
                    print(f"Removing match due to swipe change")
                    db.session.delete(existing_match)
            
            # Update the existing interest
            existing_interest.interest_type = new_interest_type
            existing_interest.created_at = datetime.utcnow()  # Update timestamp
            print(f"Updated existing swipe: {old_interest_type} -> {new_interest_type}")
        else:
            # Create new swipe as before
            try:
                print(f"About to create UserInterest with action: {action}")
                print(f"UserInterest constructor signature: interested_user_id, target_user_id, interest_type")
                
                if action == 'like':
                    # Only create UserInterest for likes, not for passes
                    # Use 'details' for likes (allowed by database constraint)
                    print(f"Creating like UserInterest: {current_user_id}, {target_user_id}, 'details'")
                    user_interest = UserInterest(
                        current_user_id,
                        target_user_id,
                        'details'  # Use 'details' for likes (allowed value)
                    )
                    db.session.add(user_interest)
                    print(f"Created UserInterest: {current_user_id} -> {target_user_id} (like)")
                else:
                    # For passes, we still need to track that we've seen this user
                    # Use 'describe' for passes (allowed by database constraint)
                    print(f"Creating pass UserInterest: {current_user_id}, {target_user_id}, 'describe'")
                    user_interest = UserInterest(
                        current_user_id,
                        target_user_id,
                        'describe'  # Use 'describe' for passes (allowed value)
                    )
                    db.session.add(user_interest)
                    print(f"Created UserInterest: {current_user_id} -> {target_user_id} (pass)")
            except Exception as e:
                print(f"Error creating UserInterest: {str(e)}")
                import traceback
                traceback.print_exc()
                return jsonify({'message': f'Failed to create user interest: {str(e)}'}), 500
        
        # Record the swipe
        try:
            print(f"About to create UserInterest with action: {action}")
            print(f"UserInterest constructor signature: interested_user_id, target_user_id, interest_type")
            
            if action == 'like':
                # Only create UserInterest for likes, not for passes
                # Use 'details' for likes (allowed by database constraint)
                print(f"Creating like UserInterest: {current_user_id}, {target_user_id}, 'details'")
                user_interest = UserInterest(
                    current_user_id,
                    target_user_id,
                    'details'  # Use 'details' for likes (allowed value)
                )
                db.session.add(user_interest)
                print(f"Created UserInterest: {current_user_id} -> {target_user_id} (like)")
            else:
                # For passes, we still need to track that we've seen this user
                # Use 'describe' for passes (allowed by database constraint)
                print(f"Creating pass UserInterest: {current_user_id}, {target_user_id}, 'describe'")
                user_interest = UserInterest(
                    current_user_id,
                    target_user_id,
                    'describe'  # Use 'describe' for passes (allowed value)
                )
                db.session.add(user_interest)
                print(f"Created UserInterest: {current_user_id} -> {target_user_id} (pass)")
        except Exception as e:
            print(f"Error creating UserInterest: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({'message': f'Failed to create user interest: {str(e)}'}), 500
        
        is_match = False
        
        # If it's a like, check for mutual interest (match)
        if action == 'like':
            try:
                # Check if the target user has also liked this user (details type interest)
                mutual_interest = UserInterest.query.filter_by(
                    interested_user_id=target_user_id,
                    target_user_id=current_user_id,
                    interest_type='details'  # Only check for likes (details), not passes (describe)
                ).first()
                
                if mutual_interest:
                    print(f"Mutual interest found! Creating match between {current_user_id} and {target_user_id}")
                    
                    # It's a match! Create match record
                    existing_match = Match.query.filter(
                        ((Match.requester_id == current_user_id) & (Match.matched_user_id == target_user_id)) |
                        ((Match.requester_id == target_user_id) & (Match.matched_user_id == current_user_id))
                    ).first()
                    
                    if not existing_match:
                        match = Match(
                            requester_id=current_user_id,
                            matched_user_id=target_user_id
                        )
                        db.session.add(match)
                        is_match = True
                        print(f"Match created successfully")
                    else:
                        print(f"Match already exists")
                        is_match = True  # Still consider it a match
                else:
                    print(f"No mutual interest found")
            except Exception as e:
                print(f"Error checking for mutual interest: {str(e)}")
                # Continue without creating match
        
        try:
            db.session.commit()
            print(f"Swipe recorded successfully")
        except Exception as e:
            print(f"Error committing to database: {str(e)}")
            db.session.rollback()
            return jsonify({'message': f'Failed to save swipe: {str(e)}'}), 500
        
        # Prepare response
        response_data = {
            'message': 'Swipe recorded successfully',
            'action': action,
            'isMatch': is_match
        }
        
        # Only include target user profile if it's a like and we can generate the profile
        if action == 'like':
            try:
                response_data['targetUser'] = target_user.to_swipe_profile()
            except Exception as e:
                print(f"Error generating target user profile: {str(e)}")
                response_data['targetUser'] = None
        
        print(f"Returning response: {response_data}")
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Error in record_swipe: {str(e)}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({'message': f'Failed to record swipe: {str(e)}'}), 500

@matching_bp.route('/matches', methods=['GET'])
@jwt_required()
def get_user_matches():
    """Get user's matches"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Get all matches for this user
        matches = Match.query.filter(
            (Match.requester_id == current_user_id) | (Match.matched_user_id == current_user_id)
        ).all()
        
        match_profiles = []
        for match in matches:
            # Get the other user in the match
            other_user_id = match.matched_user_id if match.requester_id == current_user_id else match.requester_id
            other_user = User.query.get(other_user_id)
            
            if other_user:
                match_profiles.append({
                    'matchId': match.id,
                    'user': other_user.to_swipe_profile(),
                    'matchedAt': match.created_at.isoformat(),
                    'isMutual': True  # All matches in our system are mutual
                })
        
        return jsonify({
            'matches': match_profiles,
            'total': len(match_profiles)
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get matches: {str(e)}'}), 500

@matching_bp.route('/undo-swipe', methods=['POST'])
@jwt_required()
def undo_last_swipe():
    """Undo the last swipe action"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        print(f"Undoing last swipe for user ID: {current_user_id}")
        
        # Get the most recent UserInterest for this user
        last_interest = UserInterest.query.filter_by(
            interested_user_id=current_user_id
        ).order_by(UserInterest.created_at.desc()).first()
        
        if not last_interest:
            print("No swipes to undo")
            return jsonify({'message': 'No swipes to undo'}), 400
        
        target_user_id = last_interest.target_user_id
        interest_type = last_interest.interest_type
        
        print(f"Found last swipe: {current_user_id} -> {target_user_id} ({interest_type})")
        
        # Get the target user info for response
        target_user = User.query.get(target_user_id)
        if not target_user:
            return jsonify({'message': 'Target user not found'}), 404
        
        # If it was a like (details), check if there was a match and remove it
        if interest_type == 'details':
            existing_match = Match.query.filter(
                ((Match.requester_id == current_user_id) & (Match.matched_user_id == target_user_id)) |
                ((Match.requester_id == target_user_id) & (Match.matched_user_id == current_user_id))
            ).first()
            
            if existing_match:
                print(f"Removing match between {current_user_id} and {target_user_id}")
                db.session.delete(existing_match)
        
        # Remove the UserInterest record
        db.session.delete(last_interest)
        db.session.commit()
        
        print(f"Successfully undid swipe: {current_user_id} -> {target_user_id}")
        
        return jsonify({
            'message': 'Swipe undone successfully',
            'undoneUser': target_user.to_swipe_profile(),
            'wasLike': interest_type == 'details'
        }), 200
        
    except Exception as e:
        print(f"Error in undo_last_swipe: {str(e)}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({'message': f'Failed to undo swipe: {str(e)}'}), 500

@matching_bp.route('/can-undo', methods=['GET'])
@jwt_required()
def can_undo_swipe():
    """Check if user can undo their last swipe"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Get the most recent UserInterest for this user
        last_interest = UserInterest.query.filter_by(
            interested_user_id=current_user_id
        ).order_by(UserInterest.created_at.desc()).first()
        
        can_undo = last_interest is not None
        last_swipe_info = None
        
        if can_undo:
            target_user = User.query.get(last_interest.target_user_id)
            if target_user:
                last_swipe_info = {
                    'targetUser': target_user.to_swipe_profile(),
                    'wasLike': last_interest.interest_type == 'details',
                    'swipedAt': last_interest.created_at.isoformat()
                }
        
        return jsonify({
            'canUndo': can_undo,
            'lastSwipe': last_swipe_info
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to check undo status: {str(e)}'}), 500

@matching_bp.route('/registration-status', methods=['GET'])
@jwt_required()
def get_registration_status():
    """Get user's registration status"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        return jsonify({
            'isRegistrationComplete': user.is_registration_complete(),
            'registrationStage': user.registration_stage.value if user.registration_stage else None,
            'canSearchMatches': user.can_search_matches(),
            'missingFields': user.get_missing_fields(),
            'nextStep': user.get_next_registration_step()
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get registration status: {str(e)}'}), 500