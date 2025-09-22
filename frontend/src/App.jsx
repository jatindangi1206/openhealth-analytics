import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import ChartArea from "./components/ChartArea";
import BaselineOverview from "./components/BaselineOverview";
import Disclaimer from "./components/Disclaimer";
import Login from "./components/Login";
import "./App.css";

const PARAMETERS = [
  { key: "systolic", label: "Systolic Blood Pressure" },
  { key: "diastolic", label: "Diastolic Blood Pressure" },
  { key: "heartRate", label: "Heart Rate" },
  { key: "sleep", label: "Sleep" },
  { key: "spo2", label: "Blood Oxygen Saturation (SpO₂)" },
  { key: "steps", label: "Steps" },
  { key: "temperature", label: "Temperature" },
];

export default function App() {
  const [selected, setSelected] = useState(["systolic"]);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('auth_token');
    if (saved) setToken(saved);
  }, []);

  const onLogin = (t) => {
    setToken(t);
    localStorage.setItem('auth_token', t);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('auth_token');
  };

  return (
    <div className="app-outer">
      <header className="swiss-header">
        <div className="swiss-brand">
          <span>Koita Centre for Digital Health | Ashoka University</span>
        </div>
        {token && (
          <button onClick={logout} style={{ marginLeft: 'auto' }}>Logout</button>
        )}
      </header>
      <div className="app-container">
        {!token ? (
          <main className="main-content" style={{ width: '100%' }}>
            <Login onLogin={onLogin} />
          </main>
        ) : (
          <>
            <aside className="sidebar">
              <Sidebar
                parameters={PARAMETERS}
                selected={selected}
                setSelected={setSelected}
              />
            </aside>
            <main className="main-content">
              <h1 className="swiss-title">Personal Health Data Report</h1>
              <h2 className="swiss-subtitle">Trend Graphs</h2>
              <ChartArea selected={selected} token={token} />
              <BaselineOverview token={token} />
              <Disclaimer />
            </main>
          </>
        )}
      </div>
      <footer className="swiss-footer">
        <span>&copy; {new Date().getFullYear()} Koita Centre for Digital Health, Ashoka University. All rights reserved.</span>
      </footer>
    </div>
  );
}
