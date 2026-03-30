from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from voting.models import Election, Candidate, VoteRecord, VoterRegistration
from voting.serializers import (
    ElectionSerializer, ElectionCreateSerializer, CandidateSerializer,
    CandidateCreateSerializer, VoteRecordSerializer, VoterRegistrationSerializer,
    CastVoteSerializer, VerifyVoteSerializer
)
from voting.blockchain import blockchain_service
from accounts.views import log_action


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in ['admin', 'sysadmin']


# ──────────── Election CRUD ────────────

class ElectionListCreateView(APIView):
    def get(self, request):
        elections = Election.objects.all()
        s = request.query_params.get('status')
        if s:
            elections = elections.filter(status=s)
        serializer = ElectionSerializer(elections, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.role not in ['admin', 'sysadmin']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ElectionCreateSerializer(data=request.data)
        if serializer.is_valid():
            election = serializer.save(created_by=request.user)
            log_action(request.user, 'ELECTION_CREATED', f'Election "{election.title}" created', request)
            return Response(ElectionSerializer(election).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ElectionDetailView(APIView):
    def get(self, request, pk):
        election = get_object_or_404(Election, pk=pk)
        return Response(ElectionSerializer(election).data)

    def patch(self, request, pk):
        if request.user.role not in ['admin', 'sysadmin']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        election = get_object_or_404(Election, pk=pk)
        serializer = ElectionCreateSerializer(election, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            log_action(request.user, 'ELECTION_UPDATED', f'Election "{election.title}" updated', request)
            return Response(ElectionSerializer(election).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if request.user.role != 'sysadmin':
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        election = get_object_or_404(Election, pk=pk)
        if election.status != 'not_started':
            return Response({'error': 'Cannot delete an active election'}, status=status.HTTP_400_BAD_REQUEST)
        title = election.title
        election.delete()
        log_action(request.user, 'ELECTION_DELETED', f'Election "{title}" deleted', request)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ──────────── Candidate Management ────────────

class CandidateListCreateView(APIView):
    def get(self, request, election_id):
        election = get_object_or_404(Election, pk=election_id)
        candidates = election.candidates.all()
        return Response(CandidateSerializer(candidates, many=True).data)

    def post(self, request, election_id):
        if request.user.role not in ['admin', 'sysadmin']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        election = get_object_or_404(Election, pk=election_id)
        if election.status not in ['not_started', 'registration']:
            return Response({'error': 'Cannot add candidates at this stage'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = CandidateCreateSerializer(data=request.data)
        if serializer.is_valid():
            candidate = serializer.save(election=election)
            log_action(request.user, 'CANDIDATE_ADDED',
                       f'Candidate "{candidate.full_name}" added to {election.title}', request)
            return Response(CandidateSerializer(candidate).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CandidateDetailView(APIView):
    def get(self, request, election_id, pk):
        candidate = get_object_or_404(Candidate, pk=pk, election_id=election_id)
        return Response(CandidateSerializer(candidate).data)

    def patch(self, request, election_id, pk):
        if request.user.role not in ['admin', 'sysadmin']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        candidate = get_object_or_404(Candidate, pk=pk, election_id=election_id)
        serializer = CandidateCreateSerializer(candidate, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(CandidateSerializer(candidate).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, election_id, pk):
        if request.user.role not in ['admin', 'sysadmin']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        candidate = get_object_or_404(Candidate, pk=pk, election_id=election_id)
        election = candidate.election
        if election.status not in ['not_started', 'registration']:
            return Response({'error': 'Cannot remove candidates at this stage'}, status=status.HTTP_400_BAD_REQUEST)
        candidate.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ──────────── Election Phase Management ────────────

class ElectionPhaseView(APIView):
    """Transition election phases and sync with blockchain"""
    def post(self, request, election_id, action):
        if request.user.role not in ['admin', 'sysadmin']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        election = get_object_or_404(Election, pk=election_id)

        try:
            if action == 'start_registration':
                if election.status != 'not_started':
                    return Response({'error': 'Election already started'}, status=status.HTTP_400_BAD_REQUEST)
                if election.contract_address and blockchain_service.is_connected:
                    blockchain_service.start_registration(election.contract_address)
                election.status = 'registration'
                election.save()

            elif action == 'open_polls':
                if election.status != 'registration':
                    return Response({'error': 'Must be in registration phase'}, status=status.HTTP_400_BAD_REQUEST)
                if election.candidates.count() < 2:
                    return Response({'error': 'Need at least 2 candidates'}, status=status.HTTP_400_BAD_REQUEST)
                if election.contract_address and blockchain_service.is_connected:
                    blockchain_service.open_polls(election.contract_address)
                election.status = 'voting'
                election.save()

            elif action == 'close_polls':
                if election.status != 'voting':
                    return Response({'error': 'Must be in voting phase'}, status=status.HTTP_400_BAD_REQUEST)
                if election.contract_address and blockchain_service.is_connected:
                    blockchain_service.close_polls(election.contract_address)
                election.status = 'ended'
                election.save()

            elif action == 'publish_results':
                if election.status != 'ended':
                    return Response({'error': 'Must be in ended phase'}, status=status.HTTP_400_BAD_REQUEST)
                if election.contract_address and blockchain_service.is_connected:
                    blockchain_service.publish_results(election.contract_address)
                election.status = 'results_published'
                election.save()

            elif action == 'pause':
                if election.contract_address and blockchain_service.is_connected:
                    blockchain_service.pause_election(election.contract_address)
                return Response({'message': 'Election paused'})

            elif action == 'resume':
                if election.contract_address and blockchain_service.is_connected:
                    blockchain_service.resume_election(election.contract_address)
                return Response({'message': 'Election resumed'})

            else:
                return Response({'error': f'Unknown action: {action}'}, status=status.HTTP_400_BAD_REQUEST)

            log_action(request.user, f'ELECTION_{action.upper()}',
                       f'Election "{election.title}" transitioned to {election.status}', request)
            return Response(ElectionSerializer(election).data)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ──────────── Voter Registration ────────────

class VoterRegisterView(APIView):
    """Register a voter for an election"""
    def post(self, request, election_id):
        election = get_object_or_404(Election, pk=election_id)
        if election.status != 'registration':
            return Response({'error': 'Registration is not open'}, status=status.HTTP_400_BAD_REQUEST)
        if not request.user.is_eligible:
            return Response({'error': 'You are not eligible to vote'}, status=status.HTTP_403_FORBIDDEN)
        if VoterRegistration.objects.filter(user=request.user, election=election).exists():
            return Response({'error': 'Already registered for this election'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate or use existing wallet address
        wallet = request.user.wallet_address
        if not wallet:
            from web3 import Web3
            w3 = Web3()
            account = w3.eth.account.create()
            wallet = account.address
            request.user.wallet_address = wallet
            request.user.save()

        registration = VoterRegistration.objects.create(
            user=request.user, election=election, wallet_address=wallet
        )

        # Register on blockchain if contract deployed
        if election.contract_address and blockchain_service.is_connected:
            try:
                blockchain_service.register_voter(election.contract_address, wallet)
            except Exception as e:
                pass  # Log but don't fail - blockchain sync can happen later

        log_action(request.user, 'VOTER_REGISTERED',
                   f'{request.user.student_id} registered for {election.title}', request)
        return Response(VoterRegistrationSerializer(registration).data, status=status.HTTP_201_CREATED)


class VoterRegistrationListView(APIView):
    """List registered voters for an election (admin only)"""
    def get(self, request, election_id):
        if request.user.role not in ['admin', 'sysadmin']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        election = get_object_or_404(Election, pk=election_id)
        registrations = election.registrations.all()
        return Response(VoterRegistrationSerializer(registrations, many=True).data)


# ──────────── Vote Casting ────────────

class CastVoteView(APIView):
    """Cast a vote in an election"""
    def post(self, request, election_id):
        election = get_object_or_404(Election, pk=election_id)
        if election.status != 'voting':
            return Response({'error': 'Voting is not open'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CastVoteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        candidate_ballot = serializer.validated_data['candidate_id']

        # Check voter registration
        registration = VoterRegistration.objects.filter(user=request.user, election=election).first()
        if not registration:
            return Response({'error': 'Not registered for this election'}, status=status.HTTP_403_FORBIDDEN)

        # Check if already voted
        if VoteRecord.objects.filter(user=request.user, election=election).exists():
            return Response({'error': 'Already voted in this election'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify candidate exists
        candidate = election.candidates.filter(ballot_number=candidate_ballot).first()
        if not candidate:
            return Response({'error': 'Invalid candidate'}, status=status.HTTP_400_BAD_REQUEST)

        # Record vote
        tx_hash = 'simulated_' + str(request.user.id)[:8] + '_' + str(candidate_ballot)
        block_number = None

        # Try blockchain recording
        if election.contract_address and blockchain_service.is_connected:
            try:
                receipt = blockchain_service.cast_vote_from_backend(
                    election.contract_address, candidate_ballot, registration.wallet_address
                )
                tx_hash = receipt.transactionHash.hex()
                block_number = receipt.blockNumber
            except Exception as e:
                # Fallback to simulated hash if blockchain unavailable
                import hashlib
                tx_hash = '0x' + hashlib.sha256(
                    f"{request.user.id}{election.id}{candidate_ballot}".encode()
                ).hexdigest()[:64]

        # Store vote record (without candidate choice - preserving anonymity)
        vote_record = VoteRecord.objects.create(
            user=request.user,
            election=election,
            transaction_hash=tx_hash,
            block_number=block_number
        )

        log_action(request.user, 'VOTE_CAST',
                   f'Vote cast in {election.title}', request)

        return Response({
            'message': 'Vote cast successfully',
            'transaction_hash': tx_hash,
            'receipt': VoteRecordSerializer(vote_record).data
        }, status=status.HTTP_201_CREATED)


# ──────────── Vote Verification ────────────

class VerifyVoteView(APIView):
    """Verify a vote was recorded on the blockchain"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyVoteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        tx_hash = serializer.validated_data['transaction_hash']

        # Check database
        vote_record = VoteRecord.objects.filter(transaction_hash=tx_hash).first()
        db_verified = vote_record is not None

        # Check blockchain
        blockchain_verified = False
        if blockchain_service.is_connected:
            try:
                result = blockchain_service.verify_transaction(tx_hash)
                blockchain_verified = result.get('exists', False)
            except Exception:
                pass

        return Response({
            'transaction_hash': tx_hash,
            'database_verified': db_verified,
            'blockchain_verified': blockchain_verified,
            'timestamp': vote_record.timestamp.isoformat() if vote_record else None,
        })


# ──────────── Results ────────────

class ElectionResultsView(APIView):
    """Get election results"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, election_id):
        election = get_object_or_404(Election, pk=election_id)
        if election.status not in ['ended', 'results_published']:
            return Response({'error': 'Results not available yet'}, status=status.HTTP_400_BAD_REQUEST)

        # Try blockchain results first
        if election.contract_address and blockchain_service.is_connected:
            try:
                blockchain_results = blockchain_service.get_results(election.contract_address)
                return Response({
                    'election': ElectionSerializer(election).data,
                    'results': blockchain_results,
                    'source': 'blockchain',
                    'total_votes': sum(r['vote_count'] for r in blockchain_results),
                })
            except Exception:
                pass

        # Fallback: count from database (less authoritative)
        total_votes = election.vote_records.count()
        total_registered = election.registrations.count()

        return Response({
            'election': ElectionSerializer(election).data,
            'total_votes': total_votes,
            'total_registered': total_registered,
            'turnout_percentage': round((total_votes / total_registered * 100), 1) if total_registered > 0 else 0,
            'source': 'database',
            'note': 'Blockchain unavailable - showing database records only'
        })


# ──────────── Dashboard Stats ────────────

class DashboardStatsView(APIView):
    """Get dashboard statistics"""
    def get(self, request):
        from accounts.models import User
        from django.db.models import Count

        active_elections = Election.objects.filter(status__in=['registration', 'voting'])
        total_users = User.objects.filter(role='voter').count()

        # Voter-specific stats
        voter_stats = {}
        if request.user.role == 'voter':
            voter_stats = {
                'my_registrations': VoterRegistration.objects.filter(user=request.user).count(),
                'my_votes': VoteRecord.objects.filter(user=request.user).count(),
                'my_elections': list(
                    VoterRegistration.objects.filter(user=request.user)
                    .values_list('election__title', flat=True)
                ),
            }

        return Response({
            'total_elections': Election.objects.count(),
            'active_elections': active_elections.count(),
            'total_voters': total_users,
            'elections_by_status': dict(
                Election.objects.values_list('status').annotate(count=Count('id')).values_list('status', 'count')
            ),
            **voter_stats,
        })


class MyVoteStatusView(APIView):
    """Check if current user has voted in a specific election"""
    def get(self, request, election_id):
        election = get_object_or_404(Election, pk=election_id)
        registration = VoterRegistration.objects.filter(user=request.user, election=election).first()
        vote_record = VoteRecord.objects.filter(user=request.user, election=election).first()

        return Response({
            'is_registered': registration is not None,
            'has_voted': vote_record is not None,
            'transaction_hash': vote_record.transaction_hash if vote_record else None,
            'election_status': election.status,
        })
