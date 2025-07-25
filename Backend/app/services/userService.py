from app.models.userModel import User, RegistrationStage, Gender, db
from sqlalchemy.exc import IntegrityError
import re

class UserService:

    @staticmethod
    def validate_phone_number(phone_number):
        """Validate Kenyan phone number format"""
        phone = re.sub(r'[^\d+]', '', phone_number)

        patterns = [
            r'^\+254[17]\d{8}$',
            r'^254[17]\d{8}$',
            r'^0[17]\d{8}$'
        ]

        for pattern in patterns:
            if re.match(pattern, phone):
                if phone.startswith('0'):
                    return '+254' + phone[1:]
                elif phone.startswith('254'):
                    return '+' + phone
                return phone

        return None
      
    @staticmethod
    def activate_service(phone_number):
        try:
            normalized_phone = UserService.validate_phone_number(phone_number)
            if not normalized_phone:
                return None, "Invalid phone number format"

            existing_user = User.find_by_phone(normalized_phone)
            if existing_user:
                if existing_user.is_activated:
                    return existing_user, "Service already activated. Send start#name#age#gender#county#town to 22141 to register."
                else:
                    existing_user.activate_service()
                    return existing_user, "Welcome to PENZI Dating Service! To register, SMS start#name#age#gender#county#town to 22141. E.g., start#John Doe#26#Male#Nakuru#Naivasha"

            user = User.create_activated_user(normalized_phone)
            return user, "Welcome to PENZI Dating Service! To register, SMS start#name#age#gender#county#town to 22141. E.g., start#John Doe#26#Male#Nakuru#Naivasha"

        except Exception as e:
            db.session.rollback()
            return None, f"Error activating service: {str(e)}"

    @staticmethod
    def handle_start_command(phone_number, name, age, gender, county, town):
        try:
            normalized_phone = UserService.validate_phone_number(phone_number)
            if not normalized_phone:
                return None, "Invalid phone number format"

            user = User.find_by_phone(normalized_phone)
            if not user:
                return None, "Please activate service first by sending PENZI to 22141"
            
            if not user.is_activated:
                return None, "Please activate service first by sending PENZI to 22141"

            try:
                age = int(age)
                if age < 18 or age > 100:
                    return None, "Age must be between 18 and 100"
            except ValueError:
                return None, "Invalid age format"

            if gender not in ['Male', 'Female']:
                return None, "Gender must be 'Male' or 'Female'"

            user.start_registration(name, age, gender, county, town)
            
            return user, f"Your profile has been created successfully {name}. SMS details#levelOfEducation#profession#maritalStatus#religion#ethnicity to 22141. E.g., details#diploma#driver#single#christian#mijikenda"

        except Exception as e:
            db.session.rollback()
            return None, f"Error processing start command: {str(e)}"

    @staticmethod
    def handle_details_command(phone_number, education, profession, marital_status, religion, ethnicity):
        try:
            normalized_phone = UserService.validate_phone_number(phone_number)
            if not normalized_phone:
                return None, "Invalid phone number format"

            user = User.find_by_phone(normalized_phone)
            if not user:
                return None, "User not found. Please register first."
            
            if user.registration_stage != RegistrationStage.INITIAL:
                return None, "You have already provided your details or haven't completed the start command yet."

            user.add_details(education, profession, marital_status, religion, ethnicity)
            
            return user, "Details received! This is the last stage of registration. SMS a brief description of yourself to 22141 starting with the word MYSELF. E.g., MYSELF chocolate, lovely, sexy etc."

        except Exception as e:
            db.session.rollback()
            return None, f"Error processing details command: {str(e)}"

    @staticmethod
    def handle_myself_command(phone_number, description):
        """Handle MYSELF description command"""
        try:
            normalized_phone = UserService.validate_phone_number(phone_number)
            if not normalized_phone:
                return None, "Invalid phone number format"

            user = User.find_by_phone(normalized_phone)
            if not user:
                return None, "User not found. Please register first."
            
            if user.registration_stage != RegistrationStage.DETAILS_PENDING:
                return None, "You need to complete the details step first."

            user.add_description(description)
            
            total_users = User.get_completed_registrations_count()
            
            return user, f"Welcome to our dating service with {total_users} potential dating partners! To search for a MPENZI, SMS match#age#town to 22141 and meet the person of your dreams. E.g., match#23-25#Nairobi"

        except Exception as e:
            db.session.rollback()
            return None, f"Error processing description: {str(e)}"


    @staticmethod
    def complete_basic_registration(phone_number, name, age, gender, county, town):
        """Complete basic registration for existing user"""
        try:
            normalized_phone = UserService.validate_phone_number(phone_number)
            if not normalized_phone:
                return None, "Invalid phone number format"

            user = User.find_by_phone(normalized_phone)
            if not user:
                return None, "User not found"

            user.name = name
            user.age = age
            user.gender = Gender(gender)
            user.county = county
            user.town = town

            UserService._update_registration_stage(user)
            user.save()

            return user, "Basic registration completed successfully"

        except (ValueError, IntegrityError) as e:
            db.session.rollback()
            return None, f"Error completing basic registration: {str(e)}"

    @staticmethod
    def complete_detailed_registration(user_id, level_of_education, profession, marital_status, religion, ethnicity):
        try:
            user = User.find_by_id(user_id)
            if not user:
                return None, "User not found"

            user.level_of_education = level_of_education
            user.profession = profession
            user.marital_status = marital_status
            user.religion = religion
            user.ethnicity = ethnicity

            UserService._update_registration_stage(user)
            user.save()

            return user, "Detailed registration completed successfully"

        except Exception as e:
            db.session.rollback()
            return None, f"Error completing detailed registration: {str(e)}"

    
    @staticmethod
    def create_user(phone_number, name, age, gender, county, town,
                level_of_education=None, profession=None, marital_status=None, religion=None,
                ethnicity=None, self_description=None):
        try:
            normalized_phone = UserService.validate_phone_number(phone_number)
            if not normalized_phone:
                return None, "Invalid phone number format"

            existing_user = User.find_by_phone(normalized_phone)
            if existing_user:
                return None, "User already exists"

            user = User(
                phone_number=normalized_phone,
                name=name,
                age=age,
                gender=Gender(gender),
                county=county,
                town=town,
                level_of_education=level_of_education,  
                profession=profession,
                marital_status=marital_status,
                religion=religion,
                ethnicity=ethnicity,
                self_description=self_description,
                is_activated=True,
                registration_stage=RegistrationStage.COMPLETED if all([
                    level_of_education, profession, marital_status, religion, ethnicity, self_description
                ]) else RegistrationStage.INITIAL
            )

            user.save()
            return user, "User created successfully"

        except (ValueError, IntegrityError) as e:
            db.session.rollback()
            return None, f"Error creating user: {str(e)}"
    
    @staticmethod
    def get_user_by_phone(phone_number):
        normalized_phone = UserService.validate_phone_number(phone_number)
        if not normalized_phone:
            return None, "Invalid phone number format"
            
        user = User.find_by_phone(normalized_phone)
        if not user:
            return None, "User not found"
            
        return user, "User found"
    
    @staticmethod
    def add_user_description(user_id, description):
        try:
            user = User.find_by_id(user_id)
            if not user:
                return None, "User not found"
            
            # Validate description
            description = description.strip()
            if len(description) < 10:
                return None, "Description must be at least 10 characters long"
            if len(description) > 1000:
                return None, "Description must not exceed 1000 characters"
            
            user.self_description = description
            
            if (user.registration_stage == RegistrationStage.DETAILS_PENDING and 
                all([user.level_of_education, user.profession, user.marital_status, 
                     user.religion, user.ethnicity])):
                user.registration_stage = RegistrationStage.COMPLETED
            
            user.save()
            return user, "Description added successfully"
            
        except Exception as e:
            db.session.rollback()
            return None, f"Error adding description: {str(e)}"
    
    @staticmethod
    def get_user_by_id(user_id):
        """Get user by ID"""
        user = User.find_by_id(user_id)
        if not user:
            return None, "User not found"
            
        return user, "User found"
    
    @staticmethod
    def update_user_details(user_id, **kwargs):
        try:
            user = User.find_by_id(user_id)
            if not user:
                return None, "User not found"
            
            allowed_fields = [
                'name', 'age', 'gender', 'county', 'town',
                'level_of_education', 'profession', 'marital_status',
                'religion', 'ethnicity', 'self_description'
            ]
            
            for field, value in kwargs.items():
                if field in allowed_fields:
                    if field == 'gender' and value:
                        setattr(user, field, Gender(value))
                    else:
                        setattr(user, field, value)
            
            UserService._update_registration_stage(user)
            
            user.save()
            return user, "User updated successfully"
            
        except (ValueError, IntegrityError) as e:
            db.session.rollback()
            return None, f"Error updating user: {str(e)}"
    
    @staticmethod
    def _update_registration_stage(user):
        if not user.is_activated:
            user.registration_stage = RegistrationStage.ACTIVATED
            return
            
        missing_basic = not all([user.name, user.age, user.gender, user.county, user.town])
        missing_details = not all([
            user.level_of_education, user.profession, user.marital_status,
            user.religion, user.ethnicity
        ])
        missing_description = not user.self_description
        
        if missing_basic:
            user.registration_stage = RegistrationStage.ACTIVATED
        elif missing_details:
            user.registration_stage = RegistrationStage.INITIAL
        elif missing_description:
            user.registration_stage = RegistrationStage.DETAILS_PENDING
        else:
            user.registration_stage = RegistrationStage.COMPLETED
    
    @staticmethod
    def get_registration_status(phone_number):
        """Get user's registration status and next step"""
        try:
            user, message = UserService.get_user_by_phone(phone_number)
            if not user:
                return None, "User not found. Send PENZI to 22141 to activate service."
            
            status = {
                'user': user.to_dict(),
                'registration_stage': user.registration_stage.value,
                'progress_percentage': user.get_registration_progress(),
                'next_step': user.get_next_registration_step(),
                'missing_fields': user.get_missing_fields(),
                'can_search_matches': user.can_search_matches()
            }
            
            return status, "Registration status retrieved"
            
        except Exception as e:
            return None, f"Error getting registration status: {str(e)}"
    
    @staticmethod
    def deactivate_user(user_id):
        try:
            user = User.find_by_id(user_id)
            if not user:
                return None, "User not found"
            
            user.is_active = False
            user.save()
            return user, "User deactivated successfully"
            
        except Exception as e:
            db.session.rollback()
            return None, f"Error deactivating user: {str(e)}"
    
    @staticmethod
    def activate_user(user_id):
        try:
            user = User.find_by_id(user_id)
            if not user:
                return None, "User not found"
            
            user.is_active = True
            user.save()
            return user, "User activated successfully"
            
        except Exception as e:
            db.session.rollback()
            return None, f"Error activating user: {str(e)}"
    
    @staticmethod
    def delete_user(user_id):
        try:
            user = User.find_by_id(user_id)
            if not user:
                return False, "User not found"
            
            user_name = user.name or "Unknown"
            print(f"UserService: Attempting to delete user {user_id} ({user_name})")
            
            # Use the improved delete method from the User model
            user.delete()
            
            print(f"UserService: User {user_id} deleted successfully")
            return True, f"User '{user_name}' has been successfully deleted from the system"
            
        except Exception as e:
            print(f"UserService: Error deleting user {user_id}: {str(e)}")
            db.session.rollback()
            
            # Provide user-friendly error messages
            error_message = str(e).lower()
            if "constraint" in error_message or "violates" in error_message:
                return False, "Unable to delete user due to existing data dependencies. Please contact support."
            elif "not found" in error_message:
                return False, "User not found in the system"
            elif "connection" in error_message or "database" in error_message:
                return False, "Database connection error. Please try again later."
            else:
                return False, "An unexpected error occurred while deleting the user. Please try again or contact support."
    
    @staticmethod
    def search_users(county=None, town=None, gender=None, age_min=None, age_max=None, exclude_user_id=None):
        try:
            query = User.query.filter(User.is_active.is_(True))
            
            if exclude_user_id:
                query = query.filter(User.id != exclude_user_id)
            
            if county:
                query = query.filter(User.county == county)
            
            if town:
                query = query.filter(User.town == town)
            
            if gender:
                query = query.filter(User.gender == Gender(gender))
            
            if age_min:
                query = query.filter(User.age >= age_min)
            
            if age_max:
                query = query.filter(User.age <= age_max)
            
            query = query.filter(User.registration_stage == RegistrationStage.COMPLETED)
            
            users = query.all()
            return users, f"Found {len(users)} users"
            
        except Exception as e:
            return [], f"Error searching users: {str(e)}"
    
    @staticmethod
    def get_user_stats():
        try:
            from datetime import datetime, timedelta
            from sqlalchemy import func
            
            # Basic counts
            total_users = User.query.count()
            activated_users = User.get_activated_users_count()
            active_users = User.query.filter(User.is_active.is_(True)).count()
            completed_registrations = User.get_completed_registrations_count()
            pending_registrations = total_users - completed_registrations
            
            # Gender statistics
            male_users = User.query.filter(User.gender == Gender.MALE).count()
            female_users = User.query.filter(User.gender == Gender.FEMALE).count()
            
            # Average age
            avg_age_result = db.session.query(func.avg(User.age)).filter(User.age.isnot(None)).scalar()
            average_age = float(avg_age_result) if avg_age_result else 0
            
            # Time-based registrations
            now = datetime.utcnow()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            week_start = today_start - timedelta(days=now.weekday())
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            registrations_today = User.query.filter(User.created_at >= today_start).count()
            registrations_this_week = User.query.filter(User.created_at >= week_start).count()
            registrations_this_month = User.query.filter(User.created_at >= month_start).count()
            
            # Get stats by registration stage
            stage_stats = {}
            for stage in RegistrationStage:
                count = len(User.get_users_by_stage(stage))
                stage_stats[stage.value] = count
            
            stats = {
                'total_users': total_users,
                'active_users': active_users,
                'completed_registrations': completed_registrations,
                'pending_registrations': pending_registrations,
                'male_users': male_users,
                'female_users': female_users,
                'average_age': round(average_age, 1),
                'registrations_today': registrations_today,
                'registrations_this_week': registrations_this_week,
                'registrations_this_month': registrations_this_month,
                # Additional stats for internal use
                'activated_users': activated_users,
                'activation_rate': (activated_users / total_users * 100) if total_users > 0 else 0,
                'registration_completion_rate': (completed_registrations / activated_users * 100) if activated_users > 0 else 0,
                'stage_breakdown': stage_stats
            }
            
            return stats, "Statistics retrieved successfully"
            
        except Exception as e:
            return None, f"Error getting statistics: {str(e)}"

    # SMS command parsing methods

    @staticmethod
    def parse_sms_command(message_body, phone_number):
        """Parse incoming SMS command and route to appropriate handler"""
        try:
            message = message_body.strip()
            
            # Handle PENZI activation
            if message.upper() == 'PENZI':
                return UserService.activate_service(phone_number)
            
            # Handle start command
            if message.lower().startswith('start#'):
                parts = message.split('#')
                if len(parts) != 6:
                    return None, "Invalid start command format. Use: start#name#age#gender#county#town"
                
                _, name, age, gender, county, town = parts
                return UserService.handle_start_command(phone_number, name, age, gender, county, town)
            
            # Handle details command
            if message.lower().startswith('details#'):
                parts = message.split('#')
                if len(parts) != 6:
                    return None, "Invalid details command format. Use: details#education#profession#marital_status#religion#ethnicity"
                
                _, education, profession, marital_status, religion, ethnicity = parts
                return UserService.handle_details_command(phone_number, education, profession, marital_status, religion, ethnicity)
            
            # Handle MYSELF command
            if message.upper().startswith('MYSELF '):
                description = message[7:]  
                if not description.strip():
                    return None, "Please provide a description after MYSELF"
                
                return UserService.handle_myself_command(phone_number, description)
            
            # Unknown command
            return None, f"Unknown command. Send PENZI to 22141 to get started."
            
        except Exception as e:
            return None, f"Error parsing command: {str(e)}"