import React from "react";

const BUTTON_COLORS = {
  systolic: "#d52b1e",
  diastolic: "#e57373",
  heartRate: "#b71c1c",
  sleep: "#333",
  spo2: "#1976d2",
  steps: "#388e3c",
  temperature: "#fbc02d",
};

export default function Sidebar({ parameters, selected, setSelected }) {
  const handleClick = (key) => {
    setSelected((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
    );
  };

  return (
    <div className="sidebar-inner">
      <h3 className="sidebar-title">Trend Graphs</h3>
      <div className="sidebar-btn-group">
        {parameters.map((param) => (
          <button
            key={param.key}
            className={`sidebar-btn${
              selected.includes(param.key) ? " selected" : ""
            }`}
            style={{
              borderColor: selected.includes(param.key)
                ? BUTTON_COLORS[param.key]
                : "#eee",
              color: selected.includes(param.key) ? BUTTON_COLORS[param.key] : "#222",
              background: selected.includes(param.key) ? "#fff" : "#f8f8f8",
            }}
            onClick={() => handleClick(param.key)}
          >
            {param.label}
          </button>
        ))}
      </div>
    </div>
  );
}
