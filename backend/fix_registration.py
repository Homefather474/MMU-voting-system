"""
Run this to fix voter registration - allows registration during voting phase too.
Usage: python fix_registration.py
"""
import os

views_path = os.path.join(os.path.dirname(__file__), 'voting', 'views.py')

with open(views_path, 'r') as f:
    content = f.read()

old = "if election.status != 'registration':"
new = "if election.status not in ['registration', 'voting']:"

if old in content:
    content = content.replace(old, new)
    with open(views_path, 'w') as f:
        f.write(content)
    print("FIXED: Voter registration now allowed during both registration AND voting phases")
else:
    if new in content:
        print("Already fixed!")
    else:
        print("Could not find the line to fix. Check voting/views.py manually.")
