import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Brain, Lock, Mail, User, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'security' | 'error' } | null>(null);

  const showSecurityToast = (otp: string) => {
    setNotification({ message: `SECURITY ALERT: Your verification code is ${otp}`, type: 'security' });
    setTimeout(() => setNotification(null), 10000); // Show for 10s
  };

  const { signIn, signUp, verifyOTP, verifyRecovery } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (show2FA) {
        if (isRecoveryMode) {
          await verifyRecovery(otp, userId);
        } else {
          await verifyOTP(otp, userId);
        }
      } else if (isSignUp) {
        await signUp(email, password, fullName, role);
      } else {
        const result = await signIn(email, password);
        if (result && result.require_2fa) {
          setShow2FA(true);
          setUserId(result.user_id || '');
          if (result.otp_debug) {
            showSecurityToast(result.otp_debug);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 animate-gradient-xy">

      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[45%] h-[45%] bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="absolute top-4 right-4 z-50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-sm">
        <LanguageSwitcher />
      </div>

      <div className="max-w-md w-full glass-effect dark:bg-gray-800/80 rounded-3xl shadow-2xl p-8 z-10 border border-white/50 dark:border-gray-700 animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-6 shadow-lg shadow-blue-200 animate-bounce-slow">
            <Brain className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
            {t.common.appTitle}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
            {t.common.appSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {show2FA ? (
            <div className="animate-slide-up">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 text-center">
                {isRecoveryMode ? 'Enter Recovery Code' : 'Enter Two-Factor Code'}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ShieldCheck className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  inputMode={isRecoveryMode ? "text" : "numeric"}
                  pattern={isRecoveryMode ? undefined : "[0-9]*"}
                  value={otp}
                  onChange={(e) => {
                    if (isRecoveryMode) {
                      setOtp(e.target.value.toUpperCase());
                    } else {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length <= 6) setOtp(val);
                    }
                  }}
                  className={`block w-full pl-10 pr-3 py-4 border-2 border-blue-100 dark:border-gray-600 rounded-xl leading-5 bg-white/50 dark:bg-gray-700/50 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white text-center font-black tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${isRecoveryMode ? 'text-xl' : 'text-4xl'}`}
                  placeholder={isRecoveryMode ? "ABC123XYZ0" : "000000"}
                  maxLength={isRecoveryMode ? 10 : 6}
                  required
                />
              </div>
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveryMode(!isRecoveryMode);
                    setOtp('');
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  {isRecoveryMode ? 'Back to standard 2FA' : 'Lost your device? Use recovery code'}
                </button>
              </div>
              <p className="text-xs text-center text-gray-500 mt-2">
                {isRecoveryMode ? 'Enter one of your 10-character backup codes.' : 'A verification code was generated for your account.'}
              </p>
            </div>
          ) : (
            <>
              {isSignUp && (
                <div className="space-y-4 animate-slide-up delay-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 ml-1">
                      {t.auth.fullName}
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-600 rounded-xl leading-5 bg-white/50 dark:bg-gray-700/50 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-white dark:hover:bg-gray-700"
                        placeholder="John Doe"
                        required={isSignUp}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 ml-1">
                      {t.auth.roleLabel}
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ShieldCheck className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-600 rounded-xl leading-5 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-white dark:hover:bg-gray-700 appearance-none"
                      >
                        <option value="student">{t.auth.student}</option>
                        <option value="parent">{t.auth.parent}</option>
                        <option value="teacher">{t.auth.teacher}</option>
                        <option value="doctor">{t.auth.doctor}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="animate-slide-up delay-200">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 ml-1">
                  {t.auth.email}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-600 rounded-xl leading-5 bg-white/50 dark:bg-gray-700/50 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-white dark:hover:bg-gray-700"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div className="animate-slide-up delay-300">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 ml-1">
                  {t.auth.password}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-600 rounded-xl leading-5 bg-white/50 dark:bg-gray-700/50 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-white dark:hover:bg-gray-700"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm border border-red-100 dark:border-red-800 animate-slide-up">
              {error}
            </div>
          )}

          <div className="pt-2 animate-slide-up delay-300">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t.common.loading}
                </span>
              ) : (isSignUp ? t.auth.createAccount : t.auth.signIn)}
            </button>
          </div>

          <div className="text-center animate-slide-up delay-300">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors hover:underline"
            >
              {isSignUp ? t.auth.hasAccount : t.auth.noAccount}
            </button>
          </div>
        </form>
      </div>

      {/* Footer / Branding */}
      <div className="absolute bottom-6 text-center w-full text-gray-500/60 text-xs pointer-events-none animate-fade-in delay-300">
        © {new Date().getFullYear()} {t.common.appTitle}. All rights reserved.
      </div>

      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 w-max z-[9999] animate-fade-in">
          <div className={`px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-5 border backdrop-blur-xl transition-all ${notification.type === 'security' ? 'bg-indigo-600/90 border-indigo-500 text-white' : 'bg-rose-600/90 border-rose-500 text-white'
            }`}>
            <div className="p-2.5 bg-white/20 rounded-full">
              <Lock size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Security Relay</p>
              <p className="font-bold text-sm tracking-wide">{notification.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
