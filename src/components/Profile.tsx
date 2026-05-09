import { useState, useEffect } from 'react';
import { User, Save, Download, Trash2, Shield, Smartphone, Eye, Volume2, Type, RefreshCw, LogOut, Camera, Bell, Mail, MessageSquare } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const API_URL = 'http://localhost:8000';

export function Profile() {
  const [profile, setProfile] = useState({
    full_name: '',
    age: '',
    role: 'student',
    language_preference: 'en',
    avatar_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Tab & UI States
  const [activeTab, setActiveTab] = useState('general');
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState('setup'); // 'setup' or 'verify'
  const [setupOtp, setSetupOtp] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' | 'danger' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'danger' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Feature States
  const [twoFactor, setTwoFactor] = useState(false);
  const [notifications, setNotifications] = useState({ email: true, push: true, sms: false });
  const [accessibility, setAccessibility] = useState({
    tts: false,
    largeFont: false,
    dyslexiaFont: false,
    highContrast: false
  });
  const [sessions, setSessions] = useState<any[]>([]);

  const { t, setLanguage } = useLanguage();
  const { user, token, updateUser } = useAuth();

  useEffect(() => {
    if (user && token) {
      loadProfile();
      loadSessions();
    }
  }, [user, token]);

  // TTS Effect
  useEffect(() => {
    if (accessibility.tts) {
      const msg = new SpeechSynthesisUtterance("Text to speech enabled");
      window.speechSynthesis.speak(msg);
    } else {
      window.speechSynthesis.cancel();
    }
  }, [accessibility.tts]);

  // Global Accessibility Styles
  useEffect(() => {
    document.documentElement.style.fontSize = accessibility.largeFont ? '115%' : '100%';
    document.body.style.fontFamily = accessibility.dyslexiaFont
      ? '"Comic Sans MS", "Comic Sans", cursive, sans-serif'
      : '';

    if (accessibility.highContrast) {
      document.body.style.filter = 'contrast(1.2) brightness(1.1)';
      document.body.style.backgroundColor = '#000';
      document.body.classList.add('high-contrast');
    } else {
      document.body.style.filter = '';
      document.body.style.backgroundColor = '';
      document.body.classList.remove('high-contrast');
    }
  }, [accessibility]);

  const loadProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile({
          full_name: data.full_name || '',
          age: data.age?.toString() || '',
          role: data.role || 'student',
          language_preference: data.language_preference || 'en',
          avatar_url: data.avatar_url || '',
        });
        if (data.notifications) setNotifications(data.notifications);
        if (data.accessibility) setAccessibility(data.accessibility);
        setTwoFactor(data.two_factor_enabled);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setSessions(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage('Uploading avatar...');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/api/user/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setProfile(prev => ({ ...prev, avatar_url: data.avatar_url }));
      showToast('Biometric avatar updated successfully!', 'success');
    } catch (error) {
      showToast('Error uploading avatar', 'info');
    }
  };

  // Debounced update helper to prevent API spam
  const [toggleTimeout, setToggleTimeout] = useState<any>(null);

  const handleToggle = (type: 'notifications' | 'accessibility', key: string, value: any) => {
    const newState = type === 'notifications'
      ? { ...notifications, [key]: value }
      : { ...accessibility, [key]: value };

    if (type === 'notifications') setNotifications(newState as any);
    else setAccessibility(newState as any);

    if (toggleTimeout) clearTimeout(toggleTimeout);

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ [type]: newState })
        });
        if (res.ok) {
          if (updateUser) {
            updateUser({ [type]: newState });
          }
          showToast("System preferences successfully updated.", "success");
        }
      } catch (e) { console.error(e); }
    }, 500); // 500ms debounce

    setToggleTimeout(timeout);
  };

  const handleTwoFactorToggle = async () => {
    if (!twoFactor) {
      // Start Setup
      try {
        const res = await fetch(`${API_URL}/api/auth/2fa/setup`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.otp) {
          setSetupOtp(data.otp);
          setRecoveryCodes(data.recovery_codes || []);
          setShowTwoFactorModal(true);
          setTwoFactorStep('setup');
        } else {
          showToast("Could not retrieve setup security token", "info");
        }
      } catch (e) {
        console.error(e);
        showToast("Operational failure: 2FA initialization blocked", "info");
      }
    } else {
      // Disable
      if (confirm("Disable 2FA? This will reduce your account security.")) {
        try {
          const res = await fetch(`${API_URL}/api/auth/2fa/toggle?enabled=false`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setTwoFactor(false);
            if (updateUser) updateUser({ two_factor_enabled: false });
            showToast("2FA Disabled: Account security level reduced", "info");
          }
        } catch (e) { showToast("Failed to disable security protocol", "info"); }
      }
    }
  };

  const verifySetup = async () => {
    if (otpValue.length !== 6) {
      showToast("Verification failed: Requires 6-digit numeric input", 'info');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ otp: otpValue })
      });
      if (res.ok) {
        await fetch(`${API_URL}/api/auth/2fa/toggle?enabled=true`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setTwoFactor(true);
        if (updateUser) updateUser({ two_factor_enabled: true });
        setShowTwoFactorModal(false);
        setOtpValue('');
        showToast("2FA Status: ACTIVATED. Higher encryption enabled.", "success");
      } else {
        const data = await res.json();
        showToast(data.detail || "Authentication token rejected", "info");
      }
    } catch (e) { showToast("Verification link failure", "info"); }
  };

  const revokeSession = async (sid: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/sessions/${sid}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSessions(sessions.filter(s => s.id !== sid));
        if (sessions.find(s => s.id === sid)?.is_current) {
          localStorage.removeItem('access_token');
          window.location.href = '/';
        }
        showToast("Remote session terminated", "info");
      }
    } catch (e) { showToast("Failed to revoke session", "info"); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          full_name: profile.full_name,
          age: profile.age ? parseInt(profile.age) : null,
          role: profile.role,
          language_preference: profile.language_preference
        })
      });
      if (res.ok) {
        setLanguage(profile.language_preference as any);
        showToast("Profile identity updated successfully", "success");
      }
    } catch (e) { showToast("Network relay: Save failed", "info"); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-8 border-b dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-900">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group">
              <div className="h-24 w-24 rounded-3xl overflow-hidden border-4 border-white dark:border-gray-700 shadow-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User size={48} className="text-gray-300" />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 bg-blue-600 p-2 rounded-xl text-white shadow-lg cursor-pointer hover:bg-blue-700 transition-all hover:scale-110 active:scale-90">
                <Camera size={18} />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
              </label>
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white-800">{profile.full_name || 'My Profile'}</h1>
              <p className="text-gray-500 font-medium">{profile.role.toUpperCase()} • {profile.age ? `${profile.age} years` : 'Age not set'}</p>
            </div>
          </div>
        </div>

        <div className="flex border-b dark:border-gray-700 overflow-x-auto no-scrollbar">
          {['general', 'security', 'notifications', 'accessibility', 'privacy'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[100px] py-4 text-sm font-bold transition-all border-b-2 ${activeTab === tab ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t.profile.name}</label>
                  <input type="text" value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} className="w-full px-4 py-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t.profile.age}</label>
                  <input type="number" value={profile.age} onChange={e => setProfile({ ...profile, age: e.target.value })} className="w-full px-4 py-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t.profile.language}</label>
                  <select value={profile.language_preference} onChange={e => setProfile({ ...profile, language_preference: e.target.value })} className="w-full px-4 py-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                    <option value="en">English</option>
                    <option value="ml">Malayalam</option>
                    <option value="hi">Hindi</option>
                    <option value="es">Español</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Account Role</label>
                  <input type="text" value={profile.role} disabled className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border dark:border-gray-800 text-gray-400 font-mono" />
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-2xl text-sm font-bold animate-in fade-in slide-in-from-top-1 ${message.includes('success') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {message}
                </div>
              )}

              <button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50">
                <Save size={20} /> {saving ? "Saving Changes..." : "Save Profile Details"}
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white text-lg"><Shield size={20} className="text-green-500" /> Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm">Enhance your account security by requiring a 6-digit code during every login attempt.</p>
                </div>
                <button onClick={handleTwoFactorToggle} className={`w-full md:w-auto px-8 py-3 rounded-2xl text-sm font-black transition-all shadow-md ${twoFactor ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'}`}>
                  {twoFactor ? "Disable Security" : "Enable 2FA"}
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2 px-2"><Smartphone size={18} className="text-blue-500" /> Active System Access</h3>
                {sessions.map(s => (
                  <div key={s.id} className="p-5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${s.is_current ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        <Smartphone size={24} />
                      </div>
                      <div>
                        <p className="font-black text-sm dark:text-white">{s.user_agent?.split(' ')[0] || "Auth-001"} {s.is_current && <span className="ml-2 text-[10px] bg-green-100 text-green-700 font-black px-2 py-0.5 rounded-lg uppercase">This Device</span>}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.ip_address} • {new Date(s.last_active).toLocaleString()}</p>
                      </div>
                    </div>
                    {!s.is_current && (
                      <button onClick={() => revokeSession(s.id)} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors">
                        <LogOut size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 gap-4">
                <NotificationToggle
                  icon={<Mail size={20} />}
                  label="Email Notifications"
                  description="Receive test reports and feedback directly in your inbox."
                  enabled={notifications.email}
                  onToggle={() => handleToggle('notifications', 'email', !notifications.email)}
                />
                <NotificationToggle
                  icon={<Bell size={20} />}
                  label="Push Reports"
                  description="Real-time alerts for live sessions and specialist messages."
                  enabled={notifications.push}
                  onToggle={() => handleToggle('notifications', 'push', !notifications.push)}
                />
                <NotificationToggle
                  icon={<MessageSquare size={20} />}
                  label="SMS Alerts"
                  description="Emergency notifications and appointment reminders via text."
                  enabled={notifications.sms}
                  onToggle={() => handleToggle('notifications', 'sms', !notifications.sms)}
                />
              </div>
            </div>
          )}

          {activeTab === 'accessibility' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 gap-4">
                <NotificationToggle
                  icon={<Volume2 size={20} />}
                  label="Assistive Voice (TTS)"
                  description="Automatically read quiz questions and diagnostic labels aloud."
                  enabled={accessibility.tts}
                  onToggle={() => handleToggle('accessibility', 'tts', !accessibility.tts)}
                  color="indigo"
                />
                <NotificationToggle
                  icon={<Eye size={20} />}
                  label="Visual Optimization"
                  description="Increase color contrast and define borders for better legibility."
                  enabled={accessibility.highContrast}
                  onToggle={() => handleToggle('accessibility', 'highContrast', !accessibility.highContrast)}
                  color="indigo"
                />
                <NotificationToggle
                  icon={<Type size={20} />}
                  label="Enhanced Typography"
                  description="Enable global font scaling and open-dyslexic spacing rules."
                  enabled={accessibility.largeFont}
                  onToggle={() => handleToggle('accessibility', 'largeFont', !accessibility.largeFont)}
                  color="indigo"
                />
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-blue-50/50 dark:bg-blue-900/20 p-8 rounded-3xl border border-blue-100 dark:border-blue-800 space-y-4">
                <div className="flex items-center gap-3 text-blue-800 dark:text-blue-300">
                  <Download size={24} />
                  <h3 className="text-lg font-black">Data Portability</h3>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400 leading-relaxed font-medium">Download a complete cryptographical archive of your personal data, test history, and clinical records in standardized JSON format.</p>
                <button
                  onClick={async () => {
                    const res = await fetch(`${API_URL}/api/user/export`, { headers: { 'Authorization': `Bearer ${token}` } });
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'my_health_identity.json'; a.click();
                  }}
                  className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                  Request Archive
                </button>
              </div>

              <div className="bg-red-50/50 dark:bg-red-900/20 p-8 rounded-3xl border border-red-100 dark:border-red-800 space-y-4">
                <div className="flex items-center gap-3 text-red-800 dark:text-red-300">
                  <Trash2 size={24} />
                  <h3 className="text-lg font-black">Account Termination</h3>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed font-medium">Permanently purge your biometric data, test results, and specialist relationships. This action is irreversible as per local privacy laws.</p>
                <button
                  onClick={async () => {
                    if (confirm("DANGER: Permanently delete your account? This will erase all diagnostic history and cannot be undone.")) {
                      const res = await fetch(`${API_URL}/api/user/me`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                      if (res.ok) { localStorage.removeItem('access_token'); window.location.href = '/'; }
                    }
                  }}
                  className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  Delete Identity
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Toast Notification */}
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-fade-in">
          <div className={`px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border ${notification.type === 'success' ? 'bg-blue-600 border-blue-500 text-white' : notification.type === 'danger' ? 'bg-red-600 border-red-500 text-white' : 'bg-orange-600 border-orange-500 text-white'}`}>
            <div className="p-1.5 bg-white/20 rounded-full">
              {notification.type === 'success' ? <Shield size={16} /> : notification.type === 'danger' ? <Trash2 size={16} /> : <Smartphone size={16} />}
            </div>
            <span className="font-black text-xs uppercase tracking-widest">{notification.message}</span>
          </div>
        </div>
      )}

      {showTwoFactorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[3rem] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200 border-4 border-white/50 dark:border-gray-700">
            <div className="h-24 w-24 bg-blue-100 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Shield size={48} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Login Security</h2>
            <p className="text-gray-500 font-medium mb-8">Follow the instructions to secure your identity.</p>

            {twoFactorStep === 'setup' ? (
              <div className="space-y-8">
                <div className="bg-gray-100 dark:bg-gray-900 p-8 rounded-[2rem] border-4 border-dashed border-gray-200 dark:border-gray-700 transition-colors">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-4">Your Setup Secret</p>
                  <p className="text-4xl font-black text-blue-600 tracking-widest font-mono selection:bg-blue-100">{setupOtp}</p>
                </div>

                {/* Recovery Codes Section */}
                {recoveryCodes.length > 0 && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-[2rem] border-2 border-indigo-100 dark:border-indigo-800 text-left">
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-2 px-2">Backup Recovery Codes (Save these!)</p>
                    <div className="grid grid-cols-1 gap-1 px-2">
                      {recoveryCodes.map((c, idx) => (
                        <code key={idx} className="text-xs font-mono text-indigo-700 dark:text-indigo-300 bg-white/50 dark:bg-black/20 px-2 py-1 rounded-lg">{c}</code>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={() => setTwoFactorStep('verify')} className="w-full bg-blue-600 text-white font-black py-5 rounded-3xl hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all active:scale-95 group flex items-center justify-center gap-2">
                  Proceed to Verify <RefreshCw className="group-hover:rotate-180 transition-transform duration-500" size={18} />
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={otpValue}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length <= 6) setOtpValue(val);
                  }}
                  placeholder="000000"
                  className="w-full px-6 py-6 rounded-3xl border-4 border-blue-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white text-center text-4xl font-black tracking-[0.4em] focus:border-blue-600 outline-none transition-all placeholder-gray-300"
                  maxLength={6}
                />
                <button onClick={verifySetup} className="w-full bg-blue-600 text-white font-black py-5 rounded-3xl hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all active:scale-95">Verify & Finish Setup</button>
              </div>
            )}
            <button onClick={() => setShowTwoFactorModal(false)} className="mt-6 text-gray-400 font-black text-sm uppercase tracking-widest hover:text-gray-600 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationToggle({ label, description, enabled, onToggle, icon, color = 'blue' }: any) {
  const activeColor = color === 'blue' ? 'bg-blue-600' : 'bg-indigo-600';
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-gray-50/50 dark:bg-gray-900/50 rounded-[2.5rem] border dark:border-gray-700 gap-4 hover:border-gray-200 dark:hover:border-gray-600 transition-all">
      <div className="flex items-center gap-5">
        <div className={`p-4 rounded-2xl ${enabled ? (color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600') : 'bg-white dark:bg-gray-800 text-gray-400'} shadow-sm transition-colors`}>
          {icon}
        </div>
        <div>
          <h4 className="font-black text-gray-900 dark:text-white">{label}</h4>
          <p className="text-xs text-gray-400 font-medium mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`w-16 h-10 rounded-full transition-all relative ${enabled ? activeColor : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <div className={`absolute top-1.5 w-7 h-7 bg-white rounded-full shadow-lg transition-all ${enabled ? 'left-7.5' : 'left-1.5'}`} />
      </button>
    </div>
  );
}
