# Multi-User Health Data Processing and Secure Backend

This project processes health data for multiple participants and serves it securely via a Flask backend with authentication.
- `processed_data/` — Output JSON files per participant
- `src/` — Data loaders and processors (imported by processing script)
- `backend/` — Flask server and user store

## Usage

### 1. Prepare Input Data
Organize participant data in `input/participant-x/` folders.

### 2. Run Batch Processing
```
python export_health_data.py
```
This generates `processed_data/participant-x.json` files.

### 3. Start Backend Server
```
cd backend
pip install Flask Flask-Cors
python server.py
### 4. API Endpoints
### Seeding users

Run the seed script to create an admin account and import participants as users mapped by `participant_id`:

```
python scripts/seed_users.py
```

Environment variables (optional):

- `ADMIN_USERNAME` (default: `admin`)
- `ADMIN_PASSWORD` (default: `ChangeMeNow!`)
- `DEFAULT_USER_PASSWORD` (default: `password123` for participant users)
- `INPUT_DIR` (default: `./input`)

The script is idempotent and will skip users that already exist.
- `POST /login` — Authenticate with username/password
- `GET /api/my-data` — Get your processed data (requires Authorization header)

## Example Users

---

**Note:** This is a minimal demo. For production, use a real database and secure session/token management.
