"""
Seeds the database with test data for development
"""
from django.core.management.base import BaseCommand
from accounts.models import User
from voting.models import Election, Candidate
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Seed database with test data for MMU Voting System'

    def handle(self, *args, **options):
        # Create admin user
        admin, created = User.objects.get_or_create(
            student_id='ADMIN001',
            defaults={
                'full_name': 'Dr. Nick Ishmael',
                'email': 'admin@mmu.ac.ke',
                'role': 'admin',
                'faculty': 'Computing and IT',
                'department': 'Computer Technology',
                'is_eligible': False,
                'is_staff': True,
            }
        )
        if created:
            admin.set_password('admin123')
            admin.save()
            self.stdout.write(self.style.SUCCESS(f'Created admin: {admin.student_id}'))

        # Create sysadmin
        sysadmin, created = User.objects.get_or_create(
            student_id='SYSADMIN001',
            defaults={
                'full_name': 'System Administrator',
                'email': 'sysadmin@mmu.ac.ke',
                'role': 'sysadmin',
                'faculty': 'ICT Department',
                'department': 'Systems',
                'is_eligible': False,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            sysadmin.set_password('sysadmin123')
            sysadmin.save()
            self.stdout.write(self.style.SUCCESS(f'Created sysadmin: {sysadmin.student_id}'))

        # Create sample voters
        faculties = [
            ('Computing and IT', 'Computer Technology'),
            ('Computing and IT', 'Information Technology'),
            ('Engineering', 'Electrical Engineering'),
            ('Business', 'Business Administration'),
            ('Media and Communication', 'Journalism'),
        ]
        voters = []
        for i in range(1, 11):
            fac, dept = faculties[(i - 1) % len(faculties)]
            voter, created = User.objects.get_or_create(
                student_id=f'CIT-222-{str(i).zfill(3)}/2021',
                defaults={
                    'full_name': f'Student {i}',
                    'email': f'student{i}@students.mmu.ac.ke',
                    'role': 'voter',
                    'faculty': fac,
                    'department': dept,
                    'is_eligible': True,
                }
            )
            if created:
                voter.set_password('voter123')
                voter.save()
                voters.append(voter)

        self.stdout.write(self.style.SUCCESS(f'Created {len(voters)} voters'))

        # Create sample election
        now = timezone.now()
        election, created = Election.objects.get_or_create(
            title='MMUSG Presidential Election 2026',
            defaults={
                'description': 'Annual Multimedia University Student Government Presidential Election for the academic year 2025/2026.',
                'registration_start': now - timedelta(days=3),
                'registration_end': now + timedelta(days=2),
                'voting_start': now + timedelta(days=3),
                'voting_end': now + timedelta(days=4),
                'status': 'registration',
                'created_by': admin,
            }
        )

        if created:
            candidates_data = [
                {'full_name': 'Jane Wanjiku', 'position': 'President', 'ballot_number': 1,
                 'manifesto_summary': 'Committed to improving campus Wi-Fi, creating more study spaces, and establishing a student mental health support centre.'},
                {'full_name': 'James Ochieng', 'position': 'President', 'ballot_number': 2,
                 'manifesto_summary': 'Focused on increasing student representation in university decisions, improving cafeteria services, and organising more career fairs.'},
                {'full_name': 'Amina Hassan', 'position': 'President', 'ballot_number': 3,
                 'manifesto_summary': 'Advocating for reduced tuition fees, better sports facilities, and stronger industry partnerships for internship opportunities.'},
            ]
            for cd in candidates_data:
                Candidate.objects.create(election=election, **cd)

            self.stdout.write(self.style.SUCCESS(f'Created election: {election.title} with {len(candidates_data)} candidates'))

        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))
        self.stdout.write(self.style.WARNING('\nTest Credentials:'))
        self.stdout.write(f'  Admin:    ADMIN001 / admin123')
        self.stdout.write(f'  SysAdmin: SYSADMIN001 / sysadmin123')
        self.stdout.write(f'  Voters:   CIT-222-001/2021 to CIT-222-010/2021 / voter123')
