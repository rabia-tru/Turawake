
import React from 'react';
import { TruAwakeLogo } from './icons';

interface WelcomePageProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onSignIn, onSignUp }) => {

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-pro-gradient text-center">
      <div className="flex flex-col justify-center flex-grow w-full max-w-sm mx-auto">
        <div className="mb-12">
          <div className="inline-block p-4 bg-blue-500/10 rounded-full animate-fade-in-up">
            <TruAwakeLogo className="w-20 h-20 text-blue-400" />
          </div>
          <h1 className="text-5xl font-bold mt-6 text-slate-100 animate-fade-in-up fade-in-up-delay-1">TruAwake</h1>
          <p className="text-blue-300 text-lg mt-2 animate-fade-in-up fade-in-up-delay-2">Your AI Co-Pilot for Safe Driving.</p>
        </div>
        
        <div className="flex flex-col space-y-4 animate-fade-in-up fade-in-up-delay-2">
          <button
            onClick={onSignUp}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-lg focus:outline-none focus:shadow-outline transition transform hover:scale-105"
          >
            Create Account
          </button>
          
          <button
              onClick={onSignIn}
              className="w-full bg-slate-800/60 hover:bg-slate-800/90 text-slate-100 font-bold py-4 px-4 rounded-lg focus:outline-none focus:shadow-outline transition transform hover:scale-105 border border-slate-700"
            >
              Sign In with Email
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
