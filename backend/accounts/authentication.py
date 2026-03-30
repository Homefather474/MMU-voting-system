import jwt
from datetime import datetime, timezone
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from accounts.models import User


class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            if datetime.fromtimestamp(payload['exp'], tz=timezone.utc) < datetime.now(timezone.utc):
                raise AuthenticationFailed('Token expired')
            user = User.objects.get(id=payload['user_id'])
            return (user, token)
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found')


def generate_token(user):
    expiry_minutes = (
        settings.JWT_ADMIN_EXPIRY_MINUTES
        if user.role in ['admin', 'sysadmin']
        else settings.JWT_VOTER_EXPIRY_MINUTES
    )
    payload = {
        'user_id': str(user.id),
        'student_id': user.student_id,
        'role': user.role,
        'exp': datetime.now(timezone.utc).timestamp() + (expiry_minutes * 60),
        'iat': datetime.now(timezone.utc).timestamp(),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
