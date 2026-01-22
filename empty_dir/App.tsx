
import React, { useState, useEffect } from 'react';
import { Page, TripReport, Vehicle, Profile } from './types';
import { supabase } from './services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { getVehicle } from './services/vehicleService';
import { getProfile } from './services/profileService';
import { getLatestTripReport, saveTripReport, getAllTripReports } from './services/reportService';

// Import all page components
import SplashScreen from './components/SplashScreen';
import WelcomePage from './components/WelcomePage';
import LoginPage from './components/LoginPage';
import DriverRegistrationPage from './components/DriverRegistrationPage';
import VehicleManagementPage from './components/VehicleManagementPage';
import VerificationPage from './components/VerificationPage';
import PermissionsPage from './components/PermissionsPage';
import DashboardPage from './components/DashboardPage';
import MonitoringPage from './components/MonitoringPage';
import ReportPage from './components/ReportPage';
import SettingsPage from './components/SettingsPage';
import ProfileSettingsPage from './components/ProfileSettingsPage';
import AlarmSettingsPage from './components/AlarmSettingsPage';
import ThemeSettingsPage from './components/ThemeSettingsPage';
import MapPage from './components/MapPage';
import PowerSettingsPage from './components/PowerSettingsPage';
import HistoryPage from './components/HistoryPage';
import BreakZonePage from './components/BreakZonePage';

const PAGE_STORAGE_KEY = 'truawake_current_page';

// Reads the last active page from session storage to restore state on refresh.
const getInitialPage = (): Page => {
  try {
    const savedPage = sessionStorage.getItem(PAGE_STORAGE_KEY);
    if (savedPage) {
      const pageIndex = parseInt(savedPage, 10);
      if (!isNaN(pageIndex) && Page[pageIndex] !== undefined) {
        return pageIndex as Page;
      }
    }
  } catch (e) {
    console.error("Could not read page from session storage", e);
  }
  return Page.Welcome;
};


const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true); // For data loading & splash screen
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [page, setPage] = useState<Page>(getInitialPage);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [lastTripReport, setLastTripReport] = useState<TripReport | null>(null);
  const [loginMode, setLoginMode] = useState<'signIn' | 'signUp'>('signIn');
  const [isNewUser, setIsNewUser] = useState(false);
  const [currentReport, setCurrentReport] = useState<TripReport | null>(null);
  const [allTripReports, setAllTripReports] = useState<TripReport[] | null>(null);

  // An optimized function to load all necessary user data and determine the correct page.
  const loadUserSessionData = async (currentUser: User, isFreshSignIn: boolean) => {
    // Run data fetching in parallel to speed up loading.
    const [userProfile, userVehicle, latestReport] = await Promise.all([
        getProfile(currentUser.id),
        getVehicle(currentUser.id),
        // Only fetch the report for returning users on refresh. New users won't have one.
        isFreshSignIn ? Promise.resolve(null) : getLatestTripReport(currentUser.id),
    ]);

    // Update state with fetched data
    setProfile(userProfile);
    setVehicle(userVehicle);
    if (!isFreshSignIn) {
        setLastTripReport(latestReport);
    }
    // A user is "new" for onboarding purposes if they are signing in for the first time and have not completed their profile.
    setIsNewUser(isFreshSignIn && !userProfile?.full_name);

    // --- Navigation Logic ---

    // 1. If profile is incomplete, force registration. This is the highest priority.
    if (!userProfile?.full_name) {
        setPage(Page.DriverRegistration);
        return;
    }

    // 2. If it's a fresh sign-in, continue the onboarding flow.
    if (isFreshSignIn) {
        if (!userVehicle?.license_plate) {
            setPage(Page.VehicleManagement);
            return;
        }
        if (!userVehicle.is_verified) {
            setPage(Page.VehicleVerification);
            return;
        }
        // If profile and vehicle are complete, move to permissions.
        setPage(Page.Permissions);
        return;
    }
    
    // 3. If it's a returning user (app refresh), restore their last page or go to Dashboard.
    const lastPage = getInitialPage();
    if (lastPage === Page.Welcome || lastPage === Page.Login) {
        setPage(Page.Dashboard);
    } else {
        // Respect the last page if they were in settings, history, etc.
        setPage(lastPage);
    }
  };

  // Main effect for initialization and authentication handling.
  useEffect(() => {
    const initializeApp = async () => {
        setIsLoading(true);
        // Optimized splash duration: enough for branding, but quick for return users.
        const MIN_SPLASH_DURATION = 1800;
        const splashTimer = new Promise(resolve => setTimeout(resolve, MIN_SPLASH_DURATION));

        const initTask = (async () => {
            try {
                // Check for an existing session on app load.
                const { data: { session: initialSession } } = await supabase.auth.getSession();

                if (initialSession?.user) {
                    setSession(initialSession);
                    setUser(initialSession.user);
                    // Treat this as a returning user/refresh.
                    await loadUserSessionData(initialSession.user, false);
                } else {
                    setPage(Page.Welcome);
                }
            } catch (error) {
                console.error("Initialization error:", error);
                setPage(Page.Welcome);
            }
        })();

        // Wait for both the minimum timer and the data loading to complete
        await Promise.all([splashTimer, initTask]);
        setIsLoading(false);
    };

    initializeApp();
    
    // Listen for auth state changes (sign in, sign out).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        const currentUser = newSession?.user ?? null;
        setUser(currentUser); // Update user state regardless of event

        if (_event === 'SIGNED_IN' && currentUser) {
            setIsLoading(true);
            try {
                // This is a fresh sign-in, so trigger the onboarding flow.
                await loadUserSessionData(currentUser, true);
            } catch (error) {
                console.error("Error during SIGNED_IN event:", error);
                setPage(Page.Login); // Fallback on error
            } finally {
                setIsLoading(false);
            }
        } else if (_event === 'SIGNED_OUT') {
            // Clear all user-related state on sign out.
            setIsNewUser(false);
            setPage(Page.Welcome);
            setVehicle(null);
            setProfile(null);
            setLastTripReport(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  
  // Persists the current page to session storage to remember state on refresh.
  useEffect(() => {
    try {
      const nonPersistentPages = [Page.Welcome, Page.Login];
      if (nonPersistentPages.includes(page)) {
        sessionStorage.removeItem(PAGE_STORAGE_KEY);
      } else {
        sessionStorage.setItem(PAGE_STORAGE_KEY, page.toString());
      }
    } catch (e) {
      console.error("Could not save page to session storage", e);
    }
  }, [page]);

  const handleLogout = async () => {
    sessionStorage.removeItem(PAGE_STORAGE_KEY);
    await supabase.auth.signOut();
  };

  const handleRegistrationComplete = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
    setPage(Page.VehicleManagement);
  };
  
  const handleVehicleSaveSuccess = (updatedVehicle: Vehicle) => {
      setVehicle(updatedVehicle);
      setPage(Page.VehicleVerification);
  };
  
  const handleVerificationComplete = (updatedVehicle: Vehicle) => {
      setVehicle(updatedVehicle);
      setPage(Page.Permissions);
  };

  const handlePermissionsComplete = async () => {
    setIsNewUser(false); // Onboarding is now fully complete
    if(user) {
        const report = await getLatestTripReport(user.id);
        setLastTripReport(report);
    }
    setPage(Page.Dashboard);
  };
  
  const handleSkipVehicleSetup = () => {
      setPage(Page.Permissions);
  };
  
  const handleTripComplete = async (report: TripReport) => {
    if (user) {
      const success = await saveTripReport(report, user.id);
      // If the report was saved successfully, update the `lastTripReport`
      // state immediately. This ensures the Dashboard will have the latest
      // data without needing a separate fetch when the user returns.
      if (success) {
        setLastTripReport(report);
      }
    }
    setCurrentReport(report);
    setPage(Page.Report);
  };

  const handleReturnToDashboard = () => {
    // The `lastTripReport` state is now updated in `handleTripComplete`,
    // so we can simply navigate back to the dashboard without re-fetching.
    setPage(Page.Dashboard);
  };
  
  const handleGoToHistory = async () => {
    if (!user) return;
    setPage(Page.History);
    setAllTripReports(null); // Show loading spinner
    const reports = await getAllTripReports(user.id);
    setAllTripReports(reports);
  };

  const handleSelectReportFromHistory = (report: TripReport) => {
    setCurrentReport(report);
    setPage(Page.Report);
  };
  
  const renderPage = () => {
    switch (page) {
        case Page.Welcome:
            return <WelcomePage 
                onSignIn={() => { setLoginMode('signIn'); setPage(Page.Login); }}
                onSignUp={() => { setLoginMode('signUp'); setPage(Page.Login); }}
            />;
        case Page.Login:
            return <LoginPage 
                initialMode={loginMode}
                onBack={() => setPage(Page.Welcome)}
            />;
        case Page.DriverRegistration:
            return <DriverRegistrationPage user={user} profile={profile} onSaveSuccess={handleRegistrationComplete} />;
        case Page.VehicleManagement:
            return <VehicleManagementPage 
                user={user} 
                vehicle={vehicle} 
                onBack={() => setPage(Page.Dashboard)} 
                onSaveSuccess={handleVehicleSaveSuccess}
                onSkip={handleSkipVehicleSetup}
                isInitialSetup={isNewUser}
            />;
        case Page.VehicleVerification:
             return <VerificationPage 
                user={user} 
                vehicle={vehicle} 
                onVerificationComplete={handleVerificationComplete}
            />;
        case Page.Permissions:
            return <PermissionsPage onComplete={handlePermissionsComplete} />;
        case Page.Dashboard:
            return <DashboardPage 
                user={user}
                profile={profile}
                vehicle={vehicle}
                onStart={() => setPage(Page.Monitoring)} 
                onViewReport={() => { if(lastTripReport) { setCurrentReport(lastTripReport); setPage(Page.Report); }}}
                onLogout={handleLogout}
                onManageVehicle={() => setPage(Page.VehicleManagement)}
                onGoToSettings={() => setPage(Page.Settings)}
                onGoToMap={() => setPage(Page.Map)}
                onGoToHistory={handleGoToHistory}
                onGoToBreakZone={() => setPage(Page.BreakZone)}
                lastTripReport={lastTripReport}
            />;
        case Page.Monitoring:
            return <MonitoringPage onStop={handleTripComplete} />;
        case Page.Report:
            return <ReportPage 
                report={currentReport} 
                onBack={handleReturnToDashboard} 
            />;
        case Page.Settings:
            return <SettingsPage 
                onBack={() => setPage(Page.Dashboard)} 
                onGoToProfile={() => setPage(Page.ProfileSettings)}
                onGoToAlarms={() => setPage(Page.AlarmSettings)}
                onGoToTheme={() => setPage(Page.ThemeSettings)}
                onGoToPowerSettings={() => setPage(Page.PowerSettings)}
            />;
        case Page.ProfileSettings:
            return <ProfileSettingsPage user={user} profile={profile} onBack={() => setPage(Page.Settings)} />;
        case Page.AlarmSettings:
            return <AlarmSettingsPage onBack={() => setPage(Page.Settings)} />;
        case Page.ThemeSettings:
            return <ThemeSettingsPage onBack={() => setPage(Page.Settings)} />;
        case Page.PowerSettings:
            return <PowerSettingsPage onBack={() => setPage(Page.Settings)} />;
        case Page.Map:
            return <MapPage onBack={() => setPage(Page.Dashboard)} />;
        case Page.History:
            return <HistoryPage
                reports={allTripReports}
                onBack={() => setPage(Page.Dashboard)}
                onSelectReport={handleSelectReportFromHistory}
            />;
        case Page.BreakZone:
            return <BreakZonePage onBack={() => setPage(Page.Dashboard)} />;
        default:
             return <WelcomePage 
                onSignIn={() => { setLoginMode('signIn'); setPage(Page.Login); }}
                onSignUp={() => { setLoginMode('signUp'); setPage(Page.Login); }}
            />;
    }
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <div className="h-full w-full bg-slate-950 text-slate-200 animate-app-fade-in">
        {renderPage()}
    </div>
  );
};

export default App;
