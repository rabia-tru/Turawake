import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Profile } from '../types';
import { updateProfile } from '../services/profileService';
import { supabase } from '../services/supabaseClient';
import { BackIcon } from './icons';
import { Spinner } from './Spinner';

interface ProfileSettingsPageProps {
  user: User | null;
  profile: Profile | null;
  onBack: () => void;
}

const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({ user, profile, onBack }) => {
  const [formData, setFormData] = useState<Omit<Profile, 'id' | 'updated_at'>>({
      full_name: '',
      phone_number: '',
      date_of_birth: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
  });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone_number: profile.phone_number || '',
        date_of_birth: profile.date_of_birth || '',
        address: profile.address || '',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
      });
    }
  }, [profile]);

  const showSuccessMessage = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
        const updatedProfile = await updateProfile({ ...formData, id: user.id });
        if (updatedProfile) {
            showSuccessMessage('Profile updated successfully!');
        } else {
            throw new Error("Failed to update profile.");
        }
    } catch(err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(message);
    } finally {
        setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!newPassword) {
      setError('Password cannot be empty.');
      return;
    }

    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setError(error.message);
    } else {
      setNewPassword('');
      setConfirmPassword('');
      showSuccessMessage('Password updated successfully!');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full p-4 bg-pro-gradient overflow-y-auto">
      <header className="flex items-center mb-6 relative">
        <button onClick={onBack} className="p-2 mr-2 rounded-full hover:bg-slate-800 transition">
          <BackIcon className="w-6 h-6"/>
        </button>
        <h1 className="text-2xl font-bold text-slate-100">Profile Settings</h1>
      </header>
      <div className="w-full max-w-md mx-auto space-y-8">
        {error && <p className="text-red-400 text-sm text-center -mb-4">{error}</p>}
        {success && <p className="text-green-400 text-sm text-center -mb-4">{success}</p>}

        <div className="bg-slate-900/70 p-8 rounded-2xl border border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Update Your Profile</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
             <div>
                <label className="label-style" htmlFor="full_name">Full Name</label>
                <input className="input-field" id="full_name" type="text" value={formData.full_name || ''} onChange={handleInputChange}/>
            </div>
             <div>
                <label className="label-style" htmlFor="phone_number">Phone Number</label>
                <input className="input-field" id="phone_number" type="tel" value={formData.phone_number || ''} onChange={handleInputChange}/>
            </div>
             <div>
                <label className="label-style" htmlFor="date_of_birth">Date of Birth</label>
                <input className="input-field" id="date_of_birth" type="date" value={formData.date_of_birth || ''} onChange={handleInputChange}/>
            </div>
             <div>
                <label className="label-style" htmlFor="address">Address</label>
                <input className="input-field" id="address" type="text" value={formData.address || ''} onChange={handleInputChange}/>
            </div>
            <h3 className="text-md font-semibold text-slate-300 pt-2">Emergency Contact</h3>
             <div>
                <label className="label-style" htmlFor="emergency_contact_name">Contact Name</label>
                <input className="input-field" id="emergency_contact_name" type="text" value={formData.emergency_contact_name || ''} onChange={handleInputChange}/>
            </div>
             <div>
                <label className="label-style" htmlFor="emergency_contact_phone">Contact Phone</label>
                <input className="input-field" id="emergency_contact_phone" type="tel" value={formData.emergency_contact_phone || ''} onChange={handleInputChange}/>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-600 flex justify-center items-center h-10" disabled={loading}>
              {loading ? <Spinner size="sm"/> : 'Save Profile'}
            </button>
          </form>
        </div>
        
        <div className="bg-slate-900/70 p-8 rounded-2xl border border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Change Password</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="label-style" htmlFor="newPassword">New Password</label>
              <input className="input-field" id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <label className="label-style" htmlFor="confirmPassword">Confirm New Password</label>
              <input className="input-field" id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-600 flex justify-center items-center h-10" disabled={loading}>
              {loading ? <Spinner size="sm"/> : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
      <style>{`
        .label-style {
            display: block;
            color: #cbd5e1; /* slate-300 */
            font-size: 0.875rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
        .input-field {
          width: 100%;
          padding: 0.5rem 0.75rem;
          color: #e2e8f0; /* slate-200 */
          background-color: #1e293b; /* slate-800 */
          border: 1px solid #334155; /* slate-700 */
          border-radius: 0.5rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-field:focus {
          outline: none;
          border-color: #3b82f6; /* blue-500 */
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
        }
        .input-field[type="date"]::-webkit-calendar-picker-indicator {
            filter: invert(1);
        }
      `}</style>
    </div>
  );
};

export default ProfileSettingsPage;