import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, student_id, email, full_name, password=None, **extra_fields):
        if not student_id:
            raise ValueError('Student ID is required')
        email = self.normalize_email(email)
        user = self.model(student_id=student_id, email=email, full_name=full_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, student_id, email, full_name, password=None, **extra_fields):
        extra_fields.setdefault('role', 'sysadmin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_eligible', True)
        return self.create_user(student_id, email, full_name, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('voter', 'Voter'),
        ('admin', 'Electoral Admin'),
        ('sysadmin', 'System Admin'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student_id = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    wallet_address = models.CharField(max_length=42, blank=True, null=True, unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='voter')
    faculty = models.CharField(max_length=255, blank=True, default='')
    department = models.CharField(max_length=255, blank=True, default='')
    is_eligible = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()
    USERNAME_FIELD = 'student_id'
    REQUIRED_FIELDS = ['email', 'full_name']

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} ({self.student_id})"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=255)
    details = models.TextField(blank=True, default='')
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
