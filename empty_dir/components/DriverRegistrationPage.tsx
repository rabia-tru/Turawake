
import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Profile } from '../types';
import { updateProfile } from '../services/profileService';
import { UserCircleIcon } from './icons';
import { Spinner } from './Spinner';

interface DriverRegistrationPageProps {
  user: User | null;
  profile: Profile | null;
  onSaveSuccess: (profile: Profile) => void;
}

const DriverRegistrationPage: React.FC<DriverRegistrationPageProps> = ({ user, profile, onSaveSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate the maximum allowed date (18 years ago from today)
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0];

  useEffect(() => {
      if (profile) {
          setFullName(profile.full_name || '');
          setPhoneNumber(profile.phone_number || '');
          setDateOfBirth(profile.date_of_birth || '');
          setAddress(profile.address || '');
          setEmergencyContactName(profile.emergency_contact_name || '');
          setEmergencyContactPhone(profile.emergency_contact_phone || '');
      }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to save your details.");
      return;
    }
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    
    if (!dateOfBirth) {
        setError("Please enter your date of birth.");
        return;
    }

    // Age Validation
    const birthDate = new Date(dateOfBirth);
    const ageDiffMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiffMs); // miliseconds from epoch
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    if (age < 18) {
        setError("You must be at least 18 years old to register as a driver.");
        return;
    }

    setLoading(true);
    setError(null);

    try {
        const profileData: Partial<Profile> & { id: string } = {
            id: user.id,
            full_name: fullName.trim(),
            phone_number: phoneNumber.trim() || null,
            date_of_birth: dateOfBirth || null,
            address: address.trim() || null,
            emergency_contact_name: emergencyContactName.trim() || null,
            emergency_contact_phone: emergencyContactPhone.trim() || null,
        };

        const updatedProfile = await updateProfile(profileData);
      
        if (updatedProfile) {
            onSaveSuccess(updatedProfile);
            // We do not set loading false here because the parent will likely navigate away,
            // and we want to prevent double-clicks.
        } else {
            throw new Error("Profile data was not returned after the update.");
            setLoading(false);
        }

    } catch (apiError) {
      const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
      console.error("Error saving driver details:", errorMessage);
      setError("An unexpected error occurred while saving your profile.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 bg-pro-gradient overflow-y-auto">
      <header className="mb-6 relative text-center">
        <h1 className="text-2xl font-bold text-slate-100">Step 1: Driver Details</h1>
      </header>

      <div className="w-full max-w-md mx-auto">
        <div className="bg-slate-900/70 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700/50">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-blue-500/10 rounded-full">
              <UserCircleIcon className="w-12 h-12 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mt-4 text-slate-100">Welcome to TruAwake!</h2>
            <p className="text-blue-300 mt-1">Let's complete your driver profile.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personal Details Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2 mb-3">Personal Details</h3>
              <div className="space-y-4">
                <div>
                    <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="fullName">Full Name</label>
                    <input className="input-field" id="fullName" type="text" placeholder="e.g., John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="flex space-x-4">
                    <div className="w-1/2">
                        <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="phoneNumber">Phone Number</label>
                        <input className="input-field" id="phoneNumber" type="tel" placeholder="0300-1234567" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                    </div>
                    <div className="w-1/2">
                        <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="dateOfBirth">Date of Birth</label>
                        <input 
                            className="input-field" 
                            id="dateOfBirth" 
                            type="date" 
                            value={dateOfBirth} 
                            onChange={(e) => setDateOfBirth(e.target.value)} 
                            max={maxDate} // Restrict future dates and under-18s
                            required
                        />
                        <p className="text-xs text-slate-500 mt-1">Must be 18 or older.</p>
                    </div>
                </div>
                 <div>
                    <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="address">Address</label>
                    <input className="input-field" id="address" type="text" placeholder="123 Main St, Anytown" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </div>
            </div>
            
             {/* Emergency Contact Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2 mb-3 mt-6">Emergency Contact</h3>
              <div className="space-y-4">
                 <div>
                    <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="emergencyContactName">Contact Name</label>
                    <input className="input-field" id="emergencyContactName" type="text" placeholder="e.g., Jane Doe" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} />
                </div>
                 <div>
                    <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="emergencyContactPhone">Contact Phone</label>
                    <input className="input-field" id="emergencyContactPhone" type="tel" placeholder="0300-7654321" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} />
                </div>
              </div>
            </div>


            {error && <p className="text-red-400 text-sm text-center pt-2 bg-red-900/20 p-2 rounded-lg border border-red-500/30">{error}</p>}

            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center h-12"
                disabled={loading}
              >
                {loading ? <Spinner size="sm" /> : 'Save & Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
<style>{`
        .input-field {
          width: 100%;
          padding: 0.75rem 0.75rem;
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
            cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default DriverRegistrationPage;
