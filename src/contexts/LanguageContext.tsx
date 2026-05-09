import { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'es' | 'fr' | 'de' | 'hi' | 'zh' | 'ml';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: typeof translations.en;
}

export const translations = {
    en: {
        common: { loading: 'Loading...', error: 'Error', success: 'Success', cancel: 'Cancel', save: 'Save', appTitle: 'NeuroSense', appSubtitle: 'AI-powered early detection tool' },
        nav: { dashboard: 'Dashboard', dysgraphia: 'Dysgraphia Test', dyscalculia: 'Dyscalculia Test', history: 'Test History', profile: 'Profile', signIn: 'Sign In', signOut: 'Sign Out' },
        dashboard: { welcome: 'Welcome', welcomeBack: 'Welcome Back', selectTest: 'Select a test to begin', dysgraphiaCard: 'Dysgraphia Test', dysgraphiaDesc: 'Analyze handwriting samples to detect early signs of dysgraphia.', dyscalculiaCard: 'Dyscalculia Test', dyscalculiaDesc: 'Take a math screening quiz to assess dyscalculia risk.', startTest: 'Start Test' },
        dysgraphia: { title: 'Dysgraphia Detection Test', dragDrop: 'Drag & drop handwriting sample', analyzing: 'Analyzing...', result: 'Analysis Result', prediction: 'Prediction', confidence: 'Confidence', takeAnother: 'Take Another Test', downloadReport: 'Download Report' },
        dyscalculia: { title: 'Dyscalculia Screening Quiz', instructions: 'Answer the following math questions.', start: 'Start Quiz', nextQuestion: 'Next Question', prevQuestion: 'Previous', submit: 'Submit', result: 'Quiz Result', prediction: 'Risk Level', confidence: 'Confidence', accuracy: 'Accuracy', takeAnother: 'Retake Quiz', downloadReport: 'Download Report', analyzing: 'Analyzing...' },
        history: { title: 'Test History', dysgraphiaTests: 'Dysgraphia Tests', dyscalculiaTests: 'Dyscalculia Tests', noTests: 'No test history found.', confidence: 'Confidence' },
        profile: { title: 'User Profile', edit: 'Edit Profile', name: 'Full Name', age: 'Age', role: 'Role', language: 'Language', updateSuccess: 'Profile updated successfully!', updated: 'Profile updated successfully!' },
        auth: { signInTitle: 'Sign in to your account', signUpTitle: 'Create a new account', email: 'Email address', password: 'Password', fullName: 'Full Name', noAccount: "Don't have an account? Sign up", hasAccount: 'Already have an account? Sign in', createAccount: 'Create Account', signIn: 'Sign In', roleLabel: 'Role', student: 'Student', parent: 'Parent', teacher: 'Teacher', doctor: 'Health Professional' },
        results: { disclaimer: 'This is an AI screening tool. Please consult a qualified professional for diagnosis.' },
        welcomePage: { title: 'Neuro', subtitle: 'Sense', description1: 'Empowering early detection of ', dysgraphia: 'Dysgraphia', and: ' and ', dyscalculia: 'Dyscalculia', description2: ' with AI.', getStarted: 'Get Started' }
    },
    es: {
        common: { loading: 'Cargando...', error: 'Error', success: 'Éxito', cancel: 'Cancelar', save: 'Guardar', appTitle: 'NeuroSense', appSubtitle: 'Herramienta de detección temprana con IA' },
        nav: { dashboard: 'Tablero', dysgraphia: 'Prueba Disgrafía', dyscalculia: 'Prueba Discalculia', history: 'Historial', profile: 'Perfil', signIn: 'Iniciar Sesión', signOut: 'Cerrar Sesión' },
        dashboard: { welcome: 'Bienvenido', welcomeBack: 'Bienvenido de nuevo', selectTest: 'Selecciona una prueba', dysgraphiaCard: 'Prueba de Disgrafía', dysgraphiaDesc: 'Analiza muestras de escritura.', dyscalculiaCard: 'Prueba de Discalculia', dyscalculiaDesc: 'Toma un cuestionario de matemáticas.', startTest: 'Iniciar Prueba' },
        dysgraphia: { title: 'Prueba de Detección de Disgrafía', dragDrop: 'Arrastra tu muestra de escritura', analyzing: 'Analizando...', result: 'Resultado del Análisis', prediction: 'Predicción', confidence: 'Confianza', takeAnother: 'Otra Prueba', downloadReport: 'Descargar Reporte' },
        dyscalculia: { title: 'Cuestionario de Discalculia', instructions: 'Responde las siguientes preguntas matemáticas.', start: 'Iniciar', nextQuestion: 'Siguiente', prevQuestion: 'Anterior', submit: 'Enviar', result: 'Resultado', prediction: 'Nivel de Riesgo', confidence: 'Confianza', accuracy: 'Precisión', takeAnother: 'Repetir Prueba', downloadReport: 'Descargar Reporte', analyzing: 'Analizando...' },
        history: { title: 'Historial de Pruebas', dysgraphiaTests: 'Pruebas de Disgrafía', dyscalculiaTests: 'Pruebas de Discalculia', noTests: 'No se encontró historial.', confidence: 'Confianza' },
        profile: { title: 'Perfil de Usuario', edit: 'Editar Perfil', name: 'Nombre Completo', age: 'Edad', role: 'Rol', language: 'Idioma', updateSuccess: 'Perfil actualizado con éxito!', updated: 'Perfil actualizado con éxito!' },
        auth: { signInTitle: 'Inicia sesión', signUpTitle: 'Crear cuenta nueva', email: 'Correo electrónico', password: 'Contraseña', fullName: 'Nombre Completo', noAccount: '¿No tienes cuenta? Regístrate', hasAccount: '¿Ya tienes cuenta? Inicia sesión', createAccount: 'Crear Cuenta', signIn: 'Iniciar Sesión', roleLabel: 'Rol', student: 'Estudiante', parent: 'Padre', teacher: 'Profesor', doctor: 'Profesional de la salud' },
        results: { disclaimer: 'Esta es una herramienta de detección por IA. Consulte a un profesional para el diagnóstico.' },
        welcomePage: { title: 'Neuro', subtitle: 'Sense', description1: 'Potenciando la detección temprana de ', dysgraphia: 'Disgrafía', and: ' y ', dyscalculia: 'Discalculia', description2: ' con IA.', getStarted: 'Empezar' }
    },
    fr: {
        common: { loading: 'Chargement...', error: 'Erreur', success: 'Succès', cancel: 'Annuler', save: 'Enregistrer', appTitle: 'NeuroSense', appSubtitle: 'Outil de détection précoce par IA' },
        nav: { dashboard: 'Tableau de bord', dysgraphia: 'Test Dysgraphie', dyscalculia: 'Test Dyscalculie', history: 'Historique', profile: 'Profil', signIn: 'Se connecter', signOut: 'Se déconnecter' },
        dashboard: { welcome: 'Bienvenue', welcomeBack: 'Bon retour', selectTest: 'Sélectionnez un test', dysgraphiaCard: 'Test Dysgraphie', dysgraphiaDesc: 'Analysez des échantillons d\'écriture.', dyscalculiaCard: 'Test Dyscalculie', dyscalculiaDesc: 'Passez un quiz mathématique.', startTest: 'Commencer le test' },
        dysgraphia: { title: 'Test de Détection Dysgraphie', dragDrop: 'Glisser-déposer l\'échantillon', analyzing: 'Analyse...', result: 'Résultat', prediction: 'Prédiction', confidence: 'Confiance', takeAnother: 'Autre Test', downloadReport: 'Télécharger Rapport' },
        dyscalculia: { title: 'Quiz de Dépistage Dyscalculie', instructions: 'Répondez aux questions mathématiques.', start: 'Démarrer', nextQuestion: 'Suivant', prevQuestion: 'Précédent', submit: 'Soumettre', result: 'Résultat', prediction: 'Niveau de Risque', confidence: 'Confiance', accuracy: 'Précision', takeAnother: 'Refaire le Quiz', downloadReport: 'Télécharger Rapport', analyzing: 'Analyse en cours...' },
        history: { title: 'Historique des Tests', dysgraphiaTests: 'Tests Dysgraphie', dyscalculiaTests: 'Tests Dyscalculie', noTests: 'Aucun historique trouvé.', confidence: 'Confiance' },
        profile: { title: 'Profil Utilisateur', edit: 'Modifier Profil', name: 'Nom Complet', age: 'Âge', role: 'Rôle', language: 'Langue', updateSuccess: 'Profil mis à jour!', updated: 'Profil mis à jour!' },
        auth: { signInTitle: 'Connexion', signUpTitle: 'Créer un compte', email: 'Email', password: 'Mot de passe', fullName: 'Nom Complet', noAccount: 'Pas de compte? Inscription', hasAccount: 'Déjà un compte? Connexion', createAccount: 'Créer un Compte', signIn: 'Se Connecter', roleLabel: 'Rôle', student: 'Étudiant', parent: 'Rôle parental', teacher: 'Enseignant', doctor: 'Professionnel de la santé' },
        results: { disclaimer: 'Outil de dépistage IA. Consultez un professionnel.' },
        welcomePage: { title: 'Neuro', subtitle: 'Sense', description1: 'Favoriser la détection précoce de la ', dysgraphia: 'Dysgraphie', and: ' et de la ', dyscalculia: 'Dyscalculie', description2: ' avec l\'IA.', getStarted: 'Commencer' }
    },
    de: {
        common: { loading: 'Laden...', error: 'Fehler', success: 'Erfolg', cancel: 'Abbrechen', save: 'Speichern', appTitle: 'NeuroSense', appSubtitle: 'KI-gestütztes Früherkennungstool' },
        nav: { dashboard: 'Armaturenbrett', dysgraphia: 'Dysgraphie Test', dyscalculia: 'Dyskalkulie Test', history: 'Verlauf', profile: 'Profil', signIn: 'Anmelden', signOut: 'Abmelden' },
        dashboard: { welcome: 'Willkommen', welcomeBack: 'Willkommen zurück', selectTest: 'Wählen Sie einen Test', dysgraphiaCard: 'Dysgraphie Test', dysgraphiaDesc: 'Handschrift analysieren.', dyscalculiaCard: 'Dyskalkulie Test', dyscalculiaDesc: 'Mathe-Quiz machen.', startTest: 'Test starten' },
        dysgraphia: { title: 'Dysgraphia Erkennung', dragDrop: 'Handschrift hier ablegen', analyzing: 'Analysieren...', result: 'Ergebnis', prediction: 'Vorhersage', confidence: 'Vertrauen', takeAnother: 'Neuer Test', downloadReport: 'Bericht herunterladen' },
        dyscalculia: { title: 'Dyskalkulie Quiz', instructions: 'Beantworte die Mathefragen.', start: 'Starten', nextQuestion: 'Weiter', prevQuestion: 'Zurück', submit: 'Absenden', result: 'Ergebnis', prediction: 'Risiko', confidence: 'Vertrauen', accuracy: 'Genauigkeit', takeAnother: 'Wiederholen', downloadReport: 'Bericht herunterladen', analyzing: 'Analysieren...' },
        history: { title: 'Testverlauf', dysgraphiaTests: 'Dysgraphie Tests', dyscalculiaTests: 'Dyskalkulie Tests', noTests: 'Kein Verlauf gefunden.', confidence: 'Vertrauen' },
        profile: { title: 'Benutzerprofil', edit: 'Profil bearbeiten', name: 'Vollständiger Name', age: 'Alter', role: 'Rolle', language: 'Sprache', updateSuccess: 'Profil aktualisiert!', updated: 'Profil aktualisiert!' },
        auth: { signInTitle: 'Anmelden', signUpTitle: 'Konto erstellen', email: 'E-Mail', password: 'Passwort', fullName: 'Name', noAccount: 'Kein Konto? Registrieren', hasAccount: 'Konto vorhanden? Anmelden', createAccount: 'Konto erstellen', signIn: 'Anmelden', roleLabel: 'Rolle', student: 'Student/Schüler', parent: 'Elternteil', teacher: 'Lehrer', doctor: 'Gesundheitsberuf' },
        results: { disclaimer: 'Dies ist ein KI-Tool. Bitte Arzt konsultieren.' },
        welcomePage: { title: 'Neuro', subtitle: 'Sense', description1: 'Stärkung der Früherkennung von ', dysgraphia: 'Dysgraphie', and: ' und ', dyscalculia: 'Dyskalkulie', description2: ' mit KI.', getStarted: 'Loslegen' }
    },
    hi: {
        common: { loading: 'लोड हो रहा है...', error: 'त्रुटि', success: 'सफल', cancel: 'रद्द करें', save: 'सहेजें', appTitle: 'NeuroSense', appSubtitle: 'AI-संचालित प्रारंभिक पहचान उपकरण' },
        nav: { dashboard: 'डैशबोर्ड', dysgraphia: 'डिस्ग्राफिया टेस्ट', dyscalculia: 'डिस्कैल्कुलिया टेस्ट', history: 'इतिहास', profile: 'प्रोफ़ाइल', signIn: 'साइन इन', signOut: 'साइन आउट' },
        dashboard: { welcome: 'स्वागत है', welcomeBack: 'वापसी पर स्वागत है', selectTest: 'एक परीक्षण चुनें', dysgraphiaCard: 'डिस्ग्राफिया टेस्ट', dysgraphiaDesc: 'हस्तलेखन का विश्लेषण करें', dyscalculiaCard: 'डिस्कैल्कुलिया टेस्ट', dyscalculiaDesc: 'गणित प्रश्नोत्तरी लें', startTest: 'टेस्ट शुरू करें' },
        dysgraphia: { title: 'डिस्ग्राफिया पहचान परीक्षण', dragDrop: 'हस्तलेखन नमूना खींचें', analyzing: 'विश्लेषण...', result: 'परिणाम', prediction: 'भविष्यवाणी', confidence: 'आत्मविश्वास', takeAnother: 'एक और टेस्ट लें', downloadReport: 'रिपोर्ट डाउनलोड करें' },
        dyscalculia: { title: 'डिस्कैल्कुलिया क्विज़', instructions: 'प्रश्नों का उत्तर दें', start: 'शुरू करें', nextQuestion: 'अगला', prevQuestion: 'पिछला', submit: 'जमा करें', result: 'परिणाम', prediction: 'जोखिम स्तर', confidence: 'आत्मविश्वास', accuracy: 'सटीकता', takeAnother: 'फिर से करें', downloadReport: 'रिपोर्ट डाउनलोड करें', analyzing: 'विश्लेषण कर रहा है...' },
        history: { title: 'टेस्ट इतिहास', dysgraphiaTests: 'डिस्ग्राफिया टेस्ट', dyscalculiaTests: 'डिस्कैल्कुलिया टेस्ट', noTests: 'कोई इतिहास नहीं मिला', confidence: 'आत्मविश्वास' },
        profile: { title: 'यूज़र प्रोफ़ाइल', edit: 'संपादित करें', name: 'पूरा नाम', age: 'आयु', role: 'भूमिका', language: 'भाषा', updateSuccess: 'प्रोफ़ाइल अपडेट हो गई!', updated: 'प्रोफ़ाइल अपडेट हो गई!' },
        auth: { signInTitle: 'साइन इन करें', signUpTitle: 'खाता बनाएं', email: 'ईमेल', password: 'पासवर्ड', fullName: 'पूरा नाम', noAccount: 'खाता नहीं है? साइन अप', hasAccount: 'खाता है? साइन इन', createAccount: 'खाता बनाएं', signIn: 'साइन इन', roleLabel: 'भूमिका', student: 'छात्र', parent: 'माता-पिता', teacher: 'अध्यापक', doctor: 'स्वास्थ्य पेशेवर' },
        results: { disclaimer: 'यह एक AI टूल है. डॉक्टर से सलाह लें.' },
        welcomePage: { title: 'Neuro', subtitle: 'Sense', description1: 'AI के साथ ', dysgraphia: 'डिस्ग्राफिया', and: ' और ', dyscalculia: 'डिस्कैल्कुलिया', description2: ' की प्रारंभिक पहचान को सशक्त बनाना।', getStarted: 'शुरू करें' }
    },
    zh: {
        common: { loading: '加载中...', error: '错误', success: '成功', cancel: '取消', save: '保存', appTitle: 'NeuroSense', appSubtitle: 'AI驱动的早期检测工具' },
        nav: { dashboard: '仪表板', dysgraphia: '书写障碍测试', dyscalculia: '计算障碍测试', history: '历史记录', profile: '个人资料', signIn: '登录', signOut: '退出' },
        dashboard: { welcome: '欢迎', welcomeBack: '欢迎回来', selectTest: '选择一个测试', dysgraphiaCard: '书写障碍测试', dysgraphiaDesc: '分析手写样本', dyscalculiaCard: '计算障碍测试', dyscalculiaDesc: '进行数学测验', startTest: '开始测试' },
        dysgraphia: { title: '书写障碍检测', dragDrop: '拖放手写样本', analyzing: '分析中...', result: '分析结果', prediction: '预测', confidence: '置信度', takeAnother: '再测一次', downloadReport: '下载报告' },
        dyscalculia: { title: '计算障碍筛查', instructions: '回答数学问题', start: '开始', nextQuestion: '下一题', prevQuestion: '上一题', submit: '提交', result: '结果', prediction: '风险等级', confidence: '置信度', accuracy: '准确率', takeAnother: '重测', downloadReport: '下载报告', analyzing: '正在分析...' },
        history: { title: '测试历史', dysgraphiaTests: '书写障碍测试', dyscalculiaTests: '计算障碍测试', noTests: '无历史记录', confidence: '置信度' },
        profile: { title: '用户资料', edit: '编辑资料', name: '全名', age: '年龄', role: '角色', language: '语言', updateSuccess: '资料更新成功！', updated: '资料更新成功！' },
        auth: { signInTitle: '登录', signUpTitle: '创建新账户', email: '邮箱', password: '密码', fullName: '全名', noAccount: '没有账户？注册', hasAccount: '已有账户？登录', createAccount: '创建账户', signIn: '登录', roleLabel: '角色', student: '学生', parent: '家长', teacher: '老师', doctor: '健康顾问' },
        results: { disclaimer: '这是AI筛查工具，请咨询专业人士。' },
        welcomePage: { title: 'Neuro', subtitle: 'Sense', description1: '利用人工智能辅助早期检测', dysgraphia: '书写障碍', and: '和', dyscalculia: '计算障碍', description2: '。', getStarted: '开始' }
    },
    ml: {
        common: { loading: 'ലോഡുചെയ്യുന്നു...', error: 'പിശക്', success: 'വിജയിച്ചു', cancel: 'റദ്ദാക്കുക', save: 'സംരക്ഷിക്കുക', appTitle: 'NeuroSense', appSubtitle: 'AI ഉപയോഗിച്ചുള്ള തിരിച്ചറിയൽ ഉപകരണം' },
        nav: { dashboard: 'ഡാഷ്‌ബോർഡ്', dysgraphia: 'ഡിസ്ഗ്രാഫിയ ടെസ്റ്റ്', dyscalculia: 'ഡിസ്കാൽക്കുലിയ ടെസ്റ്റ്', history: 'ചരിത്രം', profile: 'പ്രൊഫൈൽ', signIn: 'സൈൻ ഇൻ', signOut: 'പുറത്തുകടക്കുക' },
        dashboard: { welcome: 'സ്വാഗതം', welcomeBack: 'തിരിച്ചുവരവിന് സ്വാഗതം', selectTest: 'തുടങ്ങാൻ ഒരു ടെസ്റ്റ് തിരഞ്ഞെടുക്കുക', dysgraphiaCard: 'ഡിസ്ഗ്രാഫിയ ടെസ്റ്റ്', dysgraphiaDesc: 'കൈയക്ഷര സാമ്പിളുകൾ പരിശോധിക്കുക', dyscalculiaCard: 'ഡിസ്കാൽക്കുലിയ ടെസ്റ്റ്', dyscalculiaDesc: 'ഗണിത ക്വിസ് നടത്തുക', startTest: 'ടെസ്റ്റ് തുടങ്ങുക' },
        dysgraphia: { title: 'ഡിസ്ഗ്രാഫിയ തിരിച്ചറിയൽ', dragDrop: 'കൈയക്ഷര സാമ്പിൾ ഇവിടെ ഇടുക', analyzing: 'പരിശോധിക്കുന്നു...', result: 'ഫലം', prediction: 'പ്രവചനം', confidence: 'വിശ്വാസ്യത', takeAnother: 'മറ്റൊരു ടെസ്റ്റ് നടത്തുക', downloadReport: 'റിപ്പോർട്ട് ഡൗൺലോഡ് ചെയ്യുക' },
        dyscalculia: { title: 'ഡിസ്കാൽക്കുലിയ ക്വിസ്', instructions: 'താഴെ പറയുന്ന ഗണിത ചോദ്യങ്ങൾക്ക് ഉത്തരം നൽകുക', start: 'തുടങ്ങുക', nextQuestion: 'അടുത്തത്', prevQuestion: 'മുമ്പത്തേത്', submit: 'സമർപ്പിക്കുക', result: 'ഫലം', prediction: 'റിസ്ക് നില', confidence: 'വിശ്വാസ്യത', accuracy: 'കൃത്യത', takeAnother: 'വീണ്ടും ചെയ്യുക', downloadReport: 'റിപ്പോർട്ട് ഡൗൺലോഡ് ചെയ്യുക', analyzing: 'പരിശോധിക്കുന്നു...' },
        history: { title: 'ടെസ്റ്റ് ചരിത്രം', dysgraphiaTests: 'ഡിസ്ഗ്രാഫിയ ടെസ്റ്റുകൾ', dyscalculiaTests: 'ഡിസ്കാൽക്കുലിയ ടെസ്റ്റുകൾ', noTests: 'ചരിത്രം ലഭ്യമല്ല', confidence: 'വിശ്വാസ്യത' },
        profile: { title: 'ഉപയോക്തൃ പ്രൊഫൈൽ', edit: 'പ്രൊഫൈൽ എഡിറ്റ് ചെയ്യുക', name: 'പൂർണ്ണ നാമം', age: 'വയസ്സ്', role: 'റോൾ', language: 'ഭാഷ', updateSuccess: 'പ്രൊഫൈൽ പുതുക്കി!', updated: 'പ്രൊഫൈൽ പുതുക്കി!' },
        auth: { signInTitle: 'സൈൻ ഇൻ ചെയ്യുക', signUpTitle: 'പുതിയ അക്കൗണ്ട് തുടങ്ങുക', email: 'ഇമെയിൽ', password: 'പാസ്‌വേഡ്', fullName: 'പൂർണ്ണ നാമം', noAccount: 'അക്കൗണ്ട് ഇല്ലേ? സൈൻ അപ്പ്', hasAccount: 'അക്കൗണ്ട് ഉണ്ടോ? സൈൻ ഇൻ', createAccount: 'അക്കൗണ്ട് തുടങ്ങുക', signIn: 'സൈൻ ഇൻ', roleLabel: 'റോൾ', student: 'വിദ്യാർത്ഥി', parent: 'രക്ഷിതാവ്', teacher: 'അധ്യാപകൻ', doctor: 'ആരോഗ്യ വിദഗ്ദ്ധൻ' },
        results: { disclaimer: 'ഇതൊരു AI ഉപകരണം മാത്രമാണ്. കൃത്യമായ രോഗനിർണ്ണയത്തിന് ഡോക്ടറെ കാണുക.' },
        welcomePage: { title: 'Neuro', subtitle: 'Sense', description1: 'AI ഉപയോഗിച്ച് ', dysgraphia: 'ഡിസ്ഗ്രാഫിയ', and: ', ', dyscalculia: 'ഡിസ്കാൽക്കുലിയ', description2: ' എന്നിവ നേരത്തെ കണ്ടെത്താൻ സഹായിക്കുന്നു.', getStarted: 'തുടങ്ങുക' }
    }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en');

    useEffect(() => {
        const saved = localStorage.getItem('language') as Language;
        if (saved && translations[saved]) {
            setLanguageState(saved);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
