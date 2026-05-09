import { useLanguage, Language } from '../contexts/LanguageContext';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();

    const languages: { code: Language; label: string }[] = [
        { code: 'en', label: 'English' },
        { code: 'es', label: 'Español' },
        { code: 'fr', label: 'Français' },
        { code: 'de', label: 'Deutsch' },
        { code: 'hi', label: 'हिंदी' },
        { code: 'zh', label: '中文' },
        { code: 'ml', label: 'മലയാളം' },
    ];

    return (
        <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Globe className="h-5 w-5" />
                <span className="hidden sm:inline font-medium uppercase">{language}</span>
            </button>

            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 hidden group-hover:block z-50">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between ${language === lang.code ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'
                            }`}
                    >
                        <span>{lang.label}</span>
                        {language === lang.code && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                    </button>
                ))}
            </div>
        </div>
    );
}
