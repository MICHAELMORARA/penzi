from flask import Flask, send_from_directory, abort, jsonify
import os
from dotenv import load_dotenv
import logging

# Reduce logging verbosity
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

# Disable werkzeug request logging
logging.getLogger('werkzeug').setLevel(logging.ERROR)

load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL', 
        'postgresql://postgres:2020@localhost:5501/penzi'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Set upload folder configuration
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')

    # Initialize extensions
    try:
        from app.extensions import db, migrate, ma, cors, jwt
        db.init_app(app)
        ma.init_app(app)
        
        # Configure CORS to allow frontend communication
        cors.init_app(app, resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:3000", 
                    "http://127.0.0.1:3000",
                    "http://52.48.121.185:3000"
                ],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"]
            },
            r"/uploads/*": {
                "origins": [
                    "http://localhost:3000", 
                    "http://127.0.0.1:3000",
                    "http://52.48.121.185:3000"
                ],
                "methods": ["GET"],
                "allow_headers": ["Content-Type"]
            },
            r"/debug/*": {
                "origins": [
                    "http://localhost:3000", 
                    "http://127.0.0.1:3000",
                    "http://52.48.121.185:3000"
                ],
                "methods": ["GET"],
                "allow_headers": ["Content-Type"]
            },
            r"/test-*": {
                "origins": [
                    "http://localhost:3000", 
                    "http://127.0.0.1:3000",
                    "http://52.48.121.185:3000"
                ],
                "methods": ["GET"],
                "allow_headers": ["Content-Type"]
            }
        })
        
        jwt.init_app(app)
    except Exception as e:
        logger.error(f"Failed to initialize extensions: {str(e)}")
        raise
    
    # Import models and initialize migration
    try:
        from app.models import (
            User, MatchRequest, Match, SmsMessage, UserInterest,
            UserPhoto, AdminSettings, ChatMessage, PaymentTransaction
        )
    except ImportError as e:
        logger.error(f"Failed to import models: {str(e)}")
        raise

    try:
        migrate.init_app(app, db)
    except Exception as e:
        logger.error(f"Failed to initialize migration: {str(e)}")
        raise

    # Register blueprints
    try:
        from app.routes.userRoutes import user_bp
        from app.routes.matchRoutes import match_bp
        from app.routes.userInterestRoutes import user_interest_bp
        from app.routes.matchRequestRoutes import match_request_bp
        from app.routes.dashboardRoutes import dashboard_bp
        from app.routes.healthRoutes import health_bp
        from app.routes.smsRoutes import sms_bp
        from app.routes.authRoutes import auth_bp
        from app.routes.matchingRoutes import matching_bp
        from app.routes.paymentRoutes import payment_bp
        from app.routes.matchingPaymentRoutes import matching_payment_bp
        from app.routes.chatRoutes import chat_bp
        from app.routes.registrationRoutes import registration_bp
        from app.routes.adminRoutes import admin_bp

        app.register_blueprint(user_bp)
        app.register_blueprint(match_bp)
        app.register_blueprint(user_interest_bp)
        app.register_blueprint(match_request_bp)
        app.register_blueprint(dashboard_bp)
        app.register_blueprint(health_bp)
        app.register_blueprint(sms_bp)
        app.register_blueprint(auth_bp)
        app.register_blueprint(matching_bp)
        app.register_blueprint(payment_bp)
        app.register_blueprint(matching_payment_bp)
        app.register_blueprint(chat_bp)
        app.register_blueprint(registration_bp)
        app.register_blueprint(admin_bp)
        
        # Try to register upload blueprint
        try:
            from app.routes.uploadRoutes import upload_bp
            app.register_blueprint(upload_bp)
        except Exception as upload_error:
            logger.error(f"Failed to register upload blueprint: {upload_error}")
            # Continue without upload blueprint, we'll use direct routes
        
    except ImportError as e:
        logger.error(f"Failed to import blueprints: {str(e)}")
        raise

    # Add direct routes for file serving as backup
    @app.route('/uploads/<path:filename>')
    def serve_uploaded_file_direct(filename):
        """Direct route to serve uploaded files (backup)"""
        try:
            # Get uploads directory relative to app directory
            app_dir = os.path.dirname(os.path.abspath(__file__))
            backend_dir = os.path.dirname(app_dir)
            uploads_dir = os.path.join(backend_dir, 'uploads')
            
            if not os.path.exists(uploads_dir):
                return jsonify({
                    'error': 'Uploads directory not found',
                    'uploads_dir': uploads_dir
                }), 404
            
            file_path = os.path.join(uploads_dir, filename)
            
            if not os.path.exists(file_path):
                return jsonify({
                    'error': 'File not found',
                    'filename': filename,
                    'full_path': file_path
                }), 404
            
            return send_from_directory(uploads_dir, filename)
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/debug/uploads')
    def debug_uploads_direct():
        """Direct debug route"""
        try:
            app_dir = os.path.dirname(os.path.abspath(__file__))
            backend_dir = os.path.dirname(app_dir)
            uploads_dir = os.path.join(backend_dir, 'uploads')
            
            debug_info = {
                'message': 'Direct debug route working',
                'app_dir': app_dir,
                'backend_dir': backend_dir,
                'uploads_dir': uploads_dir,
                'uploads_exists': os.path.exists(uploads_dir),
                'current_working_dir': os.getcwd(),
                'directories': {}
            }
            
            if os.path.exists(uploads_dir):
                try:
                    contents = os.listdir(uploads_dir)
                    debug_info['directories']['uploads'] = contents
                    
                    for item in contents:
                        item_path = os.path.join(uploads_dir, item)
                        if os.path.isdir(item_path):
                            try:
                                sub_contents = os.listdir(item_path)
                                debug_info['directories'][item] = sub_contents
                            except Exception as e:
                                debug_info['directories'][item] = f"Error: {e}"
                except Exception as e:
                    debug_info['error'] = str(e)
            
            return jsonify(debug_info)
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/test-direct')
    def test_direct():
        """Test route to verify direct routes work"""
        return jsonify({'message': 'Direct routes are working!'})

    return app