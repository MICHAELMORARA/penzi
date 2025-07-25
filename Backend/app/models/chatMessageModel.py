from datetime import datetime
from sqlalchemy import desc
from app.extensions import db


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey('matches.id', ondelete='CASCADE'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    message_text = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(20), default='text', nullable=False)  # text, image, emoji
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    read_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    match = db.relationship('Match', backref=db.backref('messages', lazy=True, cascade='all, delete-orphan'))
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_messages')
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref='received_messages')
    
    def __init__(self, match_id, sender_id, receiver_id, message_text, message_type='text'):
        self.match_id = match_id
        self.sender_id = sender_id
        self.receiver_id = receiver_id
        self.message_text = message_text
        self.message_type = message_type
    
    def to_dict(self):
        return {
            'id': self.id,
            'matchId': self.match_id,
            'senderId': self.sender_id,
            'receiverId': self.receiver_id,
            'messageText': self.message_text,
            'messageType': self.message_type,
            'isRead': self.is_read,
            'isDeleted': self.is_deleted,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'readAt': self.read_at.isoformat() if self.read_at else None,
            'sender': {
                'id': self.sender.id,
                'firstName': self.sender.first_name,
                'lastName': self.sender.last_name,
                'profilePicture': self.sender.profile_picture
            } if self.sender else None
        }
    
    def mark_as_read(self):
        """Mark message as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.utcnow()
            db.session.commit()
        return self
    
    def soft_delete(self):
        """Soft delete message"""
        self.is_deleted = True
        db.session.commit()
        return self
    
    @classmethod
    def get_match_messages(cls, match_id, limit=50, offset=0):
        """Get messages for a specific match"""
        return cls.query.filter_by(
            match_id=match_id,
            is_deleted=False
        ).order_by(desc(cls.created_at)).limit(limit).offset(offset).all()
    
    @classmethod
    def get_unread_count(cls, user_id):
        """Get count of unread messages for a user"""
        return cls.query.filter_by(
            receiver_id=user_id,
            is_read=False,
            is_deleted=False
        ).count()
    
    @classmethod
    def get_latest_message_for_match(cls, match_id):
        """Get the latest message for a match"""
        return cls.query.filter_by(
            match_id=match_id,
            is_deleted=False
        ).order_by(desc(cls.created_at)).first()
    
    @classmethod
    def mark_match_messages_as_read(cls, match_id, user_id):
        """Mark all messages in a match as read for a specific user"""
        cls.query.filter_by(
            match_id=match_id,
            receiver_id=user_id,
            is_read=False
        ).update({
            'is_read': True,
            'read_at': datetime.utcnow()
        })
        db.session.commit()
    
    def save(self):
        """Save message to database"""
        db.session.add(self)
        db.session.commit()
        return self
    
    def delete(self):
        """Hard delete message"""
        db.session.delete(self)
        db.session.commit()