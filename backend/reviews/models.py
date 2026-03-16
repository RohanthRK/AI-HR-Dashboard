from django.db import models
from employees.models import Employee

class PerformanceReview(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='performance_reviews')
    reviewer = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='conducted_reviews')
    review_period_start = models.DateField()
    review_period_end = models.DateField()
    due_date = models.DateField()
    completion_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('overdue', 'Overdue'),
    ], default='scheduled')
    
    # Performance scores
    technical_skills = models.PositiveSmallIntegerField(null=True, blank=True)
    communication = models.PositiveSmallIntegerField(null=True, blank=True)
    teamwork = models.PositiveSmallIntegerField(null=True, blank=True)
    leadership = models.PositiveSmallIntegerField(null=True, blank=True)
    initiative = models.PositiveSmallIntegerField(null=True, blank=True)
    overall_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    
    # Comments
    strengths = models.TextField(blank=True)
    areas_for_improvement = models.TextField(blank=True)
    goals = models.TextField(blank=True)
    employee_comments = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Review for {self.employee.user.first_name} {self.employee.user.last_name} - {self.review_period_end.year}"
