from rest_framework import serializers
from .models import Team, Project
from employees.models import Employee

class EmployeeBasicSerializer(serializers.ModelSerializer):
    """Simplified Employee serializer for nested representation"""
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = ['id', 'name', 'position', 'employee_id', 'email', 'phone_number']
    
    def get_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"
    
    def get_email(self, obj):
        return obj.user.email

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'status', 'start_date', 'end_date']

class TeamSerializer(serializers.ModelSerializer):
    leader = EmployeeBasicSerializer(read_only=True)
    members = EmployeeBasicSerializer(many=True, read_only=True)
    projects = ProjectSerializer(many=True, read_only=True)
    members_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Team
        fields = [
            'id', 'name', 'department', 'description', 
            'leader', 'members', 'members_count', 
            'projects', 'created_at', 'updated_at'
        ]

class TeamCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating teams"""
    leader_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        source='leader',
        required=False,
        allow_null=True
    )
    member_ids = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Team
        fields = ['id', 'name', 'department', 'description', 'leader_id', 'member_ids']
    
    def create(self, validated_data):
        members = validated_data.pop('member_ids', [])
        team = Team.objects.create(**validated_data)
        team.members.set(members)
        return team
    
    def update(self, instance, validated_data):
        members = validated_data.pop('member_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if members is not None:
            instance.members.set(members)
        
        return instance 