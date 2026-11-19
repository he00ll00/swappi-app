# Swappi

Swappi is a Django-based prototype for discovering, creating, and swapping campus listings.

## Local setup

From the project directory in PowerShell:

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:DJANGO_SECRET_KEY = (python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
python manage.py migrate
python manage.py runserver
```

Open `http://127.0.0.1:8000/`. The project uses SQLite by default; `db.sqlite3` is local and is not committed.

Listings are currently sample data and browser-local drafts. The app does not yet persist listings or swap offers through Django models.
