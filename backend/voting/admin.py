from django.contrib import admin
from voting.models import Election, Candidate, VoteRecord, VoterRegistration

@admin.register(Election)
class ElectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'created_by', 'created_at']
    list_filter = ['status']

@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'position', 'ballot_number', 'election']
    list_filter = ['election']

@admin.register(VoteRecord)
class VoteRecordAdmin(admin.ModelAdmin):
    list_display = ['user', 'election', 'transaction_hash', 'timestamp']
    readonly_fields = ['id', 'user', 'election', 'transaction_hash', 'block_number', 'timestamp']

@admin.register(VoterRegistration)
class VoterRegistrationAdmin(admin.ModelAdmin):
    list_display = ['user', 'election', 'wallet_address', 'registered_at']
