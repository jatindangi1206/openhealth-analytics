import React, { useEffect, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";

const ALL_KEYS = [
  "systolic",
  "diastolic",
  "heartRate",
  "sleep",
  "spo2",
  "steps",
  "temperature",
];

const LABELS = {
  systolic: "Systolic BP",
  diastolic: "Diastolic BP",
  heartRate: "Heart Rate",
  sleep: "Sleep (hrs)",
  spo2: "SpO₂ (%)",
  steps: "Steps",
  temperature: "Temperature (°C)",
};

function getStats(data, key) {
  const values = data.map((d) => d[key]).filter((v) => v !== undefined && v !== null);
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  return { min, max, median };
}

// Helper to format time as HH:MM
function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper to get day label
function getDayLabel(idx) {
  return `Day ${idx + 1}`;
}

export default function BaselineOverview({ token }) {
  const [data, setData] = useState([]);
  const [meals, setMeals] = useState([]); // array of { day, time, dish }
  useEffect(() => {
    if (!token) return;
  fetch("/api/my-data", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) return res.text().then(t => { throw new Error(`Failed to fetch data (${res.status}). ${t || ''}`.trim()); });
        return res.json();
      })
      .then((raw) => {
        // Merge all time series by date (same as ChartArea)
        const dateMap = {};
        if (raw.blood_pressure?.time_series) {
          raw.blood_pressure.time_series.forEach((d) => {
            const date = d.date.slice(0, 10);
            if (!dateMap[date]) dateMap[date] = { date };
            dateMap[date].systolic = d.systolic;
            dateMap[date].diastolic = d.diastolic;
          });
        }
        if (raw.heart_rate?.time_series) {
          raw.heart_rate.time_series.forEach((d) => {
            const date = d.date.slice(0, 10);
            if (!dateMap[date]) dateMap[date] = { date };
            dateMap[date].heartRate = d.averageHeartRate;
          });
        }
        if (raw.sleep?.time_series) {
          raw.sleep.time_series.forEach((d) => {
            const date = d.date.slice(0, 10);
            if (!dateMap[date]) dateMap[date] = { date };
            dateMap[date].sleep = d.totalSleep;
          });
        }
        if (raw.spo2?.time_series) {
          raw.spo2.time_series.forEach((d) => {
            const date = d.date.slice(0, 10);
            if (!dateMap[date]) dateMap[date] = { date };
            dateMap[date].spo2 = d.spo2;
          });
        }
        if (raw.steps?.time_series) {
          raw.steps.time_series.forEach((d) => {
            const date = d.date.slice(0, 10);
            if (!dateMap[date]) dateMap[date] = { date };
            dateMap[date].steps = d.steps;
          });
        }
        if (raw.temperature?.time_series) {
          raw.temperature.time_series.forEach((d) => {
            const date = d.date.slice(0, 10);
            if (!dateMap[date]) dateMap[date] = { date };
            dateMap[date].temperature = d.temperature;
          });
        }
        setData(Object.values(dateMap));
        // Prepare meal timeline data (robust to different keys)
        const mealArr = [];
        if (raw.meals?.time_series && Array.isArray(raw.meals.time_series)) {
          const safeParseTime = (row) => {
            if (row.date) {
              const d = new Date(row.date);
              if (!isNaN(d)) return { d, label: formatTime(row.date) };
            }
            const dateStr = row.date_str || row.dateString || row.dateISO || row.date;
            const timeStr = row.time_str || row.timeString || row.time || null;
            let d;
            if (dateStr && timeStr && typeof timeStr === 'string') {
              // Combine date + time string
              d = new Date(`${dateStr} ${timeStr}`);
              if (!isNaN(d)) return { d, label: formatTime(d.toISOString()) };
            }
            if (dateStr) {
              d = new Date(dateStr);
              if (!isNaN(d)) {
                // Default to noon if time missing
                d.setHours(12, 0, 0, 0);
                return { d, label: formatTime(d.toISOString()) };
              }
            }
            return null;
          };

          const getDateKey = (row) => {
            const src = row.date || row.date_str || row.dateString || row.dateISO;
            if (src && typeof src === 'string') return src.slice(0, 10);
            const parsed = safeParseTime(row);
            if (parsed) return parsed.d.toISOString().slice(0, 10);
            return null;
          };

          const byDay = {};
          raw.meals.time_series.forEach((row) => {
            const dayKey = getDateKey(row);
            if (!dayKey) return; // skip unparsable
            if (!byDay[dayKey]) byDay[dayKey] = [];
            byDay[dayKey].push(row);
          });

          const dayKeys = Object.keys(byDay).sort();
          dayKeys.forEach((dayKey, idx) => {
            byDay[dayKey].forEach((meal) => {
              const parsed = safeParseTime(meal);
              if (!parsed) return; // skip if still invalid
              const hours = parsed.d.getHours() + parsed.d.getMinutes() / 60;
              const dish = meal.dish || meal.item || meal.name || meal.meal || meal.description || 'Meal';
              meal._dayIdx = idx;
              meal._dayLabel = getDayLabel(idx);
              meal._time = hours;
              meal._timeLabel = parsed.label;
              meal.dish = dish;
            });
            mealArr.push(...byDay[dayKey]);
          });
        }
        setMeals(mealArr);
      })
      .catch((e) => {
        console.error('Baseline fetch error', e);
      });
  }, [token]);

  return (
    <div className="baseline-overview">
      <style jsx>{`
        .custom-meal-tooltip {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          min-width: 180px;
        }
        .meal-tooltip-header {
          font-weight: 600;
          font-size: 14px;
          color: #4a5568;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid #edf2f7;
        }
        .meal-tooltip-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .meal-tooltip-item {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
        .meal-tooltip-label {
          color: #718096;
          font-weight: 500;
          margin-right: 8px;
        }
        .meal-tooltip-value {
          color: #2d3748;
          font-weight: 600;
        }
      `}</style>
      <h3>Health Baseline Overview</h3>
      <div className="baseline-blocks">
        {ALL_KEYS.map((key) => {
          const stats = getStats(data, key);
          if (!stats) return null;
          return (
            <div className="baseline-block" key={key}>
              <div className="baseline-title">{LABELS[key]}</div>
              <div className="baseline-median">Median: <b>{stats.median}</b></div>
              <div className="baseline-minmax">
                <span>Min: {stats.min}</span> | <span>Max: {stats.max}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="meals-section" style={{marginTop: '2rem'}}>
        <h3>Food Data (Meals Timeline)</h3>
        {meals.length === 0 ? (
          <div>No meal data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <XAxis
                type="category"
                dataKey="_dayLabel"
                name="Day"
                allowDuplicatedCategory={false}
              />
              <YAxis
                type="number"
                dataKey="_time"
                name="Time"
                domain={[0, 24]}
                tickFormatter={(h) => `${Math.floor(h)}:${(h % 1 * 60).toString().padStart(2, '0')}`}
                label={{ value: 'Time of Day', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="custom-meal-tooltip">
                        <div className="meal-tooltip-header">{data._dayLabel}</div>
                        <div className="meal-tooltip-content">
                          <div className="meal-tooltip-item">
                            <span className="meal-tooltip-label">Dish:</span>
                            <span className="meal-tooltip-value">{data.dish}</span>
                          </div>
                          <div className="meal-tooltip-item">
                            <span className="meal-tooltip-label">Time:</span>
                            <span className="meal-tooltip-value">{data._timeLabel}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter 
                name="Meals" 
                data={meals} 
                fill="#805ad5"
                shape={(props) => (
                  <circle 
                    cx={props.cx} 
                    cy={props.cy} 
                    r={6}
                    fill="#805ad5"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                )}
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
