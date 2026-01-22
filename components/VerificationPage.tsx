import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Vehicle } from '../types';
import { CheckCircleIcon } from './icons';
import { Spinner } from './Spinner';
import { saveVehicle } from '../services/vehicleService';

interface VerificationPageProps {
  user: User | null;
  vehicle: Vehicle | null;
  onVerificationComplete: (updatedVehicle: Vehicle) => void;
}

const VerificationPage: React.FC<VerificationPageProps> = ({ user, vehicle, onVerificationComplete }) => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenVerificationSite = () => {
    window.open('https://mtmis.excise.punjab.gov.pk/', '_blank', 'noopener,noreferrer');
  };

  const handleCompleteSetup = async () => {
    if (!user || !vehicle) {
      setError("User or vehicle data is missing.");
      return;
    }
    if (!isConfirmed) {
      setError("Please confirm that your vehicle details are verified.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedVehicleData: Vehicle = {
        ...vehicle,
        is_verified: true,
      };

      const savedData = await saveVehicle(updatedVehicleData);

      if (savedData) {
        // Pass the newly verified vehicle data directly to the parent.
        // This is more reliable than re-fetching, which can get stale data from the DB.
        onVerificationComplete(savedData);
      } else {
        setError("Failed to update verification status in the database.");
      }
    } catch (apiError) {
      const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
      console.error("Error saving verification status:", errorMessage);
      setError("An unexpected error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 bg-pro-gradient overflow-y-auto">
      <header className="mb-6 relative text-center">
        <h1 className="text-2xl font-bold text-slate-100">Step 3: Vehicle Verification</h1>
      </header>

      <div className="w-full max-w-md mx-auto">
        <div className="bg-slate-900/70 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700/50">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-green-500/10 rounded-full">
              <CheckCircleIcon className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mt-4 text-slate-100">Final Step: Verification</h2>
            <p className="text-green-300 mt-1">Ensure your vehicle details are accurate.</p>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 text-center">
              <h3 className="font-semibold text-slate-200 mb-2">Verify Your Vehicle</h3>
              <p className="text-sm text-slate-400 mb-4">
                Click the button below to open the official MTMIS Punjab government portal. After verifying your vehicle's information, return here and check the confirmation box to complete your setup.
              </p>
              <button
                type="button"
                onClick={handleOpenVerificationSite}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-md text-sm font-medium transition"
              >
                Open Verification Website
              </button>
            </div>

            <label className="flex items-center space-x-3 cursor-pointer p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800/80">
              <input
                type="checkbox"
                className="h-5 w-5 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
              />
              <span className="text-slate-300 text-sm font-medium">I confirm my vehicle details have been verified on the official portal.</span>
            </label>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <div className="pt-2">
              <button
                onClick={handleCompleteSetup}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center h-12"
                disabled={loading || !isConfirmed}
              >
                {loading ? <Spinner size="sm" /> : 'Complete Setup'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;