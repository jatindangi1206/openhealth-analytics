import os
import json
from src.data_loaders import load_all_data
from src.processors import process_all_data

def df_to_records(obj):
    if isinstance(obj, dict):
        return {k: df_to_records(v) for k, v in obj.items()}
    elif hasattr(obj, "to_dict"):
        return obj.to_dict(orient="records")
    else:
        return obj

if __name__ == "__main__":
    base_input_dir = "input"
    output_dir = "processed_data"
    os.makedirs(output_dir, exist_ok=True)
    participants = [p for p in os.listdir(base_input_dir) if os.path.isdir(os.path.join(base_input_dir, p))]
    print(f"Found participants: {participants}")
    for participant_id in participants:
        print(f"Processing data for {participant_id}...")
        participant_input_dir = os.path.join(base_input_dir, participant_id)
        raw_data = load_all_data(participant_input_dir)
        processed_data = process_all_data(raw_data)
        processed_serializable = df_to_records(processed_data)
        output_file_path = os.path.join(output_dir, f"{participant_id}.json")
        with open(output_file_path, "w") as f:
            json.dump(processed_serializable, f, indent=2, default=str)
        print(f"Successfully exported data for {participant_id} to {output_file_path}")
