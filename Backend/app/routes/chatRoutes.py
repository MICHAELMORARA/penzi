from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.extensions import db
from app.models.userModel import User
from app.models.matchModel import Match
from app.models.chatMessageModel import ChatMessage

chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')

@chat_bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    """Get all conversations for the current user"""
    try:
        current_user_id = int(get_jwt_identity())
        
        # Get all matches for the current user (these represent conversations)
        matches = Match.query.filter(
            (Match.requester_id == current_user_id) | 
            (Match.matched_user_id == current_user_id)
        ).all()
        
        conversations = []
        for match in matches:
            # Determine the other user in the conversation
            other_user_id = match.matched_user_id if match.requester_id == current_user_id else match.requester_id
            other_user = User.query.get(other_user_id)
            
            if other_user:
                # Get latest message for this conversation
                latest_message = ChatMessage.get_latest_message_for_match(match.id)
                
                # Get unread count
                unread_count = ChatMessage.query.filter_by(
                    match_id=match.id,
                    receiver_id=current_user_id,
                    is_read=False,
                    is_deleted=False
                ).count()
                
                last_message_data = {
                    'text': 'Start a conversation!',
                    'timestamp': match.created_at.isoformat(),
                    'isRead': True
                }
                
                if latest_message:
                    last_message_data = {
                        'text': latest_message.message_text,
                        'timestamp': latest_message.created_at.isoformat(),
                        'isRead': latest_message.is_read,
                        'senderId': latest_message.sender_id
                    }
                
                conversations.append({
                    'id': str(match.id),
                    'userId': str(other_user_id),
                    'user': {
                        'id': str(other_user.id),
                        'firstName': other_user.first_name,
                        'lastName': other_user.last_name,
                        'profilePicture': other_user.profile_picture,
                        'isOnline': False,  # TODO: Implement online status
                        'lastSeen': None    # TODO: Implement last seen
                    },
                    'lastMessage': last_message_data,
                    'unreadCount': unread_count,
                    'isPaid': getattr(match, 'is_paid', False),
                    'canChat': getattr(match, 'is_paid', False)
                })
        
        # Sort by latest message timestamp
        conversations.sort(key=lambda x: x['lastMessage']['timestamp'], reverse=True)
        
        return jsonify(conversations), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get conversations: {str(e)}'}), 500

@chat_bp.route('/conversations/<conversation_id>/messages', methods=['GET'])
@jwt_required()
def get_messages(conversation_id):
    """Get messages for a specific conversation"""
    try:
        current_user_id = int(get_jwt_identity())
        
        # Verify the conversation exists and user is part of it
        match = Match.query.get(conversation_id)
        if not match:
            return jsonify({'message': 'Conversation not found'}), 404
        
        if str(match.requester_id) != str(current_user_id) and str(match.matched_user_id) != str(current_user_id):
            return jsonify({'message': 'Unauthorized'}), 403
        
        # Check if user can chat (payment required)
        if not getattr(match, 'is_paid', False):
            return jsonify({'message': 'Payment required to access chat'}), 402
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 50, type=int)
        offset = (page - 1) * limit
        
        # Get messages for this conversation
        messages = ChatMessage.get_match_messages(conversation_id, limit, offset)
        
        # Mark messages as read for the current user
        ChatMessage.mark_match_messages_as_read(conversation_id, current_user_id)
        
        messages_data = [message.to_dict() for message in reversed(messages)]
        
        return jsonify({
            'messages': messages_data,
            'page': page,
            'limit': limit,
            'hasMore': len(messages) == limit
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get messages: {str(e)}'}), 500

@chat_bp.route('/conversations/<conversation_id>/messages', methods=['POST'])
@jwt_required()
def send_message(conversation_id):
    """Send a message in a conversation"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data.get('message'):
            return jsonify({'message': 'Message content is required'}), 400
        
        # Verify the conversation exists and user is part of it
        match = Match.query.get(conversation_id)
        if not match:
            return jsonify({'message': 'Conversation not found'}), 404
        
        if str(match.requester_id) != str(current_user_id) and str(match.matched_user_id) != str(current_user_id):
            return jsonify({'message': 'Unauthorized'}), 403
        
        # Check if user can chat (payment required)
        if not getattr(match, 'is_paid', False):
            return jsonify({'message': 'Payment required to send messages'}), 402
        
        # Determine receiver
        receiver_id = match.matched_user_id if match.requester_id == current_user_id else match.requester_id
        
        # Create message
        message = ChatMessage(
            match_id=conversation_id,
            sender_id=current_user_id,
            receiver_id=receiver_id,
            message_text=data['message'],
            message_type=data.get('messageType', 'text')
        )
        message.save()
        
        return jsonify({
            'message': 'Message sent successfully',
            'messageData': message.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to send message: {str(e)}'}), 500

@chat_bp.route('/conversations/<conversation_id>/typing', methods=['POST'])
@jwt_required()
def send_typing_indicator(conversation_id):
    """Send typing indicator"""
    try:
        current_user_id = int(get_jwt_identity())
        
        # Verify the conversation exists and user is part of it
        match = Match.query.get(conversation_id)
        if not match:
            return jsonify({'message': 'Conversation not found'}), 404
        
        if str(match.requester_id) != str(current_user_id) and str(match.matched_user_id) != str(current_user_id):
            return jsonify({'message': 'Unauthorized'}), 403
        
        # TODO: Implement typing indicator via WebSocket
        
        return jsonify({'message': 'Typing indicator sent'}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to send typing indicator: {str(e)}'}), 500

@chat_bp.route('/conversations/<conversation_id>/read', methods=['POST'])
@jwt_required()
def mark_as_read(conversation_id):
    """Mark messages as read"""
    try:
        current_user_id = int(get_jwt_identity())
        
        # Verify the conversation exists and user is part of it
        match = Match.query.get(conversation_id)
        if not match:
            return jsonify({'message': 'Conversation not found'}), 404
        
        if str(match.requester_id) != str(current_user_id) and str(match.matched_user_id) != str(current_user_id):
            return jsonify({'message': 'Unauthorized'}), 403
        
        # Mark all messages in this conversation as read for current user
        ChatMessage.mark_match_messages_as_read(conversation_id, current_user_id)
        
        return jsonify({'message': 'Messages marked as read'}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to mark messages as read: {str(e)}'}), 500

@chat_bp.route('/messages/<int:message_id>', methods=['DELETE'])
@jwt_required()
def delete_message(message_id):
    """Delete a message"""
    try:
        current_user_id = int(get_jwt_identity())
        
        message = ChatMessage.query.get(message_id)
        if not message:
            return jsonify({'message': 'Message not found'}), 404
        
        # Only sender can delete their message
        if message.sender_id != current_user_id:
            return jsonify({'message': 'Unauthorized'}), 403
        
        # Soft delete the message
        message.soft_delete()
        
        return jsonify({'message': 'Message deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to delete message: {str(e)}'}), 500

@chat_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Get total unread message count for current user"""
    try:
        current_user_id = int(get_jwt_identity())
        
        unread_count = ChatMessage.get_unread_count(current_user_id)
        
        return jsonify({'unreadCount': unread_count}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get unread count: {str(e)}'}), 500

@chat_bp.route('/search', methods=['GET'])
@jwt_required()
def search_messages():
    """Search messages across all conversations"""
    try:
        current_user_id = int(get_jwt_identity())
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify({'message': 'Search query is required'}), 400
        
        # Get user's matches to limit search scope
        user_matches = Match.query.filter(
            (Match.requester_id == current_user_id) | 
            (Match.matched_user_id == current_user_id)
        ).all()
        
        match_ids = [match.id for match in user_matches]
        
        # Search messages
        messages = ChatMessage.query.filter(
            ChatMessage.match_id.in_(match_ids),
            ChatMessage.message_text.ilike(f'%{query}%'),
            ChatMessage.is_deleted == False
        ).order_by(ChatMessage.created_at.desc()).limit(50).all()
        
        results = []
        for message in messages:
            match = Match.query.get(message.match_id)
            other_user_id = match.matched_user_id if match.requester_id == current_user_id else match.requester_id
            other_user = User.query.get(other_user_id)
            
            results.append({
                'message': message.to_dict(),
                'conversation': {
                    'id': str(match.id),
                    'user': {
                        'id': str(other_user.id),
                        'firstName': other_user.first_name,
                        'lastName': other_user.last_name,
                        'profilePicture': other_user.profile_picture
                    }
                }
            })
        
        return jsonify({
            'results': results,
            'query': query,
            'totalResults': len(results)
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to search messages: {str(e)}'}), 500