"""
Script to fix incorrect import statements in the project
"""
import os
import re

def fix_imports_in_file(file_path):
    """
    Fix import statements in a Python file
    """
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Replace 'from utils' with 'from utils'
    updated_content = re.sub(r'from\s+backend\.utils', 'from utils', content)
    
    # Replace other problematic imports if needed
    # updated_content = re.sub(r'from\s+some\.wrong\.path', 'from correct.path', updated_content)
    
    if content != updated_content:
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(updated_content)
        print(f"Fixed imports in {file_path}")
        return True
    return False

def walk_dir(directory):
    """
    Walk through all Python files in a directory and fix imports
    """
    files_fixed = 0
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                if fix_imports_in_file(file_path):
                    files_fixed += 1
    
    return files_fixed

if __name__ == "__main__":
    # Start from the current directory (project root)
    project_root = os.path.dirname(os.path.abspath(__file__))
    
    print(f"Fixing imports in {project_root}...")
    files_fixed = walk_dir(project_root)
    
    print(f"Fixed imports in {files_fixed} files.")
    print("Done!") 