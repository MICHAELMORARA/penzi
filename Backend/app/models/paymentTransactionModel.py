from datetime import datetime
from enum import Enum
from app.extensions import db


class PaymentStatus(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentType(Enum):
    MATCH_FEE = "match_fee"
    PREMIUM_MONTHLY = "premium_monthly"
    PREMIUM_YEARLY = "premium_yearly"
    SUPER_LIKE = "super_like"
    BOOST = "boost"


class PaymentTransaction(db.Model):
    __tablename__ = 'payment_transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    transaction_id = db.Column(db.String(100), unique=True, nullable=False)
    checkout_request_id = db.Column(db.String(100), nullable=True)
    mpesa_receipt_number = db.Column(db.String(100), nullable=True)
    phone_number = db.Column(db.String(15), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    payment_type = db.Column(db.Enum(PaymentType), nullable=False)
    payment_status = db.Column(db.Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    
    # Related entities
    target_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # For match fees
    match_id = db.Column(db.Integer, db.ForeignKey('matches.id'), nullable=True)  # For match fees
    
    # M-Pesa specific fields
    mpesa_response = db.Column(db.Text, nullable=True)  # Store full M-Pesa response
    callback_data = db.Column(db.Text, nullable=True)  # Store callback data
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='payment_transactions')
    target_user = db.relationship('User', foreign_keys=[target_user_id], backref='received_payments')
    match = db.relationship('Match', backref='payment_transactions')
    
    def __init__(self, user_id, transaction_id, phone_number, amount, payment_type, description=None, target_user_id=None, match_id=None):
        self.user_id = user_id
        self.transaction_id = transaction_id
        self.phone_number = phone_number
        self.amount = amount
        self.payment_type = payment_type
        self.description = description
        self.target_user_id = target_user_id
        self.match_id = match_id
        
        # Set expiry time (30 minutes for M-Pesa STK push)
        from datetime import timedelta
        self.expires_at = datetime.utcnow() + timedelta(minutes=30)
    
    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'transactionId': self.transaction_id,
            'checkoutRequestId': self.checkout_request_id,
            'mpesaReceiptNumber': self.mpesa_receipt_number,
            'phoneNumber': self.phone_number,
            'amount': self.amount,
            'paymentType': self.payment_type.value,
            'paymentStatus': self.payment_status.value,
            'description': self.description,
            'targetUserId': self.target_user_id,
            'matchId': self.match_id,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
            'expiresAt': self.expires_at.isoformat() if self.expires_at else None,
            'isExpired': self.is_expired(),
            'targetUser': self.target_user.to_swipe_profile() if self.target_user else None
        }
    
    def is_expired(self):
        """Check if payment has expired"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at and self.payment_status == PaymentStatus.PENDING
    
    def mark_as_completed(self, mpesa_receipt_number=None, callback_data=None):
        """Mark payment as completed"""
        self.payment_status = PaymentStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        if mpesa_receipt_number:
            self.mpesa_receipt_number = mpesa_receipt_number
        if callback_data:
            self.callback_data = callback_data
        db.session.commit()
        return self
    
    def mark_as_failed(self, callback_data=None):
        """Mark payment as failed"""
        self.payment_status = PaymentStatus.FAILED
        if callback_data:
            self.callback_data = callback_data
        db.session.commit()
        return self
    
    def mark_as_cancelled(self):
        """Mark payment as cancelled"""
        self.payment_status = PaymentStatus.CANCELLED
        db.session.commit()
        return self
    
    def update_checkout_request_id(self, checkout_request_id):
        """Update checkout request ID from M-Pesa response"""
        self.checkout_request_id = checkout_request_id
        db.session.commit()
        return self
    
    def update_mpesa_response(self, response_data):
        """Update M-Pesa response data"""
        import json
        self.mpesa_response = json.dumps(response_data) if response_data else None
        db.session.commit()
        return self
    
    @classmethod
    def get_by_transaction_id(cls, transaction_id):
        """Get payment by transaction ID"""
        return cls.query.filter_by(transaction_id=transaction_id).first()
    
    @classmethod
    def get_by_checkout_request_id(cls, checkout_request_id):
        """Get payment by checkout request ID"""
        return cls.query.filter_by(checkout_request_id=checkout_request_id).first()
    
    @classmethod
    def get_user_payments(cls, user_id, payment_type=None, status=None):
        """Get payments for a user"""
        query = cls.query.filter_by(user_id=user_id)
        if payment_type:
            query = query.filter_by(payment_type=payment_type)
        if status:
            query = query.filter_by(payment_status=status)
        return query.order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_pending_payments(cls):
        """Get all pending payments"""
        return cls.query.filter_by(payment_status=PaymentStatus.PENDING).all()
    
    @classmethod
    def get_expired_payments(cls):
        """Get all expired payments"""
        return cls.query.filter(
            cls.payment_status == PaymentStatus.PENDING,
            cls.expires_at < datetime.utcnow()
        ).all()
    
    @classmethod
    def cleanup_expired_payments(cls):
        """Mark expired payments as cancelled"""
        expired_payments = cls.get_expired_payments()
        for payment in expired_payments:
            payment.mark_as_cancelled()
        return len(expired_payments)
    
    def save(self):
        """Save payment to database"""
        db.session.add(self)
        db.session.commit()
        return self
    
    def delete(self):
        """Delete payment from database"""
        db.session.delete(self)
        db.session.commit()