"""
Backup and restore of the whole HR database as JSON files (one per collection) - no mongodump needed.

    python backup.py dump backups/2026-10-25           writes <dir>/<Collection>.json for every collection
    python backup.py restore backups/2026-10-25 --yes  replaces the collections found in the folder

Uploaded files (the `media/` folder) are not part of the dump; copy that folder separately.
Restore REPLACES the contents of every collection that has a file in the folder, so it asks for --yes.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')


def _db():
    import django
    django.setup()
    from hr_backend.db import db
    return db


def dump(folder):
    from bson import json_util
    db = _db()
    os.makedirs(folder, exist_ok=True)
    counts = {}
    for name in sorted(db.list_collection_names()):
        if name == 'LoginAttempts' or name == 'RateLimits':
            continue                                    # transient security counters
        docs = list(db[name].find())
        with open(os.path.join(folder, f'{name}.json'), 'w', encoding='utf8') as f:
            f.write(json_util.dumps(docs, indent=1))
        counts[name] = len(docs)
    return counts


def restore(folder):
    from bson import json_util
    db = _db()
    counts = {}
    for filename in sorted(os.listdir(folder)):
        if not filename.endswith('.json'):
            continue
        name = filename[:-5]
        with open(os.path.join(folder, filename), encoding='utf8') as f:
            docs = json_util.loads(f.read())
        db[name].delete_many({})
        if docs:
            db[name].insert_many(docs)
        counts[name] = len(docs)
    return counts


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('action', choices=['dump', 'restore'])
    parser.add_argument('folder')
    parser.add_argument('--yes', action='store_true', help='confirm that restore may overwrite collections')
    args = parser.parse_args()
    if args.action == 'restore' and not args.yes:
        sys.exit('Restore overwrites collections; re-run with --yes to confirm.')
    result = dump(args.folder) if args.action == 'dump' else restore(args.folder)
    for name, n in result.items():
        print(f'{name}: {n}')
    print(f"{args.action} finished ({len(result)} collections)")
