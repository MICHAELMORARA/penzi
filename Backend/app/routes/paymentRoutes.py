from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import uuid
import requests
import base64
from app.extensions import db
from app.models.userModel import User

payment_bp = Blueprint('payments', __name__, url_prefix='/api/payments')

# Mock M-Pesa configuration (replace with actual credentials)
MPESA_CONFIG = {
    'consumer_key': 'your_consumer_key',
    'consumer_secret': 'your_consumer_secret',
    'shortcode': '174379',
    'passkey': 'your_passkey',
    'callback_url': 'http://localhost:5000/api/payments/mpesa/callback'
}

def get_mpesa_access_token():
    """Get M-Pesa access token"""
    try:
        # In production, use actual M-Pesa credentials
        # For now, return a mock token
        return "mock_access_token"
        
        # Actual implementation:
        # api_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        # r = requests.get(api_url, auth=HTTPBasicAuth(MPESA_CONFIG['consumer_key'], MPESA_CONFIG['consumer_secret']))
        # return r.json()['access_token']
    except Exception as e:
        return None

def initiate_stk_push(phone_number, amount, account_reference, transaction_desc):
    """Initiate M-Pesa STK Push"""
    try:
        access_token = get_mpesa_access_token()
        if not access_token:
            return {'success': False, 'message': 'Failed to get access token'}
        
        # For development, return mock response
        checkout_request_id = str(uuid.uuid4())
        
        return {
            'success': True,
            'checkoutRequestId': checkout_request_id,
            'transactionId': str(uuid.uuid4()),
            'message': 'STK Push initiated successfully'
        }
        
        # Actual M-Pesa implementation:
        # api_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        # headers = {"Authorization": f"Bearer {access_token}"}
        # 
        # timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        # password = base64.b64encode(
        #     f"{MPESA_CONFIG['shortcode']}{MPESA_CONFIG['passkey']}{timestamp}".encode()
        # ).decode('utf-8')
        # 
        # payload = {
        #     "BusinessShortCode": MPESA_CONFIG['shortcode'],
        #     "Password": password,
        #     "Timestamp": timestamp,
        #     "TransactionType": "CustomerPayBillOnline",
        #     "Amount": amount,
        #     "PartyA": phone_number,
        #     "PartyB": MPESA_CONFIG['shortcode'],
        #     "PhoneNumber": phone_number,
        #     "CallBackURL": MPESA_CONFIG['callback_url'],
        #     "AccountReference": account_reference,
        #     "TransactionDesc": transaction_desc
        # }
        # 
        # response = requests.post(api_url, json=payload, headers=headers)
        # return response.json()
        
    except Exception as e:
        return {'success': False, 'message': str(e)}

@payment_bp.route('/mpesa/stkpush', methods=['POST'])
@jwt_required()
def mpesa_stk_push():
    """Initiate M-Pesa STK Push payment"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['amount', 'phoneNumber', 'description']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'{field} is required'}), 400
        
        amount = data['amount']
        phone_number = data['phoneNumber']
        description = data['description']
        
        # Validate amount
        if amount <= 0:
            return jsonify({'message': 'Amount must be greater than 0'}), 400
        
        # Format phone number for M-Pesa (254XXXXXXXXX)
        if phone_number.startswith('0'):
            phone_number = '254' + phone_number[1:]
        elif phone_number.startswith('+254'):
            phone_number = phone_number[1:]
        elif not phone_number.startswith('254'):
            phone_number = '254' + phone_number
        
        # Initiate STK Push
        account_reference = f"PENZI_{user.id}"
        result = initiate_stk_push(phone_number, amount, account_reference, description)
        
        if result['success']:
            # In production, store payment request in database
            # For now, just return the response
            
            return jsonify({
                'success': True,
                'transactionId': result['transactionId'],
                'checkoutRequestId': result['checkoutRequestId'],
                'message': 'Payment request sent. Please check your phone for M-Pesa prompt.'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
        
    except Exception as e:
        return jsonify({'message': f'Payment initiation failed: {str(e)}'}), 500

@payment_bp.route('/mpesa/status/<checkout_request_id>', methods=['GET'])
@jwt_required()
def check_payment_status(checkout_request_id):
    """Check M-Pesa payment status"""
    try:
        # In production, query M-Pesa API or database for payment status
        # For now, return mock status
        
        # Simulate different payment statuses
        import random
        statuses = ['pending', 'completed', 'failed']
        status = random.choice(statuses)
        
        response_data = {'status': status}
        
        if status == 'completed':
            response_data['transactionId'] = str(uuid.uuid4())
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to check payment status: {str(e)}'}), 500

@payment_bp.route('/mpesa/callback', methods=['POST'])
def mpesa_callback():
    """Handle M-Pesa callback"""
    try:
        data = request.get_json()
        
        # In production, process the callback and update payment status
        # For now, just log and return success
        
        print(f"M-Pesa Callback received: {data}")
        
        return jsonify({'ResultCode': 0, 'ResultDesc': 'Success'}), 200
        
    except Exception as e:
        print(f"M-Pesa callback error: {str(e)}")
        return jsonify({'ResultCode': 1, 'ResultDesc': 'Failed'}), 500

@payment_bp.route('/premium', methods=['POST'])
@jwt_required()
def upgrade_to_premium():
    """Upgrade user to premium"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['amount', 'phoneNumber']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'{field} is required'}), 400
        
        # Initiate payment
        result = initiate_stk_push(
            data['phoneNumber'],
            data['amount'],
            f"PREMIUM_{user.id}",
            "Penzi Premium Upgrade"
        )
        
        if result['success']:
            # In production, wait for payment confirmation before upgrading
            # For demo purposes, upgrade immediately
            user.is_premium = True
            user.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'success': True,
                'transactionId': result['transactionId'],
                'checkoutRequestId': result['checkoutRequestId'],
                'message': 'Premium upgrade successful!'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Premium upgrade failed: {str(e)}'}), 500

@payment_bp.route('/history', methods=['GET'])
@jwt_required()
def get_payment_history():
    """Get user's payment history"""
    try:
        current_user_id = get_jwt_identity()
        
        # In production, return actual payment history from database
        # For now, return mock data
        
        mock_payments = [
            {
                'id': str(uuid.uuid4()),
                'amount': 200,
                'description': 'Premium Upgrade',
                'status': 'completed',
                'transactionId': str(uuid.uuid4()),
                'createdAt': datetime.utcnow().isoformat()
            }
        ]
        
        return jsonify(mock_payments), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get payment history: {str(e)}'}), 500