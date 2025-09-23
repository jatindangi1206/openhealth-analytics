from flask import Flask, jsonify, request, abort
from flask_cors import CORS
import json
import os
from datetime import timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt
try:
    from backend.db import init_db, create_user, get_user_by_username, list_users, update_password_hash, delete_user
except ModuleNotFoundError:
    from db import init_db, create_user, get_user_by_username, list_users, update_password_hash, delete_user

app = Flask(__name__)
CORS(app)
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=12)
jwt = JWTManager(app)
init_db()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PROCESSED_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "processed_data"))
PROCESSED_DIR = os.environ.get("PROCESSED_DIR", DEFAULT_PROCESSED_DIR)

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        "message": "Health data API",
        "endpoints": ["POST /signup", "POST /login", "GET /api/my-data", "GET /health"]
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/signup', methods=['POST'])
def signup():
    payload = request.get_json(force=True, silent=True) or {}
    username = payload.get('username')
    password = payload.get('password')
    participant_id = payload.get('participant_id')
    if not username or not password or not participant_id:
        return jsonify({"message": "username, password, participant_id required"}), 400
    if get_user_by_username(username):
        return jsonify({"message": "username already exists"}), 409
    pw_hash = generate_password_hash(password)
    try:
        create_user(username, pw_hash, participant_id)
    except Exception as e:
        print("signup error", e)
        return jsonify({"message": "could not create user"}), 500
    # Assign admin role if username is 'admin'
    role = "admin" if username == 'admin' else "user"
    access_token = create_access_token(
        identity=username,
        additional_claims={"participant_id": participant_id, "role": role}
    )
    return jsonify({"token": access_token})


@app.route('/login', methods=['POST'])
def login():
    payload = request.get_json(force=True, silent=True) or {}
    username = payload.get('username')
    password = payload.get('password')
    user = get_user_by_username(username) if username else None
    if not user or not check_password_hash(user['password_hash'], password or ""):
        return jsonify({"message": "Invalid credentials"}), 401
    # Grant admin role to explicit admin username
    role = "admin" if user['username'] == 'admin' else "user"
    access_token = create_access_token(
        identity=user['username'],
        additional_claims={"participant_id": user['participant_id'], "role": role}
    )
    return jsonify({"token": access_token})

@app.route('/api/my-data', methods=['GET'])
@jwt_required()
def get_my_data():
    claims = get_jwt() or {}
    participant_id = claims.get('participant_id')
    try:
        file_path = os.path.abspath(os.path.join(PROCESSED_DIR, f"{participant_id}.json"))
        with open(file_path, 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        abort(404)
    except Exception as e:
        print(e)
        abort(500)

@app.route('/api/my-summary', methods=['GET'])
@jwt_required()
def get_my_summary():
    claims = get_jwt() or {}
    participant_id = claims.get('participant_id')
    try:
        file_path = os.path.abspath(os.path.join(PROCESSED_DIR, f"{participant_id}.json"))
        with open(file_path, 'r') as f:
            data = json.load(f)

        summary = {}

        bp = data.get('blood_pressure', {}).get('time_series', [])
        if bp:
            summary['blood_pressure_latest'] = bp[-1]

        hr = data.get('heart_rate', {}).get('time_series', [])
        if hr:
            summary['heart_rate_latest'] = hr[-1]

        sleep = data.get('sleep', {}).get('time_series', [])
        if sleep:
            summary['sleep_latest'] = sleep[-1]

        spo2 = data.get('spo2', {}).get('time_series', [])
        if spo2:
            summary['spo2_latest'] = spo2[-1]

        steps = data.get('steps', {}).get('time_series', [])
        if steps:
            summary['steps_latest'] = steps[-1]

        temp = data.get('temperature', {}).get('time_series', [])
        if temp:
            summary['temperature_latest'] = temp[-1]

        summary['lung_metrics'] = data.get('lung_function', {}).get('metrics', {})

        return jsonify(summary)
    except FileNotFoundError:
        abort(404)
    except Exception as e:
        print(e)
        abort(500)
@app.route('/admin/users', methods=['GET'])
@jwt_required()
def admin_list_users():
    claims = get_jwt() or {}
    if claims.get('role') != 'admin':
        return jsonify({"message": "forbidden"}), 403
    try:
        users = list_users()
        # Mark admin user in response
        for u in users:
            u["role"] = "admin" if u.get("username") == "admin" else "user"
        return jsonify({"users": users})
    except Exception as e:
        print("admin_list_users error", e)
        return jsonify({"message": "error listing users"}), 500


@app.route('/admin/users/reset-password', methods=['POST'])
@jwt_required()
def admin_reset_password():
    claims = get_jwt() or {}
    if claims.get('role') != 'admin':
        return jsonify({"message": "forbidden"}), 403
    payload = request.get_json(force=True, silent=True) or {}
    username = payload.get('username')
    new_password = payload.get('new_password')
    if not username or not new_password:
        return jsonify({"message": "username and new_password required"}), 400
    if username == 'admin' and not new_password:
        return jsonify({"message": "invalid request"}), 400
    if not get_user_by_username(username):
        return jsonify({"message": "user not found"}), 404
    try:
        pw_hash = generate_password_hash(new_password)
        update_password_hash(username, pw_hash)
        return jsonify({"message": "password updated"})
    except Exception as e:
        print("admin_reset_password error", e)
        return jsonify({"message": "error updating password"}), 500


@app.route('/admin/users/<username>', methods=['DELETE'])
@jwt_required()
def admin_delete_user(username):
    claims = get_jwt() or {}
    if claims.get('role') != 'admin':
        return jsonify({"message": "forbidden"}), 403
    if not username:
        return jsonify({"message": "username required"}), 400
    if username == 'admin':
        return jsonify({"message": "cannot delete admin"}), 400
    if not get_user_by_username(username):
        return jsonify({"message": "user not found"}), 404
    try:
        delete_user(username)
        return jsonify({"message": "user deleted"})
    except Exception as e:
        print("admin_delete_user error", e)
        return jsonify({"message": "error deleting user"}), 500

if __name__ == '__main__':
    # Initialize DB on startup when running directly
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5001)
