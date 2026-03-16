import os
import re

def fix_views_file():
    file_path = 'backend/ai_analytics/views.py'
    
    # Read the original file
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Fix SkillsTrendsView - indentation issue with skills_trends and return statement
    skills_trends_pattern = r'(\s+)skills_trends = \{\n(.*?)\n\s+\}\n\s+\n\s+return Response\(skills_trends\)\n\s+except'
    skills_trends_fix = r'\1skills_trends = {\n\2\n\1}\n\1\n\1return Response(skills_trends)\n\1except'
    content = re.sub(skills_trends_pattern, skills_trends_fix, content, flags=re.DOTALL)
    
    # Fix EmployeeInsightsView - indentation issue with if not employee block
    employee_pattern = r'if not employee:\n\s+return Response\(\n(\s+){"error": "Employee not found"},\n\s+status=status\.HTTP_404_NOT_FOUND\n\s+\)'
    employee_fix = r'if not employee:\n                return Response(\n\1{"error": "Employee not found"},\n                    status=status.HTTP_404_NOT_FOUND\n                )'
    content = re.sub(employee_pattern, employee_fix, content, flags=re.DOTALL)
    
    # Fix EmployeeInsightsView - except block indentation
    except_pattern = r'return Response\(employee_insights\)\n\s+\n\s+except Exception as e:'
    except_fix = r'return Response(employee_insights)\n        except Exception as e:'
    content = re.sub(except_pattern, except_fix, content, flags=re.DOTALL)
    
    # Write the fixed content to a new file
    fixed_file_path = 'backend/ai_analytics/views_fixed.py'
    with open(fixed_file_path, 'w') as f:
        f.write(content)
    
    print(f"Fixed file written to {fixed_file_path}")
    
    # Backup and replace
    os.rename(file_path, f"{file_path}.bak")
    os.rename(fixed_file_path, file_path)
    print(f"Original file backed up to {file_path}.bak and replaced with fixed version")

if __name__ == "__main__":
    fix_views_file() 