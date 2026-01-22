import React, { useState, useEffect } from 'react';
import { TruAwakeLogo, BackIcon, EyeOpenIcon, EyeClosedIcon } from './icons';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './Spinner';

interface LoginPageProps {
  initialMode: 'signIn' | 'signUp';
  onBack: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ initialMode, onBack }) => {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  useEffect(() => {
    setIsSignUp(initialMode === 'signUp');
    setError(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPasswordVisible(false);
    setConfirmPasswordVisible(false);
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }

      // This is the most robust flow: only handle authentication here.
      // Create the user with email/password, and nothing else.
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
      }
      // On success, the onAuthStateChange listener in App.tsx will detect the new
      // user, see they have no profile, and correctly navigate them to the
      // DriverRegistrationPage to create their profile.
      
    } else { // Sign In logic
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
    }
    setLoading(false);
  };
  
  const handleToggleForm = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-pro-gradient">
      <div className="w-full max-w-sm mx-auto relative">
        <button 
          onClick={onBack} 
          className="absolute -top-12 left-0 p-2 rounded-full text-slate-300 hover:bg-slate-700/50 transition z-10" 
          aria-label="Go back">
          <BackIcon className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-blue-500/10 rounded-full">
            <TruAwakeLogo className="w-16 h-16 text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold mt-4 text-slate-100">{isSignUp ? 'Create Account' : 'Sign In'}</h1>
          <p className="text-blue-300 mt-2">Your AI Co-Pilot for Safe Driving.</p>
        </div>

        <div className="bg-slate-900/70 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700/50">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="email">
                Email
              </label>
              <input
                className="w-full px-3 py-2 text-slate-100 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  className="w-full px-3 py-2 pr-10 text-slate-100 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  id="password"
                  type={passwordVisible ? 'text' : 'password'}
                  placeholder="******************"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-200"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  aria-label={passwordVisible ? "Hide password" : "Show password"}
                >
                  {passwordVisible ? <EyeClosedIcon className="w-5 h-5" /> : <EyeOpenIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
             {isSignUp && (
              <div className="mb-6">
                <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="confirm-password">
                  Confirm Password
                </label>
                <div className="relative">
                    <input
                      className="w-full px-3 py-2 pr-10 text-slate-100 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      id="confirm-password"
                      type={confirmPasswordVisible ? 'text' : 'password'}
                      placeholder="******************"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-200"
                      onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                      aria-label={confirmPasswordVisible ? "Hide password" : "Show password"}
                    >
                      {confirmPasswordVisible ? <EyeClosedIcon className="w-5 h-5" /> : <EyeOpenIcon className="w-5 h-5" />}
                    </button>
                </div>
              </div>
            )}

            {error && (
                <p className="text-red-400 text-sm text-center mb-4">{error}</p>
            )}

            <div className="flex flex-col mt-6">
               <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center h-12"
                disabled={loading}
              >
                {loading ? <Spinner size="sm" /> : (isSignUp ? 'Create Account' : 'Sign In with Email')}
              </button>
            </div>
          </form>

            <p className="text-center text-sm text-slate-400 mt-8">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <button
                type="button"
                onClick={handleToggleForm}
                className="font-semibold text-blue-400 hover:text-blue-300 focus:outline-none"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;