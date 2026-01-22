import { supabase } from './supabaseClient';
import { Vehicle } from '../types';

export const getVehicle = async (userId: string): Promise<Vehicle | null> => {
  const { data, error } = await supabase
    .from('vehicle')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found, which is not an error here
    console.error('Error fetching vehicle:', error.message);
    return null;
  }
  return data;
};

export const saveVehicle = async (vehicleData: Omit<Vehicle, 'id'> & { id?: string }): Promise<Vehicle | null> => {
  const { id, ...upsertData } = vehicleData;
  const { data, error } = await supabase
    .from('vehicle')
    .upsert(upsertData, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    console.error('Error saving vehicle:', error.message);
    return null;
  }
  return data;
};