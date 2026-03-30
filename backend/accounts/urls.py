from django.urls import path
from accounts.views import (
    RegisterView, LoginView, ProfileView, UserListView,
    BulkEligibilityView, AuditLogListView, SystemHealthView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('bulk-eligibility/', BulkEligibilityView.as_view(), name='bulk-eligibility'),
    path('audit-logs/', AuditLogListView.as_view(), name='audit-logs'),
    path('system-health/', SystemHealthView.as_view(), name='system-health'),
]
