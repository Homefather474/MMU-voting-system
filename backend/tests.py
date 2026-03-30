"""
Unit and integration tests for the MMU Voting System backend.
Covers: Authentication, Election CRUD, Voter Registration, Vote Casting, Results.
Run: python manage.py test
"""
from django.test import TestCase, Client
from django.urls import reverse
from accounts.models import User, AuditLog
from voting.models import Election, Candidate, VoteRecord, VoterRegistration
from accounts.authentication import generate_token
import json


class AuthMixin:
    """Mixin providing auth helper methods"""
    def create_admin(self):
        return User.objects.create_user(
            student_id='ADMIN001', email='admin@mmu.ac.ke',
            full_name='Test Admin', password='testpass123', role='admin',
            is_eligible=False
        )

    def create_voter(self, num=1):
        return User.objects.create_user(
            student_id=f'CIT-222-{str(num).zfill(3)}/2021',
            email=f'voter{num}@students.mmu.ac.ke',
            full_name=f'Test Voter {num}', password='testpass123',
            role='voter', is_eligible=True,
            faculty='Computing and IT', department='Computer Technology'
        )

    def auth_header(self, user):
        token = generate_token(user)
        return {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    def create_election(self, admin):
        return Election.objects.create(
            title='Test Election', description='A test election',
            status='not_started', created_by=admin
        )

    def add_candidates(self, election):
        c1 = Candidate.objects.create(
            election=election, full_name='Jane Wanjiku',
            position='President', ballot_number=1,
            manifesto_summary='Better campus Wi-Fi'
        )
        c2 = Candidate.objects.create(
            election=election, full_name='James Ochieng',
            position='President', ballot_number=2,
            manifesto_summary='More career fairs'
        )
        return c1, c2


class AuthenticationTests(TestCase, AuthMixin):
    def setUp(self):
        self.client = Client()

    def test_register_user(self):
        resp = self.client.post('/api/accounts/register/', json.dumps({
            'student_id': 'NEW-001/2021', 'full_name': 'New Student',
            'email': 'new@students.mmu.ac.ke', 'password': 'securepass123',
            'faculty': 'Engineering', 'department': 'Electrical'
        }), content_type='application/json')
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertIn('token', data)
        self.assertEqual(data['user']['student_id'], 'NEW-001/2021')
        self.assertEqual(data['user']['role'], 'voter')

    def test_login_success(self):
        self.create_voter(1)
        resp = self.client.post('/api/accounts/login/', json.dumps({
            'student_id': 'CIT-222-001/2021', 'password': 'testpass123'
        }), content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('token', resp.json())

    def test_login_invalid_credentials(self):
        resp = self.client.post('/api/accounts/login/', json.dumps({
            'student_id': 'FAKE001', 'password': 'wrong'
        }), content_type='application/json')
        self.assertEqual(resp.status_code, 401)

    def test_profile_authenticated(self):
        voter = self.create_voter(1)
        resp = self.client.get('/api/accounts/profile/', **self.auth_header(voter))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['student_id'], voter.student_id)

    def test_profile_unauthenticated(self):
        resp = self.client.get('/api/accounts/profile/')
        self.assertEqual(resp.status_code, 403)

    def test_audit_log_created_on_register(self):
        self.client.post('/api/accounts/register/', json.dumps({
            'student_id': 'LOG-001/2021', 'full_name': 'Log Test',
            'email': 'log@students.mmu.ac.ke', 'password': 'securepass123'
        }), content_type='application/json')
        self.assertTrue(AuditLog.objects.filter(action='USER_REGISTERED').exists())


class ElectionTests(TestCase, AuthMixin):
    def setUp(self):
        self.client = Client()
        self.admin = self.create_admin()
        self.voter = self.create_voter(1)

    def test_create_election_as_admin(self):
        resp = self.client.post('/api/voting/elections/', json.dumps({
            'title': 'MMUSG Election 2026',
            'description': 'Annual student government election'
        }), content_type='application/json', **self.auth_header(self.admin))
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()['title'], 'MMUSG Election 2026')

    def test_create_election_as_voter_forbidden(self):
        resp = self.client.post('/api/voting/elections/', json.dumps({
            'title': 'Unauthorized', 'description': 'Should fail'
        }), content_type='application/json', **self.auth_header(self.voter))
        self.assertEqual(resp.status_code, 403)

    def test_list_elections(self):
        self.create_election(self.admin)
        resp = self.client.get('/api/voting/elections/', **self.auth_header(self.voter))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)

    def test_election_detail(self):
        election = self.create_election(self.admin)
        resp = self.client.get(f'/api/voting/elections/{election.id}/', **self.auth_header(self.voter))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['title'], 'Test Election')


class CandidateTests(TestCase, AuthMixin):
    def setUp(self):
        self.client = Client()
        self.admin = self.create_admin()
        self.election = self.create_election(self.admin)

    def test_add_candidate(self):
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/candidates/',
            json.dumps({
                'full_name': 'Jane Wanjiku', 'position': 'President',
                'ballot_number': 1, 'manifesto_summary': 'Better campus'
            }),
            content_type='application/json', **self.auth_header(self.admin)
        )
        self.assertEqual(resp.status_code, 201)

    def test_list_candidates(self):
        self.add_candidates(self.election)
        voter = self.create_voter(1)
        resp = self.client.get(
            f'/api/voting/elections/{self.election.id}/candidates/',
            **self.auth_header(voter)
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 2)

    def test_cannot_add_candidate_during_voting(self):
        self.election.status = 'voting'
        self.election.save()
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/candidates/',
            json.dumps({
                'full_name': 'Late Candidate', 'position': 'President',
                'ballot_number': 3, 'manifesto_summary': 'Too late'
            }),
            content_type='application/json', **self.auth_header(self.admin)
        )
        self.assertEqual(resp.status_code, 400)


class ElectionPhaseTests(TestCase, AuthMixin):
    def setUp(self):
        self.client = Client()
        self.admin = self.create_admin()
        self.election = self.create_election(self.admin)
        self.add_candidates(self.election)

    def test_start_registration(self):
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/phase/start_registration/',
            json.dumps({}), content_type='application/json',
            **self.auth_header(self.admin)
        )
        self.assertEqual(resp.status_code, 200)
        self.election.refresh_from_db()
        self.assertEqual(self.election.status, 'registration')

    def test_open_polls(self):
        self.election.status = 'registration'
        self.election.save()
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/phase/open_polls/',
            json.dumps({}), content_type='application/json',
            **self.auth_header(self.admin)
        )
        self.assertEqual(resp.status_code, 200)
        self.election.refresh_from_db()
        self.assertEqual(self.election.status, 'voting')

    def test_close_polls(self):
        self.election.status = 'voting'
        self.election.save()
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/phase/close_polls/',
            json.dumps({}), content_type='application/json',
            **self.auth_header(self.admin)
        )
        self.assertEqual(resp.status_code, 200)
        self.election.refresh_from_db()
        self.assertEqual(self.election.status, 'ended')

    def test_invalid_phase_transition(self):
        # Can't open polls from not_started
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/phase/open_polls/',
            json.dumps({}), content_type='application/json',
            **self.auth_header(self.admin)
        )
        self.assertEqual(resp.status_code, 400)

    def test_voter_cannot_transition_phases(self):
        voter = self.create_voter(1)
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/phase/start_registration/',
            json.dumps({}), content_type='application/json',
            **self.auth_header(voter)
        )
        self.assertEqual(resp.status_code, 403)


class VoterRegistrationTests(TestCase, AuthMixin):
    def setUp(self):
        self.client = Client()
        self.admin = self.create_admin()
        self.election = self.create_election(self.admin)
        self.add_candidates(self.election)
        self.election.status = 'registration'
        self.election.save()
        self.voter = self.create_voter(1)

    def test_voter_can_register(self):
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/register/',
            json.dumps({}), content_type='application/json',
            **self.auth_header(self.voter)
        )
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(VoterRegistration.objects.filter(
            user=self.voter, election=self.election
        ).exists())

    def test_cannot_register_twice(self):
        self.client.post(
            f'/api/voting/elections/{self.election.id}/register/',
            json.dumps({}), content_type='application/json',
            **self.auth_header(self.voter)
        )
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/register/',
            json.dumps({}), content_type='application/json',
            **self.auth_header(self.voter)
        )
        self.assertEqual(resp.status_code, 400)

    def test_ineligible_voter_rejected(self):
        ineligible = User.objects.create_user(
            student_id='INELIG-001', email='inelig@mmu.ac.ke',
            full_name='Ineligible', password='testpass123',
            role='voter', is_eligible=False
        )
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/register/',
            json.dumps({}), content_type='application/json',
            **self.auth_header(ineligible)
        )
        self.assertEqual(resp.status_code, 403)

    def test_cannot_register_when_not_in_registration(self):
        self.election.status = 'voting'
        self.election.save()
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/register/',
            json.dumps({}), content_type='application/json',
            **self.auth_header(self.voter)
        )
        self.assertEqual(resp.status_code, 400)


class VoteCastingTests(TestCase, AuthMixin):
    def setUp(self):
        self.client = Client()
        self.admin = self.create_admin()
        self.election = self.create_election(self.admin)
        self.c1, self.c2 = self.add_candidates(self.election)
        self.election.status = 'registration'
        self.election.save()
        self.voter1 = self.create_voter(1)
        self.voter2 = self.create_voter(2)
        # Register voters
        VoterRegistration.objects.create(
            user=self.voter1, election=self.election, wallet_address='0xVOTER1'
        )
        VoterRegistration.objects.create(
            user=self.voter2, election=self.election, wallet_address='0xVOTER2'
        )
        self.election.status = 'voting'
        self.election.save()

    def test_cast_vote_success(self):
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/vote/',
            json.dumps({'candidate_id': 1}),
            content_type='application/json',
            **self.auth_header(self.voter1)
        )
        self.assertEqual(resp.status_code, 201)
        self.assertIn('transaction_hash', resp.json())
        self.assertTrue(VoteRecord.objects.filter(
            user=self.voter1, election=self.election
        ).exists())

    def test_cannot_vote_twice(self):
        self.client.post(
            f'/api/voting/elections/{self.election.id}/vote/',
            json.dumps({'candidate_id': 1}),
            content_type='application/json',
            **self.auth_header(self.voter1)
        )
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/vote/',
            json.dumps({'candidate_id': 2}),
            content_type='application/json',
            **self.auth_header(self.voter1)
        )
        self.assertEqual(resp.status_code, 400)

    def test_unregistered_voter_rejected(self):
        unregistered = self.create_voter(3)
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/vote/',
            json.dumps({'candidate_id': 1}),
            content_type='application/json',
            **self.auth_header(unregistered)
        )
        self.assertEqual(resp.status_code, 403)

    def test_invalid_candidate_rejected(self):
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/vote/',
            json.dumps({'candidate_id': 99}),
            content_type='application/json',
            **self.auth_header(self.voter1)
        )
        self.assertEqual(resp.status_code, 400)

    def test_cannot_vote_when_polls_closed(self):
        self.election.status = 'ended'
        self.election.save()
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/vote/',
            json.dumps({'candidate_id': 1}),
            content_type='application/json',
            **self.auth_header(self.voter1)
        )
        self.assertEqual(resp.status_code, 400)

    def test_vote_record_does_not_store_candidate_choice(self):
        """Verify voter anonymity: VoteRecord stores tx hash but NOT candidate_id"""
        self.client.post(
            f'/api/voting/elections/{self.election.id}/vote/',
            json.dumps({'candidate_id': 1}),
            content_type='application/json',
            **self.auth_header(self.voter1)
        )
        record = VoteRecord.objects.get(user=self.voter1, election=self.election)
        # VoteRecord model has NO candidate field
        self.assertFalse(hasattr(record, 'candidate'))
        self.assertFalse(hasattr(record, 'candidate_id'))
        self.assertTrue(record.transaction_hash)

    def test_my_vote_status(self):
        resp = self.client.get(
            f'/api/voting/elections/{self.election.id}/my-status/',
            **self.auth_header(self.voter1)
        )
        data = resp.json()
        self.assertTrue(data['is_registered'])
        self.assertFalse(data['has_voted'])

        # Vote
        self.client.post(
            f'/api/voting/elections/{self.election.id}/vote/',
            json.dumps({'candidate_id': 1}),
            content_type='application/json',
            **self.auth_header(self.voter1)
        )

        resp = self.client.get(
            f'/api/voting/elections/{self.election.id}/my-status/',
            **self.auth_header(self.voter1)
        )
        data = resp.json()
        self.assertTrue(data['has_voted'])
        self.assertIsNotNone(data['transaction_hash'])


class VoteVerificationTests(TestCase, AuthMixin):
    def setUp(self):
        self.client = Client()
        self.admin = self.create_admin()
        self.election = self.create_election(self.admin)
        self.add_candidates(self.election)
        self.election.status = 'voting'
        self.election.save()
        self.voter = self.create_voter(1)
        VoterRegistration.objects.create(
            user=self.voter, election=self.election, wallet_address='0xVOTER1'
        )

    def test_verify_existing_vote(self):
        # Cast vote
        resp = self.client.post(
            f'/api/voting/elections/{self.election.id}/vote/',
            json.dumps({'candidate_id': 1}),
            content_type='application/json',
            **self.auth_header(self.voter)
        )
        tx_hash = resp.json()['transaction_hash']

        # Verify it (public endpoint)
        resp = self.client.post('/api/voting/verify/', json.dumps({
            'transaction_hash': tx_hash
        }), content_type='application/json', **self.auth_header(self.voter))
        data = resp.json()
        self.assertTrue(data['database_verified'])

    def test_verify_nonexistent_vote(self):
        resp = self.client.post('/api/voting/verify/', json.dumps({
            'transaction_hash': '0xNONEXISTENT'
        }), content_type='application/json', **self.auth_header(self.voter))
        data = resp.json()
        self.assertFalse(data['database_verified'])


class DashboardTests(TestCase, AuthMixin):
    def setUp(self):
        self.client = Client()
        self.admin = self.create_admin()
        self.voter = self.create_voter(1)
        self.create_election(self.admin)

    def test_dashboard_stats(self):
        resp = self.client.get('/api/voting/dashboard/', **self.auth_header(self.voter))
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('total_elections', data)
        self.assertEqual(data['total_elections'], 1)


class AuditLogTests(TestCase, AuthMixin):
    def setUp(self):
        self.client = Client()
        self.admin = self.create_admin()
        self.voter = self.create_voter(1)

    def test_admin_can_view_audit_logs(self):
        # Generate some logs
        self.client.post('/api/accounts/login/', json.dumps({
            'student_id': self.admin.student_id, 'password': 'testpass123'
        }), content_type='application/json')

        resp = self.client.get('/api/accounts/audit-logs/', **self.auth_header(self.admin))
        self.assertEqual(resp.status_code, 200)

    def test_voter_cannot_view_audit_logs(self):
        resp = self.client.get('/api/accounts/audit-logs/', **self.auth_header(self.voter))
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # Voter gets empty results
        results = data.get('results', data)
        self.assertEqual(len(results), 0)
