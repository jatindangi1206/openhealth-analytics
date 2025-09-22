from flask import Flask, jsonify, request, abort
from flask_cors import CORS
import json
import os
from backend.users import USERS

app = Flask(__name__)
CORS(app)
SESSIONS = {}
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PROCESSED_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "processed_data"))
PROCESSED_DIR = os.environ.get("PROCESSED_DIR", DEFAULT_PROCESSED_DIR)

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        "message": "Health data API",
        "endpoints": ["POST /login", "GET /api/my-data", "GET /health"]
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if username in USERS and USERS[username] == password:
        SESSIONS[username] = True
        return jsonify({"token": username, "message": "Login successful"})
    return jsonify({"message": "Invalid credentials"}), 401

@app.route('/api/my-data', methods=['GET'])
def get_my_data():
    token = request.headers.get('Authorization')
    if not token or token not in SESSIONS:
        abort(401)
    participant_id = token
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
def get_my_summary():
    token = request.headers.get('Authorization')
    if not token or token not in SESSIONS:
        abort(401)

    participant_id = token
    try:
        file_path = os.path.abspath(os.path.join(PROCESSED_DIR, f"{participant_id}.json"))
        with open(file_path, 'r') as f:
            data = json.load(f)

        summary = {}

        # Latest BP
        bp = data.get('blood_pressure', {}).get('time_series', [])
        if bp:
            summary['blood_pressure_latest'] = bp[-1]

        # Latest HR average
        hr = data.get('heart_rate', {}).get('time_series', [])
        if hr:
            summary['heart_rate_latest'] = hr[-1]

        # Latest sleep total
        sleep = data.get('sleep', {}).get('time_series', [])
        if sleep:
            summary['sleep_latest'] = sleep[-1]

        # Latest SpO2
        spo2 = data.get('spo2', {}).get('time_series', [])
        if spo2:
            summary['spo2_latest'] = spo2[-1]

        # Latest steps
        steps = data.get('steps', {}).get('time_series', [])
        if steps:
            summary['steps_latest'] = steps[-1]

        # Latest temperature
        temp = data.get('temperature', {}).get('time_series', [])
        if temp:
            summary['temperature_latest'] = temp[-1]

        # Lung metrics
        summary['lung_metrics'] = data.get('lung_function', {}).get('metrics', {})

        return jsonify(summary)
    except FileNotFoundError:
        abort(404)
    except Exception as e:
        print(e)
        abort(500)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
