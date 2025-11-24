import React, { useState, useEffect } from 'react';
import { Firestore, collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Job } from '../utils/seed';
import { LoadingSpinner, IconBuilding, IconMapPin, IconBriefcase, IconPencil, IconTrash2, IconChevronDown } from './icons';

interface HrVacancyListProps {
    db: Firestore;
    appId: string;
}

// Розширюємо інтерфейс Job, щоб включити ID документа Firestore для операцій CRUD
interface Vacancy extends Job {
    docId: string;
}

const HrVacancyList: React.FC<HrVacancyListProps> = ({ db, appId }) => {
    const [vacancies, setVacancies] = useState<Vacancy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openVacancyId, setOpenVacancyId] = useState<string | null>(null);

    const handleToggle = (docId: string) => {
        setOpenVacancyId(openVacancyId === docId ? null : docId);
    };

    const handleDelete = async (docId: string) => {
        if (window.confirm("Ви впевнені, що хочете видалити цю вакансію? Цю дію неможливо скасувати.")) {
            try {
                const vacancyDocRef = doc(db, 'artifacts', appId, 'vacancies', docId);
                await deleteDoc(vacancyDocRef);
                // Миттєво оновлюємо UI, видаляючи вакансію з локального стану
                setVacancies(prevVacancies => prevVacancies.filter(v => v.docId !== docId));
            } catch (err) {
                console.error("Помилка видалення вакансії:", err);
                setError("Не вдалося видалити вакансію. Спробуйте ще раз.");
            }
        }
    };

    useEffect(() => {
        const fetchVacancies = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const vacanciesCollectionRef = collection(db, 'artifacts', appId, 'vacancies');
                const q = query(vacanciesCollectionRef, orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const vacanciesFromDb = querySnapshot.docs.map(doc => ({
                    ...(doc.data() as Job),
                    docId: doc.id,
                }));
                setVacancies(vacanciesFromDb);
            } catch (err) {
                console.error("Помилка завантаження вакансій:", err);
                setError("Не вдалося завантажити список вакансій.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchVacancies();
    }, [db, appId]);

    if (isLoading) {
        return <LoadingSpinner text="Завантаження вакансій..." />;
    }

    if (error) {
        return <p className="text-red-500 text-center">{error}</p>;
    }

    return (
        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <IconBriefcase className="w-6 h-6 mr-3" />
                Ваші активні вакансії
            </h3>
            <div className="space-y-3">
                {vacancies.map(job => (
                    <div key={job.docId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
                        {/* Заголовок акордеона */}
                        <button
                            onClick={() => handleToggle(job.docId)}
                            className="w-full text-left p-4 flex justify-between items-center hover:bg-gray-50 focus:outline-none focus:bg-gray-100 transition"
                            aria-expanded={openVacancyId === job.docId}
                            aria-controls={`vacancy-content-${job.docId}`}
                        >
                            <div>
                                <h4 className="font-bold text-lg text-[#002B49]">{job.title}</h4>
                                <div className="flex items-center text-gray-500 text-sm mt-1 space-x-4">
                                    <span className="flex items-center"><IconBuilding className="w-4 h-4 mr-1.5" />{job.company}</span>
                                    <span className="flex items-center"><IconMapPin className="w-4 h-4 mr-1.5" />{job.location}</span>
                                </div>
                            </div>
                            <IconChevronDown className={`w-6 h-6 text-gray-500 transform transition-transform duration-300 ${openVacancyId === job.docId ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Тіло акордеона (згортається) */}
                        {openVacancyId === job.docId && (
                            <div
                                id={`vacancy-content-${job.docId}`}
                                className="p-4 border-t border-gray-200 bg-gray-50/50"
                            >
                                <h5 className="font-semibold text-gray-700 mb-2">Деталі вакансії:</h5>
                                <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">{job.description}</p>
                                
                                <div className="mb-4">
                                    <h5 className="font-semibold text-gray-700 mb-2">Кандидати на цю посаду:</h5>
                                    <div className="text-center p-4 border-2 border-dashed rounded-lg text-gray-500 text-sm">
                                        <p>Тут буде відображатися список кандидатів.</p>
                                        <p>(Функціонал у розробці)</p>
                                    </div>
                                </div>
                                
                                <div className="flex justify-end items-center space-x-2">
                                    <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-full flex-shrink-0">
                                        {job.type}
                                    </span>
                                    <div className="flex-grow"></div> {/* Розпірка */}
                                    <button className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition" title="Редагувати (у розробці)">
                                        <IconPencil className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(job.docId)} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition" title="Видалити вакансію">
                                        <IconTrash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HrVacancyList;