import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { DysgraphiaTest } from './components/DysgraphiaTest';
import { DyscalculiaTest } from './components/DyscalculiaTest';
import { TestHistory } from './components/TestHistory';
import { Profile } from './components/Profile';
import { LiveClassRoom } from './components/LiveClassRoom';
import { ConsultationRoom } from './components/ConsultationRoom';

import { Welcome } from './components/Welcome';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageParams, setPageParams] = useState<any>(null);
  const { user, loading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true);

  // Initialize dark mode
  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Global Text-to-Speech (TTS) on Hover
  useEffect(() => {
    if (user?.accessibility?.tts) {
      let timeoutId: NodeJS.Timeout;

      const handleMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const validTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BUTTON', 'A', 'SPAN', 'LABEL', 'TH', 'TD', 'LI', 'DIV'];

        if (validTags.includes(target.tagName) || target.getAttribute('role') === 'button') {
          // Avoid reading large wrapper containers
          if (target.tagName === 'DIV' && target.children.length > 2) return;

          const text = target.getAttribute('aria-label') || target.innerText || target.textContent;
          if (text && text.trim().length > 0 && text.trim().length < 400) {
            clearTimeout(timeoutId);
            window.speechSynthesis.cancel();
            timeoutId = setTimeout(() => {
              const msg = new SpeechSynthesisUtterance(text.trim());
              msg.rate = 0.95; // Slightly slower for better comprehension
              window.speechSynthesis.speak(msg);
            }, 500); // Wait half a second before reading to avoid spam
          }
        }
      };

      const handleMouseOut = () => {
        clearTimeout(timeoutId);
      };

      document.addEventListener('mouseover', handleMouseOver);
      document.addEventListener('mouseout', handleMouseOut);

      return () => {
        document.removeEventListener('mouseover', handleMouseOver);
        document.removeEventListener('mouseout', handleMouseOut);
        clearTimeout(timeoutId);
        window.speechSynthesis.cancel();
      };
    } else {
      window.speechSynthesis.cancel();
    }
  }, [user?.accessibility?.tts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && showWelcome) {
    return <Welcome onStart={() => setShowWelcome(false)} />;
  }

  if (!user) {
    return <Auth />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={(page, params) => { setCurrentPage(page); setPageParams(params); }} />;
      case 'dysgraphia':
        return <DysgraphiaTest />;
      case 'dyscalculia':
        return <DyscalculiaTest />;
      case 'history':
        return <TestHistory userId={pageParams?.userId} />;
      case 'profile':
        return <Profile />;
      case 'live-class':
        return <LiveClassRoom classId={pageParams?.classId} onExit={() => setCurrentPage('dashboard')} />;
      case 'consultation':
        return <ConsultationRoom apptId={pageParams?.apptId} onExit={() => setCurrentPage('dashboard')} />;
      default:
        return <Dashboard onNavigate={(page, params) => { setCurrentPage(page); setPageParams(params); }} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={(page) => { setCurrentPage(page); setPageParams(null); }}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
