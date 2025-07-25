# app/services/smsMessagesService.py - CORRECTED VERSION FOR PENZI SMS FLOW

from datetime import datetime
import re
from app.models.smsMessagesModel import SmsMessage
from app.models.userModel import User, RegistrationStage
from app.services.userService import UserService
from app.models.matchModel import Match
from app.models.matchRequestModel import MatchRequest
from app.models.userInterestModel import UserInterest
from app.extensions import db
from sqlalchemy import and_, or_, func, desc


class SmsService:
    def log_sms(self, from_phone, to_phone, message_body, direction, message_type=None, related_user_id=None):
        """Log SMS message to database"""
        sms = SmsMessage(
            from_phone=from_phone,
            to_phone=to_phone,
            message_body=message_body,
            direction=direction,
            message_type=message_type,
            related_user_id=related_user_id
        )
        db.session.add(sms)
        db.session.commit()
        return sms

    def send_response(self, to_phone, message_body, message_type=None, related_user_id=None):
        """Send SMS response"""
        # Normalize phone numbers for consistency
        from app.services.userService import UserService
        norm_to_phone = UserService.validate_phone_number(to_phone)
        if norm_to_phone and norm_to_phone.startswith('+'):
            norm_to_phone = norm_to_phone[1:]  # Remove + prefix for consistency
        norm_from_phone = "22141"
        print(f"DEBUG: send_response called - original to: {to_phone}, normalized to: {norm_to_phone}")
        print(f"DEBUG: send_response - from: {norm_from_phone}, message: {message_body[:50]}...")
        self.log_sms(norm_from_phone, norm_to_phone, message_body,
                     "outgoing", message_type, related_user_id)
        print(f"DEBUG: send_response - message logged to database with normalized phones")
        return {
            'success': True,
            'message': message_body
        }

    def get_total_registered_users(self):
        """Get total number of registered users from database"""
        return db.session.query(User).filter(
            User.registration_stage == RegistrationStage.COMPLETED # type: ignore
        ).count()

    def process_incoming_sms(self, from_phone, message_body):
        """Process incoming SMS and route to appropriate handler"""
        
        # DEBUGGING - to Print what we received
        print(f"DEBUG: Received SMS from {from_phone}")
        print(f"DEBUG: Raw message_body: '{message_body}'")
        print(f"DEBUG: Type of message_body: {type(message_body)}")
        
        original_message = message_body.strip()
        message_body_upper = message_body.strip().upper()
        
        print(f"DEBUG: After processing - message_body_upper: '{message_body_upper}'")
        print(f"DEBUG: Checking if '{message_body_upper}' == 'PENZI'")
        print(f"DEBUG: Comparison result: {message_body_upper == 'PENZI'}")
        
        # ALWAYS LOG THE INCOMING MESSAGE FIRST
        print("DEBUG: Logging incoming message")
        self.log_sms(from_phone, "22141", original_message, "incoming")
        
        # CHECK FOR PENZI FIRST - before trying to get user
        if message_body_upper == "PENZI":
            print("DEBUG: PENZI detected, calling handle_activation")
            return self.handle_activation(from_phone)
        
        print("DEBUG: PENZI not detected, trying to get user")
        
        # Now try to get user for other commands
        try:
            user, _ = UserService.get_user_by_phone(from_phone)
            if not user:
                print("DEBUG: User lookup returned None")
                response = "User not found. Please send PENZI to 22141 to activate service first."
                return self.send_response(from_phone, response, "user_not_found")
        except Exception as e:
            print(f"DEBUG: Exception in user lookup: {str(e)}")
            response = "User not found. Please send PENZI to 22141 to activate service first."
            return self.send_response(from_phone, response, "user_not_found")
    
        print(f"DEBUG: User found: {user}")
        
        # Incoming message already logged above
    
        # Route based on command for existing users
        if message_body_upper.startswith("START#"):
            return self.handle_initial_registration(from_phone, message_body_upper)
        elif message_body_upper.startswith("DETAILS#"):
            return self.handle_details_registration(from_phone, message_body_upper)
        elif message_body_upper.startswith("MYSELF"):
            return self.handle_self_description(from_phone, original_message)
        elif message_body_upper.startswith("IMAGES"):
            return self.handle_image_upload_guide(from_phone)
        elif message_body_upper.startswith("MATCH#"):
            return self.handle_match_request(from_phone, message_body_upper)
        elif message_body_upper == "NEXT":
            return self.handle_next_matches(from_phone)
        elif message_body_upper.startswith("DESCRIBE"):
            return self.handle_describe_request(from_phone, message_body_upper)
        elif message_body_upper in ["YES", "NO"]:
            return self.handle_interest_response(from_phone, message_body_upper)
        elif message_body_upper == "STOP":
            return self.handle_stop_service(from_phone)
        elif message_body_upper == "STATS":
            return self.handle_user_stats(from_phone)
        elif message_body_upper == "HISTORY":
            return self.handle_user_history(from_phone)
        else:
            return self.handle_unknown_command(from_phone)
    
    def handle_activation(self, phone_number):
        """Handle PENZI activation command"""
        try:
            user, message = UserService.get_user_by_phone(phone_number)
        except Exception as e:
            user = None
    
        if user and user.is_registration_complete():
            # Returning user - reactivate
            user.is_active = True
            db.session.commit()
            response = f"Welcome back {user.name}! You can now search for a MPENZI. Try: match#25-30#Nairobi"
            return self.send_response(phone_number, response, "reactivation", user.id)
    
        elif user and user.is_service_activated():
            # User exists but hasn't completed registration
            if user.registration_stage == RegistrationStage.ACTIVATED:
                total_users = self.get_total_registered_users()
                response = f"Welcome to our dating service with {total_users} potential dating partners! To register, SMS: start#name#age#gender#county#town to 22141 Example: start#Michael Morara#22#Male#Nairobi#Imara"
            elif user.registration_stage == RegistrationStage.INITIAL:
                response = f"Your profile has been created successfully {user.name}. SMS: details#levelOfEducation#profession#maritalStatus#religion#ethnicity to 22141 Example: details#Graduate#IT#Divorced#Christian#Kenyan"
            elif user.registration_stage == RegistrationStage.DETAILS_PENDING:
                response = f"This is the last stage of registration. SMS a brief description of yourself to 22141 starting with the word: MYSELF Example: MYSELF tall, dark and handsome"
            else:
                response = f"Registration completed successfully {user.name}! To search for a MPENZI, SMS: match#age#town to 22141 Example: match#26-30#Nairobi"
            return self.send_response(phone_number, response, "activation_guide", user.id)
    
        else:
            # New user - create activated user
            if not user:
                normalized_phone = UserService.validate_phone_number(phone_number)
                if not normalized_phone:
                    response = "Invalid phone number format."
                    return self.send_response(phone_number, response, "error")
                    
                user = User(phone_number=normalized_phone, is_activated=True,
                            registration_stage=RegistrationStage.ACTIVATED)
                db.session.add(user)
                db.session.commit()
    
            total_users = self.get_total_registered_users()
            response = f"Welcome to our dating service with {total_users} potential dating partners! To register, SMS: start#name#age#gender#county#town to 22141 Example: start#Michael Morara#22#Male#Nairobi#Imara"
            return self.send_response(phone_number, response, "activation_success", user.id)
    
    def handle_initial_registration(self, phone_number, message):
        """Handle start#name#age#gender#county#town command"""
        try:
            parts = message.split("#")
            if len(parts) != 6:
                return self.send_response(phone_number,
                                          "Invalid format. Use: start#name#age#gender#county#town", "registration_error")

            _, name, age, gender, county, town = parts

            # Validate inputs
            if not all([name, age, gender, county, town]):
                return self.send_response(phone_number,
                                          "All fields are required. Please try again.", "registration_error")

            try:
                age = int(age)
                if age < 18:
                    return self.send_response(phone_number,
                                              "You must be at least 18 years old.", "registration_error")
            except ValueError:
                return self.send_response(phone_number,
                                          "Invalid age format.", "registration_error")

            if gender.upper() not in ['MALE', 'FEMALE']:
                return self.send_response(phone_number,
                                          "Gender must be Male or Female.", "registration_error")

            # Get user (must exist and be activated)
            user, _ = UserService.get_user_by_phone(phone_number)
            if not user or not user.is_activated:
                return self.send_response(phone_number,
                                          "Please send PENZI to 22141 first to activate the service.", "registration_error")

            # Update user with initial registration data
            user.start_registration(
                name.title(), age, gender.title(), county.title(), town.title())

            response = f"Your profile has been created successfully {name}. SMS: details#levelOfEducation#profession#maritalStatus#religion#ethnicity to 22141 Example: details#Graduate#IT#Divorced#Christian#Kenyan"

            return self.send_response(phone_number, response, "registration_initial", user.id)

        except Exception as e:
            return self.send_response(phone_number,
                                      "Registration failed. Please try again.", "registration_error")
    
    def handle_details_registration(self, phone_number, message):
        """Handle details#education#profession#marital#religion#ethnicity command"""
        try:
            user, _ = UserService.get_user_by_phone(phone_number)
            if not user:
                return self.send_response(phone_number,
                                          "User not found. Please start registration first.", "registration_error")
            
            # Check if user is at the correct stage for details registration
            if user.registration_stage != RegistrationStage.INITIAL:
                current_stage = user.registration_stage.value
                next_step = user.get_next_registration_step()
                return self.send_response(phone_number,
                                          f"Invalid registration stage. {next_step}", 
                                          "registration_error")
    
            parts = message.split("#")
            if len(parts) != 6:
                return self.send_response(phone_number,
                                          "Invalid format. Use: details#education#profession#marital#religion#ethnicity",
                                          "registration_error")
    
            _, education, profession, marital, religion, ethnicity = parts
    
            # Validate all fields are present and not empty
            fields = [education.strip(), profession.strip(), marital.strip(), 
                     religion.strip(), ethnicity.strip()]
            
            if not all(fields) or any(len(field) < 2 for field in fields):
                return self.send_response(phone_number,
                                          "All fields are required and must be at least 2 characters long.", 
                                          "registration_error")
    
            try:
                user.add_details(
                    education.strip().title(),
                    profession.strip().title(),
                    marital.strip().title(),
                    religion.strip().title(),
                    ethnicity.strip().title()
                )
                
               
                next_step = user.get_next_registration_step()
                
            except Exception as db_error:
                print(f"Database error during details update: {db_error}")
                return self.send_response(phone_number,
                                          "Failed to save details. Please try again.", "registration_error")
    
            # Return success response with next step instructions
            return self.send_response(phone_number, next_step, "registration_details_success", user.id)
    
        except Exception as e:
            print(f"Details registration error for {phone_number}: {e}")
            return self.send_response(phone_number,
                                      "Details registration failed. Please try again.", "registration_error")   
    
    def handle_self_description(self, phone_number, message):
        """Handle MYSELF description command"""
        try:
            user, _ = UserService.get_user_by_phone(phone_number)
            if not user or user.registration_stage != RegistrationStage.DETAILS_PENDING:
                return self.send_response(phone_number,
                                          "Complete previous registration steps first.", "registration_error")

            if not message.upper().startswith("MYSELF"):
                return self.send_response(phone_number,
                                          "Description must start with MYSELF", "registration_error")

            description = message[6:].strip()  
            if len(description) < 3:
                return self.send_response(phone_number,
                                          "Please provide a description.", "registration_error")

            # Complete registration
            user.add_description(description)

            response = f"Registration completed successfully {user.name}! To search for a MPENZI, SMS: match#age#town to 22141 Example: match#26-30#Nairobi"

            # Update to include image upload step
            response = f"Great job {user.name}! Your profile description is complete. Now add photos to make your profile stand out! SMS 'IMAGES' to 22141 for photo upload instructions, or start matching with: match#age#town"

            return self.send_response(phone_number, response, "registration_complete", user.id)

        except Exception as e:
            return self.send_response(phone_number,
                                      "Registration completion failed. Please try again.", "registration_error")

    def handle_image_upload_guide(self, phone_number):
        """Handle IMAGES command to provide photo upload instructions"""
        try:
            user, _ = UserService.get_user_by_phone(phone_number)
            if not user:
                return self.send_response(phone_number, "Register first using PENZI.", "image_error")

            if user.registration_stage != RegistrationStage.COMPLETED:
                return self.send_response(phone_number, "Complete your profile registration first.", "image_error")

            # Provide Instagram-style photo upload instructions
            response_parts = []
            response_parts.append(" PHOTO UPLOAD GUIDE")
            response_parts.append("")
            response_parts.append("Make your profile shine with great photos!")
            response_parts.append("")
            response_parts.append(" WEB UPLOAD:")
            response_parts.append("Visit: penzi.co.ke/upload")
            response_parts.append("Login with your phone number")
            response_parts.append("Upload up to 6 photos")
            response_parts.append("")
            response_parts.append(" WHATSAPP UPLOAD:")
            response_parts.append("Send photos to: +254700000000")
            response_parts.append("Include your phone number in message")
            response_parts.append("")
            response_parts.append("✨ PHOTO TIPS:")
            response_parts.append("• Clear, well-lit photos")
            response_parts.append("• Smile and look confident")
            response_parts.append("• Include full body shots")
            response_parts.append("• Show your hobbies/interests")
            response_parts.append("• Avoid group photos as main pic")
            response_parts.append("")
            response_parts.append("Profiles with photos get 10x more matches!")
            response_parts.append("")
            response_parts.append("Ready to find matches? Try: match#25-30#Nairobi")

            response = "\n".join(response_parts)
            return self.send_response(phone_number, response, "image_guide", user.id)

        except Exception as e:
            return self.send_response(phone_number, "Failed to get photo upload guide. Please try again.", "image_error")

    def handle_match_request(self, phone_number, message):  
        """Handle match request with proper database queries"""
        try:
            print(
                f"Starting match request for phone: {phone_number}, message: {message}")

            user, _ = UserService.get_user_by_phone(phone_number)
            print(f"User retrieved: {user.id if user else 'None'}")

            if not user or user.registration_stage != RegistrationStage.COMPLETED:
                return self.send_response(phone_number, "Complete registration first.", "match_error")

            parts = message.split("#")
            if len(parts) != 3:
                return self.send_response(phone_number, "Invalid format. Use: match#age#town", "match_error")

            _, age_range, town = parts
            print(f"Parsed: age_range={age_range}, town={town}")

            # Parse age range
            if "-" in age_range:
                age_min, age_max = map(int, age_range.split("-"))
            else:
                age_min = age_max = int(age_range)

            print(f"Age range: {age_min}-{age_max}")

            # Find potential matches
            print("Finding potential matches...")
            try:
                matches = self.find_potential_matches(
                    user, age_min, age_max, town)
                print(f"Found {len(matches) if matches else 0} matches")
            except Exception as match_error:
                print(f"Error in find_potential_matches: {str(match_error)}")
                raise match_error

            if not matches:
                # Suggest broader search criteria
                response = f"No matches found for age {age_range} in {town}. Try a broader age range like 20-35 or search in nearby areas."
                return self.send_response(phone_number, response, "match_error")
            elif len(matches) < 3:
                # If very few matches, suggest broader criteria in the response
                print(f"DEBUG: Only {len(matches)} matches found, will suggest broader search in response")

            # Create match request
            match_request = MatchRequest(
                user_id=user.id,
                age_min=age_min,
                age_max=age_max,
                preferred_town=town.title(),
            )
            db.session.add(match_request)
            db.session.flush()

            print("match_request created")

            # Create match records
            match_records = []
            for i, match_user in enumerate(matches, 1):
                match = Match(
                    request_id=match_request.id,
                    requester_id=user.id,
                    matched_user_id=match_user.id,
                    position=i
                )

                match_records.append(match)
                db.session.add(match)

            db.session.commit()
            print(match_records)
            # Send first batch of matches (show up to 5 initially)
            return self.send_match_batch(user, match_request, match_records[:5], is_first=True)

        except Exception as e:
            # Log the actual error for debugging
            print(f"Error in handle_match_request: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")

            # Rollback the transaction
            db.session.rollback()

            return self.send_response(phone_number, "Match request failed. Please try again.", "match_error")

    def find_potential_matches(self, user, age_min, age_max, town):
        """Find potential matches from database"""
        from app.models.userModel import Gender

        # Determine opposite gender
        opposite_gender = Gender.FEMALE if user.gender == Gender.MALE else Gender.MALE
        
        print(f"DEBUG: Searching for matches with criteria:")
        print(f"  - Gender: {opposite_gender}")
        print(f"  - Age range: {age_min}-{age_max}")
        print(f"  - Town: {town}")
        print(f"  - Excluding user ID: {user.id}")

        # Query for matches
        matches = db.session.query(User).filter(
            User.gender == opposite_gender, # type: ignore
            User.age >= age_min,
            User.age <= age_max,
            User.town.ilike(f"%{town}%"),
            User.is_active.is_(True),
            User.registration_stage == RegistrationStage.COMPLETED, # type: ignore
            User.id != user.id
        ).order_by(User.created_at.desc()).all()
        
        print(f"DEBUG: Found {len(matches)} total matches")
        for i, match in enumerate(matches[:10]):  # Show first 10 for debugging
            print(f"  {i+1}. {match.name} - Age: {match.age}, Town: {match.town}, Gender: {match.gender}")

        return matches

    def send_match_batch(self, user, match_request, matches, is_first=False):
        """Send batch of matches with proper formatting"""
        if not matches:
            return self.send_response(user.phone_number, "No more matches available.", "match_complete")
    
        if is_first:
            total_matches = db.session.query(Match).filter_by(
                request_id=match_request.id).count()
            gender_term = "ladies" if user.gender.value == "Male" else "gentlemen"
            showing_count = len(matches)
            response_lines = [
                f"PENZI MATCHES: {total_matches} {gender_term} found!",
                f"Showing {showing_count}:"
            ]
        else:
            response_lines = [
                "MORE MATCHES:"
            ]
    
        for match in matches:
            match_user = match.matched_user
            # Format each match as a compact block
            match_text = f"{match.position}. {match_user.name}, {match_user.age}yrs, {match_user.town}, {match_user.profession}, {match_user.phone_number}"
            response_lines.append(match_text)
            match.is_sent = True
    
        # Add suggestions based on number of matches
        if is_first and len(matches) < 3:
            response_lines.append("")
            response_lines.append("Limited matches! Try:")
            response_lines.append("match#20-35#Imara (broader age)")
            response_lines.append("match#25-30#Nairobi (bigger area)")
            response_lines.append("")
            response_lines.append(f"Details: DESCRIBE {matches[0].matched_user.phone_number}")
        else:
            response_lines.append("")
            response_lines.append("More matches: Reply NEXT")
            response_lines.append(f"Details: DESCRIBE {matches[0].matched_user.phone_number}")
    
        db.session.commit()
        response = "\n".join(response_lines)
        return self.send_response(user.phone_number, response, "match_results", user.id)

    def handle_next_matches(self, phone_number):
        """Handle NEXT command to get more matches"""
        try:
            user, _ = UserService.get_user_by_phone(phone_number)
            if not user or user.registration_stage != RegistrationStage.COMPLETED:
                return self.send_response(phone_number, "Complete registration first.", "match_error")

            # Get the user's most recent match request
            latest_request = MatchRequest.query.filter_by(
                user_id=user.id,
                status='active'
            ).order_by(MatchRequest.created_at.desc()).first()

            if not latest_request:
                return self.send_response(phone_number,
                                          "No active match request found. Use match#age#town first.", "match_error")

            # Get next batch of unsent matches
            next_matches = Match.query.filter(
                Match.request_id == latest_request.id, # type: ignore
                Match.is_sent.is_(False) # type: ignore
            ).order_by(Match.position).limit(5).all() # type: ignore

            if not next_matches:
                return self.send_response(phone_number,
                                          "No more matches available. Try a new search with match#age#town", "match_complete")

            return self.send_match_batch(user, latest_request, next_matches, is_first=False)

        except Exception as e:
            return self.send_response(phone_number,
                                          "Failed to get next matches. Please try again.", "match_error")
           
    def handle_describe_request(self, phone_number, message):
        """Handle DESCRIBE phone_number command"""
        try:
            user, _ = UserService.get_user_by_phone(phone_number)
            if not user:
                return self.send_response(phone_number, "Register first using PENZI.", "interest_error")
    
            parts = message.split()
            if len(parts) != 2:
                return self.send_response(phone_number, "Invalid format. Use: DESCRIBE 0701234567", "interest_error")
            
            target_phone = parts[1].strip()
            
            # Phone number normalization (existing logic)
            if target_phone.startswith('+'):
                target_phone = target_phone[1:]
            if target_phone.startswith('254') and len(target_phone) > 10:
                target_phone = '0' + target_phone[3:]
            
            target_user, _ = UserService.get_user_by_phone(target_phone)
            
            if not target_user:
                return self.send_response(phone_number, "User not found or not registered.", "interest_error")
    
            if target_user.id == user.id:
                return self.send_response(phone_number, "You cannot describe yourself!", "interest_error")
    
            if target_user.registration_stage != RegistrationStage.COMPLETED:
                return self.send_response(phone_number, "User profile is not complete yet.", "interest_error")
    
            # Calculate compatibility score
            compatibility = self.calculate_compatibility(user, target_user)
            
            # Build profile as a continuous readable message
            profile_parts = []
            
            # Header
            profile_parts.append(f"{target_user.name}'s Profile:")
            
            # Basic info in compact format
            basic_info = f"{target_user.age}yr {target_user.gender.value}, {target_user.town}, {target_user.county}"
            profile_parts.append(basic_info)
            
            # Education and profession combined if both exist
            if target_user.level_of_education and target_user.profession:
                profile_parts.append(f"Education: {target_user.level_of_education} | Profession: {target_user.profession}")
            elif target_user.level_of_education:
                profile_parts.append(f"Education: {target_user.level_of_education}")
            elif target_user.profession:
                profile_parts.append(f"Profession: {target_user.profession}")
            
            # Status and religion combined if both exist
            status_religion = []
            if target_user.marital_status:
                status_religion.append(f"Status: {target_user.marital_status}")
            if target_user.religion:
                status_religion.append(f"Religion: {target_user.religion}")
            if status_religion:
                profile_parts.append(" | ".join(status_religion))
            
            # Ethnicity if available
            if target_user.ethnicity:
                profile_parts.append(f"Ethnicity: {target_user.ethnicity}")
            
            # Self description (truncated)
            if target_user.self_description:
                description = target_user.self_description[:80]
                if len(target_user.self_description) > 80:
                    description += "..."
                profile_parts.append(f"About: {description}")
            
            # Compatibility score
            profile_parts.append(f"Compatibility: {compatibility}%")
    
            # Check for existing interest
            from datetime import datetime, timedelta
            twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
            
            existing_interest = UserInterest.query.filter(
                UserInterest.interested_user_id == user.id, # type: ignore
                UserInterest.target_user_id == target_user.id, # type: ignore
                UserInterest.created_at >= twenty_four_hours_ago,
                UserInterest.response_received.is_(False) # type: ignore
            ).first()
            
            if not existing_interest:
                # Create new interest and send notification
                interest = UserInterest(
                    interested_user_id=user.id,
                    target_user_id=target_user.id,
                    interest_type='describe'
                )
                db.session.add(interest)
                db.session.flush()
                # Notification message (do NOT reveal requester's phone number)
                notification_parts = []
                notification_parts.append("PENZI INTEREST ALERT!")
                notification_parts.append(f"Hi {target_user.name}!")
                notification_parts.append(f"{user.name} ({user.age}yr {user.gender.value} from {user.town}) is interested in you!")
                # Add key details about interested user
                user_details = []
                if user.profession:
                    user_details.append(f"Profession: {user.profession}")
                if user.level_of_education:
                    user_details.append(f"Education: {user.level_of_education}")
                if user.marital_status:
                    user_details.append(f"Status: {user.marital_status}")
                if user_details:
                    notification_parts.extend(user_details)
                if user.self_description:
                    brief_desc = user.self_description[:50]
                    if len(user.self_description) > 50:
                        brief_desc += "..."
                    notification_parts.append(f"About: {brief_desc}")
                notification_parts.append(f"Compatibility: {compatibility}%")
                notification_parts.append("Reply YES if interested, NO to decline. Expires in 24hrs.")
                notification = " ".join(notification_parts)
                # Send notification to target user
                self.send_response(target_user.phone_number, notification, "interest_notification", target_user.id)
                # Mark notification as sent and commit
                interest.notification_sent = True
                interest.notification_sent_at = datetime.utcnow()
                db.session.commit()
                # Add success message
                profile_parts.append(f"SUCCESS! {target_user.name} has been notified about your interest. You'll get notified when they respond (YES/NO). Try 'NEXT' for more matches!")
            else:
                # Pending response message
                time_remaining = 24 - int((datetime.utcnow() - existing_interest.created_at).total_seconds() / 3600)
                profile_parts.append(f"PENDING: Interest already sent to {target_user.name}. Waiting for response ({time_remaining}h remaining). Be patient!")
    
            profile_response = " ".join(profile_parts)
            return self.send_response(phone_number, profile_response, "profile_sent", user.id)
    
        except Exception as e:
            print(f"ERROR in handle_describe_request: {str(e)}")
            db.session.rollback()
            return self.send_response(phone_number, "Failed to fetch profile. Please try again.", "interest_error")
    
    def handle_interest_response(self, phone_number, message):
        """Handle YES/NO responses - SMS-FRIENDLY FORMATTING"""
        try:
            user, _ = UserService.get_user_by_phone(phone_number)
            if not user:
                return self.send_response(phone_number, "Register first using PENZI.", "interest_error")
    
            response = message.strip().upper()
            
            if response not in ['YES', 'NO']:
                return self.send_response(phone_number, "Invalid response. Reply with 'YES' or 'NO' only.", "interest_error")
    
            # Find pending interest 
            from datetime import datetime, timedelta
            twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
            
            pending_interest = UserInterest.query.filter(
                UserInterest.target_user_id == user.id, # type: ignore
                UserInterest.notification_sent.is_(True), # type: ignore
                UserInterest.response_received.is_(False), # type: ignore
                UserInterest.created_at >= twenty_four_hours_ago
            ).order_by(UserInterest.created_at.desc()).first()
            
            if not pending_interest:
                return self.send_response(phone_number, "No pending interest found or it may have expired.", "interest_error")
    
            # Get the user who showed interest
            interested_user, _ = UserService.get_user_by_id(pending_interest.interested_user_id)
            if not interested_user:
                return self.send_response(phone_number, "Interest sender not found.", "interest_error")
    
            # Update the interest record
            pending_interest.response_received = True
            pending_interest.response = response
            pending_interest.response_at = datetime.utcnow()
            
            if response == 'YES':
                # SMS-friendly success message for interested user
                interested_user_parts = []
                interested_user_parts.append("GREAT NEWS!")
                interested_user_parts.append(f"Hi {interested_user.name}!")
                interested_user_parts.append(f"{user.name} said YES to your interest!")
                interested_user_parts.append(f"Contact details: {user.phone_number}")
                interested_user_parts.append(f"You can now contact {user.name} directly!")
                interested_user_parts.append("Good luck with your connection!")
                interested_user_parts.append("TIP: Be respectful and start with a friendly introduction.")
                interested_user_message = " ".join(interested_user_parts)
                # Send contact details to the interested user
                self.send_response(interested_user.phone_number, interested_user_message, "match_success", interested_user.id)
                # SMS-friendly confirmation for responding user
                response_parts = []
                response_parts.append("RESPONSE SENT!")
                response_parts.append(f"Hi {user.name}!")
                response_parts.append(f"You said YES to {interested_user.name}!")
                response_parts.append(f"{interested_user.name} has been notified and given your contact details.")
                response_parts.append(f"Expect to hear from {interested_user.name} soon!")
                response_parts.append("Wishing you both the best!")
                response_message = " ".join(response_parts)
            else:  # response == 'NO'
                # SMS-friendly decline message for interested user
                interested_user_parts = []
                interested_user_parts.append("Interest Update:")
                interested_user_parts.append(f"Hi {interested_user.name}!")
                interested_user_parts.append(f"{user.name} declined your interest.")
                interested_user_parts.append("Don't worry! There are many other amazing people waiting to meet you.")
                interested_user_parts.append("Try using 'NEXT' to discover more matches!")
                interested_user_message = " ".join(interested_user_parts)
                # Send decline notification to interested user
                self.send_response(interested_user.phone_number, interested_user_message, "interest_declined", interested_user.id)
                # SMS-friendly confirmation for responding user
                response_parts = []
                response_parts.append("RESPONSE SENT!")
                response_parts.append(f"Hi {user.name}!")
                response_parts.append(f"You declined {interested_user.name}'s interest.")
                response_parts.append("They have been notified. Keep exploring! Use 'NEXT' to find your perfect match.")
                response_message = " ".join(response_parts)
    
            # Commit the database changes
            db.session.commit()
            
            # Send confirmation to the responding user
            return self.send_response(phone_number, response_message, "response_confirmed", user.id)
    
        except Exception as e:
            print(f"ERROR in handle_interest_response: {str(e)}")
            db.session.rollback()
            return self.send_response(phone_number, "Failed to process your response. Please try again.", "interest_error")   
    
    def handle_expired_interests(self):
        """Handle expired interest notifications (24 hours) - Optional background task"""
        try:
            from datetime import datetime, timedelta
            
            # Find interests that are 24+ hours old with no response
            twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
            
            expired_interests = UserInterest.query.filter(
                UserInterest.notification_sent.is_(True), # type: ignore
                UserInterest.response_received.is_(False), # type: ignore
                UserInterest.created_at <= twenty_four_hours_ago,
                UserInterest.expired_notification_sent.is_(False)
            ).all()
            
            for interest in expired_interests:
                # Notify the interested user that the interest expired
                interested_user = User.query.get(interest.interested_user_id)
                target_user = User.query.get(interest.target_user_id)
                
                if interested_user and target_user:
                    expiry_message = f" INTEREST EXPIRED\n"
                    expiry_message += f"Your interest in {target_user.name} has expired (no response after 24 hours).\n\n"
                    expiry_message += f" DON'T GIVE UP!\n"
                    expiry_message += f" Try 'NEXT' for more matches\n"
                    expiry_message += f" Search new areas with 'match#age#town'\n"
                    expiry_message += f" Your perfect match is still out there! "
                    
                    self.send_response(interested_user.phone_number, expiry_message, "interest_expired", interested_user.id)
                    
                    # Mark as expired
                    interest.expired_notification_sent = True
            
            db.session.commit()
            print(f"Processed {len(expired_interests)} expired interests")
            
        except Exception as e:
            print(f"Error processing expired interests: {str(e)}")
            db.session.rollback() 
             
    def handle_user_stats(self, phone_number):
        """Handle STATS command"""
        user, _ = UserService.get_user_by_phone(phone_number)
        if not user:
            return self.send_response(phone_number, "Register first using PENZI.", "stats_error")

        stats = self.get_comprehensive_user_stats(user.id)

        response = f" Your PENZI Stats: "
        response += f" Profile views: {stats['profile_views']} "
        response += f" Interests sent: {stats['interests_sent']} "
        response += f" Interests received: {stats['interests_received']} "
        response += f" Positive responses: {stats['positive_responses']} "
        response += f" Match requests made: {stats['match_requests']} "
        response += f" Total matches found: {stats['total_matches']} "
        response += f" Member since: {user.created_at.strftime('%b %Y')}"

        return self.send_response(phone_number, response, "user_stats", user.id)

    def handle_user_history(self, phone_number):
        """Handle HISTORY command - FIXED FORMATTING"""
        user, _ = UserService.get_user_by_phone(phone_number)
        if not user:
            return self.send_response(phone_number, "Register first using PENZI.", "history_error")
    
        # Get recent interactions
        recent_interests = db.session.query(UserInterest).join(
            User, UserInterest.target_user_id == User.id # type: ignore
        ).filter(
            UserInterest.interested_user_id == user.id # type: ignore
        ).order_by(desc(UserInterest.created_at)).limit(5).all()
    
        history_lines = []
        history_lines.append("Your Recent Activity:")
        
        if recent_interests:
            for interest in recent_interests:
                target = interest.target_user
                status = "Accepted" if interest.response == "YES" else "Declined" if interest.response == "NO" else "Pending" # type: ignore
                history_lines.append(f"{target.name} ({target.age}) - {status}")
        else:
            history_lines.append("No recent activity. Start searching with match#age#town")
    
        response = " ".join(history_lines)
        return self.send_response(phone_number, response, "user_history", user.id)

    def handle_stop_service(self, phone_number):
        """Handle STOP command"""
        try:
            user, _ = UserService.get_user_by_phone(phone_number)
            if user:
                user.is_active = False
                db.session.commit()  # Ensure changes are saved before sending response
                response = f"Sorry to see you go {user.name or 'friend'}! Your account has been deactivated. SMS PENZI to 22141 anytime to resume finding matches."
                return self.send_response(phone_number, response, "service_stopped", user.id)
            else:
                response = "Your account has been deactivated. SMS PENZI to 22141 anytime to resume finding matches."
                return self.send_response(phone_number, response, "service_stopped")
        except Exception as e:
            db.session.rollback()
            return self.send_response(phone_number,
                                      "Failed to stop service. Please try again.", "stop_error")

    def handle_unknown_command(self, phone_number):
        """Handle unknown commands"""
        user, _ = UserService.get_user_by_phone(phone_number)

        if not user:
            response = "Welcome to our Penzi dating service, to activate service SMS PENZI to 22141"
        elif user.registration_stage == RegistrationStage.ACTIVATED:
            response = "SMS start#name#age#gender#county#town to 22141 to register"
        elif user.registration_stage == RegistrationStage.INITIAL:
            response = "SMS details#education#profession#marital#religion#ethnicity to 22141"
        elif user.registration_stage == RegistrationStage.DETAILS_PENDING:
            response = "SMS your description starting with MYSELF to 22141"
        else:
            response = "Available commands:Penzi, match#age#town, NEXT, DESCRIBE phone number, STATS, HISTORY, STOP"

        return self.send_response(phone_number, response, "help")

    # Helper methods

    def calculate_compatibility(self, user1, user2):
        """Calculate compatibility score based on shared attributes"""
        score = 0
        total_factors = 0

        # Age compatibility (closer ages = higher score)
        age_diff = abs(user1.age - user2.age)
        age_score = max(0, 100 - (age_diff * 10))
        score += age_score
        total_factors += 1

        # Location compatibility
        if user1.county and user2.county and user1.county.lower() == user2.county.lower():
            score += 100
        elif user1.town and user2.town and user1.town.lower() == user2.town.lower():
            score += 80
        total_factors += 1

        # Education compatibility
        if user1.level_of_education and user2.level_of_education:
            if user1.level_of_education.lower() == user2.level_of_education.lower():
                score += 70
            total_factors += 1

        # Religion compatibility
        if user1.religion and user2.religion:
            if user1.religion.lower() == user2.religion.lower():
                score += 60
            total_factors += 1

        return min(100, int(score / total_factors)) if total_factors > 0 else 50

    def get_comprehensive_user_stats(self, user_id):
        """Get comprehensive user statistics"""
        profile_views = db.session.query(UserInterest).filter(
            UserInterest.target_user_id == user_id # type: ignore
        ).count()

        # Interests sent
        interests_sent = db.session.query(UserInterest).filter(
            UserInterest.interested_user_id == user_id # type: ignore
        ).count()

        # Interests received
        interests_received = profile_views

        # Positive responses received
        positive_responses = db.session.query(UserInterest).filter(
            UserInterest.interested_user_id == user_id, # type: ignore
            UserInterest.response == 'YES'
        ).count()

        # Match requests made
        match_requests = db.session.query(MatchRequest).filter(
            MatchRequest.user_id == user_id # type: ignore
        ).count()

        # Total matches found
        total_matches = db.session.query(Match).filter(
            Match.requester_id == user_id # type: ignore
        ).count()

        return {
            'profile_views': profile_views,
            'interests_sent': interests_sent,
            'interests_received': interests_received,
            'positive_responses': positive_responses,
            'match_requests': match_requests,
            'total_matches': total_matches
        }