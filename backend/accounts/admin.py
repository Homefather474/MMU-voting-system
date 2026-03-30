from django.contrib import admin
from accounts.models import User, AuditLog

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['student_id', 'full_name', 'email', 'role', 'faculty', 'is_eligible', 'created_at']
    list_filter = ['role', 'faculty', 'is_eligible']
    search_fields = ['student_id', 'full_name', 'email']

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'actor', 'ip_address', 'created_at']
    list_filter = ['action']
    readonly_fields = ['id', 'actor', 'action', 'details', 'ip_address', 'created_at']
