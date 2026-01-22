import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Vehicle } from '../types';
import { BackIcon, CarIcon } from './icons';
import { Spinner } from './Spinner';
import { saveVehicle } from '../services/vehicleService';

interface VehicleManagementPageProps {
  user: User | null;
  vehicle: Vehicle | null;
  onBack: () => void;
  onSaveSuccess: (updatedVehicle: Vehicle) => void;
  onSkip?: () => void;
  isInitialSetup?: boolean;
}

const VehicleManagementPage: React.FC<VehicleManagementPageProps> = ({ user, vehicle, onBack, onSaveSuccess, onSkip, isInitialSetup = false }) => {
  const [licensePlate, setLicensePlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number | ''>(new Date().getFullYear());
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) {
      setLicensePlate(vehicle.license_plate || '');
      setMake(vehicle.make || '');
      setModel(vehicle.model || '');
      setYear(vehicle.year || '');
    }
  }, [vehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        setError("You must be logged in to save a vehicle.");
        return;
    }
    if (!licensePlate || !make || !model || !year) {
        setError("Please fill out all fields.");
        return;
    }
    
    const yearNumber = typeof year === 'string' ? parseInt(year, 10) : year;
    if (isNaN(yearNumber)) {
        setError("Please enter a valid year.");
        return;
    }


    setLoading(true);
    setError(null);

    try {
        const vehicleData: Omit<Vehicle, 'id' | 'is_verified'> & { is_verified: boolean } = {
            user_id: user.id,
            license_plate: licensePlate,
            make,
            model,
            year: yearNumber,
            is_verified: vehicle?.is_verified || false, // Preserve existing status or default to false
        };
        
        const savedData = await saveVehicle(vehicleData as Vehicle);

        if (savedData) {
            // Pass the newly saved data directly back to the parent component.
            // This is more reliable than forcing a re-fetch, which can get stale data.
            onSaveSuccess(savedData);
        } else {
            setError("Failed to save vehicle data to the database. Please ensure the backend table is set up correctly.");
        }

    } catch (apiError) {
        const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
        console.error("Error saving vehicle details:", errorMessage);
        setError("An unexpected error occurred while saving.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 bg-pro-gradient overflow-y-auto">
        <header className="flex items-center mb-6 relative">
            {!isInitialSetup && (
                <button onClick={onBack} className="p-2 mr-2 rounded-full hover:bg-slate-800 transition">
                    <BackIcon className="w-6 h-6"/>
                </button>
            )}
            <h1 className="text-2xl font-bold text-slate-100">{isInitialSetup ? 'Step 2: Vehicle Details' : 'Vehicle Management'}</h1>
        </header>

        <div className="w-full max-w-md mx-auto">
            <div className="bg-slate-900/70 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700/50">
                <div className="text-center mb-8">
                    <div className="inline-block p-4 bg-blue-500/10 rounded-full">
                        <CarIcon className="w-12 h-12 text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold mt-4 text-slate-100">{isInitialSetup ? "Register Your Vehicle" : "Your Vehicle Details"}</h2>
                    <p className="text-blue-300 mt-1">{isInitialSetup ? "Next, let's add your vehicle to complete your profile." : "Keep your vehicle information up to date."}</p>
                </div>
            
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="licensePlate">
                        License Plate
                        </label>
                        <input
                        className="w-full px-3 py-2 text-slate-100 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        id="licensePlate"
                        type="text"
                        placeholder="ABC-123"
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                        required
                        />
                    </div>
                    <div className="flex space-x-4">
                        <div className="w-1/2">
                            <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="make">
                            Make
                            </label>
                            <input
                            className="w-full px-3 py-2 text-slate-100 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            id="make"
                            type="text"
                            placeholder="Toyota"
                            value={make}
                            onChange={(e) => setMake(e.target.value)}
                            required
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="model">
                            Model
                            </label>
                            <input
                            className="w-full px-3 py-2 text-slate-100 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            id="model"
                            type="text"
                            placeholder="Camry"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            required
                            />
                        </div>
                    </div>
                     <div>
                        <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="year">
                        Year
                        </label>
                        <input
                        className="w-full px-3 py-2 text-slate-100 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        id="year"
                        type="number"
                        placeholder="2023"
                        value={year}
                        onChange={(e) => setYear(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        required
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm text-center pt-2">{error}</p>}

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center h-12"
                            disabled={loading}
                        >
                            {loading ? <Spinner size="sm" /> : (isInitialSetup ? 'Save & Continue' : 'Save Vehicle')}
                        </button>
                        {isInitialSetup && onSkip && (
                            <button
                                type="button"
                                onClick={onSkip}
                                className="w-full mt-3 text-slate-400 font-medium py-3 px-4 rounded-lg hover:bg-slate-800/60 transition focus:outline-none focus:ring-2 focus:ring-slate-600"
                            >
                                Skip for Now
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};

export default VehicleManagementPage;