#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Processors for health data pipeline.
Handles normalization, metrics computation, and statistical analysis.
"""

import pandas as pd
import numpy as np
import json
from typing import Dict, List, Any, Tuple, Union


def process_anthro_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Process anthropometric data with embedded JSON per row.

    Input schema example:
    - columns: createdAt (ms epoch), filledBy, data (JSON string) or parsed_data (dict)
    - data fields include height, weight, midArmCircumference, waistCircumference,
      hipCircumference, skinFoldBiceps, skinFoldSubscapular, gripStrengthLeft,
      gripStrengthRight; each contains {first, second, third}

    Output:
    - one row per entry with averaged values; also compute BMI if height/weight available
    - date column as pandas Timestamp
    """
    processed_rows: List[Dict[str, Any]] = []

    for _, row in df.iterrows():
        raw = row.get('parsed_data') if 'parsed_data' in df.columns else row.get('data')
        # Ensure raw is a dict
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except Exception:
                continue
        if not isinstance(raw, dict):
            continue

        created_at = row.get('createdAt')
        # createdAt in sample seems to be ms epoch; convert to seconds if needed
        if pd.isna(created_at):
            date_val = pd.NaT
        else:
            # if timestamp is too large, assume ms
            ts = int(created_at)
            if ts > 10_000_000_000:  # greater than ~Sat Nov 20 2286 in seconds
                date_val = pd.to_datetime(ts, unit='ms')
            else:
                date_val = pd.to_datetime(ts, unit='s')

        def avg_three(v: Any) -> float:
            if isinstance(v, dict):
                vals = [v.get('first'), v.get('second'), v.get('third')]
                vals = [x for x in vals if x is not None]
                return float(np.mean(vals)) if vals else np.nan
            return float(v) if v is not None else np.nan

        out: Dict[str, Any] = {
            'date': date_val,
            'height_cm': avg_three(raw.get('height')),
            'weight_kg': avg_three(raw.get('weight')),
            'mid_arm_circumference_cm': avg_three(raw.get('midArmCircumference')),
            'waist_circumference_cm': avg_three(raw.get('waistCircumference')),
            'hip_circumference_cm': avg_three(raw.get('hipCircumference')),
            'skinfold_biceps_mm': avg_three(raw.get('skinFoldBiceps')),
            'skinfold_subscapular_mm': avg_three(raw.get('skinFoldSubscapular')),
            'grip_strength_left_kg': avg_three(raw.get('gripStrengthLeft')),
            'grip_strength_right_kg': avg_three(raw.get('gripStrengthRight')),
            'filledBy': row.get('filledBy')
        }

        # Compute BMI (kg/m^2), height is in cm
        h_cm = out['height_cm']
        w_kg = out['weight_kg']
        if pd.notna(h_cm) and h_cm > 0 and pd.notna(w_kg):
            h_m = h_cm / 100.0
            out['bmi'] = w_kg / (h_m * h_m)
        else:
            out['bmi'] = np.nan

        processed_rows.append(out)

    result = pd.DataFrame(processed_rows)
    if 'date' in result.columns:
        result.sort_values('date', inplace=True)
    return result


def convert_unix_to_datetime(timestamp: int) -> pd.Timestamp:
    """
    Convert Unix timestamp to pandas Timestamp.
    
    Args:
        timestamp: Unix timestamp in seconds
        
    Returns:
        pandas Timestamp object
    """
    return pd.to_datetime(timestamp, unit='s')


def process_blood_pressure_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Process blood pressure data.
    
    Args:
        df: Raw blood pressure DataFrame
        
    Returns:
        Processed DataFrame with dates converted and columns selected
    """
    # Create a copy to avoid modifying the original
    processed = df.copy()
    
    # Convert Unix timestamp to datetime
    if 'logDate' in processed.columns:
        processed['date'] = processed['logDate'].apply(convert_unix_to_datetime)
    elif 'createdTime' in processed.columns:
        processed['date'] = processed['createdTime'].apply(convert_unix_to_datetime)
    else:
        # fallback: try first timestamp-like column
        ts_col = next((c for c in processed.columns if 'time' in c.lower() or 'date' in c.lower()), None)
        if ts_col:
            processed['date'] = processed[ts_col].apply(convert_unix_to_datetime)
    
    # Select and rename relevant columns
    keep = [c for c in ['date', 'systolic', 'diastolic', 'heartRate'] if c in processed.columns]
    result = processed[keep].copy()
    
    # Sort by date
    result.sort_values('date', inplace=True)
    
    return result


def process_heart_rate_sessions(data: List[Dict]) -> pd.DataFrame:
    """
    Process heart rate sessions data.
    
    Args:
        data: Raw heart rate sessions data
        
    Returns:
        Processed DataFrame with dates converted and columns selected
    """
    # Convert list of dictionaries to DataFrame
    records = []
    for session in data:
        record = {
            'date': convert_unix_to_datetime(session['group']),
            'averageHeartRate': session['averageSessionHeartRate'],
            'maxHeartRate': session['maxRate'],
            'minHeartRate': session['minRate']
        }
        records.append(record)
    
    df = pd.DataFrame(records)
    
    # Sort by date
    df.sort_values('date', inplace=True)
    
    return df


def process_sleep_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Process sleep data.
    
    Args:
        df: Raw sleep DataFrame
        
    Returns:
        Processed DataFrame with dates converted, columns selected, and total sleep calculated
    """
    # Create a copy to avoid modifying the original
    processed = df.copy()
    
    # Convert Unix timestamp to datetime
    processed['date'] = processed['logDate'].apply(convert_unix_to_datetime)
    
    # Select relevant columns
    result = processed[['date', 'lightSleep', 'deepSleep', 'remSleep', 'almostAwake']].copy()
    
    # Compute total sleep
    result['totalSleep'] = result['lightSleep'] + result['deepSleep'] + result['remSleep'] + result['almostAwake']
    
    # Sort by date
    result.sort_values('date', inplace=True)
    
    return result


def process_spo2_data(data: List[Dict]) -> pd.DataFrame:
    """
    Process SpO2 data.
    
    Args:
        data: Raw SpO2 data
        
    Returns:
        Processed DataFrame with dates converted and columns selected
    """
    # Convert list of dictionaries to DataFrame
    records = []
    for record in data:
        processed_record = {
            'date': convert_unix_to_datetime(record['logDate']),
            'spo2': record['spo2Value']
        }
        records.append(processed_record)
    
    df = pd.DataFrame(records)
    
    # Sort by date
    df.sort_values('date', inplace=True)
    
    return df


def process_steps_activity(df: pd.DataFrame) -> pd.DataFrame:
    """
    Process steps & activity data.
    
    Args:
        df: Raw steps & activity DataFrame
        
    Returns:
        Processed DataFrame with dates converted and columns selected
    """
    # Create a copy to avoid modifying the original
    processed = df.copy()
    
    # Convert Unix timestamp to datetime
    processed['date'] = processed['logDate'].apply(convert_unix_to_datetime)
    
    # Select relevant columns
    result = processed[['date', 'steps']].copy()
    
    # Sort by date
    result.sort_values('date', inplace=True)
    
    return result


def process_temperature_data(data: List[Dict]) -> pd.DataFrame:
    """
    Process temperature data.
    
    Args:
        data: Raw temperature data
        
    Returns:
        Processed DataFrame with dates converted and columns selected
    """
    # Convert list of dictionaries to DataFrame
    records = []
    for record in data:
        processed_record = {
            'date': convert_unix_to_datetime(record['logDate']),
            'temperature': record['temperature']
        }
        records.append(processed_record)
    
    df = pd.DataFrame(records)
    
    # Sort by date
    df.sort_values('date', inplace=True)
    
    return df


def process_meals_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Process meals data.
    
    Args:
        df: Raw meals DataFrame
        
    Returns:
        Processed DataFrame with dates converted and columns selected
    """
    # Create a copy to avoid modifying the original
    processed = df.copy()
    
    # Convert time to datetime; values are Unix seconds in supplied data
    if np.issubdtype(type(processed['time'].iloc[0]), np.integer) or np.issubdtype(processed['time'].dtype, np.number):
        processed['date'] = pd.to_datetime(processed['time'], unit='s')
    else:
        processed['date'] = pd.to_datetime(processed['time'], errors='coerce')
    
    # Select and rename relevant columns
    result = processed[['date', 'dish']].copy()
    
    # Sort by date
    result.sort_values('date', inplace=True)
    
    return result


def process_lung_function(df: pd.DataFrame) -> pd.DataFrame:
    """
    Process lung function data.
    
    Args:
        df: Raw lung function DataFrame
        
    Returns:
        Processed DataFrame with selected columns
    """
    # Create a copy to avoid modifying the original
    processed = df.copy()
    
    # Select relevant columns, rename for consistency
    result = processed[['FEV1', 'FEV1/FVC']].copy()
    result.rename(columns={'FEV1': 'fev1', 'FEV1/FVC': 'fev1_fvc'}, inplace=True)
    
    return result


def calculate_metrics(df: pd.DataFrame, value_cols: List[str]) -> Dict[str, Dict[str, float]]:
    """
    Calculate metrics (mean, median, std, count, min, max) for specified columns.
    
    Args:
        df: DataFrame containing the data
        value_cols: List of column names to calculate metrics for
        
    Returns:
        Dictionary mapping column names to metric dictionaries
    """
    metrics = {}
    
    for col in value_cols:
        if col in df.columns:
            metrics[col] = {
                'mean': df[col].mean(),
                'median': df[col].median(),
                'std': df[col].std(),
                'count': df[col].count(),
                'min': df[col].min(),
                'max': df[col].max()
            }
    
    return metrics


def calculate_moving_averages(df: pd.DataFrame, value_col: str, date_col: str = 'date', 
                             windows: List[int] = [7, 30]) -> pd.DataFrame:
    """
    Calculate moving averages for a time series.
    
    Args:
        df: DataFrame containing time series data
        value_col: Column name for the values
        date_col: Column name for the dates
        windows: List of window sizes for moving averages
    
    Returns:
        DataFrame with original values and moving averages
    """
    # Create a copy to avoid modifying the original
    result = df.copy()
    
    # Sort by date
    result.sort_values(date_col, inplace=True)
    
    # Calculate moving averages
    for window in windows:
        result[f'{value_col}_ma{window}'] = result[value_col].rolling(window=window, min_periods=1).mean()
    
    return result


def group_meals_by_date(df: pd.DataFrame) -> Dict[str, List[str]]:
    """
    Group meals by date.
    
    Args:
        df: Processed meals DataFrame
        
    Returns:
        Dictionary mapping dates to lists of dishes
    """
    # Format date as string
    df['date_str'] = df['date'].dt.strftime('%Y-%m-%d')
    
    # Group by date and collect dishes
    grouped = df.groupby('date_str')['dish'].apply(list).to_dict()
    
    return grouped


def process_all_data(raw_data: Dict[str, Union[pd.DataFrame, List]]) -> Dict[str, Any]:
    """
    Process all raw data into normalized and analyzed forms.
    
    Args:
        raw_data: Dictionary of raw data from different sources
        
    Returns:
        Dictionary of processed data with metrics and time series
    """
    processed_data = {}
    
    # Process anthropometric data
    if 'anthro' in raw_data:
        anthro_df = process_anthro_data(raw_data['anthro'])
        processed_data['anthro'] = {
            'time_series': anthro_df,
            'metrics': calculate_metrics(
                anthro_df,
                [
                    'height_cm',
                    'weight_kg',
                    'mid_arm_circumference_cm',
                    'waist_circumference_cm',
                    'hip_circumference_cm',
                    'skinfold_biceps_mm',
                    'skinfold_subscapular_mm',
                    'grip_strength_left_kg',
                    'grip_strength_right_kg',
                    'bmi'
                ]
            )
        }

    # Process blood pressure data
    if 'blood_pressure' in raw_data:
        bp_df = process_blood_pressure_data(raw_data['blood_pressure'])
        processed_data['blood_pressure'] = {
            'time_series': bp_df,
            'metrics': {**calculate_metrics(bp_df, ['systolic', 'diastolic'])},
            'moving_averages': {
                'systolic': calculate_moving_averages(bp_df, 'systolic') if 'systolic' in bp_df.columns else bp_df,
                'diastolic': calculate_moving_averages(bp_df, 'diastolic') if 'diastolic' in bp_df.columns else bp_df
            }
        }
    
    # Process heart rate data
    if 'heart_rate' in raw_data:
        hr_df = process_heart_rate_sessions(raw_data['heart_rate'])
        processed_data['heart_rate'] = {
            'time_series': hr_df,
            'metrics': calculate_metrics(hr_df, ['averageHeartRate', 'maxHeartRate', 'minHeartRate']),
            'moving_averages': calculate_moving_averages(hr_df, 'averageHeartRate')
        }
    
    # Process sleep data
    if 'sleep' in raw_data:
        sleep_df = process_sleep_data(raw_data['sleep'])
        processed_data['sleep'] = {
            'time_series': sleep_df,
            'metrics': calculate_metrics(sleep_df, ['lightSleep', 'deepSleep', 'remSleep','almostAwake' 'totalSleep']),
            'moving_averages': calculate_moving_averages(sleep_df, 'totalSleep')
        }
    
    # Process SpO2 data
    if 'spo2' in raw_data:
        spo2_df = process_spo2_data(raw_data['spo2'])
        processed_data['spo2'] = {
            'time_series': spo2_df,
            'metrics': calculate_metrics(spo2_df, ['spo2']),
            'moving_averages': calculate_moving_averages(spo2_df, 'spo2')
        }
    
    # Process steps data
    if 'steps' in raw_data:
        steps_df = process_steps_activity(raw_data['steps'])
        processed_data['steps'] = {
            'time_series': steps_df,
            'metrics': calculate_metrics(steps_df, ['steps']),
            'moving_averages': calculate_moving_averages(steps_df, 'steps')
        }
    
    # Process temperature data
    if 'temperature' in raw_data:
        temp_df = process_temperature_data(raw_data['temperature'])
        processed_data['temperature'] = {
            'time_series': temp_df,
            'metrics': calculate_metrics(temp_df, ['temperature']),
            'moving_averages': calculate_moving_averages(temp_df, 'temperature')
        }
    
    # Process meals data
    if 'meals' in raw_data:
        meals_df = process_meals_data(raw_data['meals'])
        processed_data['meals'] = {
            'time_series': meals_df,
            'by_date': group_meals_by_date(meals_df)
        }
    
    # Process lung function data
    if 'lung_function' in raw_data:
        lung_df = process_lung_function(raw_data['lung_function'])
        processed_data['lung_function'] = {
            'metrics': calculate_metrics(lung_df, ['fev1', 'fev1_fvc'])
        }
    
    return processed_data