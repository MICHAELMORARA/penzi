from datetime import datetime
from sqlalchemy import and_, or_
from app.extensions import db
from app.models.userInterestModel import UserInterest
from app.models.userModel import User
import logging

logger = logging.getLogger(__name__)


class UserInterestService:
    """Service class for handling user interest operations"""

    @staticmethod
    def create_interest(interested_user_id, target_user_id, interest_type='details'):
        try:
            if interested_user_id == target_user_id:
                raise ValueError("User cannot express interest in themselves")
            
            # Check if interest already exists
            existing_interest = UserInterest.check_existing_interest(interested_user_id, target_user_id)
            if existing_interest:
                raise ValueError("Interest already exists between these users")
            
            # Create new interest
            interest = UserInterest(
                interested_user_id=interested_user_id,
                target_user_id=target_user_id,
                interest_type=interest_type
            )
            
            db.session.add(interest)
            db.session.commit()
            
            logger.info(f"Interest created: User {interested_user_id} -> User {target_user_id}")
            return interest
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating interest: {str(e)}")
            raise

    @staticmethod
    def respond_to_interest(interest_id, response):   
        try:
            if response not in ['YES', 'NO']:
                raise ValueError("Response must be 'YES' or 'NO'")
            
            interest = UserInterest.query.get(interest_id)
            if not interest:
                raise ValueError("Interest not found")
            
            if interest.response_received:
                raise ValueError("Interest has already been responded to")
            
            # Record the response
            interest.record_response(response)
            db.session.commit()
            
            logger.info(f"Interest {interest_id} responded with: {response}")
            return interest
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error responding to interest: {str(e)}")
            raise

    @staticmethod
    def get_interests_received(user_id, status='all'):
        try:
            query = UserInterest.query.filter_by(target_user_id=user_id)
            
            if status == 'pending':
                query = query.filter(
                    UserInterest.notification_sent.is_(True),
                    UserInterest.response_received.is_(False)
                )
            elif status == 'responded':
                query = query.filter(UserInterest.response_received.is_(True))
            elif status == 'awaiting_notification':
                query = query.filter(UserInterest.notification_sent.is_(False))
            
            interests = query.order_by(UserInterest.created_at.desc()).all()
            
            logger.info(f"Retrieved {len(interests)} interests received for user {user_id}")
            return interests
            
        except Exception as e:
            logger.error(f"Error getting interests received: {str(e)}")
            raise

    @staticmethod
    def get_interests_sent(user_id, status='all'):
        try:
            query = UserInterest.query.filter_by(interested_user_id=user_id)
            
            if status == 'pending':
                query = query.filter(UserInterest.response_received.is_(False))
            elif status == 'responded':
                query = query.filter(UserInterest.response_received.is_(True))
            elif status == 'awaiting_notification':
                query = query.filter(UserInterest.notification_sent.is_(False))
            
            interests = query.order_by(UserInterest.created_at.desc()).all()
            
            logger.info(f"Retrieved {len(interests)} interests sent by user {user_id}")
            return interests
            
        except Exception as e:
            logger.error(f"Error getting interests sent: {str(e)}")
            raise

    @staticmethod
    def get_pending_notifications():
        try:
            interests = UserInterest.query.filter(UserInterest.notification_sent.is_(False)).all()
            
            logger.info(f"Retrieved {len(interests)} pending notifications")
            return interests
            
        except Exception as e:
            logger.error(f"Error getting pending notifications: {str(e)}")
            raise

    @staticmethod
    def get_pending_feedback():
        try:
            interests = UserInterest.query.filter(
                UserInterest.response_received.is_(True),
                UserInterest.feedback_sent.is_(False)
            ).all()
            
            logger.info(f"Retrieved {len(interests)} pending feedback")
            return interests
            
        except Exception as e:
            logger.error(f"Error getting pending feedback: {str(e)}")
            raise

    @staticmethod
    def get_mutual_matches(user_id):
        try:
            # Find interests where user expressed interest and got YES response
            user_interests = db.session.query(UserInterest).filter(
                UserInterest.interested_user_id == user_id,
                UserInterest.response == 'YES'
            ).all()
            
            mutual_matches = []
            
            for interest in user_interests:
                # Check if target user also expressed interest back and user responded YES
                reverse_interest = db.session.query(UserInterest).filter(
                    UserInterest.interested_user_id == interest.target_user_id,
                    UserInterest.target_user_id == user_id,
                    UserInterest.response == 'YES'
                ).first()
                
                if reverse_interest:
                    # It's a mutual match
                    match_data = {
                        'user_id': interest.target_user_id,
                        'user_name': interest.target_user.name if interest.target_user else 'Unknown',
                        'user_phone': interest.target_user.phone_number if interest.target_user else 'Unknown',
                        'match_date': max(interest.response_at, reverse_interest.response_at).isoformat() if interest.response_at and reverse_interest.response_at else None,
                        'interest_ids': [interest.id, reverse_interest.id]
                    }
                    mutual_matches.append(match_data)
            
            logger.info(f"Found {len(mutual_matches)} mutual matches for user {user_id}")
            return mutual_matches
            
        except Exception as e:
            logger.error(f"Error getting mutual matches: {str(e)}")
            raise

    @staticmethod
    def get_interest_by_id(interest_id):
        try:
            interest = UserInterest.query.get(interest_id)
            
            if interest:
                logger.info(f"Retrieved interest {interest_id}")
            else:
                logger.warning(f"Interest {interest_id} not found")
            
            return interest
            
        except Exception as e:
            logger.error(f"Error getting interest by ID: {str(e)}")
            raise

    @staticmethod
    def mark_notification_sent(interest_id):
        try:
            interest = UserInterest.query.get(interest_id)
            if not interest:
                raise ValueError("Interest not found")
            
            interest.mark_notification_sent()
            db.session.commit()
            
            logger.info(f"Marked notification sent for interest {interest_id}")
            return interest
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error marking notification sent: {str(e)}")
            raise

    @staticmethod
    def mark_feedback_sent(interest_id):
        try:
            interest = UserInterest.query.get(interest_id)
            if not interest:
                raise ValueError("Interest not found")
            
            interest.mark_feedback_sent()
            db.session.commit()
            
            logger.info(f"Marked feedback sent for interest {interest_id}")
            return interest
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error marking feedback sent: {str(e)}")
            raise

    @staticmethod
    def get_user_interest_stats(user_id):
        try:
            stats = UserInterest.get_user_interest_stats(user_id)
            
            logger.info(f"Retrieved interest stats for user {user_id}")
            return stats
            
        except Exception as e:
            logger.error(f"Error getting user interest stats: {str(e)}")
            raise

    @staticmethod
    def delete_interest(interest_id):
        try:
            interest = UserInterest.query.get(interest_id)
            if not interest:
                raise ValueError("Interest not found")
            
            db.session.delete(interest)
            db.session.commit()
            
            logger.info(f"Deleted interest {interest_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting interest: {str(e)}")
            raise

    @staticmethod
    def get_all_interests(page=1, per_page=20, status_filter=None):
        try:
            query = UserInterest.query
            
            if status_filter:
                if status_filter == 'pending':
                    query = query.filter(UserInterest.response_received.is_(False))
                elif status_filter == 'responded':
                    query = query.filter(UserInterest.response_received.is_(True))
                elif status_filter == 'positive':
                    query = query.filter(UserInterest.response == 'YES')
                elif status_filter == 'negative':
                    query = query.filter(UserInterest.response == 'NO')
            
            paginated = query.order_by(UserInterest.created_at.desc()).paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            result = {
                'interests': [interest.to_dict() for interest in paginated.items],
                'pagination': {
                    'page': page,
                    'pages': paginated.pages,
                    'per_page': per_page,
                    'total': paginated.total,
                    'has_next': paginated.has_next,
                    'has_prev': paginated.has_prev
                }
            }
            
            logger.info(f"Retrieved {len(paginated.items)} interests (page {page})")
            return result
            
        except Exception as e:
            logger.error(f"Error getting all interests: {str(e)}")
            raise