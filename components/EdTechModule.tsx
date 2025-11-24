import React, { useState, useEffect } from 'react';
import { IconArrowLeft, IconGraduationCap, IconBook, LoadingSpinner, IconSend } from './icons';
import { geminiService } from '../services/geminiService';
import { Firestore, collection, getDocs } from 'firebase/firestore';
import { coursesData as fallbackCourses } from '../utils/seed'; // Import fallback data

interface EdTechModuleProps {
    setCurrentView: (view: string) => void;
    userRole: string | null;
    db: Firestore;
    appId: string;
}

interface Course {
    id: number;
    title: string;
    content: string;
}

const PRIMARY_TEXT_COLOR = 'text-[#002B49]';
const ACCENT_TEXT_COLOR = 'text-[#FFC300]';

const EdTechModule: React.FC<EdTechModuleProps> = ({ setCurrentView, userRole, db, appId }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(true);
    const [coursesError, setCoursesError] = useState<string | null>(null);
    const [selectedLesson, setSelectedLesson] = useState<Course | null>(null);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourses = async () => {
            setIsLoadingCourses(true);
            setCoursesError(null);
            try {
                const coursesCollectionRef = collection(db, 'artifacts', appId, 'courses');
                const querySnapshot = await getDocs(coursesCollectionRef);

                if (querySnapshot.empty) {
                    console.warn("Колекція курсів Firestore порожня, використовуємо локальні дані.");
                    setCourses(fallbackCourses);
                } else {
                    const coursesFromDb = querySnapshot.docs.map(doc => doc.data() as Course);
                    coursesFromDb.sort((a, b) => a.id - b.id);
                    setCourses(coursesFromDb);
                }
            } catch (error) {
                console.error("Помилка завантаження курсів з Firestore:", error);
                setCoursesError("Не вдалося завантажити курси з бази даних. Показано демонстраційні дані.");
                setCourses(fallbackCourses); // Fallback to local data on error
            } finally {
                setIsLoadingCourses(false);
            }
        };

        fetchCourses();
    }, [db, appId]);

    const handleAskQuestion = async () => {
        if (!question.trim() || !selectedLesson) return;

        setIsThinking(true);
        setError(null);
        setAnswer('');

        try {
            const result = await geminiService.generateEdTechAnswer(selectedLesson.content, question);
            setAnswer(result);
        } catch (err) {
            setError("Сталася помилка під час обробки вашого запиту. Спробуйте ще раз.");
            console.error(err);
        } finally {
            setIsThinking(false);
            setQuestion('');
        }
    };
    
    const handleSelectLesson = (lesson: Course) => {
        setSelectedLesson(lesson);
        setQuestion('');
        setAnswer('');
        setError(null);
    };

    const renderCourseSelection = () => (
        <>
            <p className="text-gray-600 mb-8">
                Оберіть курс, щоб розпочати навчання та отримати допомогу від AI-помічника.
            </p>

            {/* Display error message NON-EXCLUSIVELY if it exists */}
            {coursesError && (
                <div className="text-center py-4 px-6 bg-yellow-50 rounded-lg mb-4 border border-yellow-200">
                    <h3 className="text-lg font-semibold text-yellow-800">Попередження</h3>
                    <p className="text-yellow-700 mt-1">{coursesError}</p>
                </div>
            )}
            
            <div className="space-y-4 min-h-[200px]">
                {isLoadingCourses ? (
                    <div className="flex justify-center items-center h-full pt-10">
                        <LoadingSpinner text="Завантаження курсів..." size="lg" />
                    </div>
                ) : courses.length > 0 ? (
                    courses.map(course => (
                        <button 
                            key={course.id}
                            onClick={() => handleSelectLesson(course)}
                            className="w-full text-left p-6 bg-white rounded-xl shadow-md border border-gray-200 hover:border-[#FFC300] hover:shadow-lg transition flex items-center space-x-4"
                        >
                            <IconBook className="w-8 h-8 text-[#002B49] flex-shrink-0"/>
                            <div>
                                <h3 className="text-lg font-bold text-[#002B49]">{course.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">Натисніть, щоб почати вивчення</p>
                            </div>
                        </button>
                    ))
                ) : (
                     <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
                        <IconBook className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700">Курси не знайдено</h3>
                        <p className="text-gray-500 mt-2">Наразі немає доступних курсів. Будь ласка, перевірте пізніше.</p>
                    </div>
                )}
            </div>
        </>
    );

    const renderLessonView = () => (
        <div>
            <button 
                onClick={() => setSelectedLesson(null)}
                className="text-sm font-semibold text-gray-600 hover:text-[#002B49] mb-4 flex items-center"
            >
                <IconArrowLeft className="w-4 h-4 mr-1"/>
                Повернутися до списку курсів
            </button>
            <div className="p-6 bg-white rounded-xl shadow-inner border">
                <h3 className="text-2xl font-bold mb-4 text-[#002B49]">{selectedLesson?.title}</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{selectedLesson?.content}</p>
            </div>

            <div className="mt-8 pt-6 border-t">
                <h4 className="text-xl font-bold text-gray-800 mb-4">AI-Помічник Навчання (Q&A)</h4>
                <p className="text-gray-600 mb-4">
                    Прочитали матеріал? Задайте запитання нашому AI-тьютору, щоб краще зрозуміти тему.
                </p>
                <div className="flex space-x-3">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                        className="flex-grow p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFC300] focus:border-[#FFC300] transition"
                        placeholder="Ваше запитання щодо матеріалу..."
                        disabled={isThinking}
                    />
                    <button
                        onClick={handleAskQuestion}
                        className={`flex items-center justify-center p-3 rounded-xl text-white font-bold shadow-md transition duration-200 bg-[#002B49] ${isThinking || !question.trim() ? 'bg-gray-400 cursor-not-allowed' : 'hover:opacity-90'}`}
                        disabled={isThinking || !question.trim()}
                    >
                       {isThinking ? <LoadingSpinner size="sm"/> : <IconSend className="w-6 h-6"/>}
                    </button>
                </div>
                {error && <p className="text-red-500 mt-2">{error}</p>}
                {answer && (
                    <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                        <p className="font-semibold text-blue-800">Відповідь AI-тьютора:</p>
                        <p className="text-gray-800 whitespace-pre-line">{answer}</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 bg-gray-50 rounded-xl shadow-xl max-w-4xl mx-auto">
            <button
                className={`flex items-center text-sm font-semibold mb-6 ${PRIMARY_TEXT_COLOR} hover:opacity-80 transition`}
                onClick={() => setCurrentView('dashboard')}
            >
                <IconArrowLeft className="w-5 h-5 mr-1"/>
                Повернутися до Панелі Керування
            </button>
            <h2 className={`text-3xl font-bold mb-6 ${PRIMARY_TEXT_COLOR} flex items-center`}>
                <IconGraduationCap className={`w-8 h-8 mr-3 ${ACCENT_TEXT_COLOR}`}/>
                EdTech Модуль: Курси {userRole === 'veteran' ? 'Перекваліфікації' : 'для HR'}
            </h2>
            
            {selectedLesson ? renderLessonView() : renderCourseSelection()}
        </div>
    );
};

export default EdTechModule;