from rest_framework import serializers
from accounts.models import User, AuditLog


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'student_id', 'full_name', 'email', 'role', 'faculty',
                  'department', 'is_eligible', 'wallet_address', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['student_id', 'full_name', 'email', 'password', 'faculty', 'department']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    student_id = serializers.CharField()
    password = serializers.CharField()


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.full_name', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'actor', 'actor_name', 'action', 'details', 'ip_address', 'created_at']
