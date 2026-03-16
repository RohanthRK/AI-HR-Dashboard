from django.db import models
from django.conf import settings
from django.utils import timezone

# Create your models here.

class Department(models.Model): 
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class JobOpening(models.Model):
    title = models.CharField(max_length=200)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    location = models.CharField(max_length=150, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    required_skills = models.TextField(blank=True, null=True)  # Comma-separated skills
    required_experience = models.CharField(max_length=100, blank=True, null=True)
    required_education = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, default='active', choices=[
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('filled', 'Filled'),
    ])
    posted_date = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.title} ({self.department.name if self.department else 'N/A'})"

    class Meta:
        ordering = ['-posted_date']
