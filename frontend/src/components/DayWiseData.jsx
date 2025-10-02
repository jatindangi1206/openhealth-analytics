import React, { useEffect, useState, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

const COLORS = {
  systolic: "#d52b1e",
  diastolic: "#2563eb",
  heartRate: "#dc2626",
  sleep: "#7c3aed",
  spo2: "#0891b2",
  steps: "#ea580c",
  temperature: "#059669",
  meals: "#f59e0b"
};

const LABELS = {
  systolic: "Systolic BP",
  diastolic: "Diastolic BP",
  heartRate: "Heart Rate",
  sleep: "Sleep (min)",
  spo2: "SpO₂ (%)",
  steps: "Steps (x10²)",
  temperature: "Temperature (°C)",
  meals: "Meals"
};

const UNITS = {
  systolic: "mmHg",
  diastolic: "mmHg",
  heartRate: "bpm",
  sleep: "minutes",
  spo2: "%",
  steps: "x10²",
  temperature: "°C",
  meals: "meal"
};

// Custom tooltip for timeline charts
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="custom-tooltip">
      <div className="tooltip-header">{label}</div>
      {payload.map((entry, index) => {
        if (entry.dataKey === 'sleep' && entry.value === 1) {
          return (
            <div key={index} className="tooltip-item">
              <div 
                className="tooltip-color-indicator" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="tooltip-label">Sleep:</span>
              <span className="tooltip-value">
                Asleep{entry.payload.sleepMinutes ? ` (${Math.round(entry.payload.sleepMinutes / 60)}h total)` : ''}
              </span>
            </div>
          );
        }
        return (
          <div key={index} className="tooltip-item">
            <div 
              className="tooltip-color-indicator" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="tooltip-label">{entry.name}:</span>
            <span className="tooltip-value">
              {entry.dataKey === 'meals' ? entry.payload.mealName || 'Meal' : 
               typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
              {entry.dataKey && UNITS[entry.dataKey] && entry.dataKey !== 'meals' ? ` ${UNITS[entry.dataKey]}` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Transform raw data into continuous timeline format with all 24 hours
function transformToTimelineData(raw, selectedDayInfo = null) {
  if (!raw) return [];
  
  // Get unique dates from blood_pressure data (this is the primary reference)
  // This ensures consistency with ChartArea which also uses blood_pressure as primary
  const allDates = new Set();
  if (raw.blood_pressure?.time_series) {
    raw.blood_pressure.time_series.forEach(item => {
      allDates.add(item.date.slice(0, 10));
    });
  }
  
  // If no blood pressure data, fall back to other data sources
  if (allDates.size === 0) {
    Object.keys(raw).forEach(dataType => {
      if (raw[dataType]?.time_series && dataType !== 'meals') {
        raw[dataType].time_series.forEach(item => {
          allDates.add(item.date.slice(0, 10));
        });
      }
    });
  }
  
  const sortedDates = Array.from(allDates).sort();
  if (sortedDates.length === 0) return [];
  
  const timelineData = [];
  
  // For each day, create all 24 hours
  sortedDates.forEach((dateString, dayIndex) => {
    for (let hour = 0; hour < 24; hour++) {
      const hourStr = hour.toString().padStart(2, '0');
      const timeLabel = `${hourStr}:00`;
      const displayTime = `Day ${dayIndex + 1} ${timeLabel}`;
      const isSelectedDay = selectedDayInfo && selectedDayInfo.date && 
                            selectedDayInfo.date.slice(0, 10) === dateString;
      
      const dataPoint = {
        time: displayTime,
        dayOffset: dayIndex,
        hour: hour,
        dayLabel: `Day ${dayIndex + 1}`,
        dateString: dateString,
        timeStr: timeLabel,
        isSelectedDay: isSelectedDay,
        date: `${dateString} ${timeLabel}:00`
      };
      
      // Look for data within this hour (from HH:00 to HH:59)
      const hourStart = new Date(`${dateString}T${hourStr}:00:00`);
      const hourEnd = new Date(`${dateString}T${hourStr}:59:59`);
      
      // Process blood pressure data
      if (raw.blood_pressure?.time_series) {
        const bpData = raw.blood_pressure.time_series.find(d => {
          const dataTime = new Date(d.date);
          return dataTime >= hourStart && dataTime <= hourEnd;
        });
        if (bpData) {
          dataPoint.systolic = bpData.systolic;
          dataPoint.diastolic = bpData.diastolic;
          if (bpData.heartRate) dataPoint.heartRate = bpData.heartRate;
        }
      }
      
      // Process heart rate data
      if (raw.heart_rate?.time_series) {
        const hrData = raw.heart_rate.time_series.find(d => {
          const dataTime = new Date(d.date);
          return dataTime >= hourStart && dataTime <= hourEnd;
        });
        if (hrData) {
          dataPoint.heartRate = hrData.averageHeartRate || hrData.heart_rate;
        }
      }
      
      // Process SpO2 data
      if (raw.spo2?.time_series) {
        const spo2Data = raw.spo2.time_series.find(d => {
          const dataTime = new Date(d.date);
          return dataTime >= hourStart && dataTime <= hourEnd;
        });
        if (spo2Data) {
          dataPoint.spo2 = spo2Data.spo2;
        }
      }
      
      // Process steps data
      if (raw.steps?.time_series) {
        const stepsData = raw.steps.time_series.find(d => {
          const dataTime = new Date(d.date);
          return dataTime >= hourStart && dataTime <= hourEnd;
        });
        if (stepsData) {
          dataPoint.steps = stepsData.steps != null ? stepsData.steps / 100 : undefined;
        }
      }
      
      // Process temperature data
      if (raw.temperature?.time_series) {
        const tempData = raw.temperature.time_series.find(d => {
          const dataTime = new Date(d.date);
          return dataTime >= hourStart && dataTime <= hourEnd;
        });
        if (tempData) {
          dataPoint.temperature = tempData.temperature;
        }
      }
      
      // Process sleep data - convert total minutes to hourly indicator
      if (raw.sleep?.time_series) {
        const sleepData = raw.sleep.time_series.find(d => {
          const dataTime = new Date(d.date);
          const dataDate = d.date.slice(0, 10);
          return dataDate === dateString;
        });
        if (sleepData) {
          // totalSleep is in minutes (e.g., 480 minutes = 8 hours)
          // Assume sleep happens from 22:00 (10 PM) to 06:00 (6 AM) next day
          // Show sleep indicator (value of 1) for hours when person was asleep
          const sleepHours = Math.round(sleepData.totalSleep / 60);
          const sleepStartHour = 22; // 10 PM
          
          if (hour >= sleepStartHour || hour < (sleepStartHour + sleepHours - 24)) {
            dataPoint.sleep = 1; // Indicator that person was asleep this hour
            dataPoint.sleepMinutes = sleepData.totalSleep; // Store total for tooltip
          }
        }
      }
      
      // Process meals data
      if (raw.meals?.time_series) {
        const mealData = raw.meals.time_series.find(d => {
          const dataTime = new Date(d.date);
          return dataTime >= hourStart && dataTime <= hourEnd;
        });
        if (mealData) {
          dataPoint.meals = 1;
          dataPoint.mealName = mealData.dish;
        }
      }
      
      // Always add the hour slot, even if empty
      timelineData.push(dataPoint);
    }
  });
  
  return timelineData;
}

export default function DayWiseData({ selected, token, selectedDate, onClearSelection }) {
  const [rawData, setRawData] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollContainerRef = useRef(null);
  const chartRef = useRef(null);

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

  // Transform data when rawData or selectedDate changes
  useEffect(() => {
    if (rawData) {
      const transformed = transformToTimelineData(rawData, selectedDate);
      setTimelineData(transformed);
    } else {
      setTimelineData([]);
    }
  }, [rawData, selectedDate]);

  // Auto-scroll to selected day when selectedDate changes
  useEffect(() => {
    if (selectedDate && timelineData.length > 0 && scrollContainerRef.current) {
      // Find the first hour (00:00) of the selected day
      const selectedDateStr = selectedDate.date ? selectedDate.date.slice(0, 10) : null;
      const selectedDayIndex = timelineData.findIndex(item => 
        item.dateString === selectedDateStr && item.hour === 0
      );
      
      if (selectedDayIndex !== -1) {
        // Calculate scroll position based on data point index
        const totalWidth = scrollContainerRef.current.scrollWidth;
        const containerWidth = scrollContainerRef.current.clientWidth;
        const scrollRatio = selectedDayIndex / timelineData.length;
        const scrollPosition = Math.max(0, (scrollRatio * totalWidth) - (containerWidth / 3));
        
        setTimeout(() => {
          scrollContainerRef.current.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
          });
        }, 300);
      }
    }
  }, [selectedDate, timelineData]);

  if (loading) return <div className="loading">Loading timeline data...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  
  if (!timelineData || timelineData.length === 0) {
    return (
      <div className="day-wise-container">
        <div className="section-header">
          <h2 className="swiss-subtitle">Timeline Analysis</h2>
          <p className="section-description">Continuous timeline data with physio and food information</p>
        </div>
        <div className="no-data">No timeline data available. Please check if data is loaded correctly.</div>
      </div>
    );
  }

  // Filter data to show selected parameters plus meals and sleep
  const availableParams = [...selected, 'meals', 'sleep'];
  const filteredData = timelineData.map(item => {
    const filtered = { 
      time: item.time, 
      dayOffset: item.dayOffset, 
      hour: item.hour, 
      mealName: item.mealName,
      isSelectedDay: item.isSelectedDay,
      dayLabel: item.dayLabel,
      dateString: item.dateString,
      sleepMinutes: item.sleepMinutes
    };
    // Add all selected parameters
    availableParams.forEach(param => {
      if (item[param] !== undefined && item[param] !== null) {
        filtered[param] = item[param];
      }
    });
    return filtered;
  });

  const totalDays = timelineData.length > 0 ? Math.max(...timelineData.map(item => item.dayOffset + 1)) : 0;
  const chartWidth = Math.max(1800, totalDays * 600); // 600px per day (24 hours * 25px per hour)
  
  // Debug: Log what parameters are being shown
  console.log('Selected parameters:', selected);
  console.log('Available params (with sleep/meals):', availableParams);
  console.log('Sample filtered data point:', filteredData[0]);

  return (
    <div className="day-wise-container">
      <div className="section-header">
        <div className="section-title-row">
          <h2 className="swiss-subtitle">24-Hour Timeline Analysis</h2>
          <div className="timeline-controls">
            <span className="days-indicator">
              {totalDays} days × 24 hours
            </span>
            {selectedDate && (
              <button 
                className="clear-selection-btn"
                onClick={() => onClearSelection && onClearSelection()} 
                title="Clear selection"
              >
                ✕ Clear Selection
              </button>
            )}
          </div>
        </div>
        {selectedDate ? (
          <>
            <p className="section-description">
              <span className="selected-date-highlight">
                📅 {typeof selectedDate === 'object' && selectedDate.day ? selectedDate.day : 'Selected Day'} - {new Date(typeof selectedDate === 'string' ? selectedDate : selectedDate.date).toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </p>
            <p className="timeline-instruction">
              💡 The chart auto-scrolled to the selected day. Each day shows all 24 hours - data appears where available, blank where not.
            </p>
          </>
        ) : (
          <p className="timeline-instruction">
            💡 Each day displays all 24 hours (00:00 - 23:00). Data appears where recorded, gaps show hours with no data. Click any day above to jump to it.
          </p>
        )}
      </div>
      
      <div className="timeline-chart-container" ref={scrollContainerRef}>
        <div className="chart-container timeline-chart">
          <h3 className="chart-title">Hourly Health Data Timeline</h3>
          <ResponsiveContainer width={chartWidth} height={500}>
            <LineChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              {/* Add reference lines for each day */}
              {totalDays > 0 && Array.from({ length: totalDays }, (_, i) => {
                const firstPointOfDay = filteredData.find(item => item.dayOffset === i && item.hour === 0);
                if (!firstPointOfDay) return null;
                
                // Check if this day matches the selected date
                const selectedDateStr = selectedDate?.date ? selectedDate.date.slice(0, 10) : null;
                const isSelected = firstPointOfDay.dateString === selectedDateStr;
                
                return (
                  <ReferenceLine 
                    key={`day-${i}`} 
                    x={firstPointOfDay.time} 
                    stroke={isSelected ? "#d52b1e" : "#e5e7eb"} 
                    strokeWidth={isSelected ? 3 : 1}
                    strokeDasharray={isSelected ? "none" : "3 3"}
                    label={{ 
                      value: `Day ${i + 1}${isSelected ? ' ★' : ''}`, 
                      position: "top",
                      style: { 
                        fill: isSelected ? "#d52b1e" : "#6b7280", 
                        fontWeight: isSelected ? "bold" : "normal",
                        fontSize: 12
                      }
                    }}
                  />
                );
              })}
              
              <XAxis 
                dataKey="time" 
                tick={({ x, y, payload }) => {
                  const parts = payload.value.split(' ');
                  const day = parts.slice(0, 2).join(' '); // "Day 1"
                  const time = parts[2]; // "00:00"
                  
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text 
                        x={0} 
                        y={0} 
                        dy={16} 
                        textAnchor="middle" 
                        fill="#9ca3af" 
                        fontSize="10"
                        fontWeight="600"
                      >
                        {day}
                      </text>
                      <text 
                        x={0} 
                        y={0} 
                        dy={30} 
                        textAnchor="middle" 
                        fill="#1f2937" 
                        fontSize="11"
                        fontWeight="500"
                      >
                        {time}
                      </text>
                    </g>
                  );
                }}
                height={100}
                interval={2}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              
              {availableParams.map((param) => {
                if (param === 'sleep') {
                  // Sleep shown as a filled area/bar indicator
                  return (
                    <Line
                      key={param}
                      type="step"
                      dataKey={param}
                      stroke={COLORS[param]}
                      fill={COLORS[param]}
                      fillOpacity={0.3}
                      name="Sleep Hours"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 8, stroke: COLORS[param], strokeWidth: 2, fill: '#fff' }}
                      connectNulls={false}
                    />
                  );
                }
                return (
                  <Line
                    key={param}
                    type="monotone"
                    dataKey={param}
                    stroke={COLORS[param]}
                    name={LABELS[param]}
                    strokeWidth={param === 'meals' ? 4 : 2}
                    dot={param === 'meals' ? 
                      { r: 8, fill: COLORS[param], strokeWidth: 2, stroke: '#fff' } : 
                      { r: 4, fill: COLORS[param], strokeWidth: 1, stroke: COLORS[param] }
                    }
                    activeDot={{ r: 8, stroke: COLORS[param], strokeWidth: 2, fill: '#fff' }}
                    connectNulls={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}