import re
from typing import Dict, Any

def validate_email(email: str) -> bool:
    """Validate email format"""
    if not email:
        return False
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password: str) -> Dict[str, Any]:
    """Validate password strength"""
    if not password:
        return {'valid': False, 'message': 'Password is required'}
    
    if len(password) < 6:
        return {'valid': False, 'message': 'Password must be at least 6 characters long'}
    
    if len(password) > 128:
        return {'valid': False, 'message': 'Password must be less than 128 characters'}
    
    # Check for at least one letter and one number (optional for basic validation)
    has_letter = re.search(r'[a-zA-Z]', password)
    has_number = re.search(r'\d', password)
    
    if not has_letter:
        return {'valid': False, 'message': 'Password must contain at least one letter'}
    
    return {'valid': True, 'message': 'Password is valid'}

def validate_phone_number(phone: str) -> bool:
    """Validate phone number format (Kenyan format)"""
    if not phone:
        return False
    
    # Remove spaces and special characters
    clean_phone = re.sub(r'[^\d+]', '', phone)
    
    # Check for valid Kenyan phone number patterns
    patterns = [
        r'^\+254[17]\d{8}$',  # +254712345678 or +254112345678
        r'^254[17]\d{8}$',    # 254712345678 or 254112345678
        r'^0[17]\d{8}$',      # 0712345678 or 0112345678
        r'^[17]\d{8}$'        # 712345678 or 112345678
    ]
    
    return any(re.match(pattern, clean_phone) for pattern in patterns)

def validate_username(username: str) -> Dict[str, Any]:
    """Validate username format"""
    if not username:
        return {'valid': False, 'message': 'Username is required'}
    
    if len(username) < 3:
        return {'valid': False, 'message': 'Username must be at least 3 characters long'}
    
    if len(username) > 30:
        return {'valid': False, 'message': 'Username must be less than 30 characters'}
    
    # Check for valid characters (letters, numbers, underscores)
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return {'valid': False, 'message': 'Username can only contain letters, numbers, and underscores'}
    
    return {'valid': True, 'message': 'Username is valid'}

def validate_age(age: Any) -> Dict[str, Any]:
    """Validate age"""
    try:
        age_int = int(age)
        if age_int < 18:
            return {'valid': False, 'message': 'You must be at least 18 years old'}
        if age_int > 100:
            return {'valid': False, 'message': 'Please enter a valid age'}
        return {'valid': True, 'message': 'Age is valid'}
    except (ValueError, TypeError):
        return {'valid': False, 'message': 'Age must be a valid number'}

def validate_name(name: str, field_name: str = 'Name') -> Dict[str, Any]:
    """Validate name fields"""
    if not name:
        return {'valid': False, 'message': f'{field_name} is required'}
    
    if len(name.strip()) < 2:
        return {'valid': False, 'message': f'{field_name} must be at least 2 characters long'}
    
    if len(name) > 50:
        return {'valid': False, 'message': f'{field_name} must be less than 50 characters'}
    
    # Check for valid characters (letters, spaces, hyphens, apostrophes)
    if not re.match(r"^[a-zA-Z\s\-']+$", name):
        return {'valid': False, 'message': f'{field_name} can only contain letters, spaces, hyphens, and apostrophes'}
    
    return {'valid': True, 'message': f'{field_name} is valid'}

def validate_search_criteria(age_min: Any, age_max: Any, preferred_town: str) -> bool:
    """Validate search criteria for match finding"""
    try:
        # Validate age range
        if age_min is not None and age_max is not None:
            age_min = int(age_min)
            age_max = int(age_max)
            
            if age_min < 18 or age_max < 18:
                return False
            
            if age_min > age_max:
                return False
            
            if age_max > 100:
                return False
        
        # Validate town
        if preferred_town and len(preferred_town.strip()) < 2:
            return False
        
        return True
    except (ValueError, TypeError):
        return False

def normalize_phone_number(phone: str) -> str:
    """Normalize phone number to standard format (+254XXXXXXXXX)"""
    if not phone:
        return phone
    
    # Remove spaces and special characters except +
    clean_phone = re.sub(r'[^\d+]', '', phone)
    
    # Convert to +254 format
    if clean_phone.startswith('0'):
        return '+254' + clean_phone[1:]
    elif clean_phone.startswith('254'):
        return '+' + clean_phone
    elif clean_phone.startswith('+254'):
        return clean_phone
    elif len(clean_phone) == 9 and clean_phone[0] in ['7', '1']:
        return '+254' + clean_phone
    
    return phone  # Return original if can't normalize