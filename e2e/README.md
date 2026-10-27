# Browser (end-to-end) tests

Playwright drives a real browser through the main admin and employee flows against a **scratch database**
(`hr_e2e`, wiped by `seed.py`, which refuses to touch any other database).

```bash
pip install playwright && playwright install chromium     # or set PW_CHANNEL=msedge / chrome to use an installed browser

# 1. seed + start the API on a scratch DB
python e2e/seed.py          # run it with the backend's Python (it imports Django), e.g. backend/venv/Scripts/python.exe
cd backend && MONGODB_NAME=hr_e2e python manage.py runserver 8765 --noreload &

# 2. build the SPA against that API and serve it
cd frontend && REACT_APP_API_URL=http://localhost:8765 BUILD_PATH=../e2e/build npm run build
python e2e/spa_server.py e2e/build &

# 3. run the flows (exit code 1 on any failure or server error)
python e2e/flows.py

# 4. sweep every route on desktop and phone screens (JS errors, 5xx, horizontal scrolling)
python e2e/sweep.py
```

`MONGODB_URI` defaults to `mongodb://localhost:27017/`. Screenshots are written to `e2e/screenshots/`.
