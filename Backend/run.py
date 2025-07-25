from app import create_app
import logging
import sys
import os

# Clean up any problematic environment variables
if 'WERKZEUG_SERVER_FD' in os.environ:
    del os.environ['WERKZEUG_SERVER_FD']
if 'WERKZEUG_RUN_MAIN' in os.environ:
    del os.environ['WERKZEUG_RUN_MAIN']

# Disable all Flask/Werkzeug logging before creating the app
logging.getLogger('werkzeug').setLevel(logging.CRITICAL)
logging.getLogger('flask').setLevel(logging.CRITICAL)
logging.getLogger().setLevel(logging.CRITICAL)

app = create_app()

if __name__ == "__main__":
    # Additional logging suppression
    app.logger.disabled = True
    logging.getLogger('werkzeug').disabled = True
    
    # Print a simple startup message
    print("🚀 Penzi Backend Server Starting...")
    print("📡 Server running on http://localhost:5000")
    print("🔇 Verbose logging disabled for cleaner output")
    print("=" * 50)
    
    try:
        # Run with minimal output
        app.run(
            host="0.0.0.0", 
            port=5000, 
            debug=False, 
            use_reloader=False,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")