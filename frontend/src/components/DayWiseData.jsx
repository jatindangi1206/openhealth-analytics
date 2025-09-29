import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";

const COLORS = {
  systolic: "#d52b1e",
  diastolic: "#2563eb",
  heartRate: "#dc2626",
  sleep: "#7c3aed",
  spo2: "#0891b2",
  steps: "#ea580c",
  temperature: "#059669"
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

// Custom tooltip for hourly charts
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="custom-tooltip">
      <div className="tooltip-header">{label}</div>
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

// Transform raw data into hourly format for a specific date
function transformToHourlyData(raw, selectedDate) {
  if (!selectedDate) return [];
  
  const targetDate = selectedDate.slice(0, 10); // Get YYYY-MM-DD part
  const hourlyData = [];
  
  // Create hourly time slots (24 hours)
  for (let hour = 0; hour < 24; hour++) {
    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
    const fullDateTime = `${targetDate} ${timeLabel}:00`;
    
    const dataPoint = {
      time: timeLabel,
      hour: hour,
      fullDateTime: fullDateTime
    };
    
    // Look for data points around this hour (±30 minutes window)
    const targetTime = new Date(`${targetDate}T${timeLabel}:00`);
    const windowStart = new Date(targetTime.getTime() - 30 * 60 * 1000); // 30 min before
    const windowEnd = new Date(targetTime.getTime() + 30 * 60 * 1000); // 30 min after
    
    // Process blood pressure data
    if (raw.blood_pressure?.time_series) {
      const bpData = raw.blood_pressure.time_series.find(d => {
        const dataTime = new Date(d.date);
        return dataTime >= windowStart && dataTime <= windowEnd;
      });
      if (bpData) {
        dataPoint.systolic = bpData.systolic;
        dataPoint.diastolic = bpData.diastolic;
        dataPoint.heartRate = bpData.heartRate;
      }
    }
    
    // Process heart rate data
    if (raw.heart_rate?.time_series) {
      const hrData = raw.heart_rate.time_series.find(d => {
        const dataTime = new Date(d.date);
        return dataTime >= windowStart && dataTime <= windowEnd;
      });
      if (hrData) {
        dataPoint.heartRate = hrData.heart_rate;
      }
    }
    
    // Process sleep data
    if (raw.sleep?.time_series) {
      const sleepData = raw.sleep.time_series.find(d => {
        const dataTime = new Date(d.date);
        return dataTime >= windowStart && dataTime <= windowEnd;
      });
      if (sleepData) {
        dataPoint.sleep = sleepData.total_sleep_minutes;
      }
    }
    
    // Process SpO2 data
    if (raw.spo2?.time_series) {
      const spo2Data = raw.spo2.time_series.find(d => {
        const dataTime = new Date(d.date);
        return dataTime >= windowStart && dataTime <= windowEnd;
      });
      if (spo2Data) {
        dataPoint.spo2 = spo2Data.spo2;
      }
    }
    
    // Process steps data
    if (raw.steps?.time_series) {
      const stepsData = raw.steps.time_series.find(d => {
        const dataTime = new Date(d.date);
        return dataTime >= windowStart && dataTime <= windowEnd;
      });
      if (stepsData) {
        dataPoint.steps = stepsData.steps != null ? stepsData.steps / 100 : undefined;
      }
    }
    
    // Process temperature data
    if (raw.temperature?.time_series) {
      const tempData = raw.temperature.time_series.find(d => {
        const dataTime = new Date(d.date);
        return dataTime >= windowStart && dataTime <= windowEnd;
      });
      if (tempData) {
        dataPoint.temperature = tempData.temperature;
      }
    }
    
    // Only add data point if it has at least one measurement
    const hasData = Object.keys(dataPoint).some(key => 
      !['time', 'hour', 'fullDateTime'].includes(key) && dataPoint[key] !== undefined
    );
    
    if (hasData) {
      hourlyData.push(dataPoint);
    }
  }
  
  return hourlyData;
}

export default function DayWiseData({ selected, token, selectedDate, onClearSelection }) {
  const [rawData, setRawData] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/my-data", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error("Failed to fetch data");
        
        const data = await response.json();
        setRawData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Transform data when selectedDate changes
  useEffect(() => {
    if (rawData && selectedDate) {
      const dateString = typeof selectedDate === 'string' ? selectedDate : selectedDate.date;
      const transformed = transformToHourlyData(rawData, dateString);
      setHourlyData(transformed);
    } else {
      setHourlyData([]);
    }
  }, [rawData, selectedDate]);

  if (loading) return <div className="loading">Loading hourly data...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  
  if (!selectedDate) {
    return (
      <div className="day-wise-container">
        <div className="section-header">
          <h2 className="swiss-subtitle">Hourly Analysis</h2>
          <p className="section-description">Click on a point in the chart above to see hourly data for that day</p>
        </div>
        <div className="no-selection">
          <div className="no-selection-icon">📊</div>
          <div className="no-selection-text">Click on a day in the chart above to view hourly data</div>
        </div>
      </div>
    );
  }

  if (!hourlyData || hourlyData.length === 0) {
    return (
      <div className="day-wise-container">
        <div className="section-header">
          <div className="section-title-row">
            <h2 className="swiss-subtitle">Hourly Analysis</h2>
            <button 
              className="clear-selection-btn"
              onClick={() => onClearSelection && onClearSelection()} 
              title="Clear selection"
            >
              ✕ Clear Selection
            </button>
          </div>
          <p className="section-description">
            <span className="selected-date-highlight">
              📅 {typeof selectedDate === 'object' && selectedDate.day ? selectedDate.day : 'Selected Day'} - {new Date(typeof selectedDate === 'string' ? selectedDate : selectedDate.date).toLocaleDateString('en-US', { 
                weekday: 'long'
              })}
            </span>
          </p>
        </div>
        <div className="no-data">No hourly data available for this date</div>
      </div>
    );
  }

  // Filter data to only show selected parameters
  const filteredData = hourlyData.map(item => {
    const filtered = { time: item.time, hour: item.hour };
    selected.forEach(param => {
      if (item[param] !== undefined) {
        filtered[param] = item[param];
      }
    });
    return filtered;
  });

  return (
    <div className="day-wise-container">
      <div className="section-header">
        <div className="section-title-row">
          <h2 className="swiss-subtitle">Hourly Analysis</h2>
          <button 
            className="clear-selection-btn"
            onClick={() => onClearSelection && onClearSelection()} 
            title="Clear selection"
          >
            ✕ Clear Selection
          </button>
        </div>
        <p className="section-description">
          <span className="selected-date-highlight">
            📅 {typeof selectedDate === 'object' && selectedDate.day ? selectedDate.day : 'Selected Day'} - {new Date(typeof selectedDate === 'string' ? selectedDate : selectedDate.date).toLocaleDateString('en-US', { 
              weekday: 'long'
            })}
          </span>
        </p>
      </div>
      
      <div className="day-wise-charts">
        {/* Area Chart for hourly trends */}
        <div className="chart-container">
          <h3 className="chart-title">Hourly Trends (Area Chart)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                {selected.map((param) => (
                  <linearGradient key={param} id={`hourlyGradient-${param}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[param]} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS[param]} stopOpacity={0.1}/>
                  </linearGradient>
                ))}
              </defs>
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 11 }}
                interval={'preserveStartEnd'}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {selected.map((param) => (
                <Area
                  key={param}
                  type="monotone"
                  dataKey={param}
                  stroke={COLORS[param]}
                  fill={`url(#hourlyGradient-${param})`}
                  name={LABELS[param]}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart for precise hourly values */}
        <div className="chart-container">
          <h3 className="chart-title">Hourly Values (Line Chart)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 11 }}
                interval={'preserveStartEnd'}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {selected.map((param) => (
                <Line
                  key={param}
                  type="monotone"
                  dataKey={param}
                  stroke={COLORS[param]}
                  name={LABELS[param]}
                  strokeWidth={2}
                  dot={{ r: 4, fill: COLORS[param] }}
                  activeDot={{ r: 6, stroke: COLORS[param], strokeWidth: 2, fill: '#fff' }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}