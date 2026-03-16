from django.db import models
from django.contrib.auth.models import User

class Employee(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee')
    employee_id = models.CharField(max_length=10, unique=True)
    department = models.CharField(max_length=100)
    position = models.CharField(max_length=100)
    hire_date = models.DateField()
    joining_date = models.DateField(null=True, blank=True)
    manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('on_leave', 'On Leave'),
        ('terminated', 'Terminated'),
        ('suspended', 'Suspended'),
    ], default='active')
    leave_balance = models.PositiveIntegerField(default=20)  # Annual leave balance in days
    
    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name} ({self.employee_id})"
    
    # Helper methods to get team information - using reverse relationships    
    def get_teams(self):
        """Get all teams that the employee is a member of"""
        return self.teams.all()
    
    def get_primary_team(self):
        """Get the primary team (first team) of the employee, or None if not part of any team"""
        teams = self.get_teams()
        return teams.first() if teams.exists() else None
    
    def is_team_leader(self):
        """Check if the employee is a leader of any team"""
        return self.team_leader.exists()
    
    def get_led_teams(self):
        """Get all teams that the employee leads"""
        return self.team_leader.all()
    
    def join_team(self, team):
        """Add the employee to a team"""
        if not self.teams.filter(id=team.id).exists():
            team.add_member(self)
            return True
        return False
    
    def leave_team(self, team):
        """Remove the employee from a team"""
        if self.teams.filter(id=team.id).exists():
            team.remove_member(self)
            return True
        return False
    
    def is_in_team(self, team):
        """Check if the employee is a member of a specific team"""
        return self.teams.filter(id=team.id).exists()
    
    def is_leader_of(self, team):
        """Check if the employee is the leader of a specific team"""
        return team.leader == self
    
    def get_team_colleagues(self):
        """Get all colleagues from all teams the employee is a member of"""
        colleague_ids = set()
        for team in self.get_teams():
            colleague_ids.update(team.members.exclude(id=self.id).values_list('id', flat=True))
        return Employee.objects.filter(id__in=colleague_ids)