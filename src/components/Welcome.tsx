
import { ArrowRight, Brain, Pencil, Calculator } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

interface WelcomeProps {
    onStart: () => void;
}

export function Welcome({ onStart }: WelcomeProps) {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col items-center justify-center p-4 relative overflow-hidden text-white">
            {/* Header / Actions */}
            <div className="absolute top-4 right-4 z-50 bg-white/10 backdrop-blur-sm rounded-lg">
                <LanguageSwitcher />
            </div>

            {/* Background Shapes */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>

            {/* Floating Icons */}
            <div className="absolute top-1/4 left-1/4 animate-bounce delay-100 opacity-20">
                <Brain className="w-16 h-16 text-white" />
            </div>
            <div className="absolute bottom-1/3 right-1/4 animate-bounce delay-300 opacity-20">
                <Pencil className="w-12 h-12 text-white" />
            </div>
            <div className="absolute top-1/3 right-1/3 animate-bounce delay-500 opacity-20">
                <Calculator className="w-10 h-10 text-white" />
            </div>

            {/* Content */}
            <div className="z-10 text-center max-w-3xl mx-auto space-y-8">
                <div className="inline-block p-4 bg-white/10 backdrop-blur-xl rounded-3xl mb-4 border border-white/20 shadow-2xl animate-fade-in-down">
                    <Brain className="w-16 h-16 text-white drop-shadow-md" />
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-xl mb-4">
                    {t.welcomePage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">{t.welcomePage.subtitle}</span>
                </h1>

                <p className="text-xl md:text-2xl text-white/90 font-light leading-relaxed max-w-xl mx-auto drop-shadow-md">
                    {t.welcomePage.description1}<span className="font-semibold text-yellow-100">{t.welcomePage.dysgraphia}</span>{t.welcomePage.and}<span className="font-semibold text-pink-100">{t.welcomePage.dyscalculia}</span>{t.welcomePage.description2}
                </p>

                <div className="pt-8">
                    <button
                        onClick={onStart}
                        className="group relative inline-flex items-center gap-3 px-10 py-5 bg-white text-indigo-600 rounded-full text-xl font-bold shadow-2xl hover:bg-gray-50 hover:scale-105 hover:shadow-indigo-500/50 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-300 ring-offset-4 ring-offset-transparent"
                    >
                        {t.welcomePage.getStarted}
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>


            </div>

            {/* Footer wave */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
                <svg className="relative block w-[calc(100%+1.3px)] h-[100px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-white/10"></path>
                </svg>
            </div>

        </div>
    );
}
