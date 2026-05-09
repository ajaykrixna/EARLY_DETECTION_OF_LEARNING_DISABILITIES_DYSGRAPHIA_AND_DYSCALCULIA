import { useState, useEffect } from 'react';
import { Menu, X, FileText, Brain, History, User, LogOut, Shield, Users, Stethoscope, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

interface LayoutProps {
    children: React.ReactNode;
    currentPage: string;
    onNavigate: (page: string, params?: any) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { signOut, user } = useAuth();
    const { t } = useLanguage();
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return false;
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const getNavItems = () => {
        const role = user?.role || 'student';
        // Common items
        const profileItem = { id: 'profile', label: t.nav.profile, icon: User };

        if (role === 'admin') {
            return [
                { id: 'dashboard', label: 'Admin Panel', icon: Shield },
                profileItem
            ];
        }
        if (role === 'teacher') {
            return [
                { id: 'dashboard', label: 'Class Overview', icon: Users },
                profileItem
            ];
        }
        if (role === 'doctor') {
            return [
                { id: 'dashboard', label: 'Patient List', icon: Stethoscope },
                profileItem
            ];
        }
        // Default (Student)
        return [
            { id: 'dashboard', label: t.nav.dashboard, icon: Brain },
            { id: 'dysgraphia', label: t.nav.dysgraphia, icon: FileText },
            { id: 'dyscalculia', label: t.nav.dyscalculia, icon: Brain },
            { id: 'history', label: t.nav.history, icon: History },
            profileItem
        ];
    };

    const navItems = getNavItems();

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 animate-gradient-xy relative overflow-hidden transition-colors duration-500 text-gray-900 dark:text-white">

            {/* Background Shapes (Matches Welcome/Auth style but subtler) */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-20 left-20 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl animate-pulse delay-0"></div>
                <div className="absolute bottom-20 right-20 w-[30rem] h-[30rem] bg-pink-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl animate-float delay-500"></div>
            </div>

            {/* Glassmorphism Navbar */}
            <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/90 backdrop-blur-md border-b border-white/20 dark:border-gray-800 shadow-sm transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">

                        {/* Logo */}
                        <div className="flex items-center group cursor-pointer" onClick={() => onNavigate('dashboard')}>
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-400 rounded-full blur animate-pulse opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                <Brain className="h-8 w-8 text-indigo-600 relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
                            </div>
                            <span className="ml-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                                {t.common.appTitle || "NeuroSense"}
                            </span>
                        </div>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center space-x-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentPage === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onNavigate(item.id)}
                                        className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 relative group overflow-hidden ${isActive
                                            ? 'text-indigo-700 bg-indigo-50 border border-indigo-100 shadow-sm'
                                            : 'text-gray-600 hover:text-indigo-600 hover:bg-white/50'
                                            }`}
                                    >
                                        {/* Hover Effect Background */}
                                        <div className={`absolute inset-0 bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isActive ? 'opacity-100' : ''}`}></div>

                                        <Icon className={`h-4 w-4 mr-2 relative z-10 ${isActive ? 'text-indigo-600' : 'group-hover:text-indigo-500'}`} />
                                        <span className="relative z-10">{item.label}</span>
                                    </button>
                                );
                            })}

                            <div className="h-6 w-px bg-gray-200 mx-2"></div>

                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className="p-2 text-gray-600 hover:text-indigo-600 dark:text-gray-200 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                            </button>

                            <LanguageSwitcher />

                            <button
                                onClick={signOut}
                                className="flex items-center px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 ml-2"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                {t.nav.signOut}
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-gray-600 hover:text-indigo-600 transition-colors"
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl absolute w-full left-0 animate-slide-up shadow-lg">
                        <div className="px-4 pt-2 pb-4 space-y-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentPage === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            onNavigate(item.id);
                                            setMobileMenuOpen(false);
                                        }}
                                        className={`flex items-center w-full px-4 py-3 rounded-xl text-base font-medium transition-all ${isActive
                                            ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                                        {item.label}
                                    </button>
                                );
                            })}
                            <div className="px-2 py-3 border-t border-gray-100 dark:border-gray-800 mt-2">
                                <LanguageSwitcher />
                            </div>
                            <button
                                onClick={signOut}
                                className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all mt-2"
                            >
                                <LogOut className="h-5 w-5 mr-3" />
                                {t.nav.signOut}
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in" key={currentPage}>
                {children}
            </main>
        </div>
    );
}
