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
    fetch("/api/my-data", { headers: { Authorization: token } })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch data');
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
        // Prepare meal timeline data
        const mealArr = [];
        if (raw.meals?.time_series) {
          // Group by date
          const byDay = {};
          raw.meals.time_series.forEach((row) => {
            const date = row.date.slice(0, 10);
            if (!byDay[date]) byDay[date] = [];
            byDay[date].push(row);
          });
          const dayKeys = Object.keys(byDay).sort();
          dayKeys.forEach((date, idx) => {
            byDay[date].forEach((meal) => {
              meal._dayIdx = idx;
              meal._dayLabel = getDayLabel(idx);
              meal._time = new Date(meal.date).getHours() + new Date(meal.date).getMinutes() / 60;
              meal._timeLabel = formatTime(meal.date);
            });
            mealArr.push(...byDay[date]);
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
                formatter={(value, name, props) => {
                  if (name === 'Time') return [props.payload._timeLabel, 'Time'];
                  if (name === 'dish') return [props.payload.dish, 'Dish'];
                  return value;
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0) {
                    return `${payload[0].payload._dayLabel}`;
                  }
                  return label;
                }}
              />
              <Scatter name="Meals" data={meals} fill="#805ad5">
                <LabelList dataKey="dish" position="right" />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
