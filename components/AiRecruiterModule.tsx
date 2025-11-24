import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { audioUtils } from '../utils/audioUtils';
import { IconArrowLeft, IconBriefcase, IconZap, IconSpeaker, LoadingSpinner } from './icons';
import { Firestore, collection, getDocs, limit, query } from 'firebase/firestore';

interface AiRecruiterModuleProps {
    setCurrentView: (view: string) => void;
    db: Firestore;
    appId: string;
}

const PRIMARY_COLOR = 'bg-[#002B49]';
const PRIMARY_TEXT_COLOR = 'text-[#002B49]';
const ACCENT_TEXT_COLOR = 'text-[#FFC300]';


// A simple skeleton loader for the text areas during analysis
const SkeletonLoader: React.FC = () => (
    <div className="w-full h-full p-3 border border-gray-200 rounded-lg bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
);


const AiRecruiterModule: React.FC<AiRecruiterModuleProps> = ({ setCurrentView, db, appId }) => {
    const [jobDescription, setJobDescription] = useState('');
    const [resumeText, setResumeText] = useState('');
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [moduleError, setModuleError] = useState<string | null>(null);
    const [showContent, setShowContent] = useState(true);

    const handleAnalyze = async () => {
        if (!jobDescription.trim() || !resumeText.trim()) {
            setModuleError("Будь ласка, введіть опис вакансії та текст резюме.");
            return;
        }

        setShowContent(false); // Start fade-out animation for text areas
        setModuleError(null);
        setAnalysisResult(null);

        // Wait for fade-out animation to complete before starting analysis
        setTimeout(async () => {
            setIsAnalyzing(true);
            try {
                const resultText = await geminiService.generateRecruiterAnalysis(jobDescription, resumeText);
                setAnalysisResult(resultText);
            } catch (error) {
                console.error(error);
                setModuleError("Не вдалося отримати аналіз від AI. Спробуйте ще раз.");
            } finally {
                setIsAnalyzing(false);
                setShowContent(true); // Start fade-in animation for text areas
            }
        }, 300); // Duration should match the transition
    };
    
    const handleSpeak = async () => {
        if (!analysisResult || isSpeaking) return;
        setIsSpeaking(true);
        try {
            const audioData = await geminiService.generateSpeech(analysisResult);
            if (audioData) {
                await audioUtils.playAudio(audioData);
            } else {
                setModuleError("Не вдалося згенерувати аудіо.");
            }
        } catch (error) {
            console.error("Error in text-to-speech:", error);
            setModuleError("Не вдалося відтворити аудіо.");
        } finally {
            setIsSpeaking(false);
        }
    };

    const loadSampleData = async (type: 'vacancy' | 'resume') => {
        const collectionName = type === 'vacancy' ? 'vacancies' : 'resumes';
        const collectionRef = collection(db, 'artifacts', appId, collectionName);
        const q = query(collectionRef, limit(1));
        
        try {
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                setModuleError(`Тестові дані для '${collectionName}' не знайдено. Увійдіть як HR, щоб створити їх.`);
                return;
            }
            
            const docData = querySnapshot.docs[0].data();
            if (type === 'vacancy') {
                setJobDescription(docData.description || '');
            } else {
                setResumeText(docData.text || '');
            }
            setModuleError(null); // Clear previous errors
        } catch (error) {
            console.error(`Помилка завантаження тестових даних (${type}):`, error);
            setModuleError("Не вдалося завантажити тестові дані. Перевірте консоль.");
        }
    };

    const isFormValid = jobDescription.trim() && resumeText.trim();

    const AnalysisCard: React.FC = () => {
        if (!analysisResult) return null;

        const match = analysisResult.match(/Оцінка відповідності:\s*(\d+)\/100/);
        const score = match ? parseInt(match[1], 10) : 0;
        
        let progressColor = 'bg-red-500';
        let scoreColor = 'text-red-500';
        if (score >= 75) {
            progressColor = 'bg-green-500';
            scoreColor = 'text-green-500';
        } else if (score >= 50) {
            progressColor = 'bg-yellow-500';
            scoreColor = 'text-yellow-500';
        }

        return (
            <div className={`mt-8 p-6 bg-white rounded-xl shadow-2xl border border-gray-100 transition-all duration-700 ease-in-out transform ${analysisResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <div className="flex justify-between items-start">
                    <h3 className={`text-2xl font-bold mb-4 ${PRIMARY_TEXT_COLOR}`}>
                        Результат Аналізу Кандидата
                    </h3>
                    <button
                        onClick={handleSpeak}
                        disabled={isSpeaking}
                        className={`p-2 rounded-full transition ${isSpeaking ? 'bg-gray-300' : 'bg-blue-100 hover:bg-blue-200'}`}
                        aria-label="Прочитати аналіз вголос"
                    >
                        {isSpeaking ? <LoadingSpinner size="sm" /> : <IconSpeaker className="w-5 h-5 text-blue-600" />}
                    </button>
                </div>
                
                <div className="mb-6">
                    <p className="font-semibold text-lg text-gray-700 mb-2">Оцінка Відповідності: <span className={`font-extrabold text-3xl ml-2 ${scoreColor}`}>{score}%</span></p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full transition-all duration-500 ${progressColor}`} style={{width: `${score}%`}}></div>
                    </div>
                </div>

                <div className="prose max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: analysisResult.replace(/\n/g, '<br/>') }} />
                
                <button
                    onClick={() => setAnalysisResult(null)}
                    className={`mt-6 w-full py-2 ${PRIMARY_COLOR} text-white rounded-lg hover:opacity-90 transition`}
                >
                    Очистити та Почати Новий Аналіз
                </button>
            </div>
        );
    };

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
                <IconBriefcase className={`w-8 h-8 mr-3 ${ACCENT_TEXT_COLOR}`}/>
                AI-Скоринг Резюме (SaaS)
            </h2>
            <p className="text-gray-600 mb-8">
                Вставте опис вакансії та текст резюме для миттєвого аналізу відповідності.
            </p>

            {moduleError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Помилка: </strong>
                    <span className="block sm:inline">{moduleError}</span>
                </div>
            )}

            <div className={`grid md:grid-cols-2 gap-6 mb-6 transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 flex flex-col min-h-[300px]">
                    {isAnalyzing ? <SkeletonLoader /> : (
                        <>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-gray-700 font-semibold">1. Опис Вакансії</label>
                                <button 
                                    onClick={() => loadSampleData('vacancy')}
                                    className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-2 rounded-md transition"
                                >
                                    Завантажити приклад
                                </button>
                            </div>
                            <textarea
                                rows={10}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300] focus:border-[#FFC300] flex-grow"
                                placeholder="Вставте повний опис вакансії..."
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                            ></textarea>
                        </>
                    )}
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 flex flex-col min-h-[300px]">
                     {isAnalyzing ? <SkeletonLoader /> : (
                        <>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-gray-700 font-semibold">2. Текст Резюме</label>
                                <button 
                                    onClick={() => loadSampleData('resume')}
                                    className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-2 rounded-md transition"
                                >
                                    Завантажити приклад
                                </button>
                            </div>
                            <textarea
                                rows={10}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300] focus:border-[#FFC300] flex-grow"
                                placeholder="Вставте весь текст резюме..."
                                value={resumeText}
                                onChange={(e) => setResumeText(e.target.value)}
                            ></textarea>
                        </>
                    )}
                </div>
            </div>

            <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`w-full py-3 px-4 rounded-xl text-white font-bold shadow-lg transition duration-200 flex items-center justify-center h-[48px] ${PRIMARY_COLOR} hover:bg-[#003C65] active:bg-[#001D33] transform active:scale-[0.99] ${(!isFormValid || isAnalyzing) ? 'bg-gray-400 cursor-not-allowed' : ''}`}
            >
                {isAnalyzing ? (
                    <LoadingSpinner text="Аналіз..." size="sm" />
                ) : (
                    <span className="flex items-center justify-center">
                        <IconZap className="w-5 h-5 mr-2"/>
                        Провести AI-Скоринг Кандидата
                    </span>
                )}
            </button>

            <AnalysisCard />
        </div>
    );
};

export default AiRecruiterModule;