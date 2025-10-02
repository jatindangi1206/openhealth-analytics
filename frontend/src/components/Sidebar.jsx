import React from "react";

// Use consistent colors across all components
const BUTTON_COLORS = {
  systolic: "#d52b1e",
  diastolic: "#2563eb",
  heartRate: "#dc2626",
  sleep: "#7c3aed",
  spo2: "#0891b2",
  steps: "#ea580c",
  temperature: "#059669",
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
