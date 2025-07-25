from datetime import datetime
from enum import Enum
from app.extensions import db


class RegistrationStage(Enum):
    ACTIVATED = "activated"
    INITIAL = "initial"  # Legacy stage for SMS users
    STAGE_1_BASIC_INFO = "stage_1_basic_info"  # Name, age, gender
    STAGE_2_LOCATION = "stage_2_location"      # County, town
    STAGE_3_EDUCATION = "stage_3_education"    # Education level
    STAGE_4_PROFESSION = "stage_4_profession"  # Profession
    STAGE_5_PERSONAL = "stage_5_personal"      # Marital status, religion
    STAGE_6_ETHNICITY = "stage_6_ethnicity"    # Ethnicity
    STAGE_7_DESCRIPTION = "stage_7_description" # Self description
    STAGE_8_PHOTOS = "stage_8_photos"          # Profile photos
    DETAILS_PENDING = "details_pending"        # Legacy stage for SMS users
    DESCRIPTION_PENDING = "description_pending"  # Legacy stage for SMS users
    COMPLETED = "completed"


class Gender(Enum):
    MALE = "Male"
    FEMALE = "Female"


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    
    # SMS-based fields (existing)
    phone_number = db.Column(db.String(15), unique=True, nullable=True)
    name = db.Column(db.String(255))
    county = db.Column(db.String(100))
    town = db.Column(db.String(100))
    level_of_education = db.Column(db.String(100))
    profession = db.Column(db.String(100))
    marital_status = db.Column(db.String(50))
    religion = db.Column(db.String(100))
    ethnicity = db.Column(db.String(100))
    self_description = db.Column(db.Text)
    
    # Web-based fields (new)
    email = db.Column(db.String(255), unique=True, nullable=True)
    username = db.Column(db.String(50), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    bio = db.Column(db.Text)
    location = db.Column(db.String(255))
    interests = db.Column(db.Text)  # Comma-separated interests
    profile_picture = db.Column(db.String(255))
    role = db.Column(db.String(20), default='user')  # 'user' or 'admin'
    is_verified = db.Column(db.Boolean, default=False)
    is_premium = db.Column(db.Boolean, default=False)
    last_login = db.Column(db.DateTime)
    
    # Common fields
    age = db.Column(db.Integer)
    gender = db.Column(db.Enum(Gender), nullable=True)
    is_activated = db.Column(db.Boolean, default=False)
    registration_stage = db.Column(
        db.Enum(RegistrationStage),
        default=RegistrationStage.ACTIVATED
    )
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    match_requests = db.relationship(
        'MatchRequest', backref='user', lazy=True, cascade='all, delete-orphan')
    sms_messages = db.relationship("SmsMessage", back_populates="user", cascade='all, delete-orphan')
    
    # Additional relationships for proper cascade deletion
    requested_matches = db.relationship(
        'Match', foreign_keys='Match.requester_id', cascade='all, delete-orphan')
    received_matches = db.relationship(
        'Match', foreign_keys='Match.matched_user_id', cascade='all, delete-orphan')
    initiated_interests = db.relationship(
        'UserInterest', foreign_keys='UserInterest.interested_user_id', cascade='all, delete-orphan')
    received_interests = db.relationship(
        'UserInterest', foreign_keys='UserInterest.target_user_id', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<User {self.name or "Activated"} - {self.phone_number}>'

    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'name': self.name,
            'age': self.age,
            'gender': self.gender.value if self.gender else None,
            'county': self.county,
            'town': self.town,
            'level_of_education': self.level_of_education,
            'profession': self.profession,
            'marital_status': self.marital_status,
            'religion': self.religion,
            'ethnicity': self.ethnicity,
            'self_description': self.self_description,
            'is_activated': self.is_activated,
            'registration_stage': self.registration_stage.value if self.registration_stage else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_sensitive:
            data['phone_number'] = self.phone_number
        return data

    def to_basic_profile(self):
        """Return basic profile info for match results"""
        return {
            'name': self.name,
            'age': self.age,
            'phone_number': self.phone_number,
            'county': self.county,
            'town': self.town,
            'level_of_education': self.level_of_education,
            'profession': self.profession,
            'marital_status': self.marital_status,
            'religion': self.religion,
            'ethnicity': self.ethnicity
        }

    def to_detailed_profile(self):
        """Return detailed profile including self description"""
        profile = self.to_basic_profile()
        profile['self_description'] = self.self_description
        return profile

    def to_auth_dict(self):
        """Return user data for authentication responses"""
        interests_list = []
        if self.interests:
            interests_list = [interest.strip() for interest in self.interests.split(',') if interest.strip()]
        
        return {
            'id': str(self.id),
            'email': self.email,
            'username': self.username,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'age': self.age,
            'role': self.role,
            'profilePicture': self.profile_picture,
            'bio': self.bio,
            'interests': interests_list,
            'location': self.location,
            'isVerified': self.is_verified,
            'isPremium': self.is_premium,
            'registrationStage': self.registration_stage.value if self.registration_stage else None,
            'isRegistrationComplete': self.registration_stage == RegistrationStage.COMPLETED,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }

    def to_swipe_profile(self):
        """Return user data for swiping interface"""
        try:
            interests_list = []
            if self.interests:
                interests_list = [interest.strip() for interest in self.interests.split(',') if interest.strip()]
            
            # Get user photos
            photos = []
            try:
                from app.models.userPhotoModel import UserPhoto
                user_photos = UserPhoto.get_user_photos(self.id)
                photos = [photo.photo_url for photo in user_photos]
            except Exception as photo_error:
                print(f"Error loading photos for user {self.id}: {photo_error}")
                photos = []
            
            # Handle cases where users might not have all fields (SMS users vs web users)
            first_name = self.first_name or (self.name.split(' ')[0] if self.name else 'Unknown')
            last_name = self.last_name or (self.name.split(' ')[1] if self.name and len(self.name.split(' ')) > 1 else '')
            
            # Create bio from self_description if bio is empty
            bio = self.bio or self.self_description or f"{self.profession or 'Professional'} from {self.town or 'Kenya'}"
            
            # Create location string
            location = self.location or f"{self.town or ''}, {self.county or ''}".strip(', ')
            
            return {
                'id': str(self.id),
                'firstName': first_name,
                'lastName': last_name,
                'age': self.age or 25,  # Default age if missing
                'profilePicture': self.profile_picture,
                'photos': photos,
                'bio': bio,
                'interests': interests_list,
                'location': location,
                'county': self.county,
                'town': self.town,
                'profession': self.profession,
                'education': self.level_of_education,
                'isVerified': self.is_verified or False,
                'isPremium': self.is_premium or False
            }
        except Exception as e:
            print(f"Error in to_swipe_profile for user {self.id}: {str(e)}")
            # Return a minimal profile if there's an error
            return {
                'id': str(self.id),
                'firstName': self.first_name or self.name or 'Unknown',
                'lastName': self.last_name or '',
                'age': self.age or 25,
                'profilePicture': None,
                'photos': [],
                'bio': self.bio or self.self_description or 'No description available',
                'interests': [],
                'location': f"{self.town or ''}, {self.county or ''}".strip(', '),
                'county': self.county,
                'town': self.town,
                'profession': self.profession,
                'education': self.level_of_education,
                'isVerified': False,
                'isPremium': False
            }

    @staticmethod
    def find_by_phone(phone_number):
        """Find user by phone number - handles both +254... and 254... formats"""
        # Try exact match first
        user = User.query.filter_by(phone_number=phone_number).first()
        if user:
            return user
        
        # Try with + prefix if not found
        if not phone_number.startswith('+'):
            user = User.query.filter_by(phone_number=f'+{phone_number}').first()
            if user:
                return user
        
        # Try without + prefix if not found
        if phone_number.startswith('+'):
            user = User.query.filter_by(phone_number=phone_number[1:]).first()
            if user:
                return user
        
        return None

    @staticmethod
    def find_by_id(user_id):
        """Find user by ID"""
        return User.query.get(user_id)

    @staticmethod
    def create_activated_user(phone_number):
        """Create a new user who has sent PENZI (activated only)"""
        user = User(
            phone_number=phone_number,
            is_activated=True,
            registration_stage=RegistrationStage.ACTIVATED
        )
        return user.save()

    def activate_service(self):
        """Activate the service for this user (PENZI command)"""
        self.is_activated = True
        self.registration_stage = RegistrationStage.ACTIVATED
        db.session.commit()
        return self

    def start_registration(self, name, age, gender, county, town):
        """Handle start# command"""
        self.name = name
        self.age = age
        self.gender = Gender(gender) if isinstance(gender, str) else gender
        self.county = county
        self.town = town
        self.registration_stage = RegistrationStage.INITIAL
        db.session.commit()
        return self

    def add_details(self, level_of_education, profession, marital_status, religion, ethnicity):
        """Handle details# command"""
        self.level_of_education = level_of_education
        self.profession = profession
        self.marital_status = marital_status
        self.religion = religion
        self.ethnicity = ethnicity
        self.registration_stage = RegistrationStage.DETAILS_PENDING
        db.session.commit()
        return self

    def add_description(self, description):
        """Handle MYSELF description"""
        self.self_description = description
        self.registration_stage = RegistrationStage.COMPLETED
        db.session.commit()
        return self

    def update_registration_stage(self, stage):
        """Update user registration stage"""
        if isinstance(stage, str):
            stage = RegistrationStage(stage)
        self.registration_stage = stage
        db.session.commit()

    def is_service_activated(self):
        """Check if user has activated the service (sent PENZI)"""
        return self.is_activated

    def is_registration_started(self):
        """Check if user has started registration (sent start#)"""
        return self.registration_stage.value not in ['activated']

    def is_registration_complete(self):
        """Check if user registration is complete"""
        return self.registration_stage == RegistrationStage.COMPLETED

    def can_search_matches(self):
        """Check if user can search for matches"""
        return self.is_registration_complete() and self.is_active

    def get_registration_progress(self):
        """Get registration progress percentage for 8-stage system"""
        stage_progress = {
            RegistrationStage.ACTIVATED: 10,
            RegistrationStage.STAGE_1_BASIC_INFO: 20,
            RegistrationStage.STAGE_2_LOCATION: 30,
            RegistrationStage.STAGE_3_EDUCATION: 40,
            RegistrationStage.STAGE_4_PROFESSION: 50,
            RegistrationStage.STAGE_5_PERSONAL: 60,
            RegistrationStage.STAGE_6_ETHNICITY: 70,
            RegistrationStage.STAGE_7_DESCRIPTION: 80,
            RegistrationStage.STAGE_8_PHOTOS: 90,
            RegistrationStage.COMPLETED: 100
        }
        return stage_progress.get(self.registration_stage, 0)

    def get_missing_fields(self):
        """Get list of missing required fields for current registration stage"""
        missing = []

        # Check basic fields after start# command
        if self.registration_stage.value not in ['activated']:
            if not self.name:
                missing.append('name')
            if not self.age:
                missing.append('age')
            if not self.gender:
                missing.append('gender')
            if not self.county:
                missing.append('county')
            if not self.town:
                missing.append('town')

        # Check details fields
        if self.registration_stage in [RegistrationStage.DETAILS_PENDING, RegistrationStage.DESCRIPTION_PENDING, RegistrationStage.COMPLETED]:
            if not self.level_of_education:
                missing.append('level_of_education')
            if not self.profession:
                missing.append('profession')
            if not self.marital_status:
                missing.append('marital_status')
            if not self.religion:
                missing.append('religion')
            if not self.ethnicity:
                missing.append('ethnicity')

        # Check description field
        if self.registration_stage in [RegistrationStage.DESCRIPTION_PENDING, RegistrationStage.COMPLETED]:
            if not self.self_description:
                missing.append('self_description')

        return missing

    def get_next_registration_step(self):
        """Get the next registration step message for 8-stage system"""
        stage_messages = {
            RegistrationStage.ACTIVATED: "Complete your basic information (name, age, gender)",
            RegistrationStage.STAGE_1_BASIC_INFO: "Add your location (county and town)",
            RegistrationStage.STAGE_2_LOCATION: "Add your education level",
            RegistrationStage.STAGE_3_EDUCATION: "Add your profession",
            RegistrationStage.STAGE_4_PROFESSION: "Add personal details (marital status, religion)",
            RegistrationStage.STAGE_5_PERSONAL: "Add your ethnicity",
            RegistrationStage.STAGE_6_ETHNICITY: "Write a brief description about yourself",
            RegistrationStage.STAGE_7_DESCRIPTION: "Upload your profile photos",
            RegistrationStage.STAGE_8_PHOTOS: "Complete your registration",
            RegistrationStage.COMPLETED: "Registration complete! You can now search for matches"
        }
        return stage_messages.get(self.registration_stage, "Continue registration")
    
    def get_current_stage_info(self):
        """Get detailed information about current registration stage"""
        stage_info = {
            RegistrationStage.ACTIVATED: {
                'title': 'Welcome to Penzi!',
                'description': 'Let\'s start building your profile',
                'fields': ['firstName', 'lastName', 'age', 'gender'],
                'stage': 1,
                'total_stages': 8
            },
            RegistrationStage.STAGE_1_BASIC_INFO: {
                'title': 'Where are you located?',
                'description': 'Help us find matches near you',
                'fields': ['county', 'town'],
                'stage': 2,
                'total_stages': 8
            },
            RegistrationStage.STAGE_2_LOCATION: {
                'title': 'Education Background',
                'description': 'Tell us about your education',
                'fields': ['levelOfEducation'],
                'stage': 3,
                'total_stages': 8
            },
            RegistrationStage.STAGE_3_EDUCATION: {
                'title': 'What do you do?',
                'description': 'Share your profession',
                'fields': ['profession'],
                'stage': 4,
                'total_stages': 8
            },
            RegistrationStage.STAGE_4_PROFESSION: {
                'title': 'Personal Details',
                'description': 'Tell us more about yourself',
                'fields': ['maritalStatus', 'religion'],
                'stage': 5,
                'total_stages': 8
            },
            RegistrationStage.STAGE_5_PERSONAL: {
                'title': 'Cultural Background',
                'description': 'Share your ethnicity',
                'fields': ['ethnicity'],
                'stage': 6,
                'total_stages': 8
            },
            RegistrationStage.STAGE_6_ETHNICITY: {
                'title': 'About You',
                'description': 'Write a brief description about yourself',
                'fields': ['selfDescription'],
                'stage': 7,
                'total_stages': 8
            },
            RegistrationStage.STAGE_7_DESCRIPTION: {
                'title': 'Profile Photos',
                'description': 'Upload photos to complete your profile',
                'fields': ['photos'],
                'stage': 8,
                'total_stages': 8
            },
            RegistrationStage.STAGE_8_PHOTOS: {
                'title': 'Almost Done!',
                'description': 'Review and complete your profile',
                'fields': [],
                'stage': 8,
                'total_stages': 8
            },
            RegistrationStage.COMPLETED: {
                'title': 'Profile Complete!',
                'description': 'You can now start finding matches',
                'fields': [],
                'stage': 8,
                'total_stages': 8
            }
        }
        return stage_info.get(self.registration_stage, stage_info[RegistrationStage.ACTIVATED])
    
    def advance_registration_stage(self, stage_data):
        """Advance to next registration stage with provided data"""
        current_stage = self.registration_stage
        
        if current_stage == RegistrationStage.ACTIVATED:
            # Stage 1: Basic Info
            if all(key in stage_data for key in ['firstName', 'lastName', 'age', 'gender']):
                self.first_name = stage_data['firstName']
                self.last_name = stage_data['lastName']
                self.age = int(stage_data['age'])
                self.gender = Gender(stage_data['gender'].upper())
                self.registration_stage = RegistrationStage.STAGE_1_BASIC_INFO
                
        elif current_stage == RegistrationStage.STAGE_1_BASIC_INFO:
            # Stage 2: Location
            if all(key in stage_data for key in ['county', 'town']):
                self.county = stage_data['county']
                self.town = stage_data['town']
                self.registration_stage = RegistrationStage.STAGE_2_LOCATION
                
        elif current_stage == RegistrationStage.STAGE_2_LOCATION:
            # Stage 3: Education
            if 'levelOfEducation' in stage_data:
                self.level_of_education = stage_data['levelOfEducation']
                self.registration_stage = RegistrationStage.STAGE_3_EDUCATION
                
        elif current_stage == RegistrationStage.STAGE_3_EDUCATION:
            # Stage 4: Profession
            if 'profession' in stage_data:
                self.profession = stage_data['profession']
                self.registration_stage = RegistrationStage.STAGE_4_PROFESSION
                
        elif current_stage == RegistrationStage.STAGE_4_PROFESSION:
            # Stage 5: Personal Details
            if all(key in stage_data for key in ['maritalStatus', 'religion']):
                self.marital_status = stage_data['maritalStatus']
                self.religion = stage_data['religion']
                self.registration_stage = RegistrationStage.STAGE_5_PERSONAL
                
        elif current_stage == RegistrationStage.STAGE_5_PERSONAL:
            # Stage 6: Ethnicity
            if 'ethnicity' in stage_data:
                self.ethnicity = stage_data['ethnicity']
                self.registration_stage = RegistrationStage.STAGE_6_ETHNICITY
                
        elif current_stage == RegistrationStage.STAGE_6_ETHNICITY:
            # Stage 7: Description
            if 'selfDescription' in stage_data:
                self.self_description = stage_data['selfDescription']
                self.bio = stage_data['selfDescription']  # Also set bio for web users
                self.registration_stage = RegistrationStage.STAGE_7_DESCRIPTION
                
        elif current_stage == RegistrationStage.STAGE_7_DESCRIPTION:
            # Stage 8: Photos (handled separately in photo upload endpoint)
            # For now, just advance to photos stage
            self.registration_stage = RegistrationStage.STAGE_8_PHOTOS
            
        elif current_stage == RegistrationStage.STAGE_8_PHOTOS:
            # Complete registration
            self.registration_stage = RegistrationStage.COMPLETED
        
        self.updated_at = datetime.utcnow()
        db.session.commit()
        return self
    
    def can_access_nairobi_matches(self):
        """Check if user has enough matches to access Nairobi matches"""
        from app.models.adminSettingsModel import AdminSettings
        threshold = AdminSettings.get_setting('nairobi_match_threshold', 20)
        
        # Count user's total matches
        from app.models.matchModel import Match
        match_count = Match.query.filter(
            (Match.requester_id == self.id) | (Match.matched_user_id == self.id)
        ).count()
        
        return match_count >= threshold
    
    def get_match_count(self):
        """Get total number of matches for this user"""
        from app.models.matchModel import Match
        return Match.query.filter(
            (Match.requester_id == self.id) | (Match.matched_user_id == self.id)
        ).count()
    
    def has_uploaded_photos(self):
        """Check if user has uploaded at least one photo"""
        if hasattr(self, 'photos'):
            return len([p for p in self.photos if not getattr(p, 'is_deleted', False)]) > 0
        return False

    def save(self):
        """Save user to database"""
        db.session.add(self)
        db.session.commit()
        return self

    def delete(self):
        """Delete user from database with proper cascade handling"""
        try:
            from app.models.matchModel import Match
            from app.models.matchRequestModel import MatchRequest
            from app.models.userInterestModel import UserInterest
            from app.models.smsMessagesModel import SmsMessage
            
            print(f"Deleting user {self.id} ({self.name})")
            
            # Step 1: Delete matches where this user is involved (one by one to avoid constraint issues)
            matches_as_requester = Match.query.filter_by(requester_id=self.id).all()
            matches_as_matched = Match.query.filter_by(matched_user_id=self.id).all()
            
            print(f"Found {len(matches_as_requester)} matches as requester")
            print(f"Found {len(matches_as_matched)} matches as matched user")
            
            # Delete matches individually to avoid constraint violations
            for match in matches_as_requester + matches_as_matched:
                db.session.delete(match)
            
            # Flush to ensure matches are deleted before proceeding
            db.session.flush()
            
            # Step 2: Delete match requests by this user
            match_requests = MatchRequest.query.filter_by(user_id=self.id).all()
            print(f"Found {len(match_requests)} match requests")
            
            for request in match_requests:
                db.session.delete(request)
            
            db.session.flush()
            
            # Step 3: Delete user interests involving this user
            interests_made = UserInterest.query.filter_by(interested_user_id=self.id).all()
            interests_received = UserInterest.query.filter_by(target_user_id=self.id).all()
            
            print(f"Found {len(interests_made)} interests made")
            print(f"Found {len(interests_received)} interests received")
            
            for interest in interests_made + interests_received:
                db.session.delete(interest)
            
            db.session.flush()
            
            # Step 4: Delete SMS messages related to this user
            sms_messages = SmsMessage.query.filter_by(related_user_id=self.id).all()
            print(f"Found {len(sms_messages)} SMS messages")
            
            for message in sms_messages:
                db.session.delete(message)
            
            db.session.flush()
            
            # Step 5: Finally delete the user
            print(f"Deleting user record")
            db.session.delete(self)
            
            # Commit all changes
            db.session.commit()
            print(f"User {self.id} deleted successfully")
            
        except Exception as e:
            print(f"Error during deletion: {str(e)}")
            db.session.rollback()
            raise e

    # Class methods for querying
    @classmethod
    def get_potential_matches(cls, requester_id, age_min, age_max, preferred_town, gender_preference=None):
        """Get potential matches for a user"""
        requester = cls.find_by_id(requester_id)
        if not requester:
            return []

        # Determine opposite gender for matching
        opposite_gender = Gender.FEMALE if requester.gender == Gender.MALE else Gender.MALE

        query = cls.query.filter(
            cls.id != requester_id,  # Not the same user
            cls.age >= age_min,
            cls.age <= age_max,
            cls.town.ilike(f'%{preferred_town}%'),
            cls.gender == opposite_gender,  # Opposite gender
            cls.is_active == True,
            cls.registration_stage == RegistrationStage.COMPLETED
        )

        return query.all()

    @classmethod
    def get_activated_users_count(cls):
        """Get count of activated users"""
        return cls.query.filter_by(is_activated=True).count()

    @classmethod
    def get_completed_registrations_count(cls):
        """Get count of users who completed registration"""
        return cls.query.filter_by(registration_stage=RegistrationStage.COMPLETED).count()

    @classmethod
    def get_users_by_stage(cls, stage):
        """Get users by registration stage"""
        if isinstance(stage, str):
            stage = RegistrationStage(stage)
        return cls.query.filter_by(registration_stage=stage).all()