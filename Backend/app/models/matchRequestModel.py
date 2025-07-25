from datetime import datetime
from app.extensions import db

class MatchRequest(db.Model):
    __tablename__ = 'match_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    age_min = db.Column(db.Integer, nullable=False)
    age_max = db.Column(db.Integer, nullable=False)
    preferred_town = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), default='active', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # The relationship is already defined in User model with backref='user'
    # So we don't need to define it again here
    
    __table_args__ = (
        db.CheckConstraint("status IN ('active', 'completed')", name='check_status'),
        db.CheckConstraint("age_min <= age_max", name='check_age_range'),
        db.CheckConstraint("age_min >= 18", name='check_min_age'),
    )
    
    def __init__(self, user_id, age_min, age_max, preferred_town):
        self.user_id = user_id
        self.age_min = age_min
        self.age_max = age_max
        self.preferred_town = preferred_town
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'age_min': self.age_min,
            'age_max': self.age_max,
            'preferred_town': self.preferred_town,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<MatchRequest {self.id}: User {self.user_id} seeking in {self.preferred_town}>'
    
    def is_completed(self):
        """Placeholder method (no matches tracked)"""
        return self.status == 'completed'
    
    def has_more_matches(self):
        """Placeholder method (no matches tracked)"""
        return False  # Since matches are removed
    
    def increment_position(self):
        pass