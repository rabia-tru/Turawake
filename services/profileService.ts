import { supabase } from './supabaseClient';
import { Profile } from '../types';

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error fetching profile:', error.message);
    return null;
  }
  return data;
};

export const updateProfile = async (profileData: Partial<Profile> & { id: string }): Promise<Profile | null> => {
  // Use upsert to either create a new profile for a new user, or update an existing one.
  // This is crucial for the registration flow to work correctly, as new users won't have a profile row yet.
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profileData, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error.message);
    return null;
  }
  return data;
};
