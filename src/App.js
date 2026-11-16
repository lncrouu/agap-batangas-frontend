import React, { useEffect, useState } from 'react';
import { adminSupabase, supabase } from './supabaseClient';
import { verifyAdminAccess } from './services/adminService';
import LandingScreen from './screens/LandingScreen';
import DashboardScreen from './screens/DashboardScreen';
import ReportSubmitScreen from './screens/ReportSubmitScreen';
import HotlinesScreen from './screens/HotlineScreen';
import ReportTrackerScreen from './screens/ReportTrackerScreen';
import DangerZoneMapScreen from './screens/DangerZoneMapScreen';
import AdminScreen from './screens/AdminScreen';
import AdminLoginScreen from './screens/AdminLoginScreen';
import ProfileScreen from './screens/ProfileScreen';
import ResponderScreen from './screens/ResponderScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [userRole, setUserRole] = useState('GUEST');
  const [userProfile, setUserProfile] = useState(null);
<<<<<<< HEAD
  const [authReady, setAuthReady] = useState(false);
  const [startupError, setStartupError] = useState('');

  useEffect(() => {
    let active = true;
=======
  const [showSplash, setShowSplash] = useState(true);
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [pinError, setPinError] = useState('');

  const ADMIN_PASSCODE = 'AGAP-ADMIN-2026';

  useEffect(() => {
    checkExistingDeviceProfile();

    const savedAccessType = localStorage.getItem('agap_user_access_type');
    if (savedAccessType) {
      setCurrentScreen('dashboard');
    }

    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(splashTimer);
  }, []);
>>>>>>> 00f93ad (Admin Update)

    const initialize = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        let user = session?.user;
        if (!user) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) throw error;
          user = data.user;
        }
        if (!user) throw new Error('Supabase did not create an authenticated guest session.');

<<<<<<< HEAD
        let deviceId = localStorage.getItem('agap_device_id');
        if (!deviceId) {
          deviceId = `DEV-${Math.floor(100000 + Math.random() * 900000)}`;
          localStorage.setItem('agap_device_id', deviceId);
        }
=======
      if (data) {
        setUserProfile(data);
        setUserRole(data.user_role || 'GUEST');
      } else {
        const profileId = 'USER-' + Math.floor(100000 + Math.random() * 900000);
        const newGuestProfile = {
          id: profileId,
          device_id: localDeviceId,
          username: `Guest_${localDeviceId.replace('DEV-', '')}`,
          full_name: 'Unverified Guest',
          user_role: 'GUEST',
          verification_status: 'GUEST',
          barangay: 'Batangas City'
        };
>>>>>>> 00f93ad (Admin Update)

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
<<<<<<< HEAD
          .select('*')
          .eq('auth_user_id', user.id)
=======
          .upsert([newGuestProfile], { onConflict: 'device_id' })
          .select()
>>>>>>> 00f93ad (Admin Update)
          .maybeSingle();
        if (profileError) throw profileError;

<<<<<<< HEAD
        let resolvedProfile = profile;
        if (!resolvedProfile) {
          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: `USER-${user.id}`,
              auth_user_id: user.id,
              device_id: deviceId,
              username: 'Guest User',
              full_name: 'Unverified Guest',
              user_role: 'GUEST',
              verification_status: 'GUEST',
              barangay: 'Batangas City'
            })
            .select()
            .single();
          if (createError) throw createError;
          resolvedProfile = createdProfile;
        }

        let administrator = false;
        const { data: { session: adminSession }, error: adminSessionError } =
          await adminSupabase.auth.getSession();
        if (adminSessionError) throw adminSessionError;
        if (adminSession?.access_token) {
          try {
            await verifyAdminAccess();
            administrator = true;
          } catch (error) {
            await adminSupabase.auth.signOut();
            if (error.message !== 'Administrator sign-in is required.') {
              console.warn('Saved admin session is no longer authorized:', error.message);
            }
          }
        }

        if (active) {
          setUserProfile(resolvedProfile);
          setUserRole(administrator ? 'ADMIN' : 'GUEST');
          if (administrator) setCurrentScreen('admin');
          setAuthReady(true);
        }
      } catch (error) {
        if (active) {
          setStartupError(error.message || 'Unable to initialize the AGAP authentication session.');
          setAuthReady(true);
=======
        if (!error && createdProfile) {
          setUserProfile(createdProfile);
          setUserRole('GUEST');
        } else {
          setUserProfile(newGuestProfile);
          setUserRole('GUEST');
>>>>>>> 00f93ad (Admin Update)
        }
      }
    };

    initialize();
    return () => { active = false; };
  }, []);

  const handleResidentAccess = () => {
    if (userProfile?.full_name && userProfile.verification_status !== 'GUEST') {
      setCurrentScreen('dashboard');
    } else {
      setCurrentScreen('profile');
    }
  };

  const handleGuestAccess = () => {
    setUserRole('GUEST');
    setCurrentScreen('dashboard');
  };

<<<<<<< HEAD
  const handleAdminAuthenticated = () => {
    setUserRole('ADMIN');
    setCurrentScreen('admin');
=======
  const handleNavigate = (screenKey) => {
    if (screenKey === 'submit-report' && userProfile?.verification_status === 'BANNED') {
      alert('ACCESS RESTRICTED: Your device fingerprint has been banned due to repeated false hazard submissions. Contact CDRRMO Batangas to appeal.');
      return;
    }
    setCurrentScreen(screenKey);
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
  };

  const handleTriggerAdminPortal = () => {
    if (userRole === 'ADMIN') {
      setCurrentScreen('admin');
    } else {
      setAdminPinInput('');
      setShowPasscode(false);
      setPinError('');
      setShowAdminPinModal(true);
    }
  };

  const handleVerifyAdminPin = (e) => {
    e.preventDefault();
    if (adminPinInput.trim() === ADMIN_PASSCODE) {
      setUserRole('ADMIN');
      setShowAdminPinModal(false);
      setCurrentScreen('admin');
    } else {
      setPinError('Invalid Passcode! Access restricted to authorized CDRRMO personnel.');
    }
>>>>>>> 00f93ad (Admin Update)
  };

  const handleAdminLogout = async () => {
    const { error } = await adminSupabase.auth.signOut();
    if (error) {
      setStartupError(`Admin sign-out failed: ${error.message}`);
      return;
    }
    setUserRole('GUEST');
    setCurrentScreen('dashboard');
  };

  return (
    <div style={styles.appContainer}>
      <style>{`
        html, body, #root {
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background-color: #0F172A !important;
        }
      `}</style>
      <div style={styles.screenWrapper}>
<<<<<<< HEAD
        {!authReady ? (
          <div style={styles.message}>Connecting securely to AGAP...</div>
        ) : startupError ? (
          <div role="alert" style={styles.error}>
            <strong>AGAP could not start.</strong>
            <p>{startupError}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
=======
        {showSplash ? (
          <div style={styles.splashContainer}>
            <div style={styles.radarPulseRing}></div>
            <div style={styles.shieldLogoBox}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M12 8v4"/>
                <path d="M12 16h.01"/>
              </svg>
            </div>
            <h1 style={styles.splashTitle}>PROJECT AGAP</h1>
            <p style={styles.splashTagline}>Active Guardianship & Alert Protocol</p>
            <div style={styles.splashBadge}>BATANGAS PROVINCIAL EMERGENCY SYSTEM</div>
>>>>>>> 00f93ad (Admin Update)
          </div>
        ) : (
          <>
            {currentScreen === 'landing' && (
<<<<<<< HEAD
              <LandingScreen onResidentAccess={handleResidentAccess} onGuestAccess={handleGuestAccess} />
            )}
            {currentScreen === 'dashboard' && (
              <DashboardScreen
                onNavigate={setCurrentScreen}
=======
              <LandingScreen
                onResidentAccess={handleResidentAccess}
                onGuestAccess={handleGuestAccess}
              />
            )}

            {currentScreen === 'dashboard' && (
              <DashboardScreen
                onNavigate={handleNavigate}
>>>>>>> 00f93ad (Admin Update)
                userRole={userRole}
                onOpenProfile={() => setCurrentScreen('profile')}
              />
            )}
<<<<<<< HEAD
            {currentScreen === 'profile' && (
              <ProfileScreen
                onBack={() => setCurrentScreen('dashboard')}
                onAdminLogin={() => setCurrentScreen('admin-login')}
              />
            )}
            {currentScreen === 'admin-login' && (
              <AdminLoginScreen
                onBack={() => setCurrentScreen('profile')}
                onAuthenticated={handleAdminAuthenticated}
              />
            )}
            {currentScreen === 'submit-report' && (
              <ReportSubmitScreen
                onBack={() => setCurrentScreen('dashboard')}
                onSubmitSuccess={() => setCurrentScreen('dashboard')}
                userRole={userRole}
              />
            )}
            {currentScreen === 'hotlines' && <HotlinesScreen onBack={() => setCurrentScreen('dashboard')} />}
            {currentScreen === 'tracker' && <ReportTrackerScreen onBack={() => setCurrentScreen('dashboard')} />}
            {currentScreen === 'danger-map' && <DangerZoneMapScreen onBack={() => setCurrentScreen('dashboard')} />}
            {currentScreen === 'admin' && <AdminScreen onBack={handleAdminLogout} />}
          </>
=======

            {currentScreen === 'profile' && (
              <ProfileScreen
                onBack={handleBackToDashboard}
                onAdminLogin={handleTriggerAdminPortal}
                onNavigate={handleNavigate}
              />
            )}

            {currentScreen === 'submit-report' && (
              <ReportSubmitScreen
                onBack={handleBackToDashboard}
                onSubmitSuccess={handleBackToDashboard}
                userRole={userRole}
              />
            )}

            {currentScreen === 'hotlines' && (
              <HotlinesScreen
                onBack={handleBackToDashboard}
              />
            )}

            {currentScreen === 'tracker' && (
              <ReportTrackerScreen
                onBack={handleBackToDashboard}
              />
            )}

            {currentScreen === 'danger-map' && (
              <DangerZoneMapScreen
                onBack={handleBackToDashboard}
              />
            )}

            {currentScreen === 'admin' && (
              <AdminScreen
                onBack={handleBackToDashboard}
              />
            )}

            {currentScreen === 'responder' && (
              <ResponderScreen
                onBack={handleBackToDashboard}
              />
            )}
          </>
        )}

        {showAdminPinModal && (
          <div style={styles.modalBackdrop} onClick={() => setShowAdminPinModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <span style={styles.modalTitle}>CDRRMO Official Verification</span>
                <button style={styles.closeBtn} onClick={() => setShowAdminPinModal(false)}>✕</button>
              </div>

              <p style={styles.modalSubtext}>
                This Command Portal is restricted to authorized Batangas City CDRRMO administrators and dispatch officers.
              </p>

              <form onSubmit={handleVerifyAdminPin} style={styles.formStack}>
                <div>
                  <label style={styles.inputLabel}>ENTER ADMIN SECURITY PASSCODE</label>
                  <div style={styles.passcodeInputWrapper}>
                    <input
                      type={showPasscode ? 'text' : 'password'}
                      style={styles.passcodeInput}
                      placeholder="Enter Security Passcode..."
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value)}
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      style={styles.togglePasscodeBtn}
                      onClick={() => setShowPasscode(!showPasscode)}
                    >
                      {showPasscode ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {pinError && <div style={styles.errorText}>{pinError}</div>}
                  <div style={styles.hintText}>Demo Admin Key: <code>AGAP-ADMIN-2026</code></div>
                </div>

                <button type="submit" style={styles.verifyBtn}>
                  Authorize & Open Command Portal
                </button>
              </form>
            </div>
          </div>
>>>>>>> 00f93ad (Admin Update)
        )}
      </div>
    </div>
  );
}

const styles = {
<<<<<<< HEAD
  appContainer: {
    minHeight: '100vh',
    backgroundColor: '#0F172A',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: "'Inter', sans-serif"
  },
  screenWrapper: {
    width: '100%',
    maxWidth: '440px',
    minHeight: '100vh',
    backgroundColor: '#F8FAFC',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
  },
  message: { padding: '32px', color: '#334155', textAlign: 'center' },
  error: { margin: '24px', padding: '16px', background: '#FEF2F2', color: '#991B1B', borderRadius: '8px' }
=======
  appContainer: { minHeight: '100vh', backgroundColor: '#0F172A', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Inter', sans-serif" },
  screenWrapper: { width: '100%', maxWidth: '440px', minHeight: '100vh', backgroundColor: '#F8FAFC', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', position: 'relative' },
  splashContainer: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0F172A', color: '#FFFFFF', padding: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' },
  radarPulseRing: { position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', border: '2px solid rgba(15, 118, 110, 0.4)', animation: 'pulse 2s infinite' },
  shieldLogoBox: { width: '80px', height: '80px', backgroundColor: '#CCFBF1', borderRadius: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px', zIndex: 2, boxShadow: '0 10px 25px -5px rgba(15, 118, 110, 0.5)' },
  splashTitle: { fontSize: '24px', fontWeight: '900', letterSpacing: '2px', color: '#F8FAFC', margin: '0 0 6px 0', zIndex: 2 },
  splashTagline: { fontSize: '12px', color: '#94A3B8', margin: '0 0 16px 0', letterSpacing: '0.5px', zIndex: 2 },
  splashBadge: { fontSize: '9px', fontWeight: '800', letterSpacing: '1px', backgroundColor: '#0F766E', color: '#CCFBF1', padding: '6px 12px', borderRadius: '12px', zIndex: 2 },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', maxWidth: '360px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  modalTitle: { fontSize: '15px', fontWeight: '800', color: '#0F172A' },
  closeBtn: { backgroundColor: '#F1F5F9', border: 'none', width: '28px', height: '28px', borderRadius: '50%', fontSize: '12px', fontWeight: '800', color: '#64748B', cursor: 'pointer' },
  modalSubtext: { fontSize: '11px', color: '#64748B', lineHeight: '1.4', marginBottom: '16px' },
  formStack: { display: 'flex', flexDirection: 'column', gap: '12px' },
  inputLabel: { fontSize: '9px', fontWeight: '800', color: '#64748B', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' },
  passcodeInputWrapper: { display: 'flex', gap: '6px', alignItems: 'center' },
  passcodeInput: { flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' },
  togglePasscodeBtn: { backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#0F766E', padding: '10px', borderRadius: '8px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' },
  errorText: { fontSize: '10px', fontWeight: '700', color: '#DC2626', marginTop: '4px' },
  hintText: { fontSize: '10px', color: '#0F766E', marginTop: '6px', backgroundColor: '#F0FDF4', padding: '6px', borderRadius: '6px' },
  verifyBtn: { width: '100%', padding: '12px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }
>>>>>>> 00f93ad (Admin Update)
};
