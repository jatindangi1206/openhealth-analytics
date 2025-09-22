# Multi-User Health Data Processing and Secure Backend

This project processes health data for multiple participants and serves it securely via a Flask backend with authentication.

## Structure

- `input/` — Place participant folders here (e.g., `participant-1/`, `participant-2/`)
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
```

### 4. API Endpoints
- `POST /login` — Authenticate with username/password
- `GET /api/my-data` — Get your processed data (requires Authorization header)

## Example Users
See `backend/users.py` for sample credentials.

---

**Note:** This is a minimal demo. For production, use a real database and secure session/token management.
