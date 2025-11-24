import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, Auth } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, Firestore, collection, query, limit, getDocs } from 'firebase/firestore';

import { IconUser, IconBriefcase, IconGraduationCap, IconHeartHandshake, LoadingSpinner, IconPlusCircle, IconStar } from './components/icons';
import AiRecruiterModule from './components/AiRecruiterModule';
import VeteranJobsModule from './components/VeteranJobsModule';
import EdTechModule from './components/EdTechModule';
import LiveSupportModule from './components/LiveSupportModule';
import CreateVacancyForm from './components/CreateVacancyForm';
import HrVacancyList from './components/HrVacancyList';
import VeteranProfileModule from './components/VeteranProfileModule'; // Імпортуємо новий модуль
import { seedSupportChat } from './utils/seed';

// Canvas-provided global variables
declare const __app_id: string | undefined;
declare const __initial_auth_token: string | undefined;

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCIN063xZHW3v-zMi2a1y-aNoMYhLjiZtA",
  authDomain: "herowayua-2014.firebaseapp.com",
  projectId: "herowayua-2014",
  storageBucket: "herowayua-2014.appspot.com",
  messagingSenderId: "946517753531",
  appId: "1:946517753531:web:fe6fc6dc75b1b324d5739e",
  measurementId: "G-KPGF7BNQM9"
};


// Global Firebase instances
let db: Firestore;
let auth: Auth;

const PRIMARY_COLOR = 'bg-[#002B49]'; // Dark Blue
const ACCENT_COLOR = 'bg-[#FFC300]'; // Gold

// --- Main App Component ---
const App: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentView, setCurrentView] = useState('dashboard');
    const [jobsExist, setJobsExist] = useState(true); // Assume they exist to avoid UI flicker
    const [favoriteJobsCount, setFavoriteJobsCount] = useState<number>(0);
    const [initialJobsFilter, setInitialJobsFilter] = useState<'all' | 'favorites'>('all');

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    useEffect(() => {
        if (!firebaseConfig.projectId) {
            setError("Конфігурацію Firebase не знайдено або вона недійсна. Поле 'projectId' є обов'язковим.");
            setLoading(false);
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            getAnalytics(app);
            db = getFirestore(app);
            auth = getAuth(app);

            const authenticate = async (authInstance: Auth) => {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(authInstance, initialAuthToken);
                    } else {
                        await signInAnonymously(authInstance);
                    }
                } catch (e: any) {
                     if (e.code === 'auth/configuration-not-found') {
                        console.error("Firebase Authentication configuration not found:", e);
                        setError("Помилка конфігурації автентифікації. Будь ласка, переконайтеся, що методи входу 'Anonymous' та 'Email/Password' увімкнені в налаштуваннях автентифікації вашого проєкту Firebase.");
                    } else {
                        console.error("Authentication error:", e);
                        setError("Сталася невідома помилка автентифікації. Будь ласка, перевірте консоль та налаштування Firebase.");
                    }
                }
            };
            
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    setUserId(null);
                    setUserRole(null);
                }
                setIsAuthReady(true);
                setLoading(false);
            });

            authenticate(auth);
            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase initialization error:", e);
            setError("Не вдалося ініціалізувати систему. Перевірте конфігурацію.");
            setLoading(false);
        }
    }, [initialAuthToken]);

    useEffect(() => {
        if (!isAuthReady || !userId || !db) return;

        const profileRef = doc(db, 'artifacts', appId, 'users', userId, 'user_profiles', 'data');
        
        const unsubscribe = onSnapshot(profileRef, async (docSnap) => {
            if (docSnap.exists()) {
                const profileData = docSnap.data();
                setUserRole(profileData.role || 'veteran');
                setUserName(profileData.name || (profileData.role === 'veteran' ? 'Герой' : 'HR-фахівець'));
            } else {
                const initialRole = initialAuthToken ? 'hr' : 'veteran';
                const newName = initialRole === 'veteran' ? 'Герой' : 'HR-фахівець';
                const newProfileData: { [key: string]: any } = {
                    uid: userId,
                    role: initialRole,
                    name: newName,
                    createdAt: new Date().toISOString(),
                };
                try {
                    // Seed user-specific data based on role
                    if (initialRole === 'veteran') {
                        await seedSupportChat(db, appId, userId);
                        newProfileData.chatSeeded = true; // Flag to prevent re-seeding for this user
                    }

                    await setDoc(profileRef, newProfileData);
                    setUserRole(initialRole);
                    setUserName(newName);
                } catch (e) {
                    console.error("Error creating profile or seeding data:", e);
                    setError("Не вдалося зберегти дані профілю.");
                }
            }
        }, (err) => {
            console.error("Profile snapshot error:", err);
            setError("Помилка отримання профілю користувача.");
        });

        return () => unsubscribe();
    }, [isAuthReady, userId, appId, initialAuthToken]);

    // Listen for favorite jobs count for veterans
    useEffect(() => {
        if (userRole === 'veteran' && userId && db) {
            const favoritesCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'favorites');
            const unsubscribe = onSnapshot(favoritesCollectionRef, (snapshot) => {
                setFavoriteJobsCount(snapshot.size);
            }, (err) => {
                console.error("Error fetching favorite jobs count:", err);
            });

            return () => unsubscribe();
        }
    }, [userRole, userId, db, appId]);


     useEffect(() => {
        if (userRole === 'hr' && db) {
            const checkJobs = async () => {
                const vacanciesCollectionRef = collection(db, 'artifacts', appId, 'vacancies');
                const q = query(vacanciesCollectionRef, limit(1));
                try {
                    const snapshot = await getDocs(q);
                    setJobsExist(!snapshot.empty);
                } catch (e) {
                    console.error("Error checking for jobs:", e);
                    setJobsExist(true); // Default to true to not break UI on error
                }
            };
            checkJobs();
        }
    }, [userRole, db, appId]);

    const handleRoleChange = async (newRole: 'veteran' | 'hr') => {
        if (!userId || !db) return;
        setCurrentView('dashboard'); // Повертаємось на дашборд при зміні ролі
        const profileRef = doc(db, 'artifacts', appId, 'users', userId, 'user_profiles', 'data');
        const newName = newRole === 'veteran' ? 'Герой' : 'HR-фахівець';
        try {
            await setDoc(profileRef, { role: newRole, name: newName }, { merge: true });
            // onSnapshot автоматично оновить стан, але для миттєвого відгуку можна оновити і вручну
            setUserRole(newRole);
            setUserName(newName);
        } catch (e) {
            console.error("Помилка оновлення ролі:", e);
            setError("Не вдалося змінити роль. Перевірте консоль.");
        }
    };

    const NavButton: React.FC<{ icon: React.ElementType; title: string; role: string; viewName: string }> = ({ icon: Icon, title, role, viewName }) => (
        <button
            className={`flex flex-col items-center justify-center p-4 m-2 text-white transition duration-300 ${PRIMARY_COLOR} hover:bg-[#003C65] hover:scale-[1.02] rounded-xl shadow-lg hover:shadow-xl active:shadow-inner active:scale-[0.99] w-full md:w-48 h-32 transform focus:outline-none focus:ring-4 focus:ring-[#FFC300]/50`}
            onClick={() => setCurrentView(viewName)}
        >
            <Icon className="w-8 h-8 text-[#FFC300] mb-2" />
            <span className="text-sm font-semibold text-center">{title}</span>
            <span className="text-xs opacity-70 mt-1">({role})</span>
        </button>
    );

    if (loading || !isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
                <div className="text-center">
                    <LoadingSpinner text="Завантаження платформи HeroWayUa..." size="lg"/>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-red-100 p-4">
                <div className="p-6 bg-white rounded-xl shadow-xl border border-red-400 max-w-lg text-center">
                    <h2 className="text-xl font-bold text-red-700 mb-4">Системна помилка</h2>
                    <p className="text-gray-700">{error}</p>
                    <p className="text-sm mt-4 text-red-500">Будь ласка, спробуйте оновити сторінку після вирішення проблеми.</p>
                </div>
            </div>
        );
    }

    const renderDashboard = () => {
        const isVeteran = userRole === 'veteran';
        const isHR = userRole === 'hr';

        return (
            <main className="max-w-7xl mx-auto p-4 md:p-8">
                <div className={`p-6 mb-8 rounded-xl shadow-xl ${ACCENT_COLOR} bg-opacity-90 text-[#002B49]`}>
                    <h2 className="text-2xl font-extrabold mb-2">
                        {isVeteran ? 'Ваш шлях до відновлення та кар\'єри' : 'AI-Рекрутер: Прискорте найм'}
                    </h2>
                    <p className="text-lg">
                        {isVeteran ? 'Оберіть модуль: підтримка, навчання або пошук роботи.' : 'Почніть з аналізу вакансій та скорингу резюме.'}
                    </p>
                </div>

                <section className="mb-10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800">Основні модулі</h3>
                        {isHR && (
                             <button 
                                onClick={() => setCurrentView('create_vacancy')}
                                className="flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition shadow-md hover:shadow-lg"
                            >
                                <IconPlusCircle className="w-5 h-5 mr-2" />
                                Додати вакансію
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap -m-2">
                        {isHR && (
                            <>
                                <NavButton icon={IconBriefcase} title="AI-Скоринг та Вакансії" role="SaaS модуль" viewName="ai_recruiter" />
                                <NavButton icon={IconGraduationCap} title="EdTech: Курси для HR" role="EdTech модуль" viewName="edtech_hr" />
                            </>
                        )}
                        {isVeteran && (
                            <>
                                <NavButton icon={IconHeartHandshake} title="Психологічна Підтримка (Наживо)" role="B2C модуль" viewName="live_support" />
                                <NavButton icon={IconBriefcase} title="Вакансії для Ветеранів" role="B2C модуль" viewName="veteran_jobs" />
                                <NavButton icon={IconGraduationCap} title="Перекваліфікація (Курси)" role="EdTech модуль" viewName="edtech_veteran" />
                                <NavButton icon={IconUser} title="Мій Профіль" role="B2C модуль" viewName="veteran_profile" />
                            </>
                        )}
                    </div>
                </section>
                
                 {isHR && (
                    <section className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                        {!jobsExist ? (
                            <div className="text-center p-8">
                                <IconBriefcase className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                <h3 className="text-xl font-bold text-gray-800 mb-2">
                                    Ваш список вакансій порожній
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Розпочніть роботу, додавши свою першу вакансію. Це дозволить вам використовувати AI-інструменти для скорингу кандидатів.
                                </p>
                                <button
                                    onClick={() => setCurrentView('create_vacancy')}
                                    className="flex items-center justify-center mx-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                    <IconPlusCircle className="w-6 h-6 mr-2" />
                                    Створити першу вакансію
                                </button>
                            </div>
                        ) : (
                            <HrVacancyList db={db} appId={appId} />
                        )}
                    </section>
                )}
                
                {isVeteran && (
                    <section className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Left side: Info */}
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-4">
                                    Швидкий доступ
                                </h3>
                                <p className="text-gray-600">
                                    Використовуйте модулі вище для пошуку роботи, навчання та підтримки.
                                </p>
                                <p className="text-sm mt-3 text-gray-500">
                                    Ваш UID: <span className="font-mono text-xs">{userId}</span>
                                </p>
                            </div>
                            {/* Right side: Favorites Card */}
                            <button 
                                onClick={() => {
                                    setInitialJobsFilter('favorites');
                                    setCurrentView('veteran_jobs');
                                }}
                                className="bg-blue-50 p-6 rounded-lg border border-blue-200 text-left hover:bg-blue-100 transition group flex flex-col justify-center disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-blue-50"
                                disabled={favoriteJobsCount === 0}
                            >
                                <div className="flex items-center">
                                    <IconStar filled className={`w-8 h-8 mr-4 ${favoriteJobsCount > 0 ? 'text-yellow-500' : 'text-gray-400'}`}/>
                                    <div>
                                        <h4 className="text-lg font-bold text-[#002B49]">Моє Вибране</h4>
                                        <p className="text-gray-600">
                                            {favoriteJobsCount > 0 
                                                ? `У вас ${favoriteJobsCount} збережених вакансій.` 
                                                : 'Зберігайте вакансії, щоб переглянути їх пізніше.'}
                                        </p>
                                    </div>
                                    <span className={`ml-auto text-sm font-semibold text-blue-600 ${favoriteJobsCount > 0 ? 'opacity-0 group-hover:opacity-100' : ''} transition-opacity duration-300`}>
                                        Переглянути →
                                    </span>
                                </div>
                            </button>
                        </div>
                    </section>
                 )}
            </main>
        );
    };

    const renderContent = () => {
        if (!userRole) {
            return (
                <div className="text-center p-8 max-w-4xl mx-auto">
                    <IconUser className="w-10 h-10 mx-auto text-gray-400" />
                    <p className="text-lg mt-3 text-gray-600">Налаштування профілю...</p>
                </div>
            );
        }

        switch (currentView) {
            case 'ai_recruiter':
                return <AiRecruiterModule setCurrentView={setCurrentView} db={db} appId={appId} />;
            case 'live_support':
                return <LiveSupportModule setCurrentView={setCurrentView} />;
            case 'edtech_hr':
            case 'edtech_veteran':
                return <EdTechModule setCurrentView={setCurrentView} userRole={userRole} db={db} appId={appId} />;
            case 'veteran_jobs':
                return <VeteranJobsModule 
                            setCurrentView={setCurrentView} 
                            db={db} 
                            appId={appId} 
                            userId={userId!} 
                            initialFilter={initialJobsFilter}
                            onViewed={() => setInitialJobsFilter('all')}
                        />;
            case 'veteran_profile':
                return <VeteranProfileModule setCurrentView={setCurrentView} db={db} appId={appId} userId={userId!} />;
            case 'create_vacancy':
                return <CreateVacancyForm onClose={() => setCurrentView('dashboard')} onSuccess={() => setJobsExist(true)} db={db} appId={appId} />;
            case 'dashboard':
            default:
                return renderDashboard();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <header className={`${PRIMARY_COLOR} text-white p-4 shadow-lg relative`}>
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold">HeroWayUa | {userRole === 'veteran' ? 'Мій Простір' : 'Панель Рекрутера'}</h1>
                    
                    {/* Role Switcher */}
                    {userRole && (
                        <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-black bg-opacity-20 p-1 rounded-lg">
                            <button 
                                onClick={() => handleRoleChange('veteran')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition ${userRole === 'veteran' ? 'bg-[#FFC300] text-[#002B49]' : 'text-white hover:bg-opacity-30 hover:bg-black'}`}
                            >
                                Профіль Ветерана
                            </button>
                            <button 
                                onClick={() => handleRoleChange('hr')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition ${userRole === 'hr' ? 'bg-[#FFC300] text-[#002B49]' : 'text-white hover:bg-opacity-30 hover:bg-black'}`}
                            >
                                Профіль HR
                            </button>
                        </div>
                    )}

                    <div className="text-right">
                        <p className="text-sm font-semibold">
                            {userName ? `Вітаємо, ${userName}!` : 'Вітаємо!'}
                        </p>
                        <p className="text-xs opacity-75 break-words" title="Ваш унікальний ідентифікатор">
                            ID: {userId}
                        </p>
                    </div>
                </div>
            </header>

            {renderContent()}
            
            <footer className={`${PRIMARY_COLOR} text-white p-4 mt-8 text-center text-sm`}>
                <p>&copy; {new Date().getFullYear()} HeroWayUa. Платформа відновлення та кар'єри. v2.2</p>
                 <p className="text-xs opacity-75 mt-1">
                    Демонстраційний режим: Перемикання ролей увімкнено.
                </p>
            </footer>
        </div>
    );
};

export default App;