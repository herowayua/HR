import React, { useState, useEffect, useCallback } from 'react';
import { IconArrowLeft, IconUser, IconTrash2, IconPlusCircle, LoadingSpinner } from './icons';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';

// --- Інтерфейси для структури даних профілю ---

interface PersonalInfo {
    lastName: string;      // Прізвище
    firstName: string;     // Ім'я
    middleName: string;    // По батькові
    dateOfBirth: string;   // Дата народження (YYYY-MM-DD)
    city: string;          // Місто проживання
    photoURL: string;      // URL фото профілю
}

interface Experience {
    id: number;
    title: string;
    company: string;
    startDate: string;
    endDate: string;
    description: string;
}

interface Certification {
    id: number;
    name: string;
    organization: string;
    date: string;
}

interface ProfileData {
    personalInfo: PersonalInfo;
    summary: string;
    experience: Experience[];
    skills: string;
    certifications: Certification[];
}

const initialProfileData: ProfileData = {
    personalInfo: {
        lastName: '',
        firstName: '',
        middleName: '',
        dateOfBirth: '',
        city: '',
        photoURL: '',
    },
    summary: '',
    experience: [],
    skills: '',
    certifications: [],
};

// --- Пропси компонента ---
interface VeteranProfileModuleProps {
    setCurrentView: (view: string) => void;
    db: Firestore;
    appId: string;
    userId: string;
}

const PRIMARY_TEXT_COLOR = 'text-[#002B49]';
const ACCENT_TEXT_COLOR = 'text-[#FFC300]';

// --- Допоміжний компонент для секцій ---
const ProfileSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-xl font-bold text-[#002B49] mb-4">{title}</h3>
        {children}
    </div>
);

// --- Основний компонент ---
const VeteranProfileModule: React.FC<VeteranProfileModuleProps> = ({ setCurrentView, db, appId, userId }) => {
    const [profile, setProfile] = useState<ProfileData>(initialProfileData);
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    const profileDocRef = useCallback(() => {
        return doc(db, 'artifacts', appId, 'users', userId, 'user_profiles', 'data');
    }, [db, appId, userId]);

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const docSnap = await getDoc(profileDocRef());
                if (docSnap.exists()) {
                    const fetchedData = docSnap.data() as any;
                    // Merge with defaults to ensure all keys exist
                    if (fetchedData && typeof fetchedData === 'object') {
                        setProfile({
                            personalInfo: {
                                lastName: fetchedData.personalInfo?.lastName || fetchedData.lastName || initialProfileData.personalInfo.lastName,
                                firstName: fetchedData.personalInfo?.firstName || fetchedData.firstName || initialProfileData.personalInfo.firstName,
                                middleName: fetchedData.personalInfo?.middleName || fetchedData.middleName || initialProfileData.personalInfo.middleName,
                                dateOfBirth: fetchedData.personalInfo?.dateOfBirth || fetchedData.dateOfBirth || initialProfileData.personalInfo.dateOfBirth,
                                city: fetchedData.personalInfo?.city || fetchedData.city || initialProfileData.personalInfo.city,
                                photoURL: fetchedData.personalInfo?.photoURL || fetchedData.photoURL || initialProfileData.personalInfo.photoURL,
                            },
                            summary: fetchedData.summary || initialProfileData.summary,
                            experience: Array.isArray(fetchedData.experience) ? fetchedData.experience : initialProfileData.experience,
                            skills: fetchedData.skills || initialProfileData.skills,
                            certifications: Array.isArray(fetchedData.certifications) ? fetchedData.certifications : initialProfileData.certifications,
                        });
                    } else {
                        setProfile(initialProfileData);
                    }
                } else {
                    setProfile(initialProfileData);
                }
            } catch (err) {
                console.error("Помилка завантаження профілю:", err);
                setError("Не вдалося завантажити дані профілю. Будь ласка, спробуйте оновити сторінку.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [profileDocRef]);

    // --- Обробники для динамічних списків ---
    const handleProfileChange = <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    const handlePersonalInfoChange = <K extends keyof PersonalInfo>(field: K, value: PersonalInfo[K]) => {
        setProfile(prev => ({
            ...prev,
            personalInfo: {
                ...prev.personalInfo,
                [field]: value,
            },
        }));
    };

    const handleDynamicListChange = (listName: 'experience' | 'certifications', index: number, field: string, value: string) => {
        const updatedList = profile[listName].map((item, i) => {
            if (i === index) {
                return { ...item, [field]: value };
            }
            return item;
        });
        handleProfileChange(listName, updatedList as any);
    };

    const addListItem = (listName: 'experience' | 'certifications') => {
        const newItem = listName === 'experience'
            ? { id: Date.now(), title: '', company: '', startDate: '', endDate: '', description: '' }
            : { id: Date.now(), name: '', organization: '', date: '' };

        const list = [...profile[listName], newItem] as any;
        handleProfileChange(listName, list);
    };

    const removeListItem = (listName: 'experience' | 'certifications', id: number) => {
        const list = profile[listName].filter(item => item.id !== id) as any;
        handleProfileChange(listName, list);
    };

    // --- Збереження профілю ---
    const handleSave = async () => {
        // Валідація обов'язкових полів
        if (!profile.personalInfo.lastName || !profile.personalInfo.firstName) {
            setError("Будь ласка, заповніть прізвище та ім'я");
            return;
        }
        if (!profile.personalInfo.dateOfBirth) {
            setError("Будь ласка, вкажіть дату народження");
            return;
        }
        if (!profile.personalInfo.city) {
            setError("Будь ласка, вкажіть місто проживання");
            return;
        }

        setSaveStatus('saving');
        setError(null);

        try {
            console.log('=== SAVING PROFILE ===');
            console.log('Profile data to save:', profile);
            console.log('Firestore path:', `artifacts/${appId}/users/${userId}/user_profiles/data`);

            // Use merge: true to preserve existing user data (role, fullName, email, etc.)
            await setDoc(profileDocRef(), profile, { merge: true });

            console.log('✅ Profile saved successfully!');
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err) {
            console.error("❌ Помилка збереження профілю:", err);
            console.error("Error details:", {
                message: (err as Error).message,
                code: (err as any).code,
                stack: (err as Error).stack,
            });
            setError(`Не вдалося зберегти профіль: ${(err as Error).message}`);
            setSaveStatus('error');
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 md:p-8 bg-white rounded-xl shadow-xl max-w-4xl mx-auto text-center">
                <LoadingSpinner text="Завантаження профілю..." size="lg" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 bg-gray-50 rounded-xl shadow-xl max-w-4xl mx-auto">
            <button
                className={`flex items-center text-sm font-semibold mb-6 ${PRIMARY_TEXT_COLOR} hover:opacity-80 transition`}
                onClick={() => setCurrentView('dashboard')}
            >
                <IconArrowLeft className="w-5 h-5 mr-1" />
                Повернутися до Панелі Керування
            </button>
            <div className="flex items-center mb-6">
                <IconUser className={`w-10 h-10 mr-4 ${ACCENT_TEXT_COLOR}`} />
                <div>
                    <h2 className={`text-3xl font-bold ${PRIMARY_TEXT_COLOR}`}>Мій Профіль</h2>
                    <p className="text-gray-600 mt-1">
                        Керуйте своїм резюме, навичками та професійною інформацією.
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Помилка: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            <div className="space-y-6">
                {/* Секція: Особиста Інформація */}
                <ProfileSection title="Особиста Інформація">
                    <div className="space-y-4">
                        {/* Фото профілю */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Фото профілю (URL)
                            </label>
                            <div className="flex items-center space-x-4">
                                {profile.personalInfo.photoURL && (
                                    <img
                                        src={profile.personalInfo.photoURL}
                                        alt="Фото профілю"
                                        className="w-20 h-20 rounded-full object-cover border-2 border-[#FFC300]"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=Фото';
                                        }}
                                    />
                                )}
                                <input
                                    type="text"
                                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300]"
                                    placeholder="https://example.com/photo.jpg"
                                    value={profile.personalInfo.photoURL}
                                    onChange={(e) => handlePersonalInfoChange('photoURL', e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Вставте посилання на ваше фото (наприклад, з Google Drive або Imgur)
                            </p>
                        </div>

                        {/* ПІБ */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Прізвище *
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300]"
                                    placeholder="Іваненко"
                                    value={profile.personalInfo.lastName}
                                    onChange={(e) => handlePersonalInfoChange('lastName', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Ім'я *
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300]"
                                    placeholder="Іван"
                                    value={profile.personalInfo.firstName}
                                    onChange={(e) => handlePersonalInfoChange('firstName', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    По батькові
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300]"
                                    placeholder="Іванович"
                                    value={profile.personalInfo.middleName}
                                    onChange={(e) => handlePersonalInfoChange('middleName', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Дата народження та місто */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Дата народження *
                                </label>
                                <input
                                    type="date"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300]"
                                    value={profile.personalInfo.dateOfBirth}
                                    onChange={(e) => handlePersonalInfoChange('dateOfBirth', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Місто проживання *
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300]"
                                    placeholder="Київ"
                                    value={profile.personalInfo.city}
                                    onChange={(e) => handlePersonalInfoChange('city', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </ProfileSection>

                {/* Секція: Професійне резюме */}
                <ProfileSection title="Професійне резюме (Summary)">
                    <textarea
                        rows={5}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300]"
                        placeholder="Опишіть свій професійний досвід, ключові досягнення та кар'єрні цілі..."
                        value={profile.summary}
                        onChange={(e) => handleProfileChange('summary', e.target.value)}
                    />
                </ProfileSection>

                {/* Секція: Досвід роботи */}
                <ProfileSection title="Досвід роботи">
                    <div className="space-y-4">
                        {profile.experience.map((exp, index) => (
                            <div key={exp.id} className="p-4 border rounded-md bg-gray-50 relative">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" placeholder="Посада" value={exp.title} onChange={e => handleDynamicListChange('experience', index, 'title', e.target.value)} className="p-2 border rounded" />
                                    <input type="text" placeholder="Компанія" value={exp.company} onChange={e => handleDynamicListChange('experience', index, 'company', e.target.value)} className="p-2 border rounded" />
                                    <input type="text" placeholder="Дата початку (РРРР-ММ)" value={exp.startDate} onChange={e => handleDynamicListChange('experience', index, 'startDate', e.target.value)} className="p-2 border rounded" />
                                    <input type="text" placeholder="Дата закінчення (РРРР-ММ)" value={exp.endDate} onChange={e => handleDynamicListChange('experience', index, 'endDate', e.target.value)} className="p-2 border rounded" />
                                </div>
                                <textarea placeholder="Опис обов'язків та досягнень..." value={exp.description} onChange={e => handleDynamicListChange('experience', index, 'description', e.target.value)} className="w-full mt-3 p-2 border rounded" rows={3}></textarea>
                                <button onClick={() => removeListItem('experience', exp.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100">
                                    <IconTrash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => addListItem('experience')} className="mt-4 flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800">
                        <IconPlusCircle className="w-5 h-5 mr-2" /> Додати досвід
                    </button>
                </ProfileSection>

                {/* Секція: Навички */}
                <ProfileSection title="Ключові навички">
                    <textarea
                        rows={4}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300]"
                        placeholder="Перелічіть ваші навички через кому, наприклад: Управління проектами, Логістика, Python, Комунікація..."
                        value={profile.skills}
                        onChange={(e) => handleProfileChange('skills', e.target.value)}
                    />
                </ProfileSection>

                {/* Секція: Сертифікати */}
                <ProfileSection title="Сертифікати та Курси">
                    <div className="space-y-4">
                        {profile.certifications.map((cert, index) => (
                            <div key={cert.id} className="p-4 border rounded-md bg-gray-50 relative">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" placeholder="Назва сертифікату" value={cert.name} onChange={e => handleDynamicListChange('certifications', index, 'name', e.target.value)} className="p-2 border rounded" />
                                    <input type="text" placeholder="Організація, що видала" value={cert.organization} onChange={e => handleDynamicListChange('certifications', index, 'organization', e.target.value)} className="p-2 border rounded" />
                                    <input type="text" placeholder="Дата видачі (РРРР-ММ)" value={cert.date} onChange={e => handleDynamicListChange('certifications', index, 'date', e.target.value)} className="p-2 border rounded col-span-full md:col-span-1" />
                                </div>
                                <button onClick={() => removeListItem('certifications', cert.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100">
                                    <IconTrash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => addListItem('certifications')} className="mt-4 flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800">
                        <IconPlusCircle className="w-5 h-5 mr-2" /> Додати сертифікат
                    </button>
                </ProfileSection>
            </div>

            {/* Кнопка збереження */}
            <div className="mt-8 flex justify-end items-center">
                {saveStatus === 'success' && <span className="text-green-600 mr-4 font-semibold">Профіль успішно збережено!</span>}
                <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    className="flex items-center justify-center bg-[#002B49] hover:bg-[#003C65] text-white font-bold py-3 px-6 rounded-lg transition shadow-lg w-48 h-12"
                >
                    {saveStatus === 'saving' ? <LoadingSpinner size="sm" /> : 'Зберегти профіль'}
                </button>
            </div>
        </div>
    );
};

export default VeteranProfileModule;