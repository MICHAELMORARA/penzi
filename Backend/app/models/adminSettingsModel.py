from datetime import datetime
from app.extensions import db


class AdminSettings(db.Model):
    __tablename__ = 'admin_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    setting_key = db.Column(db.String(100), unique=True, nullable=False)
    setting_value = db.Column(db.Text, nullable=False)
    setting_type = db.Column(db.String(20), default='string', nullable=False)  # string, number, boolean, json
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Relationship
    updated_by_user = db.relationship('User', backref='admin_settings_updates')
    
    def __init__(self, setting_key, setting_value, setting_type='string', description=None):
        self.setting_key = setting_key
        self.setting_value = str(setting_value)
        self.setting_type = setting_type
        self.description = description
    
    def to_dict(self):
        return {
            'id': self.id,
            'settingKey': self.setting_key,
            'settingValue': self.get_typed_value(),
            'settingType': self.setting_type,
            'description': self.description,
            'isActive': self.is_active,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'updatedBy': self.updated_by
        }
    
    def get_typed_value(self):
        """Return the setting value in its proper type"""
        if self.setting_type == 'number':
            try:
                if '.' in self.setting_value:
                    return float(self.setting_value)
                return int(self.setting_value)
            except ValueError:
                return 0
        elif self.setting_type == 'boolean':
            return self.setting_value.lower() in ('true', '1', 'yes', 'on')
        elif self.setting_type == 'json':
            import json
            try:
                return json.loads(self.setting_value)
            except json.JSONDecodeError:
                return {}
        else:
            return self.setting_value
    
    def update_value(self, new_value, updated_by_user_id=None):
        """Update the setting value"""
        self.setting_value = str(new_value)
        self.updated_at = datetime.utcnow()
        if updated_by_user_id:
            self.updated_by = updated_by_user_id
        db.session.commit()
        return self
    
    @classmethod
    def get_setting(cls, key, default_value=None):
        """Get a setting value by key"""
        setting = cls.query.filter_by(setting_key=key, is_active=True).first()
        if setting:
            return setting.get_typed_value()
        return default_value
    
    @classmethod
    def set_setting(cls, key, value, setting_type='string', description=None, updated_by_user_id=None):
        """Set or update a setting"""
        setting = cls.query.filter_by(setting_key=key).first()
        if setting:
            setting.update_value(value, updated_by_user_id)
        else:
            setting = cls(key, value, setting_type, description)
            if updated_by_user_id:
                setting.updated_by = updated_by_user_id
            db.session.add(setting)
            db.session.commit()
        return setting
    
    @classmethod
    def get_all_settings(cls):
        """Get all active settings"""
        return cls.query.filter_by(is_active=True).all()
    
    @classmethod
    def initialize_default_settings(cls):
        """Initialize default admin settings"""
        default_settings = [
            ('match_fee', '50', 'number', 'Fee for expressing interest in a match (KES)'),
            ('premium_monthly_fee', '500', 'number', 'Monthly premium subscription fee (KES)'),
            ('premium_yearly_fee', '5000', 'number', 'Yearly premium subscription fee (KES)'),
            ('max_free_likes_per_day', '5', 'number', 'Maximum free likes per day for non-premium users'),
            ('max_photos_per_user', '6', 'number', 'Maximum number of photos a user can upload'),
            ('photo_verification_required', 'false', 'boolean', 'Whether photo verification is required'),
            ('min_age', '18', 'number', 'Minimum age for registration'),
            ('max_age', '80', 'number', 'Maximum age for registration'),
            ('app_name', 'Penzi', 'string', 'Application name'),
            ('support_email', 'support@penzi.co.ke', 'string', 'Support email address'),
            ('support_phone', '+254700000000', 'string', 'Support phone number'),
            ('mpesa_shortcode', '174379', 'string', 'M-Pesa business shortcode'),
            ('mpesa_passkey', '', 'string', 'M-Pesa passkey'),
            ('mpesa_consumer_key', '', 'string', 'M-Pesa consumer key'),
            ('mpesa_consumer_secret', '', 'string', 'M-Pesa consumer secret'),
            ('mpesa_callback_url', '', 'string', 'M-Pesa callback URL'),
            ('mpesa_environment', 'sandbox', 'string', 'M-Pesa environment (sandbox/production)'),
            ('enable_sms_notifications', 'true', 'boolean', 'Enable SMS notifications'),
            ('enable_email_notifications', 'true', 'boolean', 'Enable email notifications'),
            ('match_radius_km', '50', 'number', 'Default match radius in kilometers'),
            ('registration_stages', '8', 'number', 'Number of registration stages'),
            ('nairobi_match_threshold', '20', 'number', 'Number of matches required to access Nairobi matches'),
        ]
        
        for key, value, setting_type, description in default_settings:
            existing = cls.query.filter_by(setting_key=key).first()
            if not existing:
                setting = cls(key, value, setting_type, description)
                db.session.add(setting)
        
        db.session.commit()
    
    def save(self):
        """Save setting to database"""
        db.session.add(self)
        db.session.commit()
        return self
    
    def delete(self):
        """Soft delete setting"""
        self.is_active = False
        self.updated_at = datetime.utcnow()
        db.session.commit()