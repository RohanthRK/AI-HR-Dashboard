import os
import sys

sys.path.append(r'c:\Users\mt24055\Desktop\WorkArea\projects\HR-app\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')

import django
django.setup()

from hr_backend.db import db
info = db.command('listCollections', filter={'name': 'Attendance'})
col_info = info['cursor']['firstBatch']
if col_info:
    options = col_info[0].get('options', {})
    import json
    print(json.dumps(options, indent=2, default=str))
else:
    print("Collection not found")
