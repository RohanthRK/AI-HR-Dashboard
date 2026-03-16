from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Team, Project
from employees.models import Employee
from datetime import date

class TeamModelTests(TestCase):
    def setUp(self):
        # Create a user for testing
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword'
        )
        
        # Create an employee
        self.employee = Employee.objects.create(
            user=self.user,
            employee_id='EMP001',
            department='Engineering',
            position='Software Engineer',
            hire_date=date(2022, 1, 1),
            salary=75000
        )
        
        # Create a team
        self.team = Team.objects.create(
            name='Test Team',
            department='Engineering',
            description='A team for testing',
            leader=self.employee
        )
        
        # Add the employee as a member
        self.team.members.add(self.employee)
    
    def test_team_creation(self):
        """Test that a team can be created properly"""
        self.assertEqual(self.team.name, 'Test Team')
        self.assertEqual(self.team.department, 'Engineering')
        self.assertEqual(self.team.leader, self.employee)
        self.assertEqual(self.team.members.count(), 1)
        self.assertEqual(self.team.members.first(), self.employee)
    
    def test_is_member(self):
        """Test the is_member helper method"""
        self.assertTrue(self.team.is_member(self.employee))
        
        # Create another employee that is not a member
        user2 = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpassword'
        )
        employee2 = Employee.objects.create(
            user=user2,
            employee_id='EMP002',
            department='Marketing',
            position='Marketing Specialist',
            hire_date=date(2022, 2, 1),
            salary=65000
        )
        
        self.assertFalse(self.team.is_member(employee2))
    
    def test_members_count(self):
        """Test the members_count property"""
        self.assertEqual(self.team.members_count, 1)
        
        # Add another employee
        user2 = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpassword'
        )
        employee2 = Employee.objects.create(
            user=user2,
            employee_id='EMP002',
            department='Marketing',
            position='Marketing Specialist',
            hire_date=date(2022, 2, 1),
            salary=65000
        )
        
        self.team.add_member(employee2)
        self.assertEqual(self.team.members_count, 2)
        
        # Test remove_member
        self.team.remove_member(employee2)
        self.assertEqual(self.team.members_count, 1)

class ProjectModelTests(TestCase):
    def setUp(self):
        # Create a user for testing
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword'
        )
        
        # Create an employee
        self.employee = Employee.objects.create(
            user=self.user,
            employee_id='EMP001',
            department='Engineering',
            position='Software Engineer',
            hire_date=date(2022, 1, 1),
            salary=75000
        )
        
        # Create a team
        self.team = Team.objects.create(
            name='Test Team',
            department='Engineering',
            description='A team for testing',
            leader=self.employee
        )
        
        # Create a project
        self.project = Project.objects.create(
            name='Test Project',
            description='A project for testing',
            team=self.team,
            status='in_progress',
            start_date=date(2023, 1, 1)
        )
    
    def test_project_creation(self):
        """Test that a project can be created properly"""
        self.assertEqual(self.project.name, 'Test Project')
        self.assertEqual(self.project.team, self.team)
        self.assertEqual(self.project.status, 'in_progress')
        self.assertEqual(self.project.start_date, date(2023, 1, 1))
        self.assertIsNone(self.project.end_date)
    
    def test_project_completion(self):
        """Test updating a project to completed status"""
        self.project.status = 'completed'
        self.project.end_date = date(2023, 3, 1)
        self.project.save()
        
        updated_project = Project.objects.get(id=self.project.id)
        self.assertEqual(updated_project.status, 'completed')
        self.assertEqual(updated_project.end_date, date(2023, 3, 1)) 