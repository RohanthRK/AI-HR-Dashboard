from django.db import models
from django.utils import timezone
from employees.models import Employee
from employees.departments import is_valid_department

class Team(models.Model):
    name = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    leader = models.ForeignKey(
        Employee, 
        related_name='team_leader',
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    members = models.ManyToManyField(
        Employee,
        related_name='teams',
        blank=True
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # Validate department before saving
        if self.department and not is_valid_department(self.department):
            raise ValueError(f"'{self.department}' is not a valid department.")
        super().save(*args, **kwargs)
    
    @property
    def members_count(self):
        """Get the number of team members"""
        return self.members.count()
    
    def add_member(self, employee):
        """Add an employee to the team"""
        self.members.add(employee)
        
    def remove_member(self, employee):
        """Remove an employee from the team"""
        self.members.remove(employee)
        
    def is_member(self, employee):
        """Check if an employee is a member of the team"""
        return self.members.filter(id=employee.id).exists()

class Project(models.Model):
    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('on_hold', 'On Hold'),
        ('canceled', 'Canceled'),
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    team = models.ForeignKey(
        Team,
        related_name='projects',
        on_delete=models.CASCADE
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='planning'
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name 