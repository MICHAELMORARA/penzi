from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.extensions import db
from app.models.userModel import User
from app.models.adminSettingsModel import AdminSettings
from app.models.paymentTransactionModel import PaymentTransaction
from app.models.matchModel import Match
from app.models.userPhotoModel import UserPhoto

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

def require_admin():
    """Decorator to require admin role"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user or user.role != 'admin':
        return jsonify({'message': 'Admin access required'}), 403
    return None

@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get admin dashboard statistics"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        # Get various statistics
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        completed_registrations = User.query.filter_by(registration_stage='completed').count()
        premium_users = User.query.filter_by(is_premium=True).count()
        
        total_matches = Match.query.count()
        paid_matches = Match.query.filter_by(is_paid=True).count()
        
        total_payments = PaymentTransaction.query.count()
        completed_payments = PaymentTransaction.query.filter_by(payment_status='completed').count()
        
        # Calculate revenue
        revenue_query = PaymentTransaction.query.filter_by(payment_status='completed')
        total_revenue = sum([p.amount for p in revenue_query.all()])
        
        # Recent registrations (last 7 days)
        from datetime import timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_registrations = User.query.filter(User.created_at >= week_ago).count()
        
        stats = {
            'users': {
                'total': total_users,
                'active': active_users,
                'completed_registrations': completed_registrations,
                'premium': premium_users,
                'recent_registrations': recent_registrations
            },
            'matches': {
                'total': total_matches,
                'paid': paid_matches,
                'conversion_rate': round((paid_matches / total_matches * 100) if total_matches > 0 else 0, 2)
            },
            'payments': {
                'total': total_payments,
                'completed': completed_payments,
                'total_revenue': total_revenue,
                'success_rate': round((completed_payments / total_payments * 100) if total_payments > 0 else 0, 2)
            }
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get dashboard stats: {str(e)}'}), 500

@admin_bp.route('/settings', methods=['GET'])
@jwt_required()
def get_settings():
    """Get all admin settings"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        settings = AdminSettings.get_all_settings()
        settings_data = [setting.to_dict() for setting in settings]
        
        return jsonify(settings_data), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get settings: {str(e)}'}), 500

@admin_bp.route('/settings', methods=['POST'])
@jwt_required()
def update_setting():
    """Update or create an admin setting"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        required_fields = ['settingKey', 'settingValue', 'settingType']
        for field in required_fields:
            if field not in data:
                return jsonify({'message': f'{field} is required'}), 400
        
        setting = AdminSettings.set_setting(
            key=data['settingKey'],
            value=data['settingValue'],
            setting_type=data['settingType'],
            description=data.get('description'),
            updated_by_user_id=current_user_id
        )
        
        return jsonify({
            'message': 'Setting updated successfully',
            'setting': setting.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update setting: {str(e)}'}), 500

@admin_bp.route('/settings/initialize', methods=['POST'])
@jwt_required()
def initialize_default_settings():
    """Initialize default admin settings"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        AdminSettings.initialize_default_settings()
        
        return jsonify({'message': 'Default settings initialized successfully'}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to initialize settings: {str(e)}'}), 500

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    """Get all users with pagination"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '').strip()
        
        query = User.query
        
        if search:
            query = query.filter(
                db.or_(
                    User.first_name.ilike(f'%{search}%'),
                    User.last_name.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%'),
                    User.phone_number.ilike(f'%{search}%')
                )
            )
        
        users = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        users_data = []
        for user in users.items:
            user_dict = user.to_auth_dict()
            user_dict['registrationStage'] = user.registration_stage.value if user.registration_stage else None
            user_dict['matchCount'] = user.get_match_count()
            users_data.append(user_dict)
        
        return jsonify({
            'users': users_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': users.total,
                'pages': users.pages,
                'has_next': users.has_next,
                'has_prev': users.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get users: {str(e)}'}), 500

@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_details(user_id):
    """Get detailed information about a specific user"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Get user photos
        photos = UserPhoto.get_user_photos(user_id)
        
        # Get user payments
        payments = PaymentTransaction.get_user_payments(user_id)
        
        # Get user matches
        matches = Match.query.filter(
            (Match.requester_id == user_id) | (Match.matched_user_id == user_id)
        ).all()
        
        user_data = user.to_auth_dict()
        user_data.update({
            'registrationStage': user.registration_stage.value if user.registration_stage else None,
            'photos': [photo.to_dict() for photo in photos],
            'payments': [payment.to_dict() for payment in payments],
            'matchCount': len(matches),
            'canAccessNairobi': user.can_access_nairobi_matches()
        })
        
        return jsonify(user_data), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get user details: {str(e)}'}), 500

@admin_bp.route('/users/<int:user_id>/toggle-status', methods=['POST'])
@jwt_required()
def toggle_user_status(user_id):
    """Toggle user active status"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        user.is_active = not user.is_active
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        status = 'activated' if user.is_active else 'deactivated'
        
        return jsonify({
            'message': f'User {status} successfully',
            'isActive': user.is_active
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to toggle user status: {str(e)}'}), 500

@admin_bp.route('/users/<int:user_id>/toggle-premium', methods=['POST'])
@jwt_required()
def toggle_user_premium(user_id):
    """Toggle user premium status"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        user.is_premium = not user.is_premium
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        status = 'granted' if user.is_premium else 'revoked'
        
        return jsonify({
            'message': f'Premium access {status} successfully',
            'isPremium': user.is_premium
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to toggle premium status: {str(e)}'}), 500

@admin_bp.route('/payments', methods=['GET'])
@jwt_required()
def get_payments():
    """Get all payment transactions"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        
        query = PaymentTransaction.query
        
        if status:
            query = query.filter_by(payment_status=status)
        
        payments = query.order_by(PaymentTransaction.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        payments_data = [payment.to_dict() for payment in payments.items]
        
        return jsonify({
            'payments': payments_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': payments.total,
                'pages': payments.pages,
                'has_next': payments.has_next,
                'has_prev': payments.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get payments: {str(e)}'}), 500

@admin_bp.route('/photos/pending', methods=['GET'])
@jwt_required()
def get_pending_photos():
    """Get photos pending verification"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        photos = UserPhoto.query.filter_by(is_verified=False).all()
        
        photos_data = []
        for photo in photos:
            photo_dict = photo.to_dict()
            photo_dict['user'] = {
                'id': photo.user.id,
                'firstName': photo.user.first_name,
                'lastName': photo.user.last_name,
                'email': photo.user.email
            }
            photos_data.append(photo_dict)
        
        return jsonify(photos_data), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get pending photos: {str(e)}'}), 500

@admin_bp.route('/photos/<int:photo_id>/verify', methods=['POST'])
@jwt_required()
def verify_photo(photo_id):
    """Verify a user photo"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        photo = UserPhoto.query.get(photo_id)
        if not photo:
            return jsonify({'message': 'Photo not found'}), 404
        
        photo.verify_photo()
        
        return jsonify({'message': 'Photo verified successfully'}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to verify photo: {str(e)}'}), 500

@admin_bp.route('/settings/<int:setting_id>', methods=['PUT'])
@jwt_required()
def update_setting_by_id(setting_id):
    """Update a specific admin setting by ID"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        setting = AdminSettings.query.get(setting_id)
        if not setting:
            return jsonify({'message': 'Setting not found'}), 404
        
        # Update setting fields
        if 'settingValue' in data:
            setting.setting_value = str(data['settingValue'])
        if 'description' in data:
            setting.description = data['description']
        if 'isActive' in data:
            setting.is_active = data['isActive']
        
        setting.updated_at = datetime.utcnow()
        setting.updated_by = current_user_id
        
        db.session.commit()
        
        return jsonify({
            'message': 'Setting updated successfully',
            'setting': setting.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update setting: {str(e)}'}), 500

@admin_bp.route('/settings/<int:setting_id>', methods=['DELETE'])
@jwt_required()
def delete_setting(setting_id):
    """Soft delete an admin setting"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        setting = AdminSettings.query.get(setting_id)
        if not setting:
            return jsonify({'message': 'Setting not found'}), 404
        
        setting.delete()
        
        return jsonify({'message': 'Setting deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to delete setting: {str(e)}'}), 500

@admin_bp.route('/settings/chat-fee', methods=['GET'])
@jwt_required()
def get_chat_fee():
    """Get current chat fee setting"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        chat_fee = AdminSettings.get_setting('match_fee', 50)
        setting = AdminSettings.query.filter_by(setting_key='match_fee').first()
        
        return jsonify({
            'chatFee': chat_fee,
            'setting': setting.to_dict() if setting else None
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get chat fee: {str(e)}'}), 500

@admin_bp.route('/settings/chat-fee', methods=['PUT'])
@jwt_required()
def update_chat_fee():
    """Update chat fee setting"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if 'chatFee' not in data:
            return jsonify({'message': 'chatFee is required'}), 400
        
        chat_fee = data['chatFee']
        
        # Validate chat fee
        try:
            chat_fee = float(chat_fee)
            if chat_fee < 0:
                return jsonify({'message': 'Chat fee must be non-negative'}), 400
        except (ValueError, TypeError):
            return jsonify({'message': 'Invalid chat fee value'}), 400
        
        # Update or create setting
        setting = AdminSettings.set_setting(
            key='match_fee',
            value=chat_fee,
            setting_type='number',
            description='Fee for expressing interest in a match (KES)',
            updated_by_user_id=current_user_id
        )
        
        return jsonify({
            'message': 'Chat fee updated successfully',
            'chatFee': chat_fee,
            'setting': setting.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update chat fee: {str(e)}'}), 500

@admin_bp.route('/settings/mpesa', methods=['GET'])
@jwt_required()
def get_mpesa_settings():
    """Get M-Pesa configuration settings"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        mpesa_settings = {
            'shortcode': AdminSettings.get_setting('mpesa_shortcode', '174379'),
            'consumerKey': AdminSettings.get_setting('mpesa_consumer_key', ''),
            'consumerSecret': AdminSettings.get_setting('mpesa_consumer_secret', ''),
            'passkey': AdminSettings.get_setting('mpesa_passkey', ''),
            'callbackUrl': AdminSettings.get_setting('mpesa_callback_url', ''),
            'environment': AdminSettings.get_setting('mpesa_environment', 'sandbox')
        }
        
        return jsonify(mpesa_settings), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get M-Pesa settings: {str(e)}'}), 500

@admin_bp.route('/settings/mpesa', methods=['PUT'])
@jwt_required()
def update_mpesa_settings():
    """Update M-Pesa configuration settings"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Define M-Pesa settings to update
        mpesa_settings = {
            'mpesa_shortcode': ('shortcode', 'string', 'M-Pesa business shortcode'),
            'mpesa_consumer_key': ('consumerKey', 'string', 'M-Pesa consumer key'),
            'mpesa_consumer_secret': ('consumerSecret', 'string', 'M-Pesa consumer secret'),
            'mpesa_passkey': ('passkey', 'string', 'M-Pesa passkey'),
            'mpesa_callback_url': ('callbackUrl', 'string', 'M-Pesa callback URL'),
            'mpesa_environment': ('environment', 'string', 'M-Pesa environment (sandbox/production)')
        }
        
        updated_settings = []
        
        for setting_key, (data_key, setting_type, description) in mpesa_settings.items():
            if data_key in data:
                setting = AdminSettings.set_setting(
                    key=setting_key,
                    value=data[data_key],
                    setting_type=setting_type,
                    description=description,
                    updated_by_user_id=current_user_id
                )
                updated_settings.append(setting.to_dict())
        
        return jsonify({
            'message': 'M-Pesa settings updated successfully',
            'settings': updated_settings
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update M-Pesa settings: {str(e)}'}), 500

@admin_bp.route('/analytics/revenue', methods=['GET'])
@jwt_required()
def get_revenue_analytics():
    """Get revenue analytics"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        # Get revenue by payment type
        from sqlalchemy import func
        revenue_by_type = db.session.query(
            PaymentTransaction.payment_type,
            func.sum(PaymentTransaction.amount).label('total'),
            func.count(PaymentTransaction.id).label('count')
        ).filter_by(payment_status='completed').group_by(PaymentTransaction.payment_type).all()
        
        # Get daily revenue for last 30 days
        from datetime import timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        daily_revenue = db.session.query(
            func.date(PaymentTransaction.completed_at).label('date'),
            func.sum(PaymentTransaction.amount).label('revenue'),
            func.count(PaymentTransaction.id).label('transactions')
        ).filter(
            PaymentTransaction.payment_status == 'completed',
            PaymentTransaction.completed_at >= thirty_days_ago
        ).group_by(func.date(PaymentTransaction.completed_at)).all()
        
        analytics = {
            'revenueByType': [
                {
                    'type': item.payment_type.value,
                    'total': float(item.total),
                    'count': item.count
                } for item in revenue_by_type
            ],
            'dailyRevenue': [
                {
                    'date': item.date.isoformat(),
                    'revenue': float(item.revenue),
                    'transactions': item.transactions
                } for item in daily_revenue
            ]
        }
        
        return jsonify(analytics), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get revenue analytics: {str(e)}'}), 500

@admin_bp.route('/payments/match-fees', methods=['GET'])
@jwt_required()
def get_match_fee_payments():
    """Get all match fee payments"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        
        query = PaymentTransaction.query.filter_by(payment_type='match_fee')
        
        if status:
            query = query.filter_by(payment_status=status)
        
        payments = query.order_by(PaymentTransaction.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        payments_data = []
        for payment in payments.items:
            payment_dict = payment.to_dict()
            # Add user details
            if payment.user:
                payment_dict['user'] = {
                    'id': payment.user.id,
                    'firstName': payment.user.first_name,
                    'lastName': payment.user.last_name,
                    'email': payment.user.email,
                    'phoneNumber': payment.user.phone_number
                }
            payments_data.append(payment_dict)
        
        return jsonify({
            'payments': payments_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': payments.total,
                'pages': payments.pages,
                'has_next': payments.has_next,
                'has_prev': payments.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get match fee payments: {str(e)}'}), 500

@admin_bp.route('/payments/<int:payment_id>/refund', methods=['POST'])
@jwt_required()
def refund_payment(payment_id):
    """Refund a payment"""
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        payment = PaymentTransaction.query.get(payment_id)
        if not payment:
            return jsonify({'message': 'Payment not found'}), 404
        
        if payment.payment_status != PaymentStatus.COMPLETED:
            return jsonify({'message': 'Can only refund completed payments'}), 400
        
        # Mark payment as refunded
        payment.payment_status = PaymentStatus.REFUNDED
        payment.updated_at = datetime.utcnow()
        
        # Remove user interest if it exists
        if payment.payment_type == PaymentType.MATCH_FEE:
            interest = UserInterest.query.filter_by(
                payment_transaction_id=payment.id
            ).first()
            if interest:
                db.session.delete(interest)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Payment refunded successfully',
            'payment': payment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to refund payment: {str(e)}'}), 500