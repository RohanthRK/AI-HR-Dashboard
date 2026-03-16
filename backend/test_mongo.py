from pymongo import MongoClient

try:
    client = MongoClient("mongodb://127.0.0.1:27017/", serverSelectionTimeoutMS=2000)
    client.server_info() # force connection
    db = client["hr_dashboard_db"]
    collections = db.list_collection_names()
    print("Collections:", collections)
except Exception as e:
    print("Error:", e)
