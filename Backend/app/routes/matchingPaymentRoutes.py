from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import uuid
import requests
import base64
from app.extensions import db
from app.models.userModel import User
from app.models.paymentTransactionModel import PaymentTransaction, PaymentType, PaymentStatus
from app.models.adminSettingsModel import AdminSettings
from app.models.userInterestModel import UserInterest
from app.models.chatMessageModel import ChatMessage

matching_payment_bp = Blueprint('matching_payments', __name__, url_prefix='/api/matching/payment')

def get_mpesa_access_token():
    """Get M-Pesa access token"""
    try:
        # Get M-Pesa credentials from admin settings
        consumer_key = AdminSettings.get_setting('mpesa_consumer_key', '')
        consumer_secret = AdminSettings.get_setting('mpesa_consumer_secret', '')
        
        if not consumer_key or not consumer_secret:
            # Return mock token for development
            return "mock_access_token"
        
        # In production, use actual M-Pesa credentials
        from requests.auth import HTTPBasicAuth
        api_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        response = requests.get(api_url, auth=HTTPBasicAuth(consumer_key, consumer_secret))
        
        if response.status_code == 200:
            return response.json()['access_token']
        else:
            return None
            
    except Exception as e:
        print(f"Error getting M-Pesa access token: {str(e)}")
        return None

def initiate_mpesa_stk_push(phone_number, amount, account_reference, transaction_desc):
    """Initiate M-Pesa STK Push"""
    try:
        access_token = get_mpesa_access_token()
        if not access_token:
            return {'success': False, 'message': 'Failed to get access token'}
        
        # Get M-Pesa settings from admin
        shortcode = AdminSettings.get_setting('mpesa_shortcode', '174379')
        passkey = AdminSettings.get_setting('mpesa_passkey', '')
        callback_url = AdminSettings.get_setting('mpesa_callback_url', 'https://your-domain.com/api/matching/payment/callback')
        
        # For development, return mock response
        if access_token == "mock_access_token":
            checkout_request_id = str(uuid.uuid4())
            return {
                'success': True,
                'checkoutRequestId': checkout_request_id,
                'transactionId': str(uuid.uuid4()),
                'message': 'STK Push initiated successfully'
            }
        
        # Actual M-Pesa implementation
        api_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(
            f"{shortcode}{passkey}{timestamp}".encode()
        ).decode('utf-8')
        
        payload = {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone_number,
            "PartyB": shortcode,
            "PhoneNumber": phone_number,
            "CallBackURL": callback_url,
            "AccountReference": account_reference,
            "TransactionDesc": transaction_desc
        }
        
        response = requests.post(api_url, json=payload, headers=headers)
        result = response.json()
        
        if response.status_code == 200 and result.get('ResponseCode') == '0':
            return {
                'success': True,
                'checkoutRequestId': result.get('CheckoutRequestID'),
                'transactionId': str(uuid.uuid4()),  # Generate our own transaction ID
                'message': 'STK Push initiated successfully'
            }
        else:
            return {
                'success': False,
                'message': result.get('errorMessage', 'STK Push failed')
            }
        
    except Exception as e:
        return {'success': False, 'message': str(e)}

@matching_payment_bp.route('/initiate', methods=['POST'])
@jwt_required()
def initiate_match_payment():
    """Initiate payment for expressing interest in a match"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['targetUserId', 'phoneNumber']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'{field} is required'}), 400
        
        target_user_id = data['targetUserId']
        phone_number = data['phoneNumber']
        
        # Get target user
        target_user = User.query.get(target_user_id)
        if not target_user:
            return jsonify({'message': 'Target user not found'}), 404
        
        # Check if user is trying to pay for themselves
        if target_user_id == current_user_id:
            return jsonify({'message': 'Cannot express interest in yourself'}), 400
        
        # Get chat fee from admin settings
        chat_fee = AdminSettings.get_setting('match_fee', 50)
        amount = data.get('amount', chat_fee)
        
        # Validate amount
        if amount != chat_fee:
            return jsonify({'message': f'Invalid amount. Expected KES {chat_fee}'}), 400
        
        # Check for existing pending payment
        existing_payment = PaymentTransaction.query.filter_by(
            user_id=current_user_id,
            target_user_id=target_user_id,
            payment_type=PaymentType.MATCH_FEE,
            payment_status=PaymentStatus.PENDING
        ).first()
        
        if existing_payment and not existing_payment.is_expired():
            return jsonify({
                'message': 'You already have a pending payment for this user',
                'transactionId': existing_payment.transaction_id
            }), 400
        
        # Check if user has already paid for this match
        completed_payment = PaymentTransaction.query.filter_by(
            user_id=current_user_id,
            target_user_id=target_user_id,
            payment_type=PaymentType.MATCH_FEE,
            payment_status=PaymentStatus.COMPLETED
        ).first()
        
        if completed_payment:
            return jsonify({'message': 'You have already paid to connect with this user'}), 400
        
        # Format phone number for M-Pesa (254XXXXXXXXX)
        if phone_number.startswith('0'):
            phone_number = '254' + phone_number[1:]
        elif phone_number.startswith('+254'):
            phone_number = phone_number[1:]
        elif not phone_number.startswith('254'):
            phone_number = '254' + phone_number
        
        # Generate transaction ID
        transaction_id = f"MATCH_{current_user_id}_{target_user_id}_{int(datetime.utcnow().timestamp())}"
        
        # Create payment record
        payment = PaymentTransaction(
            user_id=current_user_id,
            transaction_id=transaction_id,
            phone_number=phone_number,
            amount=amount,
            payment_type=PaymentType.MATCH_FEE,
            description=f"Connect with {target_user.first_name} {target_user.last_name}",
            target_user_id=target_user_id
        )
        
        db.session.add(payment)
        db.session.commit()
        
        # Initiate M-Pesa STK Push
        account_reference = f"PENZI_{current_user_id}"
        result = initiate_mpesa_stk_push(
            phone_number, 
            amount, 
            account_reference, 
            f"Connect with {target_user.first_name}"
        )
        
        if result['success']:
            # Update payment with checkout request ID
            payment.update_checkout_request_id(result['checkoutRequestId'])
            payment.update_mpesa_response(result)
            
            return jsonify({
                'success': True,
                'transactionId': transaction_id,
                'checkoutRequestId': result['checkoutRequestId'],
                'message': 'Payment request sent. Please check your phone for M-Pesa prompt.',
                'amount': amount
            }), 200
        else:
            # Mark payment as failed
            payment.mark_as_failed()
            
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Payment initiation failed: {str(e)}'}), 500

@matching_payment_bp.route('/verify', methods=['POST'])
@jwt_required()
def verify_match_payment():
    """Verify payment and enable chat between users"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        data = request.get_json()
        transaction_id = data.get('transactionId')
        target_user_id = data.get('targetUserId')
        
        if not transaction_id:
            return jsonify({'message': 'Transaction ID is required'}), 400
        
        # Get payment record
        payment = PaymentTransaction.get_by_transaction_id(transaction_id)
        if not payment:
            return jsonify({'message': 'Payment not found'}), 404
        
        # Verify payment belongs to current user
        if payment.user_id != current_user_id:
            return jsonify({'message': 'Unauthorized'}), 403
        
        # Check if payment is already completed
        if payment.payment_status == PaymentStatus.COMPLETED:
            return jsonify({
                'success': True,
                'message': 'Payment already verified',
                'canChat': True
            }), 200
        
        # For development/demo purposes, mark payment as completed
        # In production, this would verify with M-Pesa API
        if payment.payment_status == PaymentStatus.PENDING:
            # Simulate payment verification
            import random
            is_payment_successful = random.choice([True, True, True, False])  # 75% success rate for demo
            
            if is_payment_successful:
                # Mark payment as completed
                mpesa_receipt = f"MPESA_{random.randint(100000, 999999)}"
                payment.mark_as_completed(mpesa_receipt_number=mpesa_receipt)
                
                # Create user interest record
                interest = UserInterest(
                    interested_user_id=current_user_id,
                    target_user_id=payment.target_user_id,
                    interest_type='paid_match',
                    payment_transaction_id=payment.id
                )
                db.session.add(interest)
                
                # Send notification to target user
                target_user = User.query.get(payment.target_user_id)
                if target_user:
                    notification_message = f"💕 {user.first_name} {user.last_name} is interested in you! They've paid to connect. You can now chat with them."
                    
                    # Create system message in chat
                    system_message = ChatMessage(
                        sender_id=None,  # System message
                        receiver_id=target_user.id,
                        message=notification_message,
                        message_type='system_notification'
                    )
                    db.session.add(system_message)
                
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'message': 'Payment verified successfully! You can now chat.',
                    'canChat': True,
                    'mpesaReceipt': mpesa_receipt
                }), 200
            else:
                # Mark payment as failed
                payment.mark_as_failed()
                return jsonify({
                    'success': False,
                    'message': 'Payment verification failed. Please try again.'
                }), 400
        else:
            return jsonify({
                'success': False,
                'message': f'Payment is {payment.payment_status.value}'
            }), 400
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Payment verification failed: {str(e)}'}), 500

@matching_payment_bp.route('/status/<transaction_id>', methods=['GET'])
@jwt_required()
def get_payment_status(transaction_id):
    """Get payment status"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get payment record
        payment = PaymentTransaction.get_by_transaction_id(transaction_id)
        if not payment:
            return jsonify({'message': 'Payment not found'}), 404
        
        # Verify payment belongs to current user
        if payment.user_id != current_user_id:
            return jsonify({'message': 'Unauthorized'}), 403
        
        return jsonify({
            'transactionId': payment.transaction_id,
            'status': payment.payment_status.value,
            'amount': payment.amount,
            'createdAt': payment.created_at.isoformat(),
            'completedAt': payment.completed_at.isoformat() if payment.completed_at else None,
            'isExpired': payment.is_expired(),
            'mpesaReceipt': payment.mpesa_receipt_number,
            'targetUser': {
                'id': payment.target_user.id,
                'firstName': payment.target_user.first_name,
                'lastName': payment.target_user.last_name
            } if payment.target_user else None
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get payment status: {str(e)}'}), 500

@matching_payment_bp.route('/callback', methods=['POST'])
def mpesa_callback():
    """Handle M-Pesa callback"""
    try:
        data = request.get_json()
        
        # Extract callback data
        stk_callback = data.get('Body', {}).get('stkCallback', {})
        checkout_request_id = stk_callback.get('CheckoutRequestID')
        result_code = stk_callback.get('ResultCode')
        result_desc = stk_callback.get('ResultDesc')
        
        if not checkout_request_id:
            return jsonify({'ResultCode': 1, 'ResultDesc': 'Invalid callback data'}), 400
        
        # Find payment by checkout request ID
        payment = PaymentTransaction.get_by_checkout_request_id(checkout_request_id)
        if not payment:
            return jsonify({'ResultCode': 1, 'ResultDesc': 'Payment not found'}), 404
        
        # Update payment with callback data
        payment.update_mpesa_response(data)
        
        if result_code == 0:  # Success
            # Extract M-Pesa receipt number
            callback_metadata = stk_callback.get('CallbackMetadata', {}).get('Item', [])
            mpesa_receipt = None
            
            for item in callback_metadata:
                if item.get('Name') == 'MpesaReceiptNumber':
                    mpesa_receipt = item.get('Value')
                    break
            
            # Mark payment as completed
            payment.mark_as_completed(mpesa_receipt_number=mpesa_receipt, callback_data=data)
            
            # Create user interest record
            interest = UserInterest(
                interested_user_id=payment.user_id,
                target_user_id=payment.target_user_id,
                interest_type='paid_match',
                payment_transaction_id=payment.id
            )
            db.session.add(interest)
            
            # Send notification to target user
            user = User.query.get(payment.user_id)
            target_user = User.query.get(payment.target_user_id)
            
            if user and target_user:
                notification_message = f"💕 {user.first_name} {user.last_name} is interested in you! They've paid to connect. You can now chat with them."
                
                # Create system message in chat
                system_message = ChatMessage(
                    sender_id=None,  # System message
                    receiver_id=target_user.id,
                    message=notification_message,
                    message_type='system_notification'
                )
                db.session.add(system_message)
            
            db.session.commit()
            
        else:  # Failed
            payment.mark_as_failed(callback_data=data)
        
        return jsonify({'ResultCode': 0, 'ResultDesc': 'Success'}), 200
        
    except Exception as e:
        print(f"M-Pesa callback error: {str(e)}")
        return jsonify({'ResultCode': 1, 'ResultDesc': 'Failed'}), 500

@matching_payment_bp.route('/history', methods=['GET'])
@jwt_required()
def get_payment_history():
    """Get user's match payment history"""
    try:
        current_user_id = get_jwt_identity()
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Get user's match payments
        payments = PaymentTransaction.query.filter_by(
            user_id=current_user_id,
            payment_type=PaymentType.MATCH_FEE
        ).order_by(PaymentTransaction.created_at.desc()).paginate(
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
        return jsonify({'message': f'Failed to get payment history: {str(e)}'}), 500

@matching_payment_bp.route('/can-chat/<int:target_user_id>', methods=['GET'])
@jwt_required()
def can_chat_with_user(target_user_id):
    """Check if current user can chat with target user (has paid)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if user has completed payment for this target user
        completed_payment = PaymentTransaction.query.filter_by(
            user_id=current_user_id,
            target_user_id=target_user_id,
            payment_type=PaymentType.MATCH_FEE,
            payment_status=PaymentStatus.COMPLETED
        ).first()
        
        # Also check if target user has paid for current user
        reverse_payment = PaymentTransaction.query.filter_by(
            user_id=target_user_id,
            target_user_id=current_user_id,
            payment_type=PaymentType.MATCH_FEE,
            payment_status=PaymentStatus.COMPLETED
        ).first()
        
        can_chat = bool(completed_payment or reverse_payment)
        
        return jsonify({
            'canChat': can_chat,
            'hasPaid': bool(completed_payment),
            'targetHasPaid': bool(reverse_payment),
            'payment': completed_payment.to_dict() if completed_payment else None
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to check chat permission: {str(e)}'}), 500