import React, { useState } from 'react';
import { IconArrowLeft, IconBriefcase, LoadingSpinner } from './icons';
import { Firestore, collection, addDoc, Timestamp } from 'firebase/firestore';

interface CreateVacancyFormProps {
    onClose: () => void;
    onSuccess: () => void;
    db: Firestore;
    appId: string;
}

const PRIMARY_TEXT_COLOR = 'text-[#002B49]';
const ACCENT_TEXT_COLOR = 'text-[#FFC300]';
const PRIMARY_COLOR = 'bg-[#002B49]';

type CompanyTypeEnglish = 'Private' | 'State' | 'Non-profit';
type CompanyTypeUkrainian = 'Приватна' | 'Державна' | 'Некомерційна';

interface FormErrors {
    title?: string;
    company?: string;
    description?: string;
    responsibilities?: string;
    qualifications?: string;
    location?: string;
}


const CreateVacancyForm: React.FC<CreateVacancyFormProps> = ({ onClose, onSuccess, db, appId }) => {
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState('');
    const [description, setDescription] = useState('');
    const [qualifications, setQualifications] = useState('');
    const [responsibilities, setResponsibilities] = useState('');
    const [companyType, setCompanyType] = useState<CompanyTypeEnglish>('Private');
    const [location, setLocation] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errors, setErrors] = useState<FormErrors>({});

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!title.trim()) newErrors.title = "Назва вакансії є обов'язковою.";
        if (!company.trim()) newErrors.company = "Назва компанії є обов'язковою.";
        if (!description.trim()) newErrors.description = "Опис вакансії є обов'язковим.";
        if (!responsibilities.trim()) newErrors.responsibilities = "Вкажіть принаймні один обов'язок.";
        if (!qualifications.trim()) newErrors.qualifications = "Вкажіть принаймні одну вимогу.";
        if (!location.trim()) newErrors.location = "Місцезнаходження є обов'язковим.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSaveVacancy = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return; // Зупинити відправку, якщо валідація не пройдена
        }

        setIsSaving(true);
        setError(null);

        const typeMapping: Record<CompanyTypeEnglish, CompanyTypeUkrainian> = {
            'Private': 'Приватна',
            'State': 'Державна',
            'Non-profit': 'Некомерційна',
        };

        const vacancyData = {
            id: Date.now(), // Use timestamp for a unique-enough numeric ID
            title,
            company,
            description,
            qualifications: qualifications.split('\n').filter(q => q.trim() !== ''),
            responsibilities: responsibilities.split('\n').filter(r => r.trim() !== ''),
            type: typeMapping[companyType],
            location,
            createdAt: Timestamp.now(),
        };
        
        try {
            const vacanciesCollectionRef = collection(db, 'artifacts', appId, 'vacancies');
            await addDoc(vacanciesCollectionRef, vacancyData);
            onSuccess();
            onClose(); // Close form on success
        } catch (err) {
            console.error("Error saving vacancy:", err);
            setError("Не вдалося зберегти вакансію. Перевірте дозволи та підключення до мережі.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-gray-50 rounded-xl shadow-xl max-w-4xl mx-auto">
            <button
                className={`flex items-center text-sm font-semibold mb-6 ${PRIMARY_TEXT_COLOR} hover:opacity-80 transition`}
                onClick={onClose}
            >
                <IconArrowLeft className="w-5 h-5 mr-1"/>
                Повернутися до Панелі
            </button>
            <h2 className={`text-3xl font-bold mb-8 ${PRIMARY_TEXT_COLOR} flex items-center`}>
                <IconBriefcase className={`w-8 h-8 mr-3 ${ACCENT_TEXT_COLOR}`}/>
                Створити Нову Вакансію
            </h2>
            
            <form onSubmit={handleSaveVacancy} className="space-y-6 bg-white p-6 rounded-lg border">
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <strong className="font-bold">Помилка: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
                {/* Title and Company */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Назва вакансії</label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                if (errors.title) setErrors(prev => ({...prev, title: undefined}));
                            }}
                            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-[#FFC300] focus:border-[#FFC300] ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                        />
                         {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
                    </div>
                    <div>
                        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">Назва компанії</label>
                        <input
                            type="text"
                            id="company"
                            value={company}
                            onChange={(e) => {
                                setCompany(e.target.value);
                                if (errors.company) setErrors(prev => ({...prev, company: undefined}));
                            }}
                            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-[#FFC300] focus:border-[#FFC300] ${errors.company ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.company && <p className="mt-1 text-xs text-red-600">{errors.company}</p>}
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Опис вакансії</label>
                    <textarea
                        id="description"
                        rows={4}
                        value={description}
                        onChange={(e) => {
                            setDescription(e.target.value);
                            if (errors.description) setErrors(prev => ({...prev, description: undefined}));
                        }}
                        placeholder="Детально опишіть вакансію, її цілі та умови..."
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-[#FFC300] focus:border-[#FFC300] ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
                </div>

                {/* Responsibilities and Qualifications */}
                <div className="grid md:grid-cols-2 gap-6">
                     <div>
                        <label htmlFor="responsibilities" className="block text-sm font-medium text-gray-700 mb-1">Обов'язки (кожен з нового рядка)</label>
                        <textarea
                            id="responsibilities"
                            rows={5}
                            value={responsibilities}
                            onChange={(e) => {
                                setResponsibilities(e.target.value);
                                if (errors.responsibilities) setErrors(prev => ({...prev, responsibilities: undefined}));
                            }}
                            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-[#FFC300] focus:border-[#FFC300] ${errors.responsibilities ? 'border-red-500' : 'border-gray-300'}`}
                        />
                         {errors.responsibilities && <p className="mt-1 text-xs text-red-600">{errors.responsibilities}</p>}
                    </div>
                    <div>
                        <label htmlFor="qualifications" className="block text-sm font-medium text-gray-700 mb-1">Вимоги (кожна з нового рядка)</label>
                        <textarea
                            id="qualifications"
                            rows={5}
                            value={qualifications}
                            onChange={(e) => {
                                setQualifications(e.target.value);
                                if (errors.qualifications) setErrors(prev => ({...prev, qualifications: undefined}));
                            }}
                            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-[#FFC300] focus:border-[#FFC300] ${errors.qualifications ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.qualifications && <p className="mt-1 text-xs text-red-600">{errors.qualifications}</p>}
                    </div>
                </div>

                {/* Location and Company Type */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Місцезнаходження</label>
                        <input
                            type="text"
                            id="location"
                            value={location}
                            onChange={(e) => {
                                setLocation(e.target.value);
                                if (errors.location) setErrors(prev => ({...prev, location: undefined}));
                            }}
                            placeholder="Наприклад: Київ, Україна"
                            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-[#FFC300] focus:border-[#FFC300] ${errors.location ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location}</p>}
                    </div>
                    <div>
                        <label htmlFor="companyType" className="block text-sm font-medium text-gray-700 mb-1">Тип компанії</label>
                        <select
                            id="companyType"
                            value={companyType}
                            onChange={(e) => setCompanyType(e.target.value as CompanyTypeEnglish)}
                            required
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#FFC300] focus:border-[#FFC300]"
                        >
                            <option value="Private">Приватна</option>
                            <option value="State">Державна</option>
                            <option value="Non-profit">Некомерційна</option>
                        </select>
                    </div>
                </div>
                
                <div className="pt-4 flex justify-end space-x-4">
                     <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="py-2 px-6 rounded-lg text-gray-700 font-semibold bg-gray-200 hover:bg-gray-300 transition disabled:opacity-50"
                    >
                        Скасувати
                    </button>
                     <button
                        type="submit"
                        disabled={isSaving}
                        className={`py-2 px-6 rounded-lg text-white font-bold shadow-md transition ${PRIMARY_COLOR} hover:bg-[#003C65] disabled:bg-gray-400 disabled:cursor-not-allowed w-40`}
                    >
                        {isSaving ? <LoadingSpinner size="sm" /> : 'Зберегти вакансію'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateVacancyForm;