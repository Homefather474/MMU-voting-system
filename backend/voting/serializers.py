from rest_framework import serializers
from voting.models import Election, Candidate, VoteRecord, VoterRegistration


class CandidateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Candidate
        fields = ['id', 'full_name', 'position', 'manifesto_summary', 'ballot_number', 'photo_url']


class ElectionSerializer(serializers.ModelSerializer):
    candidates = CandidateSerializer(many=True, read_only=True)
    total_voters = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Election
        fields = ['id', 'title', 'description', 'registration_start', 'registration_end',
                  'voting_start', 'voting_end', 'contract_address', 'status',
                  'candidates', 'total_voters', 'total_votes', 'created_by_name',
                  'created_at', 'updated_at']

    def get_total_voters(self, obj):
        return obj.registrations.count()

    def get_total_votes(self, obj):
        return obj.vote_records.count()


class ElectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Election
        fields = ['title', 'description', 'registration_start', 'registration_end',
                  'voting_start', 'voting_end']


class CandidateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Candidate
        fields = ['full_name', 'position', 'manifesto_summary', 'ballot_number', 'photo_url']


class VoteRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoteRecord
        fields = ['id', 'transaction_hash', 'block_number', 'timestamp']


class VoterRegistrationSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    student_id = serializers.CharField(source='user.student_id', read_only=True)

    class Meta:
        model = VoterRegistration
        fields = ['id', 'user_name', 'student_id', 'wallet_address', 'registered_at']


class CastVoteSerializer(serializers.Serializer):
    candidate_id = serializers.IntegerField()


class VerifyVoteSerializer(serializers.Serializer):
    transaction_hash = serializers.CharField(max_length=66)
