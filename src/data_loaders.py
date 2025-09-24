#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Data loaders for health data pipeline.
Handles loading CSV and JSON files from structured folders.
"""

import os
import json
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any, Optional, Union


def load_blood_pressure_csv(file_path: str) -> pd.DataFrame:
    """
    Load blood pressure CSV file and perform initial formatting.
    
    Args:
        file_path: Path to the blood pressure CSV file
        
    Returns:
        DataFrame with blood pressure data
    """
    df = pd.read_csv(file_path)
    return df


def load_heart_rate_sessions_json(file_path: str) -> List[Dict[str, Any]]:
    """
    Load heart rate sessions JSON file.
    
    Args:
        file_path: Path to the heart rate sessions JSON file
        
    Returns:
        List of heart rate session records
    """
    with open(file_path, 'r') as f:
        data = json.load(f)
    return data


def load_sleep_data_csv(file_path: str) -> pd.DataFrame:
    """
    Load sleep data CSV file.
    
    Args:
        file_path: Path to the sleep data CSV file
        
    Returns:
        DataFrame with sleep data
    """
    df = pd.read_csv(file_path)
    return df


def load_spo2_data_json(file_path: str) -> List[Dict[str, Any]]:
    """
    Load SpO2 data JSON file.
    
    Args:
        file_path: Path to the SpO2 data JSON file
        
    Returns:
        List of SpO2 records
    """
    with open(file_path, 'r') as f:
        data = json.load(f)
    return data


def load_steps_activity_csv(file_path: str) -> pd.DataFrame:
    """
    Load steps & activity CSV file.
    
    Args:
        file_path: Path to the steps & activity CSV file
        
    Returns:
        DataFrame with steps & activity data
    """
    df = pd.read_csv(file_path)
    return df


def load_temperature_data_json(file_path: str) -> List[Dict[str, Any]]:
    """
    Load temperature data JSON file.
    
    Args:
        file_path: Path to the temperature data JSON file
        
    Returns:
        List of temperature records
    """
    with open(file_path, 'r') as f:
        data = json.load(f)
    return data


def load_meals_data_csv(file_path: str) -> pd.DataFrame:
    """
    Load meals data CSV file.
    
    Args:
        file_path: Path to the meals data CSV file
        
    Returns:
        DataFrame with meals data
    """
    df = pd.read_csv(file_path)
    return df


def load_lung_function_csv(file_path: str) -> pd.DataFrame:
    """
    Load lung function CSV file.
    
    Args:
        file_path: Path to the lung function CSV file
        
    Returns:
        DataFrame with lung function data
    """
    df = pd.read_csv(file_path)
    return df


def load_anthro_data_csv(file_path: str) -> pd.DataFrame:
    """
    Load anthropometric data CSV file with embedded JSON data.
    
    Args:
        file_path: Path to the anthropometric data CSV file
        
    Returns:
        DataFrame with anthropometric data
    """
    df = pd.read_csv(file_path)
    
    # Parse JSON data in the 'data' column
    if 'data' in df.columns:
        df['parsed_data'] = df['data'].apply(json.loads)
    
    return df


def discover_input_files(base_dir: str) -> Dict[str, str]:
    """
    Discover all input files in the structured folder system.
    
    Args:
        base_dir: Base directory containing input folders
        
    Returns:
        Dictionary mapping data types to file paths
    """
    input_files = {}
    
    # Anthropometric data (expected single CSV)
    anthro_dir = os.path.join(base_dir, "anthro_data")
    if os.path.exists(anthro_dir):
        csv_files = [f for f in os.listdir(anthro_dir) if f.endswith('.csv')]
        if csv_files:
            input_files["anthro"] = os.path.join(anthro_dir, csv_files[0])

    # Lung data (expected single CSV)
    lungs_dir = os.path.join(base_dir, "lungs_data")
    if os.path.exists(lungs_dir):
        csv_files = [f for f in os.listdir(lungs_dir) if f.endswith('.csv')]
        if csv_files:
            input_files["lung_function"] = os.path.join(lungs_dir, csv_files[0])
    
    # Meals data (expected single CSV)
    meals_dir = os.path.join(base_dir, "meals_data")
    if os.path.exists(meals_dir):
        csv_files = [f for f in os.listdir(meals_dir) if f.endswith('.csv')]
        if csv_files:
            input_files["meals"] = os.path.join(meals_dir, csv_files[0])
    
    # Physio data (multiple files)
    physio_dir = os.path.join(base_dir, "physio_data")
    if os.path.exists(physio_dir):
        # Blood Pressure (CSV) — support names like 'bp_*.csv' or containing 'blood_pressure'
        bp_files = [
            f for f in os.listdir(physio_dir)
            if f.lower().endswith('.csv') and (f.lower().startswith('bp_') or 'blood_pressure' in f.lower())
        ]
        if bp_files:
            input_files["blood_pressure"] = os.path.join(physio_dir, bp_files[0])
        
        # Heart Rate Sessions (JSON) — support 'heartrate_*.json' or containing 'heart_rate'
        hr_files = [
            f for f in os.listdir(physio_dir)
            if f.lower().endswith('.json') and ('heart_rate' in f.lower() or 'heartrate' in f.lower())
        ]
        if hr_files:
            input_files["heart_rate"] = os.path.join(physio_dir, hr_files[0])
        
        # Sleep (CSV)
        sleep_files = [f for f in os.listdir(physio_dir) if "sleep" in f.lower() and f.endswith('.csv')]
        if sleep_files:
            input_files["sleep"] = os.path.join(physio_dir, sleep_files[0])
        
        # SpO₂ (JSON)
        spo2_files = [f for f in os.listdir(physio_dir) if "spo2" in f.lower() and f.endswith('.json')]
        if spo2_files:
            input_files["spo2"] = os.path.join(physio_dir, spo2_files[0])
        
        # Steps & Activity (CSV)
        steps_files = [f for f in os.listdir(physio_dir) if "steps" in f.lower() and f.endswith('.csv')]
        if steps_files:
            input_files["steps"] = os.path.join(physio_dir, steps_files[0])
        
        # Temperature (JSON)
        temp_files = [f for f in os.listdir(physio_dir) if "temperature" in f.lower() and f.endswith('.json')]
        if temp_files:
            input_files["temperature"] = os.path.join(physio_dir, temp_files[0])
    
    return input_files


def load_all_data(input_dir: str) -> Dict[str, Union[pd.DataFrame, List]]:
    """
    Load all data files from the input directory.
    
    Args:
        input_dir: Input directory containing structured folders
        
    Returns:
        Dictionary mapping data types to loaded data
    """
    file_paths = discover_input_files(input_dir)
    loaded_data = {}
    
    if "anthro" in file_paths:
        loaded_data["anthro"] = load_anthro_data_csv(file_paths["anthro"])

    # Load each file based on its type
    if "blood_pressure" in file_paths:
        loaded_data["blood_pressure"] = load_blood_pressure_csv(file_paths["blood_pressure"])
    
    if "heart_rate" in file_paths:
        loaded_data["heart_rate"] = load_heart_rate_sessions_json(file_paths["heart_rate"])
    
    if "sleep" in file_paths:
        loaded_data["sleep"] = load_sleep_data_csv(file_paths["sleep"])
    
    if "spo2" in file_paths:
        loaded_data["spo2"] = load_spo2_data_json(file_paths["spo2"])
    
    if "steps" in file_paths:
        loaded_data["steps"] = load_steps_activity_csv(file_paths["steps"])
    
    if "temperature" in file_paths:
        loaded_data["temperature"] = load_temperature_data_json(file_paths["temperature"])
    
    if "meals" in file_paths:
        loaded_data["meals"] = load_meals_data_csv(file_paths["meals"])
    
    if "lung_function" in file_paths:
        loaded_data["lung_function"] = load_lung_function_csv(file_paths["lung_function"])
    
    return loaded_data