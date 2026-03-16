from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from employees.models import Employee
from teams.models import Team, Project
import random
from datetime import timedelta

class Command(BaseCommand):
    help = 'Seeds the database with initial team data'

    def handle(self, *args, **options):
        # Check if we have employees
        if Employee.objects.count() == 0:
            self.stdout.write(self.style.WARNING('No employees found. Please run seed_employees command first.'))
            return
        
        # Seed teams
        self.create_teams()
        
        # Seed projects
        self.create_projects()
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded team data'))
    
    def create_teams(self):
        team_data = [
            {
                'name': 'Frontend Development',
                'department': 'Engineering',
                'description': 'Responsible for building and maintaining the user interface components of our web applications.'
            },
            {
                'name': 'Backend Development',
                'department': 'Engineering',
                'description': 'Builds and maintains server-side logic, databases, and APIs for our applications.'
            },
            {
                'name': 'Product Management',
                'department': 'Product',
                'description': 'Guides product development from conception to launch, ensuring market fit and business value.'
            },
            {
                'name': 'Marketing Team',
                'department': 'Marketing',
                'description': 'Develops and implements marketing strategies to promote our products and services.'
            },
            {
                'name': 'Customer Support',
                'department': 'Customer Support',
                'description': 'Provides technical assistance and product guidance to customers across all channels.'
            },
        ]
        
        # Get all employees
        employees = list(Employee.objects.all())
        
        if not employees:
            self.stdout.write(self.style.WARNING('No employees available for team creation'))
            return
        
        created_count = 0
        for team_info in team_data:
            # Skip if team with this name already exists
            if Team.objects.filter(name=team_info['name']).exists():
                continue
            
            # Create the team
            team = Team.objects.create(
                name=team_info['name'],
                department=team_info['department'],
                description=team_info['description'],
                created_at=timezone.now() - timedelta(days=random.randint(30, 180))
            )
            
            # Assign a random leader
            if employees:
                leader = random.choice(employees)
                team.leader = leader
                team.save()
            
            # Assign random members (3-8 employees)
            member_count = min(len(employees), random.randint(3, 8))
            members = random.sample(employees, member_count)
            
            # Make sure leader is also a member
            if team.leader and team.leader not in members:
                members.append(team.leader)
            
            team.members.set(members)
            created_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Created {created_count} teams'))
    
    def create_projects(self):
        teams = Team.objects.all()
        
        if not teams:
            self.stdout.write(self.style.WARNING('No teams available for project creation'))
            return
        
        project_data = [
            {
                'name': 'Website Redesign',
                'description': 'Redesign the company website with modern UI/UX principles',
                'status': 'in_progress'
            },
            {
                'name': 'Mobile App Development',
                'description': 'Create a native mobile app for iOS and Android',
                'status': 'planning'
            },
            {
                'name': 'API Overhaul',
                'description': 'Refactor our API for better performance and security',
                'status': 'in_progress'
            },
            {
                'name': 'Customer Portal',
                'description': 'Build a self-service portal for customers',
                'status': 'completed'
            },
            {
                'name': 'Internal Dashboard',
                'description': 'Create an internal metrics dashboard',
                'status': 'in_progress'
            },
            {
                'name': 'Authentication System',
                'description': 'Implement single sign-on and improved security',
                'status': 'planning'
            },
            {
                'name': 'Database Migration',
                'description': 'Migrate from SQL to NoSQL for specific services',
                'status': 'on_hold'
            },
            {
                'name': 'Performance Optimization',
                'description': 'Optimize loading times and resource usage',
                'status': 'in_progress'
            },
        ]
        
        created_count = 0
        for team in teams:
            # Assign 1-3 projects per team
            project_count = random.randint(1, 3)
            selected_projects = random.sample(project_data, min(project_count, len(project_data)))
            
            for project_info in selected_projects:
                # Create project with random dates
                start_date = timezone.now().date() - timedelta(days=random.randint(30, 180))
                
                # End date logic based on status
                end_date = None
                if project_info['status'] == 'completed':
                    end_date = start_date + timedelta(days=random.randint(30, 90))
                elif project_info['status'] == 'in_progress' and random.choice([True, False]):
                    end_date = timezone.now().date() + timedelta(days=random.randint(14, 60))
                
                # Create the project
                Project.objects.create(
                    name=f"{project_info['name']} - {team.name}",
                    description=project_info['description'],
                    team=team,
                    status=project_info['status'],
                    start_date=start_date,
                    end_date=end_date,
                    created_at=start_date
                )
                created_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Created {created_count} projects')) 