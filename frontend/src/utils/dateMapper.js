/**
 * Shared date mapping utility to ensure consistent day numbering across the entire app
 * This collects ALL dates from ALL data sources and assigns Day 1, Day 2, etc.
 */

/**
 * Collect all unique dates from all data sources
 * @param {Object} rawData - The raw data object from the API
 * @returns {Array} Sorted array of date strings (YYYY-MM-DD)
 */
export function collectAllDates(rawData) {
  if (!rawData) return [];
  
  const allDates = new Set();
  
  // Iterate through all data sources
  Object.keys(rawData).forEach(dataType => {
    if (rawData[dataType]?.time_series && Array.isArray(rawData[dataType].time_series)) {
      rawData[dataType].time_series.forEach(item => {
        if (item.date) {
          // Extract just the date part (YYYY-MM-DD)
          const dateStr = item.date.slice(0, 10);
          allDates.add(dateStr);
        }
      });
    }
  });
  
  // Return sorted array
  return Array.from(allDates).sort();
}

/**
 * Create a date-to-day mapping
 * @param {Array} sortedDates - Sorted array of date strings
 * @returns {Object} Map of date string to day info { dayNumber, dayLabel, formattedDate }
 */
export function createDateToDayMap(sortedDates) {
  const map = {};
  
  sortedDates.forEach((dateStr, index) => {
    map[dateStr] = {
      dayNumber: index + 1,
      dayLabel: `Day ${index + 1}`,
      date: dateStr,
      formattedDate: new Date(dateStr).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    };
  });
  
  return map;
}

/**
 * Get day info for a specific date
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {Object} dateToDayMap - The date-to-day mapping
 * @returns {Object|null} Day info or null if not found
 */
export function getDayInfo(dateStr, dateToDayMap) {
  return dateToDayMap[dateStr] || null;
}

/**
 * Main function to get complete date mapping for raw data
 * @param {Object} rawData - The raw data object from the API
 * @returns {Object} { sortedDates, dateToDayMap, totalDays }
 */
export function getDateMapping(rawData) {
  const sortedDates = collectAllDates(rawData);
  const dateToDayMap = createDateToDayMap(sortedDates);
  
  return {
    sortedDates,
    dateToDayMap,
    totalDays: sortedDates.length
  };
}
