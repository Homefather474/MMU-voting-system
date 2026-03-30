from django.urls import path
from voting.views import (
    ElectionListCreateView, ElectionDetailView,
    CandidateListCreateView, CandidateDetailView,
    ElectionPhaseView, VoterRegisterView, VoterRegistrationListView,
    CastVoteView, VerifyVoteView, ElectionResultsView,
    DashboardStatsView, MyVoteStatusView,
)

urlpatterns = [
    # Elections
    path('elections/', ElectionListCreateView.as_view(), name='election-list'),
    path('elections/<uuid:pk>/', ElectionDetailView.as_view(), name='election-detail'),
    path('elections/<uuid:election_id>/phase/<str:action>/', ElectionPhaseView.as_view(), name='election-phase'),

    # Candidates
    path('elections/<uuid:election_id>/candidates/', CandidateListCreateView.as_view(), name='candidate-list'),
    path('elections/<uuid:election_id>/candidates/<uuid:pk>/', CandidateDetailView.as_view(), name='candidate-detail'),

    # Voter Registration
    path('elections/<uuid:election_id>/register/', VoterRegisterView.as_view(), name='voter-register'),
    path('elections/<uuid:election_id>/registrations/', VoterRegistrationListView.as_view(), name='voter-registrations'),

    # Voting
    path('elections/<uuid:election_id>/vote/', CastVoteView.as_view(), name='cast-vote'),
    path('elections/<uuid:election_id>/my-status/', MyVoteStatusView.as_view(), name='my-vote-status'),

    # Results & Verification
    path('elections/<uuid:election_id>/results/', ElectionResultsView.as_view(), name='election-results'),
    path('verify/', VerifyVoteView.as_view(), name='verify-vote'),

    # Dashboard
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard'),
]
