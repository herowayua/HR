import React, { useState, useMemo, useEffect, useRef } from 'react';
import { IconArrowLeft, IconBriefcase, IconBuilding, IconMapPin, IconSparkles, LoadingSpinner, IconMessageSquare, IconSearch, IconX, IconStar, IconChevronDown } from './icons';
import { geminiService } from '../services/geminiService';
import InterviewSimulator from './InterviewSimulator'; // Import the new component
import { Firestore, collection, getDocs, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { jobsData as fallbackJobs, type Job } from '../utils/seed'; // Import fallback data & Job type

interface VeteranJobsModuleProps {
    setCurrentView: (view: string) => void;
    db: Firestore;
    appId: string;
    userId: string;
    initialFilter: 'all' | 'favorites';
    onViewed: () => void;
}

// A mock veteran profile to simulate a logged-in user's data for the AI prompt.
const mockVeteranProfile = "Ветеран з 5-річним досвідом у військовій логістиці та управлінні командою. Володіє навичками планування, координації та вирішення проблем у стресових ситуаціях. Має досвід роботи з технічною документацією та системами відстеження.";


const PRIMARY_TEXT_COLOR = 'text-[#002B49]';
const ACCENT_TEXT_COLOR = 'text-[#FFC300]';

// --- Новий компонент для мульти-фільтрації ---
const MultiSelectDropdown: React.FC<{
    options: string[];
    selectedOptions: string[];
    onSelectionChange: (newSelection: string[]) => void;
    placeholder: string;
}> = ({ options, selectedOptions, onSelectionChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleOptionToggle = (option: string) => {
        const newSelection = selectedOptions.includes(option)
            ? selectedOptions.filter(item => item !== option)
            : [...selectedOptions, option];
        onSelectionChange(newSelection);
    };

    const displayValue = selectedOptions.length > 1
        ? `${selectedOptions.length} вибрано`
        : selectedOptions.length === 1
        ? selectedOptions[0]
        : placeholder;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="block w-full text-left py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#FFC300] focus:border-[#FFC300] sm:text-sm flex justify-between items-center"
            >
                <span className={selectedOptions.length === 0 ? 'text-gray-500' : ''}>{displayValue}</span>
                <IconChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {options.map(option => (
                        <label key={option} className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedOptions.includes(option)}
                                onChange={() => handleOptionToggle(option)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-sm text-gray-700">{option}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};


const VeteranJobsModule: React.FC<VeteranJobsModuleProps> = ({ setCurrentView, db, appId, userId, initialFilter, onViewed }) => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoadingJobs, setIsLoadingJobs] = useState(true);
    const [jobsError, setJobsError] = useState<string | null>(null);

    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInterviewing, setIsInterviewing] = useState(false);

    // --- State for filters (оновлено для мульти-фільтрації) ---
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState<string[]>([]);
    const [companyTypeFilter, setCompanyTypeFilter] = useState<string[]>([]);
    
    // --- New states for Favorites ---
    const [favoriteJobIds, setFavoriteJobIds] = useState<Set<number>>(new Set());
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

    // Effect to fetch and listen for favorite jobs
    useEffect(() => {
        if (!userId) return;
        const favoritesCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'favorites');
        const unsubscribe = onSnapshot(favoritesCollectionRef, (snapshot) => {
            const newFavoriteIds = new Set<number>();
            snapshot.forEach(doc => newFavoriteIds.add(Number(doc.id)));
            setFavoriteJobIds(newFavoriteIds);
        });

        return () => unsubscribe();
    }, [db, appId, userId]);
    
    // Effect to handle the initial filter from dashboard
    useEffect(() => {
        if (initialFilter === 'favorites') {
            setShowOnlyFavorites(true);
            onViewed(); // Signal that the filter has been applied
        }
    }, [initialFilter, onViewed]);

    // Function to toggle a favorite job
    const toggleFavorite = async (jobId: number) => {
        if (!userId) return;
        const favDocRef = doc(db, 'artifacts', appId, 'users', userId, 'favorites', String(jobId));

        if (favoriteJobIds.has(jobId)) {
            await deleteDoc(favDocRef);
        } else {
            await setDoc(favDocRef, { addedAt: new Date() });
        }
        // The onSnapshot listener will automatically update the state, no manual set needed
    };
    
    useEffect(() => {
        const fetchJobs = async () => {
            setIsLoadingJobs(true);
            setJobsError(null);
            try {
                const vacanciesCollectionRef = collection(db, 'artifacts', appId, 'vacancies');
                const querySnapshot = await getDocs(vacanciesCollectionRef);
                
                if (querySnapshot.empty) {
                    console.warn("Колекція вакансій Firestore порожня, використовуємо локальні дані.");
                    setJobs(fallbackJobs as Job[]);
                } else {
                    const jobsFromDb = querySnapshot.docs.map(doc => doc.data() as Job);
                    jobsFromDb.sort((a, b) => a.id - b.id);
                    setJobs(jobsFromDb);
                }
            } catch (error) {
                console.error("Помилка завантаження вакансій з Firestore:", error);
                setJobsError("Не вдалося завантажити вакансії з бази даних. Показано демонстраційні дані.");
                setJobs(fallbackJobs as Job[]); // Fallback to local data on error
            } finally {
                setIsLoadingJobs(false);
            }
        };

        fetchJobs();
    }, [db, appId]);
    
    const uniqueLocations = useMemo(() => [...new Set(jobs.map(job => job.location))].sort(), [jobs]);
    const uniqueCompanyTypes = useMemo(() => [...new Set(jobs.map(job => job.type))].sort(), [jobs]);

    const filteredJobs = useMemo(() => {
        return jobs.filter(job => {
            if (showOnlyFavorites && !favoriteJobIds.has(job.id)) {
                return false;
            }

            const matchesSearchTerm = searchTerm.trim() === '' ||
                job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                job.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesLocation = locationFilter.length === 0 || locationFilter.includes(job.location);
            const matchesCompanyType = companyTypeFilter.length === 0 || companyTypeFilter.includes(job.type);

            return matchesSearchTerm && matchesLocation && matchesCompanyType;
        });
    }, [jobs, searchTerm, locationFilter, companyTypeFilter, showOnlyFavorites, favoriteJobIds]);

    const handleClearFilters = () => {
        setSearchTerm('');
        setLocationFilter([]);
        setCompanyTypeFilter([]);
        setShowOnlyFavorites(false);
    };

    const handleViewDetails = async (job: Job) => {
        setSelectedJob(job);
        setIsLoadingAnalysis(true);
        setError(null);
        setAnalysis(null);

        try {
            const jobDescriptionForAI = `
                Назва посади: ${job.title}
                Компанія: ${job.company}
                Опис: ${job.description}
                Обов'язки: ${job.responsibilities.join(', ')}
                Кваліфікація: ${job.qualifications.join(', ')}
            `;
            const result = await geminiService.generateJobFitAnalysis(mockVeteranProfile, jobDescriptionForAI);
            setAnalysis(result);
        } catch (err) {
            setError("Не вдалося згенерувати аналіз відповідності. Спробуйте ще раз.");
            console.error(err);
        } finally {
            setIsLoadingAnalysis(false);
        }
    };

    const handleCloseDetails = () => {
        setSelectedJob(null);
        setAnalysis(null);
        setError(null);
    };

    const handleStartInterview = () => {
        if (selectedJob) {
            setIsInterviewing(true);
        }
    };

    const handleFinishInterview = () => {
        setIsInterviewing(false);
    };

    if (isInterviewing && selectedJob) {
        return <InterviewSimulator job={selectedJob} onFinish={handleFinishInterview} />;
    }
    
    const JobCard: React.FC<{ job: Job }> = ({ job }) => {
        const isFavorite = favoriteJobIds.has(job.id);
    
        const handleFavoriteClick = (e: React.MouseEvent) => {
            e.stopPropagation(); // Prevent modal from opening
            toggleFavorite(job.id);
        };
    
        return (
            <div 
                onClick={() => handleViewDetails(job)}
                className="bg-white p-5 rounded-xl shadow-sm border border-transparent hover:border-[#FFC300] hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer group relative"
                role="button"
                tabIndex={0}
                onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleViewDetails(job)}
            >
                <button
                    onClick={handleFavoriteClick}
                    className={`absolute top-3 right-3 p-2 rounded-full transition-colors z-10 ${isFavorite ? 'text-yellow-500 bg-yellow-100 hover:bg-yellow-200' : 'text-gray-400 bg-gray-100 hover:bg-gray-200'}`}
                    aria-label={isFavorite ? 'Видалити з вибраного' : 'Додати у вибране'}
                >
                    <IconStar filled={isFavorite} className="w-5 h-5"/>
                </button>

                <div className="flex items-center text-gray-500 text-sm mb-3">
                    <IconBuilding className="w-4 h-4 mr-2" />
                    <span>{job.company}</span>
                </div>
                
                <div className="flex-grow">
                    <h3 className={`text-lg font-bold ${PRIMARY_TEXT_COLOR} group-hover:text-blue-600 transition-colors`}>{job.title}</h3>
                    <p className="text-gray-600 mt-2 text-sm line-clamp-3">{job.description}</p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            <IconMapPin className="w-3 h-3 mr-1.5" />
                            {job.location}
                        </span>
                        <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                            {job.type}
                        </span>
                    </div>
                    
                    <span className="text-sm font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Детальніше →
                    </span>
                </div>
            </div>
        );
    };

    const JobDetailModal: React.FC = () => {
        if (!selectedJob) return null;
        const isFavorite = favoriteJobIds.has(selectedJob.id);

        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 relative animate-fade-in-up">
                    <button
                        onClick={handleCloseDetails}
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10 p-2 rounded-full hover:bg-gray-200"
                    >
                        <IconX className="w-6 h-6"/>
                    </button>
                    
                    <div className="flex justify-between items-start mb-4">
                        <div>
                             <h2 className={`text-3xl font-bold ${PRIMARY_TEXT_COLOR}`}>{selectedJob.title}</h2>
                            <div className="flex items-center text-gray-600 mt-2 text-lg">
                                <IconBuilding className="w-5 h-5 mr-2" />
                                <span>{selectedJob.company}</span>
                                <span className="mx-2">|</span>
                                <IconMapPin className="w-5 h-5 mr-2" />
                                <span>{selectedJob.location}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => toggleFavorite(selectedJob.id)}
                            className={`flex items-center gap-2 font-semibold py-2 px-4 rounded-lg transition-colors flex-shrink-0 ml-4 ${isFavorite ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            <IconStar filled={isFavorite} className="w-5 h-5"/>
                            {isFavorite ? 'Збережено' : 'Зберегти'}
                        </button>
                    </div>

                    <div className="mt-6 pt-6 border-t">
                        <h4 className="text-xl font-semibold text-gray-800 mb-2">Опис вакансії</h4>
                        <p className="text-gray-700">{selectedJob.description}</p>
                    </div>

                    {selectedJob.companyDescription && (
                        <div className="mt-6 pt-6 border-t">
                            <h4 className="text-xl font-semibold text-gray-800 mb-4">Про компанію</h4>
                            <div className="flex items-start gap-4 p-4 bg-white rounded-lg">
                                {selectedJob.companyLogo && (
                                    <div className="flex-shrink-0 w-20 h-20 bg-white border p-1 rounded-md flex items-center justify-center">
                                        <img src={selectedJob.companyLogo} alt={`${selectedJob.company} logo`} className="max-w-full max-h-full object-contain" />
                                    </div>
                                )}
                                <p className="text-gray-700 text-sm">{selectedJob.companyDescription}</p>
                            </div>
                        </div>
                    )}

                    <div className="mt-4">
                        <h4 className="text-xl font-semibold text-gray-800 mb-2">Основні обов'язки</h4>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                            {selectedJob.responsibilities.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    </div>

                    <div className="mt-4">
                        <h4 className="text-xl font-semibold text-gray-800 mb-2">Вимоги до кандидата</h4>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                            {selectedJob.qualifications.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                        <h4 className="text-xl font-semibold text-blue-800 mb-2 flex items-center">
                           <IconSparkles className="w-6 h-6 mr-2 text-blue-500" />
                            AI-Аналіз: Чому ви підходите
                        </h4>
                        {isLoadingAnalysis && <LoadingSpinner text="Аналізуємо вашу відповідність..." />}
                        {error && <p className="text-red-500">{error}</p>}
                        {analysis && <div className="prose prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: analysis.replace(/\n/g, '<br/>') }} />}
                    </div>
                    
                    <div className="mt-8 flex flex-col md:flex-row gap-4">
                        <button className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition text-lg">
                            Подати заявку
                        </button>
                        <button 
                            onClick={handleStartInterview}
                            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition text-lg flex items-center justify-center"
                        >
                            <IconMessageSquare className="w-6 h-6 mr-2" />
                            Практикувати співбесіду
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-8 bg-white rounded-xl shadow-xl max-w-4xl mx-auto">
            <button
                className={`flex items-center text-sm font-semibold mb-6 ${PRIMARY_TEXT_COLOR} hover:opacity-80 transition`}
                onClick={() => setCurrentView('dashboard')}
            >
                <IconArrowLeft className="w-5 h-5 mr-1"/>
                Повернутися до Панелі Керування
            </button>
            <div className="flex items-center mb-6">
                <IconBriefcase className={`w-10 h-10 mr-4 ${ACCENT_TEXT_COLOR}`}/>
                <div>
                    <h2 className={`text-3xl font-bold ${PRIMARY_TEXT_COLOR}`}>Вакансії для Ветеранів</h2>
                    <p className="text-gray-600 mt-1">
                        Персоналізовані пропозиції роботи, що відповідають вашим унікальним навичкам.
                    </p>
                </div>
            </div>

             {/* --- Filter Panel --- */}
            <div className="p-4 bg-gray-100 rounded-lg mb-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                    {/* Search Input */}
                    <div>
                        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Пошук за ключовими словами</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <IconSearch className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                id="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FFC300] focus:border-[#FFC300] sm:text-sm"
                                placeholder="Назва, компанія, опис..."
                            />
                        </div>
                    </div>
                     {/* Location Multi-Select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Локація</label>
                        <MultiSelectDropdown
                            options={uniqueLocations}
                            selectedOptions={locationFilter}
                            onSelectionChange={setLocationFilter}
                            placeholder="Всі локації"
                        />
                    </div>
                     {/* Company Type Multi-Select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Тип компанії</label>
                         <MultiSelectDropdown
                            options={uniqueCompanyTypes}
                            selectedOptions={companyTypeFilter}
                            onSelectionChange={setCompanyTypeFilter}
                            placeholder="Всі типи"
                        />
                    </div>
                </div>
                <div className="flex items-center justify-between col-span-1 md:col-span-2 lg:col-span-3 mt-4 pt-4 border-t border-gray-200">
                     {(searchTerm || locationFilter.length > 0 || companyTypeFilter.length > 0 || showOnlyFavorites) && (
                        <button
                            onClick={handleClearFilters}
                            className="flex items-center text-sm font-semibold text-gray-600 hover:text-gray-900 transition"
                        >
                            <IconX className="w-4 h-4 mr-1" />
                            Очистити фільтри
                        </button>
                    )}
                    <div className="flex-grow"></div> {/* Spacer */}
                     <label htmlFor="favorites-toggle" className="flex items-center cursor-pointer">
                        <span className="mr-3 text-sm font-medium text-gray-700">Тільки вибране</span>
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                id="favorites-toggle" 
                                className="sr-only" 
                                checked={showOnlyFavorites} 
                                onChange={() => setShowOnlyFavorites(!showOnlyFavorites)} 
                            />
                            <div className={`block w-12 h-6 rounded-full transition ${showOnlyFavorites ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${showOnlyFavorites ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                    </label>
                </div>
            </div>
            
            <div className="mb-4 text-sm text-gray-600 font-semibold">
                {isLoadingJobs ? 'Завантаження вакансій...' : `Знайдено ${filteredJobs.length} з ${jobs.length} вакансій.`}
            </div>

            {jobsError && (
                <div className="text-center py-4 px-6 bg-yellow-50 rounded-lg mb-4 border border-yellow-200">
                    <h3 className="text-lg font-semibold text-yellow-800">Попередження</h3>
                    <p className="text-yellow-700 mt-1">{jobsError}</p>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 min-h-[300px]">
                {isLoadingJobs ? (
                    <div className="md:col-span-2 flex justify-center items-center">
                        <LoadingSpinner text="Завантаження вакансій..." size="lg" />
                    </div>
                ) : filteredJobs.length > 0 ? (
                    filteredJobs.map(job => <JobCard key={job.id} job={job} />)
                ) : (
                    <div className="md:col-span-2 text-center py-12 px-6 bg-gray-50 rounded-lg">
                        <IconBriefcase className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700">Вакансій не знайдено</h3>
                        <p className="text-gray-500 mt-2">Спробуйте змінити критерії фільтрації або {showOnlyFavorites ? 'перегляньте всі вакансії.' : 'збережіть цікаві вакансії.'}</p>
                    </div>
                )}
            </div>

            <JobDetailModal />
        </div>
    );
};

export default VeteranJobsModule;