import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, RadialBarChart, RadialBar } from "recharts";

const COLORS = {
  systolic: "#d52b1e",
  diastolic: "#2563eb",
  heartRate: "#dc2626",
  sleep: "#7c3aed",
  spo2: "#0891b2",
  steps: "#ea580c",
  temperature: "#059669",
  deepSleep: "#4FD1C5",
  remSleep: "#F687B3",
  lightSleep: "#F6E05E",
  almostAwake: "#CBD5E0"
};

const GRADIENTS = {
  systolic: { start: "#d52b1e", end: "#b71c1c" },
  diastolic: { start: "#2563eb", end: "#1d4ed8" },
  heartRate: { start: "#dc2626", end: "#b91c1c" },
  sleep: { start: "#7c3aed", end: "#6d28d9" },
  spo2: { start: "#0891b2", end: "#0e7490" },
  steps: { start: "#ea580c", end: "#c2410c" },
  temperature: { start: "#059669", end: "#047857" }
};

const LABELS = {
  systolic: "Systolic BP",
  diastolic: "Diastolic BP",
  heartRate: "Heart Rate",
  sleep: "Sleep (min)",
  spo2: "SpO₂ (%)",
  steps: "Steps (x10²)",
  temperature: "Temperature (°C)",
};

const UNITS = {
  systolic: "mmHg",
  diastolic: "mmHg",
  heartRate: "bpm",
  sleep: "minutes",
  spo2: "%",
  steps: "x10²",
  temperature: "°C",
};

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

function transformData(raw) {
  const dateMap = {};
  let sleepStageArr = [];
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
      dateMap[date].deepSleep = d.deepSleep;
      dateMap[date].remSleep = d.remSleep;
      dateMap[date].lightSleep = d.lightSleep;
    });
    sleepStageArr = raw.sleep.time_series;
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
      // Normalize steps to hundreds
      dateMap[date].steps = d.steps != null ? d.steps / 100 : undefined;
    });
  }
  if (raw.temperature?.time_series) {
    raw.temperature.time_series.forEach((d) => {
      const date = d.date.slice(0, 10);
      if (!dateMap[date]) dateMap[date] = { date };
      dateMap[date].temperature = d.temperature;
    });
  }
  const arr = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  return {
    arr: arr.map((item, idx) => ({
      ...item,
      day: `Day ${idx + 1}`,
      formattedDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })),
    sleepStageArr
  };
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  // If label is a day string, use as is; else fallback
  const dayLabel = payload[0]?.payload?.day || label;
  return (
    <div className="custom-tooltip">
      <div className="tooltip-header">{dayLabel}</div>
      {payload.map((entry, index) => (
        <div key={index} className="tooltip-item">
          <div 
            className="tooltip-color-indicator" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="tooltip-label">{entry.name}:</span>
          <span className="tooltip-value">
            {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
            {entry.dataKey && UNITS[entry.dataKey] ? ` ${UNITS[entry.dataKey]}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
};

// Custom legend component
const CustomLegend = ({ payload }) => {
  return (
    <div className="custom-legend">
      {payload.map((entry, index) => (
        <div key={index} className="legend-item">
          <div 
            className="legend-color-indicator" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="legend-text">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// Loading skeleton component
const ChartSkeleton = () => (
  <div className="chart-skeleton">
    <div className="skeleton-header"></div>
    <div className="skeleton-chart">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="skeleton-bar" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
      ))}
    </div>
  </div>
);

// Error component
const ChartError = ({ message, onRetry }) => (
  <div className="chart-error">
    <div className="error-icon">⚠️</div>
    <div className="error-message">{message}</div>
    {onRetry && (
      <button className="error-retry-btn" onClick={onRetry}>
        Try Again
      </button>
    )}
  </div>
);

export default function ChartArea({ selected, token, onDateClick }) {
  const [data, setData] = useState([]);
  const [sleepStages, setSleepStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('line');
  const [lungMetrics, setLungMetrics] = useState(null);
  const [anthro, setAnthro] = useState(null);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
  const res = await fetch("/api/my-data", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch data (${res.status}). ${text || ''}`.trim());
      }
      const raw = await res.json();
      const { arr, sleepStageArr } = transformData(raw);
      setData(arr);
      setSleepStages(sleepStageArr);
      // Lung function metrics
      if (raw.lung_function && raw.lung_function.metrics) {
        setLungMetrics(raw.lung_function.metrics);
      } else {
        setLungMetrics(null);
      }
      // Anthropometrics
      if (raw.anthro) {
        const m = raw.anthro.metrics || {};
        const latest = Array.isArray(raw.anthro.time_series) && raw.anthro.time_series.length > 0
          ? raw.anthro.time_series[raw.anthro.time_series.length - 1]
          : {};
        // Prefer metrics mean, fallback to latest point
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
    } catch (e) {
      console.error('Data fetch error', e);
      setError(e.message || 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Calculate statistics
  const getStats = (key) => {
    const values = data.map(d => d[key]).filter(v => v != null);
    if (!values.length) return null;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const latest = values[values.length - 1];
    
    return { min, max, avg, latest, count: values.length };
  };

  // Pie chart data for sleep
  let pieData = null;
  if (selected.includes("sleep") && sleepStages.length > 0) {
    let deep = 0, rem = 0, light = 0, almostAwake = 0;
    sleepStages.forEach((d) => {
      deep += d.deepSleep || 0;
      rem += d.remSleep || 0;
      light += d.lightSleep || 0;
      almostAwake += d.almostAwake || 0;
    });
    
    const total = deep + rem + light + almostAwake;
    if (total > 0) {
      pieData = [
        { name: "Deep Sleep", value: deep, color: COLORS.deepSleep, percentage: (deep / total * 100).toFixed(1) },
        { name: "REM Sleep", value: rem, color: COLORS.remSleep, percentage: (rem / total * 100).toFixed(1) },
        { name: "Light Sleep", value: light, color: COLORS.lightSleep, percentage: (light / total * 100).toFixed(1) },
        { name: "Almost Awake", value: almostAwake, color: COLORS.almostAwake, percentage: (almostAwake / total * 100).toFixed(1) },
      ].filter(item => item.value > 0);
    }
  }

  const renderChart = () => {
    if (loading) return <ChartSkeleton />;
    if (error) return <ChartError message={error} onRetry={fetchData} />;
    if (!data.length) return <ChartError message="No data available" />;

    const ChartComponent = chartType === 'bar' ? BarChart : LineChart;
    const DataComponent = chartType === 'bar' ? Bar : Line;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          onClick={(e) => {
            if (e && e.activeLabel && e.activePayload && e.activePayload.length > 0) {
              const activeData = e.activePayload[0].payload;
              if (activeData && activeData.date && onDateClick) {
                onDateClick({
                  date: activeData.date,
                  day: activeData.day,
                  formattedDate: activeData.formattedDate
                });
              }
            }
          }}
        >
          <defs>
            {Object.entries(GRADIENTS).map(([key, gradient]) => (
              <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradient.start} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={gradient.end} stopOpacity={0.3}/>
              </linearGradient>
            ))}
          </defs>
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          {selected.map((key) => (
            <DataComponent
              key={key}
              type={chartType === 'line' ? "monotone" : undefined}
              dataKey={key}
              stroke={COLORS[key]}
              fill={chartType === 'bar' ? `url(#gradient-${key})` : 'none'}
              name={LABELS[key]}
              dot={chartType === 'line' ? { fill: COLORS[key], strokeWidth: 2, r: 4 } : undefined}
              strokeWidth={chartType === 'line' ? 3 : undefined}
              activeDot={chartType === 'line' ? { r: 6, stroke: COLORS[key], strokeWidth: 2, fill: '#fff' } : undefined}
            />
          ))}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="elegant-chart-area">
      <style>{`
        .elegant-chart-area {
          background: linear-gradient(145deg, #ffffff 0%, #fafbfc 100%);
          border-radius: 1.5rem;
          box-shadow: 
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
          padding: 2rem;
          margin-bottom: 2rem;
          border: 1px solid rgba(0, 0, 0, 0.05);
          position: relative;
          overflow: hidden;
        }

        .anthro-section {
          margin-bottom: 1.75rem;
        }
        .anthro-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }
        .anthro-title {
          font-size: 1.25rem;
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

        .elegant-chart-area::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #d52b1e 0%, #ff5252 50%, #d52b1e 100%);
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .chart-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #d52b1e;
          background: linear-gradient(135deg, #d52b1e 0%, #b71c1c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .chart-controls {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .chart-toggle {
          padding: 0.5rem 1rem;
          border: 2px solid #e5e7eb;
          background: #ffffff;
          color: #6b7280;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .chart-toggle.active {
          border-color: #d52b1e;
          background: linear-gradient(135deg, #d52b1e 0%, #b71c1c 100%);
          color: white;
        }

        .chart-toggle:hover:not(.active) {
          border-color: #d52b1e;
          color: #d52b1e;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: linear-gradient(145deg, #ffffff 0%, #f9fafb 100%);
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1.5rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: var(--stat-color, #d52b1e);
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .stat-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .stat-range {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .custom-tooltip {
          background: linear-gradient(145deg, #ffffff 0%, #f9fafb 100%);
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          min-width: 200px;
        }

        .tooltip-header {
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .tooltip-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .tooltip-color-indicator {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .tooltip-label {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .tooltip-value {
          font-weight: 600;
          color: #1f2937;
          margin-left: auto;
        }

        .custom-legend {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .legend-color-indicator {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }

        .legend-text {
          font-size: 0.875rem;
          font-weight: 500;
          color: #4b5563;
        }

        .sleep-charts {
          margin-top: 3rem;
        }

        .sleep-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .sleep-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #d52b1e;
          margin-bottom: 0.5rem;
        }

        .sleep-subtitle {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .chart-skeleton {
          padding: 2rem;
          text-align: center;
        }

        .skeleton-header {
          height: 1.5rem;
          width: 60%;
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          border-radius: 0.5rem;
          margin: 0 auto 2rem;
          animation: shimmer 2s infinite;
        }

        .skeleton-chart {
          display: flex;
          align-items: end;
          justify-content: space-around;
          height: 200px;
          gap: 1rem;
        }

        .skeleton-bar {
          flex: 1;
          max-width: 60px;
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          border-radius: 0.25rem;
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }

        .chart-error {
          text-align: center;
          padding: 3rem 2rem;
          color: #6b7280;
        }

        .error-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .error-message {
          font-size: 1.125rem;
          font-weight: 500;
          margin-bottom: 1.5rem;
        }

        .error-retry-btn {
          background: linear-gradient(135deg, #d52b1e 0%, #b71c1c 100%);
          color: white;
          border: none;
          border-radius: 0.5rem;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .error-retry-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(213, 43, 30, 0.3);
        }

        @media (max-width: 768px) {
          .elegant-chart-area {
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .chart-header {
            flex-direction: column;
            align-items: stretch;
          }

          .chart-controls {
            justify-content: center;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .custom-legend {
            gap: 1rem;
          }
        }
      `}</style>


      <div className="chart-header">
        <h3 className="chart-title">Health Metrics Overview</h3>
        <div className="chart-controls">
          <button 
            className={`chart-toggle ${chartType === 'line' ? 'active' : ''}`}
            onClick={() => setChartType('line')}
          >
            Line Chart
          </button>
          <button 
            className={`chart-toggle ${chartType === 'bar' ? 'active' : ''}`}
            onClick={() => setChartType('bar')}
          >
            Bar Chart
          </button>
        </div>
      </div>

      {/* Main Chart */}
      <div style={{ minHeight: '400px' }}>
        {renderChart()}
      </div>


      {/* Sleep Distribution Chart */}
      {pieData && (
        <div className="sleep-charts">
          <div className="sleep-header">
            <h4 className="sleep-title">Sleep Stages Distribution</h4>
            <p className="sleep-subtitle">Breakdown of sleep quality over the monitored period</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={40}
                paddingAngle={2}
                label={({ name, percentage }) => `${name} (${percentage}%)`}
              >
                {pieData.map((entry, idx) => (
                  <Cell 
                    key={entry.name} 
                    fill={entry.color}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Legend content={<CustomLegend />} />
              <Tooltip 
                formatter={(value, name) => [`${value.toFixed(1)} minutes`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}