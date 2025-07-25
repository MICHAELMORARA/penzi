from .userModel import User
from .matchRequestModel import MatchRequest  
from .smsMessagesModel import SmsMessage
from .matchModel import Match
from .userInterestModel import UserInterest
from .userPhotoModel import UserPhoto
from .adminSettingsModel import AdminSettings
from .chatMessageModel import ChatMessage
from .paymentTransactionModel import PaymentTransaction
from app.extensions import db

# Make models available when importing from models package
__all__ = [
    'User', 'MatchRequest', 'Match', 'SmsMessage', 'UserInterest',
    'UserPhoto', 'AdminSettings', 'ChatMessage', 'PaymentTransaction', 'db'
]