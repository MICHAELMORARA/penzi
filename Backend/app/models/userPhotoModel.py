from datetime import datetime
from sqlalchemy import desc, asc
from app.extensions import db


class UserPhoto(db.Model):
    __tablename__ = 'user_photos'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    photo_url = db.Column(db.String(500), nullable=False)
    is_primary = db.Column(db.Boolean, default=False, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)
    upload_order = db.Column(db.Integer, default=1, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationship
    user = db.relationship('User', backref=db.backref('photos', lazy=True, cascade='all, delete-orphan'))
    
    def __init__(self, user_id, photo_url, is_primary=False, upload_order=1):
        self.user_id = user_id
        self.photo_url = photo_url
        self.is_primary = is_primary
        self.upload_order = upload_order
    
    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'photoUrl': self.photo_url,
            'isPrimary': self.is_primary,
            'isVerified': self.is_verified,
            'uploadOrder': self.upload_order,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def mark_as_primary(self):
        """Mark this photo as primary and unmark others"""
        # First, unmark all other photos for this user
        UserPhoto.query.filter_by(user_id=self.user_id, is_primary=True).update({'is_primary': False})
        
        # Mark this photo as primary
        self.is_primary = True
        db.session.commit()
        return self
    
    def verify_photo(self):
        """Mark photo as verified"""
        self.is_verified = True
        self.updated_at = datetime.utcnow()
        db.session.commit()
        return self
    
    @classmethod
    def get_user_photos(cls, user_id, verified_only=False):
        """Get all photos for a user"""
        query = cls.query.filter_by(user_id=user_id, is_deleted=False)
        if verified_only:
            query = query.filter_by(is_verified=True)
        return query.order_by(desc(cls.is_primary), asc(cls.upload_order)).all()
    
    @classmethod
    def get_primary_photo(cls, user_id):
        """Get the primary photo for a user"""
        return cls.query.filter_by(user_id=user_id, is_primary=True).first()
    
    @classmethod
    def count_user_photos(cls, user_id):
        """Count photos for a user"""
        return cls.query.filter_by(user_id=user_id).count()
    
    def save(self):
        """Save photo to database"""
        db.session.add(self)
        db.session.commit()
        return self
    
    def delete(self):
        """Delete photo from database"""
        db.session.delete(self)
        db.session.commit()