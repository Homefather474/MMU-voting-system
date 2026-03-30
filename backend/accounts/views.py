from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from accounts.models import User, AuditLog
from accounts.serializers import (
    UserSerializer, UserRegistrationSerializer, LoginSerializer, AuditLogSerializer
)
from accounts.authentication import generate_token


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded.split(',')[0] if x_forwarded else request.META.get('REMOTE_ADDR')


def log_action(actor, action, details='', request=None):
    AuditLog.objects.create(
        actor=actor, action=action, details=details,
        ip_address=get_client_ip(request) if request else None
    )


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token = generate_token(user)
            log_action(user, 'USER_REGISTERED', f'User {user.student_id} registered', request)
            return Response({
                'token': token,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = authenticate(
                request,
                username=serializer.validated_data['student_id'],
                password=serializer.validated_data['password']
            )
            if user:
                token = generate_token(user)
                log_action(user, 'USER_LOGIN', f'User {user.student_id} logged in', request)
                return Response({
                    'token': token,
                    'user': UserSerializer(user).data
                })
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer

    def get_queryset(self):
        if self.request.user.role not in ['admin', 'sysadmin']:
            return User.objects.none()
        qs = User.objects.all()
        role = self.request.query_params.get('role')
        eligible = self.request.query_params.get('eligible')
        faculty = self.request.query_params.get('faculty')
        if role:
            qs = qs.filter(role=role)
        if eligible is not None:
            qs = qs.filter(is_eligible=eligible.lower() == 'true')
        if faculty:
            qs = qs.filter(faculty__icontains=faculty)
        return qs


class BulkEligibilityView(APIView):
    """Import eligible voters from CSV-like data"""
    def post(self, request):
        if request.user.role not in ['admin', 'sysadmin']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        student_ids = request.data.get('student_ids', [])
        updated = User.objects.filter(student_id__in=student_ids).update(is_eligible=True)
        log_action(request.user, 'BULK_ELIGIBILITY_UPDATE',
                   f'Updated {updated} voters as eligible', request)
        return Response({'updated': updated})


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        if self.request.user.role not in ['admin', 'sysadmin']:
            return AuditLog.objects.none()
        qs = AuditLog.objects.all()
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action__icontains=action)
        return qs


class SystemHealthView(APIView):
    def get(self, request):
        if request.user.role != 'sysadmin':
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        from django.db import connection
        db_ok = True
        try:
            connection.ensure_connection()
        except Exception:
            db_ok = False
        return Response({
            'database': 'connected' if db_ok else 'disconnected',
            'status': 'operational',
        })
