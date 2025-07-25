from datetime import datetime
from app.extensions import db


class Match(db.Model):
    __tablename__ = 'matches'
    
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('match_requests.id', ondelete='CASCADE'), nullable=True)
    requester_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    matched_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    position = db.Column(db.Integer, nullable=True)
    is_sent = db.Column(db.Boolean, server_default='false', nullable=False)
    status = db.Column(db.String(20), nullable=False, default='active')
    
    # Payment fields for web app
    is_paid = db.Column(db.Boolean, default=False, nullable=False)
    payment_transaction_id = db.Column(db.String(100), nullable=True)
    payment_amount = db.Column(db.Float, nullable=True)
    payment_date = db.Column(db.DateTime, nullable=True)
    
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp(), nullable=False)

    # Relationships
    match_request = db.relationship('MatchRequest', backref='matches')
    requester = db.relationship('User', foreign_keys=[requester_id], overlaps="requested_matches")
    matched_user = db.relationship('User', foreign_keys=[matched_user_id], overlaps="received_matches")
    
    def __init__(self, requester_id, matched_user_id, request_id=None, position=None, **kwargs):
        self.requester_id = requester_id
        self.matched_user_id = matched_user_id
        self.request_id = request_id
        self.position = position
        
        # Handle payment fields
        self.is_paid = kwargs.get('is_paid', False)
        self.payment_transaction_id = kwargs.get('payment_transaction_id')
        self.payment_amount = kwargs.get('payment_amount')
        self.payment_date = kwargs.get('payment_date')
        
        self.created_at = kwargs.get('created_at', datetime.utcnow())
    
    def mark_as_sent(self):
        """Mark this match as sent to the requester"""
        self.is_sent = True
        db.session.commit()
    
    def mark_as_paid(self, transaction_id, amount=None):
        """Mark this match as paid"""
        self.is_paid = True
        self.payment_transaction_id = transaction_id
        self.payment_amount = amount
        self.payment_date = datetime.utcnow()
        db.session.commit()
    
    def to_dict(self):
        return {
            'id': self.id,
            'request_id': self.request_id,
            'requester_id': self.requester_id,
            'matched_user_id': self.matched_user_id,
            'position': self.position,
            'is_sent': self.is_sent,
            'status': self.status,
            'is_paid': self.is_paid,
            'payment_transaction_id': self.payment_transaction_id,
            'payment_amount': self.payment_amount,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @staticmethod
    def get_unsent_matches():
        """Get all matches that haven't been sent yet"""
        return Match.query.filter_by(is_sent=False).all()
    
    def __repr__(self):
        return f'<Match req:{self.request_id} pos:{self.position} user:{self.matched_user_id} paid:{self.is_paid}>'