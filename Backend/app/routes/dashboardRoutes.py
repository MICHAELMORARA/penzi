from flask import Blueprint, request, jsonify
from app.models.userModel import User, RegistrationStage
from app.models.matchModel import Match
from app.models.smsMessagesModel import SmsMessage
from app.models.userInterestModel import UserInterest
from app.models.matchRequestModel import MatchRequest
from app.extensions import db
from sqlalchemy import func, desc, and_, or_
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/analytics', methods=['GET'])
def get_analytics():
    """Get dashboard analytics data"""
    try:
        # Calculate success rate (interests that got positive responses)
        total_interests = UserInterest.query.count()
        positive_responses = UserInterest.query.filter(
            UserInterest.response == 'YES'
        ).count()
        
        success_rate = (positive_responses / total_interests * 100) if total_interests > 0 else 0
        
        analytics = {
            'success_rate': round(success_rate, 1),
            'total_interests': total_interests,
            'positive_responses': positive_responses,
            'conversion_rate': round(success_rate, 1)  
        }
        
        return jsonify({
            'success': True,
            'data': analytics,
            'message': 'Analytics data retrieved successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting analytics: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to get analytics: {str(e)}'
        }), 500

@dashboard_bp.route('/users', methods=['GET'])
def get_users():
    """Get users with pagination and filters"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        status = request.args.get('status', 'all')
        search = request.args.get('search', '')
        
        # Build query
        query = User.query
        
        # Apply status filter
        if status == 'active':
            query = query.filter(User.is_active == True)
        elif status == 'inactive':
            query = query.filter(User.is_active == False)
        elif status == 'completed':
            query = query.filter(User.registration_stage == RegistrationStage.COMPLETED)
        elif status == 'pending':
            query = query.filter(User.registration_stage != RegistrationStage.COMPLETED)
        
        # Apply search filter
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(
                    User.name.ilike(search_filter),
                    User.phone_number.ilike(search_filter),
                    User.town.ilike(search_filter),
                    User.county.ilike(search_filter)
                )
            )
        
        # Order by creation date (newest first)
        query = query.order_by(desc(User.created_at))
        
        # Paginate
        paginated_users = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        users_data = []
        for user in paginated_users.items:
            users_data.append(user.to_dict())
        
        return jsonify({
            'success': True,
            'data': {
                'users': users_data,
                'pagination': {
                    'page': page,
                    'pages': paginated_users.pages,
                    'per_page': per_page,
                    'total': paginated_users.total
                }
            },
            'message': f'Retrieved {len(users_data)} users'
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to get users: {str(e)}'
        }), 500

@dashboard_bp.route('/matches', methods=['GET'])
def get_matches():
    """Get matches with pagination and filters"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        status = request.args.get('status', 'all')
        
        # Build query - simplified without complex joins
        query = Match.query
        
        # Apply status filter
        if status == 'active':
            query = query.filter(Match.status == 'active')
        elif status == 'pending':
            query = query.filter(Match.status == 'pending')
        elif status == 'expired':
            query = query.filter(Match.status == 'expired')
        
        # Order by creation date (newest first)
        query = query.order_by(desc(Match.created_at))
        
        # Get matches with pagination
        matches = query.offset((page - 1) * per_page).limit(per_page).all()
        total_matches = query.count()
        
        matches_data = []
        for match in matches:
            requester = User.query.get(match.requester_id)
            matched_user = User.query.get(match.matched_user_id)
            
            match_data = {
                'id': match.id,
                'requester': {
                    'id': requester.id,
                    'name': requester.name or 'Unknown',
                    'phone': requester.phone_number,
                    'age': requester.age,
                    'town': requester.town,
                } if requester else None,
                'matched_user': {
                    'id': matched_user.id,
                    'name': matched_user.name or 'Unknown',
                    'phone': matched_user.phone_number,
                    'age': matched_user.age,
                    'town': matched_user.town,
                } if matched_user else None,
                'status': getattr(match, 'status', 'active'),
                'compatibility_score': getattr(match, 'compatibility_score', 85),
                'created_at': match.created_at.isoformat() if match.created_at else None,
            }
            matches_data.append(match_data)
        
        return jsonify({
            'success': True,
            'data': {
                'matches': matches_data,
                'pagination': {
                    'page': page,
                    'pages': (total_matches + per_page - 1) // per_page,
                    'per_page': per_page,
                    'total': total_matches
                }
            },
            'message': f'Retrieved {len(matches_data)} matches'
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting matches: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to get matches: {str(e)}'
        }), 500

@dashboard_bp.route('/interests', methods=['GET'])
def get_interests():
    """Get interests with pagination and filters"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        response_filter = request.args.get('response', 'all')
        
        # Build query
        query = UserInterest.query
        
        # Apply response filter
        if response_filter == 'pending':
            query = query.filter(UserInterest.response_received == False)
        elif response_filter == 'YES':
            query = query.filter(UserInterest.response == 'YES')
        elif response_filter == 'NO':
            query = query.filter(UserInterest.response == 'NO')
        
        # Order by creation date (newest first)
        query = query.order_by(desc(UserInterest.created_at))
        
        # Paginate
        paginated_interests = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        interests_data = []
        for interest in paginated_interests.items:
            interested_user = User.query.get(interest.interested_user_id)
            target_user = User.query.get(interest.target_user_id)
            
            interest_data = {
                'id': interest.id,
                'interested_user': {
                    'id': interested_user.id,
                    'name': interested_user.name or 'Unknown',
                    'phone': interested_user.phone_number,
                } if interested_user else None,
                'target_user': {
                    'id': target_user.id,
                    'name': target_user.name or 'Unknown',
                    'phone': target_user.phone_number,
                } if target_user else None,
                'interest_type': interest.interest_type or 'romantic',
                'response': interest.response,
                'notification_sent': interest.notification_sent,
                'response_received': interest.response_received,
                'feedback_sent': getattr(interest, 'feedback_sent', False),
                'created_at': interest.created_at.isoformat() if interest.created_at else None,
                'response_at': interest.response_at.isoformat() if interest.response_at else None,
            }
            interests_data.append(interest_data)
        
        return jsonify({
            'success': True,
            'data': {
                'interests': interests_data,
                'pagination': {
                    'page': page,
                    'pages': paginated_interests.pages,
                    'per_page': per_page,
                    'total': paginated_interests.total
                }
            },
            'message': f'Retrieved {len(interests_data)} interests'
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting interests: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to get interests: {str(e)}'
        }), 500

@dashboard_bp.route('/messages', methods=['GET'])
def get_messages():
    """Get SMS messages with pagination and filters"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        direction = request.args.get('direction', 'all')
        message_type = request.args.get('message_type', 'all')
        
        # Build query
        query = SmsMessage.query
        
        # Apply direction filter
        if direction == 'inbound':
            query = query.filter(SmsMessage.direction == 'incoming')
        elif direction == 'outbound':
            query = query.filter(SmsMessage.direction == 'outgoing')
        
        # Apply message type filter
        if message_type != 'all':
            query = query.filter(SmsMessage.message_type == message_type)
        
        # Order by timestamp (newest first)
        query = query.order_by(desc(SmsMessage.created_at))
        
        # Paginate
        paginated_messages = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        messages_data = []
        for message in paginated_messages.items:
            user = User.query.get(message.related_user_id) if message.related_user_id else None
            
            # If no user found via related_user_id, try to find by phone number
            if not user:
                from app.services.userService import UserService
                if message.from_phone != '22141':
                    user, _ = UserService.get_user_by_phone(message.from_phone)
                elif message.to_phone != '22141':
                    user, _ = UserService.get_user_by_phone(message.to_phone)
            
            # Determine user name based on message direction and phone numbers
            if message.from_phone == '22141':
                # Message from system
                user_name = 'System (22141)'
            elif message.to_phone == '22141' and user and user.name:
                # Message to system from a known user
                user_name = user.name
            else:
                # Fallback for unknown users or system messages
                user_name = 'System (22141)'
            
            message_data = {
                'id': message.id,
                'from_phone': message.from_phone,
                'to_phone': message.to_phone,
                'message_body': message.message_body,
                'direction': message.direction,
                'message_type': message.message_type,
                'related_user_id': message.related_user_id,
                'user_name': user_name,
                'timestamp': message.created_at.isoformat() if message.created_at else None,
            }
            messages_data.append(message_data)
        
        return jsonify({
            'success': True,
            'data': {
                'messages': messages_data,
                'pagination': {
                    'page': page,
                    'pages': paginated_messages.pages,
                    'per_page': per_page,
                    'total': paginated_messages.total
                }
            },
            'message': f'Retrieved {len(messages_data)} messages'
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting messages: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to get messages: {str(e)}'
        }), 500

@dashboard_bp.route('/conversations', methods=['GET'])
def get_conversations():
    """Get chat conversations for live chat"""
    try:
        # Get unique phone numbers from SMS messages
        conversations_query = db.session.query(
            SmsMessage.from_phone,
            func.max(SmsMessage.created_at).label('last_message_time'),
            func.count(SmsMessage.id).label('message_count')
        ).filter(
            SmsMessage.direction == 'incoming'
        ).group_by(SmsMessage.from_phone).order_by(desc('last_message_time')).limit(20)
        
        conversations_data = []
        for conv in conversations_query:
            # Get user details using UserService for better phone matching
            from app.services.userService import UserService
            user, _ = UserService.get_user_by_phone(conv.from_phone)
            
            # Get recent messages for this conversation
            recent_messages = SmsMessage.query.filter(
                or_(
                    and_(SmsMessage.from_phone == conv.from_phone, SmsMessage.direction == 'incoming'),
                    and_(SmsMessage.to_phone == conv.from_phone, SmsMessage.direction == 'outgoing')
                )
            ).order_by(SmsMessage.created_at).limit(50).all()
            
            # Get last message
            last_message = SmsMessage.query.filter(
                or_(
                    and_(SmsMessage.from_phone == conv.from_phone, SmsMessage.direction == 'incoming'),
                    and_(SmsMessage.to_phone == conv.from_phone, SmsMessage.direction == 'outgoing')
                )
            ).order_by(desc(SmsMessage.created_at)).first()
            
            conversation_data = {
                'phone_number': conv.from_phone,
                'user_name': user.name if user else 'System (22141)',
                'last_message': last_message.message_body if last_message else '',
                'last_message_time': conv.last_message_time.isoformat() if conv.last_message_time else None,
                'message_count': conv.message_count,
                'messages': [
                    {
                        'id': msg.id,
                        'from_phone': msg.from_phone,
                        'to_phone': msg.to_phone,
                        'message_body': msg.message_body,
                        'direction': msg.direction,
                        'timestamp': msg.created_at.isoformat() if msg.created_at else None,
                        'user_name': user.name if user else None,
                    }
                    for msg in recent_messages
                ]
            }
            conversations_data.append(conversation_data)
        
        return jsonify({
            'success': True,
            'data': {
                'conversations': conversations_data
            },
            'message': f'Retrieved {len(conversations_data)} conversations'
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting conversations: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to get conversations: {str(e)}'
        }), 500

@dashboard_bp.route('/send-message', methods=['POST'])
def send_message():
    """Send SMS message through the system"""
    try:
        data = request.get_json()
        to_phone = data.get('to_phone')
        message = data.get('message')
        
        if not to_phone or not message:
            return jsonify({
                'success': False,
                'message': 'Phone number and message are required'
            }), 400
        
        # Use the SMS service to send the message
        from app.services.smsMessagesService import SmsService
        sms_service = SmsService()
        
        result = sms_service.send_response(to_phone, message, 'admin_message')
        
        return jsonify({
            'success': True,
            'data': result,
            'message': 'Message sent successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to send message: {str(e)}'
        }), 500

@dashboard_bp.route('/notifications/count', methods=['GET'])
def get_notification_count():
    """Get notification count for efficient polling"""
    try:
        # Get count of recent interests with notifications
        interest_count = UserInterest.query.filter(
            UserInterest.notification_sent == True,
            UserInterest.created_at >= datetime.utcnow() - timedelta(hours=24)
        ).count()
        
        # Get count of recent matches
        match_count = Match.query.filter(
            Match.created_at >= datetime.utcnow() - timedelta(hours=24)
        ).count()
        
        # Get count of recent messages
        message_count = SmsMessage.query.filter(
            SmsMessage.direction == 'incoming',
            SmsMessage.created_at >= datetime.utcnow() - timedelta(hours=24)
        ).count()
        
        total_count = interest_count + match_count + message_count
        
        return jsonify({
            'success': True,
            'data': {
                'total_count': total_count,
                'interest_count': interest_count,
                'match_count': match_count,
                'message_count': message_count,
                'last_updated': datetime.utcnow().isoformat()
            },
            'message': 'Notification count retrieved successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting notification count: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to get notification count: {str(e)}'
        }), 500

# Error handlers
@dashboard_bp.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Endpoint not found'}), 404

@dashboard_bp.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'success': False, 'message': 'Method not allowed'}), 405

@dashboard_bp.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'message': 'Internal server error'}), 500