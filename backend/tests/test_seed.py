"""The demo company must be internally consistent, and the integrity checker must notice when it is not."""
import os
import shutil
import tempfile
import unittest

from django.test import override_settings

import check_data
import seed_data
from hr_backend.db import db, ensure_indexes


class SeededCompanyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        assert db.name.startswith('hr_test_'), 'refusing to seed a non-scratch database'
        cls.media = tempfile.mkdtemp()
        cls.override = override_settings(MEDIA_ROOT=cls.media)
        cls.override.enable()
        seed_data.main(['--yes', '--force'])

    @classmethod
    def tearDownClass(cls):
        cls.override.disable()
        shutil.rmtree(cls.media, ignore_errors=True)
        for name in db.list_collection_names():
            db.drop_collection(name)
        ensure_indexes()

    def test_everything_is_consistent(self):
        self.assertEqual(check_data.check(db, self.media), [])

    def test_headcount_teams_and_structure(self):
        active = list(db['Employees'].find({'employment_status': 'Active'}))
        self.assertEqual(len(active), 49)
        self.assertEqual(db['Employees'].count_documents({'employment_status': 'Terminated'}), 8)
        self.assertEqual(db['Teams'].count_documents({}), 12)
        self.assertTrue(all(e['team_id'] and e['department_id'] and e['user_id'] for e in active))
        self.assertEqual(sum(1 for e in active if not e['manager_id']), 1)   # only the CEO has no manager

    def test_every_area_has_data(self):
        for coll in ('Attendance', 'Leaves', 'Payroll', 'Reviews', 'Courses', 'TrainingAssignments',
                     'Surveys', 'Documents', 'Notifications'):
            self.assertGreater(db[coll].count_documents({}), 0, coll)

    def test_checker_detects_corruption(self):
        e = db['Employees'].find_one({'employment_status': 'Active', 'position': {'$ne': 'Chief Executive Officer'}})
        saved = dict(e)
        db['Employees'].update_one({'_id': e['_id']}, {'$set': {'team_id': '', 'team': ''}})
        self.assertTrue(check_data.check(db, self.media))
        db['Employees'].replace_one({'_id': e['_id']}, saved)

        doc = db['Documents'].find_one()
        path = os.path.join(self.media, doc['file_path'])
        os.rename(path, path + '.bak')
        self.assertTrue(check_data.check(db, self.media))
        os.rename(path + '.bak', path)
        self.assertEqual(check_data.check(db, self.media), [])
