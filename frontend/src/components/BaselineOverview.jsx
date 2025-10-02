import React, { useEffect, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const ANTHRO_LABELS = {
  height_cm: "Height",
  weight_kg: "Weight",
  bmi: "BMI",
  waist_circumference_cm: "Waist",
  hip_circumference_cm: "Hip",
  mid_arm_circumference_cm: "Mid-Arm",
  grip_strength_left_kg: "Grip Left",
  grip_strength_right_kg: "Grip Right",
};

const ANTHRO_UNITS = {
  height_cm: "cm",
  weight_kg: "kg",
  bmi: "",
  waist_circumference_cm: "cm",
  hip_circumference_cm: "cm",
  mid_arm_circumference_cm: "cm",
  grip_strength_left_kg: "kg",
  grip_strength_right_kg: "kg",
};

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
  const [anthro, setAnthro] = useState(null);
  const [lungMetrics, setLungMetrics] = useState(null);
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
        // Anthropometrics
        if (raw.anthro) {
          const m = raw.anthro.metrics || {};
          const latest = Array.isArray(raw.anthro.time_series) && raw.anthro.time_series.length > 0
            ? raw.anthro.time_series[raw.anthro.time_series.length - 1]
            : {};
          const val = (k) => (m[k]?.mean ?? latest?.[k] ?? null);
          setAnthro({
            height_cm: val('height_cm'),
            weight_kg: val('weight_kg'),
            bmi: val('bmi'),
            waist_circumference_cm: val('waist_circumference_cm'),
            hip_circumference_cm: val('hip_circumference_cm'),
            mid_arm_circumference_cm: val('mid_arm_circumference_cm'),
            grip_strength_left_kg: val('grip_strength_left_kg'),
            grip_strength_right_kg: val('grip_strength_right_kg'),
            filledBy: latest?.filledBy || null,
            date: latest?.date || null,
          });
        } else {
          setAnthro(null);
        }
        // Lung function metrics
        if (raw.lung_function && raw.lung_function.metrics) {
          setLungMetrics(raw.lung_function.metrics);
        } else {
          setLungMetrics(null);
        }
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
        .baseline-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .baseline-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: #d52b1e;
        }
        .anthro-section {
          margin: 1rem 0 1.5rem;
        }
        .anthro-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }
        .anthro-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #d52b1e;
        }
        .anthro-subtle {
          color: #6b7280;
          font-size: 0.875rem;
        }
        .anthro-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 0.75rem;
        }
        .anthro-card {
          background: linear-gradient(145deg, #ffffff 0%, #f9fafb 100%);
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
          position: relative;
          overflow: hidden;
        }
        .anthro-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #d52b1e 0%, #ff5252 50%, #d52b1e 100%);
        }
        .anthro-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .05em;
          color: #6b7280;
          margin-bottom: 6px;
        }
        .anthro-value {
          font-size: 1.25rem;
          font-weight: 800;
          color: #1f2937;
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .anthro-unit {
          font-size: 0.8rem;
          color: #9ca3af;
          font-weight: 600;
        }
        .anthro-footnote {
          font-size: 0.72rem;
          color: #6b7280;
          margin-top: 4px;
        }
        .lung-section {
          margin: 0.25rem 0 1.5rem;
        }
        .lung-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #d52b1e;
          margin-bottom: 0.75rem;
        }
        .lung-cards {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .lung-metric-card {
          background: #f9fafb;
          border-radius: 12px;
          padding: 16px 18px;
          min-width: 220px;
          box-shadow: 0 2px 8px #0001;
          border: 1px solid #e5e7eb;
        }
        .lung-metric-title { font-weight: 700; color: #d52b1e; margin-bottom: 4px; }
        .lung-metric-value { font-size: 22px; font-weight: 800; }
        .lung-metric-range { font-size: 13px; color: #666; margin-top: 2px; }
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
      
      {/* Anthropometrics */}
      {anthro && (
        <div className="anthro-section">
          <div className="anthro-header">
            <div className="anthro-title">Anthropometrics Data</div>
          </div>
          <div className="anthro-grid">
            {[
              'height_cm',
              'weight_kg',
              'bmi',
              'waist_circumference_cm',
              'hip_circumference_cm',
              'mid_arm_circumference_cm',
              'grip_strength_left_kg',
              'grip_strength_right_kg',
            ].map((k) => {
              const val = anthro?.[k];
              const display = typeof val === 'number' ? (k === 'bmi' ? val.toFixed(1) : val.toFixed(1)) : '--';
              const unit = ANTHRO_UNITS[k] || '';
              
              return (
                <div key={k} className="anthro-card">
                  <div className="anthro-label">{ANTHRO_LABELS[k]}</div>
                  <div className="anthro-value">
                    <span>{display}</span>
                    {unit && <span className="anthro-unit">{unit}</span>}
                  </div>
                  {k === 'bmi' && typeof val === 'number' && (
                    <div className="anthro-footnote">
                      <a 
                        href="https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          color: '#d52b1e',
                          textDecoration: 'none',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        What does this mean?
                        <span style={{ fontSize: '0.65rem' }}>↗</span>
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lung Function */}
      {lungMetrics && (
        <div className="lung-section">
          <div className="lung-title">Lung Function</div>
          <div className="lung-cards">
            <div className="lung-metric-card">
              <div className="lung-metric-title">FEV1</div>
              <div className="lung-metric-value">{lungMetrics.fev1?.mean?.toFixed(2) ?? '--'} <span style={{ fontSize: 14, color: '#888' }}>L</span></div>
              <div className="lung-metric-range">Min: {lungMetrics.fev1?.min?.toFixed(2) ?? '--'} | Max: {lungMetrics.fev1?.max?.toFixed(2) ?? '--'}</div>
            </div>
            <div className="lung-metric-card">
              <div className="lung-metric-title">FEV1/FVC</div>
              <div className="lung-metric-value">{lungMetrics.fev1_fvc?.mean?.toFixed(2) ?? '--'}</div>
              <div className="lung-metric-range">Min: {lungMetrics.fev1_fvc?.min?.toFixed(2) ?? '--'} | Max: {lungMetrics.fev1_fvc?.max?.toFixed(2) ?? '--'}</div>
            </div>
          </div>
        </div>
      )}
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
