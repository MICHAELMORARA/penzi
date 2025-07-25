from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.extensions import db


class UserInterest(db.Model):
    __tablename__ = 'user_interests'
    __table_args__ = {'extend_existing': True}  
    
    id = Column(Integer, primary_key=True)
    interested_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    target_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    interest_type = Column(String(20), server_default='details', nullable=False)
    
    notification_sent = Column(Boolean, server_default='false', nullable=False)
    notification_sent_at = Column(DateTime)
    response_received = Column(Boolean, server_default='false', nullable=False)
    response = Column(String(10))
    response_at = Column(DateTime)
    feedback_sent = Column(Boolean, server_default='false', nullable=False)
    expired_notification_sent = Column(Boolean, server_default='false', nullable=False)
    payment_transaction_id = Column(Integer, ForeignKey('payment_transactions.id'), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships 
    interested_user = relationship(
        'User', 
        foreign_keys=[interested_user_id],
        overlaps="initiated_interests"
    )
    target_user = relationship(
        'User', 
        foreign_keys=[target_user_id],
        overlaps="received_interests"
    )

    def __init__(self, interested_user_id, target_user_id, interest_type='details'):
        self.interested_user_id = interested_user_id
        self.target_user_id = target_user_id
        self.interest_type = interest_type

    def __repr__(self):
        return f'<UserInterest {self.id}: User {self.interested_user_id} -> User {self.target_user_id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'interested_user_id': self.interested_user_id,
            'target_user_id': self.target_user_id,
            'interest_type': self.interest_type,
            'notification_sent': self.notification_sent,
            'response_received': self.response_received,
            'response': self.response,
            'response_at': self.response_at.isoformat() if self.response_at else None, # type: ignore
            'feedback_sent': self.feedback_sent,
            'created_at': self.created_at.isoformat() if self.created_at else None, # type: ignore
            'status': self.get_status()
        }

    def get_status(self):
        if not self.notification_sent:  # type: ignore
            return 'pending_notification'
        elif not self.response_received: # type: ignore
            return 'awaiting_response'
        elif not self.feedback_sent: # type: ignore
            return 'pending_feedback'
        else:
            return 'completed'
        
    def mark_notification_sent(self):
        self.notification_sent = True
        return self
    
    def record_response(self, response):
        if response not in ['YES', 'NO']:
            raise ValueError("Response must be 'YES' or 'NO'")
        
        self.response = response
        self.response_received = True
        self.response_at = datetime.utcnow()
        return self
    
    def mark_feedback_sent(self):
        """Mark that feedback has been sent to interested user"""
        self.feedback_sent = True
        return self
    
    def is_response_positive(self):
        return self.response == 'YES'
    
    def is_pending_response(self):
        return self.notification_sent and not self.response_received # type: ignore
    
    def is_complete(self):
        return self.notification_sent and self.response_received and self.feedback_sent
    
    @classmethod
    def create_interest(cls, interested_user_id, target_user_id, interest_type='details'):
       
        if interested_user_id == target_user_id:
            raise ValueError("User cannot express interest in themselves")
        
        # Check if interest already exists
        existing_interest = cls.check_existing_interest(interested_user_id, target_user_id)
        if existing_interest:
            raise ValueError("Interest already exists between these users")
        
        interest = cls(
            interested_user_id=interested_user_id,
            target_user_id=target_user_id,
            interest_type=interest_type
        )
        
        db.session.add(interest)
        db.session.commit()
        return interest
    
    @staticmethod
    def check_existing_interest(interested_user_id, target_user_id):
        return UserInterest.query.filter_by(
            interested_user_id=interested_user_id,
            target_user_id=target_user_id
        ).filter(
            # Either pending notification, awaiting response, or pending feedback
            db.or_(
                UserInterest.notification_sent == False,
                db.and_(
                    UserInterest.notification_sent == True,
                    UserInterest.response_received == False
                ),
                db.and_(
                    UserInterest.response_received == True,
                    UserInterest.feedback_sent == False
                )
            )
        ).first()
    
    @classmethod
    def get_interests_for_user(cls, user_id, as_target=True):
       
        if as_target:
            return cls.query.filter_by(target_user_id=user_id).order_by(cls.created_at.desc()).all()
        else:
            return cls.query.filter_by(interested_user_id=user_id).order_by(cls.created_at.desc()).all()
    
    @staticmethod
    def get_pending_notifications():
        return UserInterest.query.filter_by(notification_sent=False).all()
    
    @staticmethod
    def get_pending_feedback():
        return UserInterest.query.filter(
            UserInterest.response_received == True,
            UserInterest.feedback_sent == False
        ).all()
    
    @classmethod
    def get_user_interest_stats(cls, user_id):
       
        interests_sent = cls.query.filter_by(interested_user_id=user_id).count()
        interests_received = cls.query.filter_by(target_user_id=user_id).count()
        
        positive_responses_given = cls.query.filter_by(
            target_user_id=user_id,
            response='YES'
        ).count()
        
        positive_responses_received = cls.query.filter_by(
            interested_user_id=user_id,
            response='YES'
        ).count()
        
        pending_responses = cls.query.filter_by(
            target_user_id=user_id,
            response_received=False
        ).count()
        
        return {
            'interests_sent': interests_sent,
            'interests_received': interests_received,
            'positive_responses_given': positive_responses_given,
            'positive_responses_received': positive_responses_received,
            'pending_responses': pending_responses
        }