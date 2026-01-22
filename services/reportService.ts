
import { supabase } from './supabaseClient';
import { TripReport } from '../types';

/**
 * Saves a trip report to the database.
 * @param report The TripReport object to save.
 * @param userId The ID of the user who owns the report.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export const saveTripReport = async (report: TripReport, userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('trip_reports')
    .insert({
      user_id: userId,
      start_time: new Date(report.startTime).toISOString(),
      end_time: new Date(report.endTime).toISOString(),
      max_drowsiness: Math.round(report.maxDrowsiness), // Explicitly round to prevent type errors
      alert_count: report.alertCount,
      yawn_count: report.yawnCount,
      report_data: report, // Save the full report object in the JSONB column
    });

  if (error) {
    console.error('Error saving trip report:', error.message);
    return false;
  }
  return true;
};

/**
 * Fetches the most recent trip report for a user from the database.
 * @param userId The ID of the user.
 * @returns {Promise<TripReport | null>} The latest TripReport object or null if none found.
 */
export const getLatestTripReport = async (userId: string): Promise<TripReport | null> => {
  const { data, error } = await supabase
    .from('trip_reports')
    .select('report_data')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching latest trip report:', error.message);
    return null;
  }

  // The query returns an array. If it's not empty, return the report_data of the first element.
  return data && data.length > 0 ? data[0].report_data as TripReport : null;
};

/**
 * Fetches all historical trip reports for a user.
 * @param userId The ID of the user.
 * @returns {Promise<TripReport[] | null>} An array of TripReport objects or null on error.
 */
export const getAllTripReports = async (userId: string): Promise<TripReport[] | null> => {
  const { data, error } = await supabase
    .from('trip_reports')
    .select('report_data')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all trip reports:', error.message);
    return null;
  }
  
  // The 'report_data' column contains the full JSONB object. We map the array to extract it.
  return data ? data.map(item => item.report_data as TripReport) : [];
};