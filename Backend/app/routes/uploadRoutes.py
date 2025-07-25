from flask import Blueprint, send_from_directory, abort, jsonify
import os

# Create blueprint without URL prefix so routes work at root level
upload_bp = Blueprint('uploads', __name__)

@upload_bp.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    """Serve uploaded files"""
    try:
        # Get the uploads directory relative to the Backend folder
        # Go up from app/routes/ to Backend/
        current_file = os.path.abspath(__file__)
        routes_dir = os.path.dirname(current_file)
        app_dir = os.path.dirname(routes_dir)
        backend_dir = os.path.dirname(app_dir)
        uploads_dir = os.path.join(backend_dir, 'uploads')
        
        # Ensure uploads directory exists
        if not os.path.exists(uploads_dir):
            return jsonify({
                'error': 'Uploads directory not found',
                'uploads_dir': uploads_dir,
                'backend_dir': backend_dir
            }), 404
        
        file_path = os.path.join(uploads_dir, filename)
        
        if not os.path.exists(file_path):
            # List directory contents for debugging
            debug_info = {'error': 'File not found', 'filename': filename, 'full_path': file_path}
            try:
                dir_path = os.path.dirname(file_path)
                if os.path.exists(dir_path):
                    files = os.listdir(dir_path)
                    debug_info['directory_contents'] = files
                else:
                    debug_info['directory_exists'] = False
            except Exception as list_error:
                debug_info['list_error'] = str(list_error)
            
            return jsonify(debug_info), 404
        
        return send_from_directory(uploads_dir, filename)
        
    except Exception as e:
        return jsonify({'error': str(e), 'filename': filename}), 500

@upload_bp.route('/debug/uploads')
def debug_uploads():
    """Debug endpoint to check uploads directory"""
    try:
        # Get the uploads directory relative to the Backend folder
        current_file = os.path.abspath(__file__)
        routes_dir = os.path.dirname(current_file)
        app_dir = os.path.dirname(routes_dir)
        backend_dir = os.path.dirname(app_dir)
        uploads_dir = os.path.join(backend_dir, 'uploads')
        
        debug_info = {
            'current_file': current_file,
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
                
                # Check subdirectories
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
        else:
            debug_info['error'] = 'Uploads directory does not exist'
        
        return jsonify(debug_info)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add a simple test route to verify the blueprint is working
@upload_bp.route('/test-upload-blueprint')
def test_upload_blueprint():
    """Test route to verify blueprint is registered"""
    return jsonify({
        'message': 'Upload blueprint is working!',
        'blueprint_name': upload_bp.name
    })