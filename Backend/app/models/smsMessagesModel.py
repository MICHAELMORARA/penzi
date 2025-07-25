from app.extensions import db
from datetime import datetime

class SmsMessage(db.Model):
    __tablename__ = 'sms_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    from_phone = db.Column(db.String(15))
    to_phone = db.Column(db.String(15), nullable=False)
    message_body = db.Column(db.Text, nullable=False)
    direction = db.Column(db.String(10), nullable=False)  # 'incoming', 'outgoing'
    message_type = db.Column(db.String(50))  # 'activation', 'registration', 'match_request', etc.
    status = db.Column(db.String(20), default='processed')  # 'pending', 'processed', 'sent', 'failed'
    related_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to users table
    user = db.relationship("User", back_populates="sms_messages")
    
    def to_dict(self):
        return {
            'id': self.id,
            'from_phone': self.from_phone,
            'to_phone': self.to_phone,
            'message_body': self.message_body,
            'direction': self.direction,
            'message_type': self.message_type,
            'status': self.status,
            'related_user_id': self.related_user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }