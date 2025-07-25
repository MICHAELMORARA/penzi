from flask import Blueprint, jsonify
from datetime import datetime

health_bp = Blueprint('health', __name__, url_prefix='/api')

@health_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify API is running"""
    return jsonify({
        'success': True,
        'message': 'Penzi API is running',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    }), 200

@health_bp.route('/test', methods=['GET'])
def test_endpoint():
    """Test endpoint for frontend-backend connectivity"""
    return jsonify({
        'success': True,
        'message': 'Frontend-Backend connection successful',
        'data': {
            'backend_status': 'operational',
            'database_status': 'connected',
            'cors_enabled': True
        }
    }), 200