# Personal Health Data Visualization Platform

This repository contains a full-stack application for processing, analyzing, and visualizing personal health data. The platform supports multiple participants, secure authentication, and interactive data visualization.

## Table of Contents
- [Project Overview](#project-overview)
- [Getting Started with Docker](#getting-started-with-docker)
- [Manual Setup](#manual-setup)
- [Data Format and Structure](#data-format-and-structure)
- [Adding New Participants](#adding-new-participants)
- [Authentication and User Management](#authentication-and-user-management)
- [API Endpoints](#api-endpoints)
- [Frontend Features](#frontend-features)
- [Development Guidelines](#development-guidelines)

## Project Overview

This application processes health data from various sources (heart rate, sleep, SpO2, steps, etc.), transforming raw data into structured JSON formats suitable for visualization. The platform includes:

- **Data Processing Pipeline**: Python scripts to transform and normalize raw health data
- **Secure Backend API**: Flask server with JWT authentication
- **Interactive Frontend**: React application with responsive visualizations using Recharts
- **Multi-participant Support**: Data segmentation and access controls by participant
- **Docker Integration**: Containerized deployment for both development and production

## Getting Started with Docker

The easiest way to run the application is with Docker:

### Prerequisites
- Docker and Docker Compose installed on your system
- Input data (see [Data Format and Structure](#data-format-and-structure))

### Running the Application

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd digital-koita
   ```

2. **Build Docker images**:
   ```bash
   docker compose build
   ```

3. **Start the services**:
   ```bash
   docker compose up -d
   ```

4. **Process initial data** (only needed once):
   ```bash
   docker compose run --rm preprocess
   ```

5. **Create initial users** (only needed once):
   ```bash
   docker compose exec backend python /app/scripts/seed_users.py
   ```

6. **Access the application**:
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:5000

7. **Default login credentials**:
   - Admin: username `admin`, password `ChangeMeNow!`
   - Participants: username matches folder name, password `password123`

### Docker Commands Reference

- **Start all services**:
  ```bash
  docker compose up -d
  ```

- **Stop all services**:
  ```bash
  docker compose down
  ```

- **View logs**:
  ```bash
  docker compose logs -f backend  # backend logs
  docker compose logs -f frontend  # frontend logs
  ```

- **Re-process data**:
  ```bash
  docker compose run --rm preprocess
  ```

## Manual Setup

If you prefer to run the application without Docker:

### Backend Setup

1. **Set up a Python virtual environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Process data**:
   ```bash
   python export_health_data.py
   ```

4. **Create users**:
   ```bash
   python scripts/seed_users.py
   ```

5. **Run the backend server**:
   ```bash
   cd backend
   python server.py
   ```

### Frontend Setup

1. **Install Node.js dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

## Data Format and Structure

The application expects data to be organized in the following structure:

```
input/
  participant-1/
    lungs_data/
      spirometry.csv
    meals_data/
      Combined Meals Data.csv
    physio_data/
      bp_*.csv
      heartrate_*.json
      sleep_*.csv
      spo2_*.json
      steps_*.csv
      temperature_*.json
  participant-2/
    ...
```

### Supported Data Types

- **Blood Pressure**: CSV files with columns for systolic and diastolic readings
- **Heart Rate**: JSON files with average heart rate data
- **Sleep**: CSV files with sleep duration and stages
- **SpO2**: JSON files with oxygen saturation readings
- **Steps**: CSV files with step count data
- **Temperature**: JSON files with body temperature readings
- **Lung Function**: CSV files with spirometry data
- **Meals**: CSV files with food consumption data

## Adding New Participants

To add a new participant:

1. **Create a folder** in the `input/` directory following the naming convention `participant-X` where X is a unique identifier

2. **Add the participant's data** in the appropriate subfolders (see [Data Format and Structure](#data-format-and-structure))

3. **Process the data**:
   ```bash
   # With Docker:
   docker compose run --rm preprocess
   
   # Without Docker:
   python export_health_data.py
   ```

4. **Create a user account** for the new participant:
   ```bash
   # With Docker:
   docker compose exec backend python /app/scripts/seed_users.py
   
   # Without Docker:
   python scripts/seed_users.py
   ```

## Authentication and User Management

The application uses JWT (JSON Web Token) authentication with the following user types:

- **Admin**: Can view all participant data and manage users
- **Participant**: Can only view their own data

### User Management

Administrators can:
- View all registered users
- Reset user passwords
- Delete users

## API Endpoints

- **Authentication**:
  - `POST /signup`: Register a new user
  - `POST /login`: Authenticate a user and receive a JWT token

- **Data Access**:
  - `GET /api/my-data`: Get the authenticated user's health data
  - `GET /api/users`: (Admin only) Get a list of all users

- **User Management**:
  - `PUT /api/users/<username>/password`: (Admin only) Reset a user's password
  - `DELETE /api/users/<username>`: (Admin only) Delete a user

## Frontend Features

- **Authentication**: Secure login and session management
- **Dashboard**: Overview of health metrics with interactive charts
- **Chart Customization**: Select metrics to display and toggle chart types
- **Admin Panel**: User management for administrators
- **Responsive Design**: Works on desktop and mobile devices

## Development Guidelines

### Code Structure

- `backend/`: Flask server and authentication
- `frontend/`: React application and visualizations
- `src/`: Data processing modules
- `scripts/`: Utility scripts for setup and maintenance
- `input/`: Raw participant data (gitignored)
- `processed_data/`: Generated JSON output (gitignored)

### Adding New Data Types

To add support for new types of health data:

1. Add a loader function in `src/data_loaders.py`
2. Add a processor function in `src/processors.py`
3. Update the pipeline in `export_health_data.py`
4. Add visualization components in the frontend

### Security Considerations

- JWT tokens expire after 12 hours
- Passwords are securely hashed using Werkzeug's password hashing
- Each participant can only access their own data
- API endpoints are protected with appropriate authentication

**Note:** This is a demo application. For production use, consider implementing additional security measures and using a proper database.
