import React, { useEffect, useState } from 'react';
import { TruAwakeLogo } from './icons';
import { Preferences } from '@capacitor/preferences';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [shouldShow, setShouldShow] = useState(true);

  useEffect(() => {
    const checkAndHandleSplash = async () => {
      try {
        // Check if splash has been shown before
        const { value: splashShown } = await Preferences.get({
          key: 'truawake_splash_shown',
        });

        if (splashShown === 'true') {
          // Splash was already shown, skip it
          console.log('✅ Splash already shown, skipping...');
          setShouldShow(false);
          onFinish();
          return;
        }

        // First time: show splash for 3 seconds
        console.log('🎬 Showing splash screen for first time');
        const timer = setTimeout(async () => {
          try {
            // Mark splash as shown
            await Preferences.set({
              key: 'truawake_splash_shown',
              value: 'true',
            });
            console.log('✅ Splash marked as shown');
            onFinish();
          } catch (error) {
            console.error('Error saving splash preference:', error);
            onFinish();
          }
        }, 3000);

        return () => clearTimeout(timer);
      } catch (error) {
        console.error('Error checking splash preference:', error);
        // If there's an error, just skip splash
        setShouldShow(false);
        onFinish();
      }
    };

    checkAndHandleSplash();
  }, [onFinish]);

  // If splash shouldn't be shown, return null or empty
  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center h-screen w-screen bg-gradient-to-b from-slate-950 to-blue-900/40 z-50">
      <div className="text-center">
        <div className="inline-block p-4 opacity-0 animate-fade-in-up">
          <TruAwakeLogo className="w-24 h-24 text-blue-400 animate-breathing-glow" />
        </div>
        <h1 className="text-5xl font-bold mt-4 text-white opacity-0 animate-fade-in-up fade-in-up-delay-1">
          TruAwake
        </h1>
        <p className="text-blue-200 mt-2 opacity-0 animate-fade-in-up fade-in-up-delay-2">
          Your AI Co-Pilot for Safe Driving.
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;