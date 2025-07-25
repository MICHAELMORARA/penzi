from flask import Blueprint, request, jsonify
from app.services.smsMessagesService import SmsService
import logging

# Reduce logging verbosity
logging.getLogger(__name__).setLevel(logging.WARNING)

sms_bp = Blueprint('sms_api', __name__, url_prefix='/api/sms')

def normalize_phone(phone):
    """Remove + prefix from phone numbers for consistency"""
    if phone and phone.startswith('+'):
        return phone[1:]
    return phone

@sms_bp.route('/process-incoming', methods=['POST'])
def process_incoming_sms():
    """Process incoming SMS messages with enhanced error handling"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['from_phone', 'to_phone', 'message_body', 'direction']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}',
                'required_fields': required_fields
            }), 400
        
        # Extract data
        from_phone = data['from_phone']
        to_phone = data['to_phone']
        message_body = data['message_body']
        direction = data['direction']
        
        # Validate direction
        if direction not in ['incoming', 'outgoing']:
            return jsonify({
                'success': False,
                'error': 'Direction must be either "incoming" or "outgoing"'
            }), 400
        
        # Check if this is a PENZI activation command - these should bypass user validation
        is_penzi_command = message_body.strip().upper() == 'PENZI'
        
        # Only validate user existence for non-PENZI commands
        if not is_penzi_command and direction == 'incoming':
            try:
                from app.services.userService import UserService
                from app.models.userModel import RegistrationStage
                
                user, user_message = UserService.get_user_by_phone(from_phone)
                
                if not user:
                    return jsonify({
                        'success': False,
                        'from_phone': from_phone,
                        'to_phone': to_phone,
                        'message_body': message_body,
                        'direction': direction,
                        'error': f'User not found: {user_message}. Please send PENZI to 22141 to activate service first.',
                        'debug_info': {
                            'searched_phone': from_phone,
                            'normalized_phone': UserService.validate_phone_number(from_phone)
                        },
                        'status': 'user_not_found'
                    }), 404
                
            except Exception as user_check_error:
                return jsonify({
                    'success': False,
                    'from_phone': from_phone,
                    'to_phone': to_phone,
                    'message_body': message_body,
                    'direction': direction,
                    'error': f'User validation failed: {str(user_check_error)}',
                    'error_type': type(user_check_error).__name__,
                    'status': 'user_validation_failed'
                }), 500
        
        # Initialize SMS service
        sms_service = SmsService()
        
        # Process the incoming SMS with detailed error handling
        if direction == 'incoming':
            try:
                response = sms_service.process_incoming_sms(from_phone, message_body)
                
                # Check if the response indicates success or failure
                response_success = response.get('success', True) if isinstance(response, dict) else True
                
                if not response_success:
                    return jsonify({
                        'success': False,
                        'from_phone': from_phone,
                        'to_phone': to_phone,
                        'message_body': message_body,
                        'direction': direction,
                        'error': response.get('message', 'SMS processing failed'),
                        'sms_service_response': response,
                        'status': 'sms_processing_failed'
                    }), 400
                
            except Exception as sms_error:
                return jsonify({
                    'success': False,
                    'from_phone': from_phone,
                    'to_phone': to_phone,
                    'message_body': message_body,
                    'direction': direction,
                    'error': str(sms_error),
                    'error_type': type(sms_error).__name__,
                    'status': 'sms_service_exception'
                }), 500
        else:
            # Handle outgoing messages if needed
            response = sms_service.send_response(to_phone, message_body)
        
        # Return successful response
        return jsonify({
            'success': True,
            'from_phone': from_phone,
            'to_phone': to_phone,
            'message_body': message_body,
            'direction': direction,
            'response': response,
            'status': 'processed'
        }), 200
        
    except Exception as e:
        # Handle any errors
        from app.extensions import db
        db.session.rollback()  # Rollback any failed database operations
        
        return jsonify({
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__,
            'status': 'general_exception'
        }), 500

@sms_bp.route('/send-message', methods=['POST'])
def send_message():
    """Send SMS message"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        to_phone = data.get('to_phone')
        message_body = data.get('message_body')
        message_type = data.get('message_type', 'admin_message')
        
        if not to_phone or not message_body:
            return jsonify({
                'success': False,
                'message': 'to_phone and message_body are required'
            }), 400
        
        # Send the SMS
        sms_service = SmsService()
        result = sms_service.send_response(to_phone, message_body, message_type)
        
        return jsonify({
            'success': True,
            'message': 'SMS sent successfully',
            'response': result
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to send SMS: {str(e)}'
        }), 500

@sms_bp.route('/conversations', methods=['GET'])
def get_conversations():
    """Get SMS conversations for chat interface"""
    try:
        from app.models.smsMessagesModel import SmsMessage
        from app.models.userModel import User
        from app.extensions import db
        from sqlalchemy import func, desc, or_, and_
        
        # Group all messages between each user and the system number as a single conversation
        system_number = '22141'
        users_query = db.session.query(SmsMessage.from_phone).filter(SmsMessage.from_phone != system_number).distinct()
        conversations_data = []
        from app.services.userService import UserService
        # Don't normalize system number - it's already in the correct format
        norm_system_number = system_number
        
        for user_row in users_query:
            user_phone = normalize_phone(UserService.validate_phone_number(user_row.from_phone))
            
            # Get all messages between this user and the system (both directions, normalized)
            messages = SmsMessage.query.filter(
                or_(
                    SmsMessage.from_phone == user_phone,
                    SmsMessage.to_phone == user_phone
                ),
                or_(
                    SmsMessage.from_phone == norm_system_number,
                    SmsMessage.to_phone == norm_system_number
                )
            ).order_by(SmsMessage.created_at).all()
            
            if not messages:
                continue
            last_message = messages[-1]
            # Get user with better phone number matching
            from app.models.userModel import User
            user = None
            
            # Try multiple phone number formats to find the user
            phone_variations = [
                user_phone,
                user_row.from_phone,  # Original format
                UserService.validate_phone_number(user_row.from_phone),  # Normalized format
            ]
            
            # Remove duplicates and None values
            phone_variations = list(set(filter(None, phone_variations)))
            
            for phone_var in phone_variations:
                user = User.query.filter_by(phone_number=phone_var).first()
                if user:
                    break
            
            # If still not found, try using UserService
            if not user:
                try:
                    user, _ = UserService.get_user_by_phone(user_row.from_phone)
                except Exception:
                    pass
            
            conversation_data = {
                'phone_number': user_phone,
                'user_name': user.name if user else 'System (22141)',
                'last_message': last_message.message_body if last_message else '',
                'last_message_time': last_message.created_at.isoformat() if last_message and last_message.created_at else None,
                'message_count': len(messages),
                'messages': [
                    {
                        'id': msg.id,
                        'from_phone': msg.from_phone,
                        'to_phone': msg.to_phone,
                        'message_body': msg.message_body,
                        'direction': msg.direction,
                        'timestamp': msg.created_at.isoformat() if msg.created_at else None,
                        'user_name': (
                            'System (22141)' if msg.from_phone == system_number 
                            else (user.name if user and user.name else 'System (22141)')
                        ),
                    }
                    for msg in messages
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
        return jsonify({
            'success': False,
            'message': f'Failed to get conversations: {str(e)}'
        }), 500

@sms_bp.route('/conversations/<phone_number>/clear', methods=['DELETE', 'OPTIONS'])
def clear_conversation(phone_number):
    """Clear all messages for a specific conversation"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'DELETE,OPTIONS')
        return response
    
    try:
        from app.models.smsMessagesModel import SmsMessage
        from app.extensions import db
        from sqlalchemy import or_, and_
        from app.services.userService import UserService
        
        # Normalize the phone number
        normalized_phone = normalize_phone(UserService.validate_phone_number(phone_number))
        system_number = '22141'
        
        # Delete all messages between this user and the system
        deleted_count = SmsMessage.query.filter(
            or_(
                and_(SmsMessage.from_phone == normalized_phone, SmsMessage.to_phone == system_number),
                and_(SmsMessage.from_phone == system_number, SmsMessage.to_phone == normalized_phone),
                and_(SmsMessage.from_phone == phone_number, SmsMessage.to_phone == system_number),
                and_(SmsMessage.from_phone == system_number, SmsMessage.to_phone == phone_number)
            )
        ).delete(synchronize_session=False)
        
        db.session.commit()
        
        response = jsonify({
            'success': True,
            'message': f'Cleared {deleted_count} messages for conversation',
            'deleted_count': deleted_count
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        db.session.rollback()
        response = jsonify({
            'success': False,
            'message': f'Failed to clear conversation: {str(e)}'
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

@sms_bp.route('/messages/<int:message_id>', methods=['DELETE', 'OPTIONS'])
def delete_message(message_id):
    """Delete a specific message"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'DELETE,OPTIONS')
        return response
    
    try:
        from app.models.smsMessagesModel import SmsMessage
        from app.extensions import db
        
        # Find and delete the message
        message = SmsMessage.query.get(message_id)
        if not message:
            response = jsonify({
                'success': False,
                'message': 'Message not found'
            })
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 404
        
        db.session.delete(message)
        db.session.commit()
        
        response = jsonify({
            'success': True,
            'message': 'Message deleted successfully'
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        db.session.rollback()
        response = jsonify({
            'success': False,
            'message': f'Failed to delete message: {str(e)}'
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

@sms_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'SMS Processing API',
        'version': '1.0.0'
    }), 200

# Error handlers
@sms_bp.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Endpoint not found'}), 404

@sms_bp.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'success': False, 'message': 'Method not allowed'}), 405

@sms_bp.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'message': 'Internal server error'}), 500