import uuid
from django.db import models
from accounts.models import User


class Election(models.Model):
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('registration', 'Registration'),
        ('voting', 'Voting'),
        ('ended', 'Ended'),
        ('results_published', 'Results Published'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    registration_start = models.DateTimeField(null=True, blank=True)
    registration_end = models.DateTimeField(null=True, blank=True)
    voting_start = models.DateTimeField(null=True, blank=True)
    voting_end = models.DateTimeField(null=True, blank=True)
    contract_address = models.CharField(max_length=42, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_elections')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'elections'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Candidate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='candidates')
    full_name = models.CharField(max_length=255)
    position = models.CharField(max_length=255)
    manifesto_summary = models.TextField(blank=True, default='')
    ballot_number = models.IntegerField()
    photo_url = models.URLField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'candidates'
        ordering = ['ballot_number']
        unique_together = ['election', 'ballot_number']

    def __str__(self):
        return f"{self.full_name} - {self.position}"


class VoteRecord(models.Model):
    """Stores tx hash only - NOT the candidate choice (preserving anonymity)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='vote_records')
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='vote_records')
    transaction_hash = models.CharField(max_length=66, unique=True)
    block_number = models.IntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vote_records'
        unique_together = ['user', 'election']

    def __str__(self):
        return f"Vote by {self.user} in {self.election} - tx:{self.transaction_hash[:10]}..."


class VoterRegistration(models.Model):
    """Tracks voter registration per election"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='registrations')
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='registrations')
    wallet_address = models.CharField(max_length=42)
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'voter_registrations'
        unique_together = ['user', 'election']
