import os
import uuid
from werkzeug.utils import secure_filename
import io

# Try to import PIL, make it optional
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("Warning: PIL (Pillow) not installed. Image optimization will be disabled.")

def save_uploaded_file(file, upload_folder):
    """
    Save an uploaded file to the specified folder
    
    Args:
        file: The uploaded file object
        upload_folder: The folder name within uploads directory
    
    Returns:
        str: The filename of the saved file
    """
    # Create uploads directory if it doesn't exist
    uploads_dir = os.path.join(os.getcwd(), 'uploads', upload_folder)
    os.makedirs(uploads_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = file.filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
    
    # Save the file
    file_path = os.path.join(uploads_dir, unique_filename)
    
    # If it's an image and PIL is available, optimize it
    if file_extension in ['jpg', 'jpeg', 'png', 'gif', 'webp'] and PIL_AVAILABLE:
        try:
            # Open and optimize the image
            image = Image.open(file.stream)
            
            # Convert to RGB if necessary
            if image.mode in ('RGBA', 'LA', 'P'):
                image = image.convert('RGB')
            
            # Resize if too large (max 1200x1200)
            max_size = (1200, 1200)
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save with optimization
            image.save(file_path, optimize=True, quality=85)
        except Exception as e:
            # If image processing fails, save as is
            file.seek(0)  # Reset file pointer
            file.save(file_path)
    else:
        # Save files as is (either non-image or PIL not available)
        file.save(file_path)
    
    return unique_filename

def delete_file(file_path):
    """
    Delete a file from the filesystem
    
    Args:
        file_path: Path to the file to delete
    """
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
    except Exception as e:
        print(f"Error deleting file {file_path}: {str(e)}")
    return False

def get_file_url(filename, upload_folder):
    """
    Get the URL for an uploaded file
    
    Args:
        filename: The filename
        upload_folder: The folder name within uploads directory
    
    Returns:
        str: The URL path to the file
    """
    return f"/uploads/{upload_folder}/{filename}"

def validate_file_type(filename, allowed_extensions):
    """
    Validate if a file has an allowed extension
    
    Args:
        filename: The filename to validate
        allowed_extensions: Set of allowed extensions
    
    Returns:
        bool: True if valid, False otherwise
    """
    if '.' not in filename:
        return False
    
    extension = filename.rsplit('.', 1)[1].lower()
    return extension in allowed_extensions

def get_file_size(file):
    """
    Get the size of an uploaded file in bytes
    
    Args:
        file: The uploaded file object
    
    Returns:
        int: File size in bytes
    """
    file.seek(0, 2)  # Seek to end
    size = file.tell()
    file.seek(0)  # Reset to beginning
    return size