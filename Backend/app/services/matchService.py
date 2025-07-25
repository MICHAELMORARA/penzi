from datetime import datetime
from sqlalchemy import and_, or_
from sqlalchemy.orm import sessionmaker
from app.models.matchRequestModel import MatchRequest
from app.models.matchModel import Match
from app.models.userModel import User, Gender, RegistrationStage
from app.extensions import db
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class MatchService:
    
    @staticmethod
    def find_matches_for_user(user_id: int, search_criteria: Dict) -> List[User]:
       
        try:
            user = User.query.get(user_id)
            if not user:
                raise ValueError("User not found")
            
            if user.gender == Gender.MALE:
                target_gender = Gender.FEMALE
            elif user.gender == Gender.FEMALE:
                target_gender = Gender.MALE
            else:
                raise ValueError("User gender not specified")
            
            age_min = search_criteria.get('age_min')
            age_max = search_criteria.get('age_max')
            preferred_town = search_criteria.get('preferred_town')
            
            query = User.query.filter(
                User.id != user_id,  
                User.registration_stage == RegistrationStage.COMPLETED,
                User.is_active.is_(True),
                User.age >= age_min,
                User.age <= age_max,
                User.gender == target_gender,  
                User.town.ilike(f'%{preferred_town}%')  
            )
            
            matches = query.order_by(User.created_at.desc()).all()
            
            logger.info(f"Found {len(matches)} matches for user {user_id} (searching for {target_gender.value})")
            return matches
            
        except Exception as e:
            logger.error(f"Error finding matches for user {user_id}: {str(e)}")
            return []

    @staticmethod
    def create_match_request(user_id: int, search_criteria: Dict) -> MatchRequest:
        try:
            user = User.query.filter(User.id == user_id, User.is_active.is_(True)).first()
            if not user:
                raise ValueError("User not found or inactive")

            if user.registration_stage != RegistrationStage.COMPLETED:
                raise ValueError(
                    "User must complete registration before searching for matches")

            match_request = MatchRequest(
                user_id=user_id,
                age_min=search_criteria.get('age_min'),
                age_max=search_criteria.get('age_max'),
                preferred_town=search_criteria.get('preferred_town')
            )

            db.session.add(match_request)
            db.session.commit()

            logger.info(
                f"Created match request {match_request.id} for user {user_id}")
            return match_request

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating match request: {str(e)}")
            raise

    @staticmethod
    def find_potential_matches(requester_id: int, search_criteria: Dict) -> List[User]:
        return MatchService.find_matches_for_user(requester_id, search_criteria)

    
    @staticmethod
    def find_matches_by_criteria(search_criteria: Dict) -> List[User]:
       
        try:
            age_min = search_criteria.get('age_min')
            age_max = search_criteria.get('age_max')
            preferred_town = search_criteria.get('preferred_town')
            
            query = User.query.filter(
                User.registration_stage == RegistrationStage.COMPLETED,
                User.is_active.is_(True),
                User.age >= age_min,
                User.age <= age_max
            )
            
            if preferred_town:
                query = query.filter(
                    or_(
                        User.town.ilike(f'%{preferred_town}%'),
                        User.county.ilike(f'%{preferred_town}%')
                    )
                )
            
            matches = query.order_by(User.created_at.desc()).all()
            
            logger.info(f"Found {len(matches)} matches for criteria: {search_criteria}")
            return matches
            
        except Exception as e:
            logger.error(f"Error finding matches by criteria: {str(e)}")
            return []
    
    @staticmethod
    def find_matches_by_criteria_paginated(search_criteria: Dict, page: int = 1, per_page: int = 10) -> Dict:
        
        try:
            age_min = search_criteria.get('age_min')
            age_max = search_criteria.get('age_max')
            preferred_town = search_criteria.get('preferred_town')
            
            query = User.query.filter(
                User.registration_stage == RegistrationStage.COMPLETED,
                User.is_active.is_(True),
                User.age >= age_min,
                User.age <= age_max
            )
            
            if preferred_town:
                query = query.filter(
                    or_(
                        User.town.ilike(f'%{preferred_town}%'),
                        User.county.ilike(f'%{preferred_town}%')
                    )
                )
            
            paginated = query.order_by(User.created_at.desc()).paginate(
                page=page, 
                per_page=per_page, 
                error_out=False
            )
            
            return {
                'items': paginated.items,
                'total': paginated.total,
                'pages': paginated.pages,
                'current_page': page,
                'per_page': per_page
            }
            
        except Exception as e:
            logger.error(f"Error in paginated search: {str(e)}")
            return {
                'items': [],
                'total': 0,
                'pages': 0,
                'current_page': page,
                'per_page': per_page
            }
    
    @staticmethod
    def get_all_matches_paginated(page: int = 1, per_page: int = 10) -> Dict:
       
        try:
            query = User.query.filter(
                User.registration_stage == RegistrationStage.COMPLETED,
                User.is_active.is_(True)
            )
            
            paginated = query.order_by(User.created_at.desc()).paginate(
                page=page, 
                per_page=per_page, 
                error_out=False
            )
            
            return {
                'items': paginated.items,
                'total': paginated.total,
                'pages': paginated.pages,
                'current_page': page,
                'per_page': per_page
            }
            
        except Exception as e:
            logger.error(f"Error getting all matches: {str(e)}")
            return {
                'items': [],
                'total': 0,
                'pages': 0,
                'current_page': page,
                'per_page': per_page
            }
    
    @staticmethod
    def get_general_match_stats() -> Dict:
       
        try:
            total_users = User.query.filter(
                User.registration_stage == RegistrationStage.COMPLETED,
                User.is_active.is_(True)
            ).count()
            
            male_users = User.query.filter(
                User.registration_stage == RegistrationStage.COMPLETED,
                User.is_active.is_(True),
                User.gender == Gender.MALE
            ).count()
            
            female_users = User.query.filter(
                User.registration_stage == RegistrationStage.COMPLETED,
                User.is_active.is_(True),
                User.gender == Gender.FEMALE
            ).count()
            
            total_match_requests = MatchRequest.query.count()
            active_requests = MatchRequest.query.filter_by(status='active').count()
            total_matches_created = Match.query.count()
            
            from sqlalchemy import func
            age_stats = db.session.query(
                func.min(User.age).label('min_age'),
                func.max(User.age).label('max_age'),
                func.avg(User.age).label('avg_age')
            ).filter(
                User.registration_stage == RegistrationStage.COMPLETED,
                User.is_active.is_(True)
            ).first()
            
            return {
                'total_active_users': total_users,
                'male_users': male_users,
                'female_users': female_users,
                'total_match_requests': total_match_requests,
                'active_match_requests': active_requests,
                'total_matches_created': total_matches_created,
                'age_statistics': {
                    'min_age': age_stats.min_age if age_stats else None,
                    'max_age': age_stats.max_age if age_stats else None,
                    'average_age': round(float(age_stats.avg_age), 1) if age_stats and age_stats.avg_age else None
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting general stats: {str(e)}")
            return {}

    @staticmethod
    def store_matches(request_id: int, requester_id: int, potential_matches: List[User]) -> List[Match]:
        try:
            stored_matches = []

            for position, matched_user in enumerate(potential_matches, 1):
                match = Match(
                    request_id=request_id,
                    requester_id=requester_id,
                    matched_user_id=matched_user.id,
                    position=position
                )
                db.session.add(match)
                stored_matches.append(match)

            db.session.commit()

            logger.info(
                f"Stored {len(stored_matches)} matches for request {request_id}")
            return stored_matches

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error storing matches: {str(e)}")
            raise

    @staticmethod
    def get_next_match(user_id: int) -> Optional[Match]:
        try:
            match_request = MatchRequest.query.filter_by(
                user_id=user_id,
                status='active'
            ).first()

            if not match_request:
                return None

            next_match = Match.query.filter(
                Match.request_id == match_request.id,
                Match.is_sent.is_(False)
            ).order_by(Match.position).first()

            if next_match:
                next_match.is_sent = True
                db.session.commit()

                logger.info(
                    f"Retrieved next match {next_match.id} for user {user_id}")

            return next_match

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error getting next match: {str(e)}")
            return None

    @staticmethod
    def get_user_matches(user_id: int, limit: int = 10) -> List[Match]:
        try:
            matches = Match.query.filter_by(requester_id=user_id)\
                .order_by(Match.position)\
                .limit(limit)\
                .all()

            return matches

        except Exception as e:
            logger.error(f"Error getting user matches: {str(e)}")
            return []

    @staticmethod
    def complete_search(user_id: int) -> bool:
        try:
            match_request = MatchRequest.query.filter_by(
                user_id=user_id,
                status='active'
            ).first()

            if match_request:
                match_request.status = 'completed'
                db.session.commit()
                logger.info(f"Completed search for user {user_id}")
                return True

            return False

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error completing search: {str(e)}")
            return False

    @staticmethod
    def get_match_stats(user_id: int) -> dict:
        try:
            total_requests = MatchRequest.query.filter_by(user_id=user_id).count()
            
            total_matches = Match.query.filter_by(requester_id=user_id).count()
            
            active_request = MatchRequest.query.filter_by(
                user_id=user_id, 
                status='active'
            ).first()
            
            return {
                'total_requests': total_requests,
                'total_matches': total_matches,
                'has_active_request': bool(active_request),
                'active_request_id': active_request.id if active_request else None
            }

        except Exception as e:
            logger.error(f"Error getting match stats: {str(e)}")
            return {}

    @staticmethod
    def get_match_history(user_id: int, page: int = 1, per_page: int = 20) -> dict:
        try:
            as_requester = Match.query.filter_by(requester_id=user_id)\
                .order_by(Match.created_at.desc())\
                .paginate(page=page, per_page=per_page, error_out=False)
            
            as_target = Match.query.filter_by(matched_user_id=user_id)\
                .order_by(Match.created_at.desc())\
                .paginate(page=page, per_page=per_page, error_out=False)
            
            return {
                'as_requester': as_requester.items,
                'as_target': as_target.items,
                'total_as_requester': as_requester.total,
                'total_as_target': as_target.total
            }

        except Exception as e:
            logger.error(f"Error getting match history: {str(e)}")
            return {}

    @staticmethod
    def get_current_match_request(user_id: int) -> Optional[MatchRequest]:
        try:
            return MatchRequest.query.filter_by(
                user_id=user_id, 
                status='active'
            ).first()

        except Exception as e:
            logger.error(f"Error getting current match request: {str(e)}")
            return None

    @staticmethod
    def get_request_progress(request_id: int) -> dict:
        try:
            total_matches = Match.query.filter_by(request_id=request_id).count()
            sent_matches = Match.query.filter(Match.request_id == request_id, Match.is_sent.is_(True)).count()
            
            return {
                'total_matches': total_matches,
                'sent_matches': sent_matches,
                'remaining_matches': total_matches - sent_matches,
                'completion_percentage': (sent_matches / total_matches * 100) if total_matches > 0 else 0
            }

        except Exception as e:
            logger.error(f"Error getting request progress: {str(e)}")
            return {}