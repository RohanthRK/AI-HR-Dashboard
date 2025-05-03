from django.contrib import admin
from .models import Team, Project

class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'department', 'leader', 'members_count', 'created_at')
    search_fields = ('name', 'department', 'leader__user__first_name', 'leader__user__last_name')
    list_filter = ('department', 'created_at')
    filter_horizontal = ('members',)
    readonly_fields = ('created_at', 'updated_at')
    
    def members_count(self, obj):
        return obj.members.count()
    members_count.short_description = 'Members'

class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'team', 'status', 'start_date', 'end_date')
    search_fields = ('name', 'team__name', 'description')
    list_filter = ('status', 'team', 'start_date', 'end_date')
    readonly_fields = ('created_at', 'updated_at')

admin.site.register(Team, TeamAdmin)
admin.site.register(Project, ProjectAdmin) 