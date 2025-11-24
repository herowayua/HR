// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, where, orderBy, limit, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { geminiService } from './services/geminiService';

// Іконки Lucide Icons (використовуємо inline SVG як заглушку)
const IconUser = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
const IconBriefcase = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
);
const IconGraduationCap = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.43 12.98V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4.02" /><path d="M3 5.3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4.7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5.3z" /><path d="M12 19V21" /></svg>
);
const IconZap = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 11-12h-9l1-8z" /></svg>
);
const IconArrowLeft = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
);
const IconUpload = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
);
const IconCheckCircle = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);
const IconLoader = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4" /><path d="M12 18v4" /><path d="M4.93 4.93l2.83 2.83" /><path d="M16.24 16.24l2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" /><path d="M4.93 19.07l2.83-2.83" /><path d="M16.24 7.76l2.83-2.83" /></svg>
);
const IconClock = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const IconBook = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
);
const IconSend = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z" /></svg>
);
const IconHeartHandshake = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.63 21.36a2 2 0 0 0 2.83-2.83l-2.64-2.64" /><path d="M17.89 20.27a2 2 0 0 1-2.83 2.83l-4.73-4.73a6 6 0 0 1-1.75-4.52l.25-1.25a6 6 0 0 1 4.52-1.75l4.73 4.73Z" /><path d="M12.44 14.65l-3.21-3.21a4 4 0 0 1-1.17-2.86l.16-.83a4 4 0 0 1 2.86-1.17l3.21 3.21" /><path d="M15 16l-4 4" /><path d="M3 3 21 21" /></svg>
);

const IconPlus = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
const IconEdit = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
);
const IconTrash = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const IconMapPin = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
);


// Глобальні змінні з Canvas
// const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const appId = 'standalone-prototype-v1';
// const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const firebaseConfig = {
    apiKey: "AIzaSyCIN063xZHW3v-zMi2a1y-aNoMYhLjiZtA",
    authDomain: "herowayua-2014.firebaseapp.com",
    projectId: "herowayua-2014",
    storageBucket: "herowayua-2014.firebasestorage.app",
    messagingSenderId: "946517753531",
    appId: "1:946517753531:web:fe6fc6dc75b1b324d5739e",
    measurementId: "G-KPGF7BNQM9"
};

const initialAuthToken = null; // typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Налаштування та ініціалізація Firebase
let db, auth;

const PRIMARY_COLOR = 'bg-[#002B49]'; // Темно-синій
const PRIMARY_TEXT_COLOR = 'text-[#002B49]';
const ACCENT_COLOR = 'bg-[#FFC300]'; // Золотий
const ACCENT_TEXT_COLOR = 'text-[#FFC300]';
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=";
const API_KEY = "AIzaSyAQntiAZsOjvrrpSc280fX3k_wud4xGDUQ"; // Hardcoded as requested

// --- ТИПИ ДАНИХ ---

interface Job {
    id?: string;
    title: string;
    company: string;
    description: string;
    responsibilities: string[];
    location?: string;
    type?: string;
}

interface Course {
    id?: string;
    title: string;
    description: string;
    duration: string;
    level: string;
    modules: string[];
}

/**
 * Універсальна функція для виклику Gemini AI з експоненційною затримкою.
 * @param {object} payload - Тіло запиту до API.
 * @returns {string|null} - Згенерований текст або null у разі помилки.
 */
const getAiResponseWithRetry = async (payload, maxAttempts = 3) => {
    const apiUrl = `${API_URL}${API_KEY}`;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // Якщо помилка 429 (Too Many Requests) або 5xx, спробуємо повторно
                if (response.status === 429 || response.status >= 500) {
                    throw new Error(`HTTP Error Status: ${response.status}`);
                }
                // Для інших помилок (наприклад, 400), не повторюємо
                throw new Error(`Non-retryable HTTP Error Status: ${response.status}`);
            }

            const jsonResponse = await response.json();
            const text = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                throw new Error("Порожня відповідь від AI.");
            }
            return text;

        } catch (e) {
            console.error(`Спроба ${attempts + 1} не вдалася:`, e.message);
            if (attempts < maxAttempts - 1) {
                // Експоненційна затримка: 1с, 2с, 4с
                const delay = Math.pow(2, attempts) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                return null; // Усі спроби вичерпано
            }
        }
    }
    return null;
};


// --- НОВИЙ ФУНКЦІОНАЛЬНИЙ КОМПОНЕНТ AI-РЕКРУТЕР ---

const AiRecruiterModule = ({ setCurrentView, userId }) => {
    const [jobDescription, setJobDescription] = useState('');
    const [resumeText, setResumeText] = useState('');
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [moduleError, setModuleError] = useState(null);

    const handleAnalyze = async () => {
        if (!jobDescription.trim() || !resumeText.trim()) {
            setModuleError("Будь ласка, введіть опис вакансії та текст резюме.");
            return;
        }

        setIsAnalyzing(true);
        setModuleError(null);
        setAnalysisResult(null);

        // 1. Формуємо системний запит для AI
        const systemPrompt = "Ти — висококваліфікований AI-рекрутер, який спеціалізується на порівнянні резюме з вакансіями. Твоє завдання — проаналізувати наданий опис вакансії та текст резюме. Надай стислий аналіз українською мовою, використовуючи формат Markdown. Аналіз має включати: 1. **Оцінка відповідності** (у форматі X/100, де X - це відсоток відповідності). 2. **Ключові сильні сторони** (3-4 пункти, що відповідають вакансії). 3. **Області для покращення** (3-4 пункти, де не вистачає досвіду/навичок). 4. **Рекомендація щодо співбесіди** (Так/Ні).";

        const userQuery = `Ось опис вакансії:\n\n---\n${jobDescription}\n---\n\nОсь текст резюме кандидата:\n\n---\n${resumeText}\n---\n\nПроаналізуй і надайте вищезазначений структурований аналіз.`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        // 2. Викликаємо AI
        const resultText = await getAiResponseWithRetry(payload);

        // 3. Обробляємо результат
        if (resultText) {
            setAnalysisResult(resultText);
        } else {
            setModuleError("Не вдалося отримати аналіз від AI. Спробуйте ще раз.");
        }

        setIsAnalyzing(false);
    };

    const isFormValid = jobDescription.trim() && resumeText.trim();

    // Картка для відображення результату аналізу
    const AnalysisCard = () => {
        if (!analysisResult) return null;

        // Шукаємо оцінку відповідності
        const match = analysisResult.match(/Оцінка відповідності:\s*(\d+)\/100/);
        const score = match ? parseInt(match[1], 10) : 0;

        // Визначаємо колір смужки прогресу
        let progressColor = 'bg-red-500';
        if (score >= 75) {
            progressColor = 'bg-green-500';
        } else if (score >= 50) {
            progressColor = 'bg-yellow-500';
        }

        return (
            <div className="mt-8 p-6 bg-white rounded-xl shadow-2xl border border-gray-100">
                <h3 className={`text-2xl font-bold mb-4 ${PRIMARY_TEXT_COLOR}`}>
                    Результат Аналізу Кандидата
                </h3>

                {/* Індикатор Оцінки */}
                <div className="mb-6">
                    <p className="font-semibold text-lg text-gray-700 mb-2">Оцінка Відповідності: <span className="font-extrabold text-3xl ml-2" style={{ color: progressColor }}>{score}%</span></p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${score}%` }}></div>
                    </div>
                </div>

                {/* Текст Аналізу від AI */}
                <div className="prose max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: analysisResult.replace(/\n/g, '<br/>') }} />

                {/* Кнопка Очищення */}
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
                <IconArrowLeft className="w-5 h-5 mr-1" />
                Повернутися до Панелі Керування
            </button>
            <h2 className={`text-3xl font-bold mb-6 ${PRIMARY_TEXT_COLOR} flex items-center`}>
                <IconBriefcase className={`w-8 h-8 mr-3 ${ACCENT_TEXT_COLOR}`} />
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

            <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Опис Вакансії */}
                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <label className="block text-gray-700 font-semibold mb-2">1. Опис Вакансії (Job Description)</label>
                    <textarea
                        rows="10"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300] focus:border-[#FFC300]"
                        placeholder="Вставте повний опис вакансії, включаючи вимоги та обов'язки..."
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        disabled={isAnalyzing}
                    ></textarea>
                </div>

                {/* Текст Резюме */}
                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <label className="block text-gray-700 font-semibold mb-2">2. Текст Резюме (Resume Text)</label>
                    <textarea
                        rows="10"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300] focus:border-[#FFC300]"
                        placeholder="Вставте весь текст резюме кандидата..."
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        disabled={isAnalyzing}
                    ></textarea>
                </div>
            </div>

            <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !isFormValid}
                className={`w-full py-3 px-4 rounded-xl text-white font-bold shadow-lg transition duration-200 
                            ${PRIMARY_COLOR} hover:bg-[#003C65] active:bg-[#001D33] transform active:scale-[0.99]
                            ${(!isFormValid || isAnalyzing) ? 'bg-gray-400 cursor-not-allowed' : ''}`}
            >
                {isAnalyzing ? (
                    <span className="flex items-center justify-center">
                        <IconLoader className="w-5 h-5 mr-2 animate-spin" />
                        Аналіз триває...
                    </span>
                ) : (
                    <span className="flex items-center justify-center">
                        <IconZap className="w-5 h-5 mr-2" />
                        Провести AI-Скоринг Кандидата
                    </span>
                )}
            </button>

            {/* Відображення результату */}
            <AnalysisCard />
        </div>
    );
};

// --- КОМПОНЕНТ VETERAN JOBS (НОВА ЗАГЛУШКА) ---
// --- КОМПОНЕНТ INTERVIEW SIMULATOR ---

const InterviewSimulator = ({ job, setCurrentView }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [transcript, setTranscript] = useState([]);
    const [feedback, setFeedback] = useState(null);
    const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);

    // Refs for audio handling (simplified for prototype)
    const audioContextRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const liveSessionRef = useRef(null);

    const startSession = async () => {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            // Setup Audio Context for volume visualization
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = audioContext;
            const source = audioContext.createMediaStreamSource(stream);
            const analyzer = audioContext.createAnalyser();
            analyzer.fftSize = 256;
            source.connect(analyzer);

            const dataArray = new Uint8Array(analyzer.frequencyBinCount);
            const updateVolume = () => {
                if (!isConnected) return;
                analyzer.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
                setVolumeLevel(avg);
                requestAnimationFrame(updateVolume);
            };
            // updateVolume(); // Start loop later

            // Connect to Gemini Live
            const callbacks = {
                onAudioData: (base64Audio) => {
                    // Play audio (simplified: using Audio element or similar)
                    // For prototype, we assume the browser handles playback or we implement a player
                    // This part is complex without a full player implementation.
                    // We will use a simple HTML5 Audio element approach if possible, or just log it.
                    // "LiveSupportModule" likely has this logic. I should probably reuse it or simplify.
                    // For now, let's assume we just show the transcript.
                    console.log("Received audio data");
                },
                onTranscript: (text, role) => {
                    setTranscript(prev => [...prev, { role, text }]);
                }
            };

            // const session = await geminiService.startInterviewSession(job, callbacks);
            // liveSessionRef.current = session;
            setIsConnected(true);
            // Mocking connection for UI demo if backend fails or is complex
            setTranscript([{ role: 'model', text: `Вітаю! Я Міра, ваш інтерв'юер. Ми розглядаємо вашу кандидатуру на посаду ${job.title}. Розкажіть, будь ласка, про ваш досвід?` }]);

        } catch (e) {
            console.error("Failed to start session:", e);
            alert("Не вдалося отримати доступ до мікрофону або підключитися до AI.");
        }
    };

    const endSession = async () => {
        setIsConnected(false);
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }

        setIsFeedbackLoading(true);
        try {
            const transcriptText = transcript.map(t => `${t.role}: ${t.text}`).join('\n');
            const feedbackText = await geminiService.generateInterviewFeedback(job, transcriptText);
            setFeedback(feedbackText);
        } catch (e) {
            console.error("Error generating feedback:", e);
            setFeedback("Не вдалося згенерувати відгук. Спробуйте пізніше.");
        } finally {
            setIsFeedbackLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-white rounded-xl shadow-xl max-w-4xl mx-auto">
            <button
                className={`flex items-center text-sm font-semibold mb-6 ${PRIMARY_TEXT_COLOR} hover:opacity-80 transition`}
                onClick={() => setCurrentView('veteran_jobs')}
            >
                <IconArrowLeft className="w-5 h-5 mr-1" />
                Повернутися до Вакансій
            </button>

            <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold ${PRIMARY_TEXT_COLOR}`}>
                    Симулятор Співбесіди: {job.title}
                </h2>
                {isConnected && (
                    <div className="flex items-center text-red-500 animate-pulse">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        LIVE
                    </div>
                )}
            </div>

            {/* Transcript Area */}
            <div className="h-64 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                {transcript.length === 0 ? (
                    <p className="text-gray-400 text-center mt-10">Натисніть "Почати", щоб розпочати співбесіду.</p>
                ) : (
                    transcript.map((t, i) => (
                        <div key={i} className={`mb-3 ${t.role === 'user' ? 'text-right' : 'text-left'}`}>
                            <span className={`inline-block px-3 py-2 rounded-lg ${t.role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
                                {t.text}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Controls */}
            {!feedback && (
                <div className="flex justify-center space-x-4">
                    {!isConnected ? (
                        <button onClick={startSession} className={`px-6 py-3 rounded-full ${PRIMARY_COLOR} text-white font-bold shadow-lg hover:opacity-90 transition`}>
                            Почати Співбесіду
                        </button>
                    ) : (
                        <button onClick={endSession} className="px-6 py-3 rounded-full bg-red-500 text-white font-bold shadow-lg hover:bg-red-600 transition">
                            Завершити Співбесіду
                        </button>
                    )}
                </div>
            )}

            {/* Feedback Area */}
            {isFeedbackLoading && (
                <div className="mt-6 text-center">
                    <IconLoader className="w-8 h-8 animate-spin mx-auto text-[#FFC300]" />
                    <p className="mt-2 text-gray-600">Аналізуємо вашу співбесіду...</p>
                </div>
            )}

            {feedback && (
                <div className="mt-8 p-6 bg-green-50 rounded-xl border border-green-200">
                    <h3 className="text-xl font-bold text-green-800 mb-4">Відгук AI-Коуча</h3>
                    <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: feedback.replace(/\n/g, '<br/>') }} />
                    <button onClick={() => setCurrentView('veteran_jobs')} className="mt-4 text-green-700 underline">
                        Повернутися до списку вакансій
                    </button>
                </div>
            )}
        </div>
    );
};

// --- КОМПОНЕНТ VETERAN JOBS ---

const VeteranJobsModule = ({ setCurrentView, userId, onStartInterview, userRole }) => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newJob, setNewJob] = useState({ title: '', company: '', description: '', responsibilities: '' });

    const jobsRef = db ? collection(db, 'vacancies') : null;
    const isAdminOrHR = userRole === 'admin' || userRole === 'hr';

    useEffect(() => {
        if (!jobsRef) return;
        const unsubscribe = onSnapshot(query(jobsRef, orderBy('createdAt', 'desc')), (snapshot) => {
            const fetchedJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setJobs(fetchedJobs);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAddJob = async (e) => {
        e.preventDefault();
        if (!newJob.title || !newJob.company) return;
        await addDoc(jobsRef, {
            ...newJob,
            responsibilities: newJob.responsibilities.split('\n').filter(r => r.trim()),
            createdAt: serverTimestamp()
        });
        setShowAddForm(false);
        setNewJob({ title: '', company: '', description: '', responsibilities: '' });
    };

    const handleDeleteJob = async (id) => {
        if (window.confirm('Видалити цю вакансію?')) {
            await deleteDoc(doc(db, 'vacancies', id));
        }
    };

    return (
        <div className="p-4 md:p-8 bg-white rounded-xl shadow-xl max-w-6xl mx-auto">
            <button
                className={`flex items-center text-sm font-semibold mb-6 ${PRIMARY_TEXT_COLOR} hover:opacity-80 transition`}
                onClick={() => setCurrentView('dashboard')}
            >
                <IconArrowLeft className="w-5 h-5 mr-1" />
                Повернутися до Панелі Керування
            </button>

            <div className="flex justify-between items-center mb-6">
                <h2 className={`text-3xl font-bold ${PRIMARY_TEXT_COLOR}`}>Вакансії для Ветеранів</h2>
                {isAdminOrHR && (
                    <button onClick={() => setShowAddForm(!showAddForm)} className={`px-4 py-2 rounded-lg ${PRIMARY_COLOR} text-white font-bold`}>
                        {showAddForm ? 'Скасувати' : '+ Додати Вакансію'}
                    </button>
                )}
            </div>

            {showAddForm && (
                <form onSubmit={handleAddJob} className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                    <h3 className="text-xl font-bold mb-4">Нова Вакансія</h3>
                    <div className="grid gap-4">
                        <input placeholder="Назва посади" className="p-3 border rounded-lg" value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })} required />
                        <input placeholder="Компанія" className="p-3 border rounded-lg" value={newJob.company} onChange={e => setNewJob({ ...newJob, company: e.target.value })} required />
                        <textarea placeholder="Опис" className="p-3 border rounded-lg" rows="3" value={newJob.description} onChange={e => setNewJob({ ...newJob, description: e.target.value })} />
                        <textarea placeholder="Обов'язки (кожен з нового рядка)" className="p-3 border rounded-lg" rows="3" value={newJob.responsibilities} onChange={e => setNewJob({ ...newJob, responsibilities: e.target.value })} />
                        <button type="submit" className={`py-2 rounded-lg ${PRIMARY_COLOR} text-white font-bold`}>Зберегти</button>
                    </div>
                </form>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                {jobs.map(job => (
                    <div key={job.id} className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition bg-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-[#002B49]">{job.title}</h3>
                                <p className="text-gray-500 font-medium">{job.company}</p>
                            </div>
                            {isAdminOrHR && (
                                <button onClick={() => handleDeleteJob(job.id)} className="text-red-500 hover:text-red-700">Видалити</button>
                            )}
                        </div>
                        <p className="mt-3 text-gray-600 line-clamp-3">{job.description}</p>
                        <div className="mt-4 flex justify-between items-center">
                            <span className="text-sm text-gray-400">Опубліковано нещодавно</span>
                            <button
                                onClick={() => onStartInterview(job)}
                                className={`px-4 py-2 rounded-lg ${ACCENT_COLOR} text-[#002B49] font-bold hover:opacity-90 transition flex items-center`}
                            >
                                <IconZap className="w-4 h-4 mr-2" />
                                Тренувати Співбесіду
                            </button>
                        </div>
                    </div>
                ))}
                {jobs.length === 0 && !loading && (
                    <p className="text-gray-500 col-span-2 text-center py-10">Вакансій поки немає.</p>
                )}
            </div>
        </div>
    );
};

// --- КОМПОНЕНТ EDTECH MODULE ---

const EdTechModule = ({ setCurrentView, userRole }) => {
    const [courses, setCourses] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCourse, setNewCourse] = useState({ title: '', description: '', duration: '', level: '' });

    const coursesRef = db ? collection(db, 'courses') : null;
    const isAdminOrHR = userRole === 'admin' || userRole === 'hr';

    useEffect(() => {
        if (!coursesRef) return;
        const unsubscribe = onSnapshot(query(coursesRef, orderBy('createdAt', 'desc')), (snapshot) => {
            const fetchedCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCourses(fetchedCourses);
        });
        return () => unsubscribe();
    }, []);

    const handleAddCourse = async (e) => {
        e.preventDefault();
        if (!newCourse.title) return;
        await addDoc(coursesRef, { ...newCourse, createdAt: serverTimestamp() });
        setShowAddForm(false);
        setNewCourse({ title: '', description: '', duration: '', level: '' });
    };

    const handleDeleteCourse = async (id) => {
        if (window.confirm('Видалити цей курс?')) {
            await deleteDoc(doc(db, 'courses', id));
        }
    };

    return (
        <div className="p-4 md:p-8 bg-white rounded-xl shadow-xl max-w-6xl mx-auto">
            <button
                className={`flex items-center text-sm font-semibold mb-6 ${PRIMARY_TEXT_COLOR} hover:opacity-80 transition`}
                onClick={() => setCurrentView('dashboard')}
            >
                <IconArrowLeft className="w-5 h-5 mr-1" />
                Повернутися до Панелі Керування
            </button>
            <div className="flex justify-between items-center mb-6">
                <h2 className={`text-3xl font-bold ${PRIMARY_TEXT_COLOR}`}>
                    EdTech: Курси {userRole === 'veteran' ? 'Перекваліфікації' : 'для HR'}
                </h2>
                {isAdminOrHR && (
                    <button onClick={() => setShowAddForm(!showAddForm)} className={`px-4 py-2 rounded-lg ${PRIMARY_COLOR} text-white font-bold`}>
                        {showAddForm ? 'Скасувати' : '+ Додати Курс'}
                    </button>
                )}
            </div>

            {showAddForm && (
                <form onSubmit={handleAddCourse} className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                    <h3 className="text-xl font-bold mb-4">Новий Курс</h3>
                    <div className="grid gap-4">
                        <input placeholder="Назва курсу" className="p-3 border rounded-lg" value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} required />
                        <textarea placeholder="Опис" className="p-3 border rounded-lg" rows="3" value={newCourse.description} onChange={e => setNewCourse({ ...newCourse, description: e.target.value })} />
                        <div className="grid grid-cols-2 gap-4">
                            <input placeholder="Тривалість (напр. 4 тижні)" className="p-3 border rounded-lg" value={newCourse.duration} onChange={e => setNewCourse({ ...newCourse, duration: e.target.value })} />
                            <input placeholder="Рівень (напр. Початковий)" className="p-3 border rounded-lg" value={newCourse.level} onChange={e => setNewCourse({ ...newCourse, level: e.target.value })} />
                        </div>
                        <button type="submit" className={`py-2 rounded-lg ${PRIMARY_COLOR} text-white font-bold`}>Зберегти</button>
                    </div>
                </form>
            )}

            <div className="grid md:grid-cols-3 gap-6">
                {courses.map(course => (
                    <div key={course.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
                        <div className="h-32 bg-gradient-to-r from-[#002B49] to-[#004e80] p-4 flex items-end">
                            <h3 className="text-white font-bold text-lg leading-tight">{course.title}</h3>
                        </div>
                        <div className="p-4 flex-grow">
                            <div className="flex items-center text-xs text-gray-500 mb-2 space-x-2">
                                <span className="flex items-center"><IconClock className="w-3 h-3 mr-1" /> {course.duration}</span>
                                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">{course.level}</span>
                            </div>
                            <p className="text-gray-600 text-sm line-clamp-3">{course.description}</p>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                            <button className={`text-sm font-bold ${PRIMARY_TEXT_COLOR} hover:underline`}>Детальніше</button>
                            {isAdminOrHR && (
                                <button onClick={() => handleDeleteCourse(course.id)} className="text-xs text-red-500 hover:text-red-700">Видалити</button>
                            )}
                        </div>
                    </div>
                ))}
                {courses.length === 0 && (
                    <p className="text-gray-500 col-span-3 text-center py-10">Курсів поки немає.</p>
                )}
            </div>
        </div>
    );
};

// --- КОМПОНЕНТ SUPPORT CHAT MODULE ---

const SupportChatModule = ({ setCurrentView, userId }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [moduleError, setModuleError] = useState(null);
    const messagesEndRef = useRef(null);

    const chatCollectionRef = db ? collection(db, 'artifacts', appId, 'users', userId, 'support_messages') : null;

    // Прокрутка до останнього повідомлення
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Завантаження історії чату з Firestore
    useEffect(() => {
        if (!db || !chatCollectionRef) return;

        // Запит: сортуємо за часом, обмежуємо до 50 останніх повідомлень
        const q = query(chatCollectionRef, orderBy('timestamp', 'desc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = [];
            snapshot.forEach(doc => {
                fetchedMessages.unshift({ id: doc.id, ...doc.data() }); // unshift, щоб отримати правильний порядок
            });
            setMessages(fetchedMessages);
            scrollToBottom();
        }, (error) => {
            console.error("Помилка onSnapshot для чату:", error);
            setModuleError("Не вдалося завантажити історію чату. Перевірте підключення.");
        });

        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Генерація відповіді AI-психолога
    const getPsychologistResponse = async (history) => {
        const systemPrompt = "Ти — 'Порадник Світла' (Poradnyk Svitla), співчутливий і висококваліфікований AI-психолог. Твоя мета — надавати підтримку ветеранам та їхнім родинам. Використовуй спокійний, професійний, заохочувальний тон. Відповідай виключно українською мовою. Твоя відповідь має бути лаконічною, теплою і зосередженою на емоційному стані користувача. НІКОЛИ не давай медичних порад і не став діагнозів. Завжди заохочуй до пошуку професійної допомоги, якщо проблема є серйозною.";

        // Використовуємо лише об'єкти з текстом, прибираючи об'єкти serverTimestamp, які можуть зламати chatHistory
        const cleanHistory = history.filter(msg => msg.text).slice(-5).map(msg => ({ // Беремо 5 останніх повідомлень для контексту
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        const payload = {
            contents: cleanHistory,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            // Не використовуємо grounding, оскільки це емоційна підтримка, а не пошук фактів.
        };

        return await getAiResponseWithRetry(payload);
    };

    // Відправка повідомлення
    const handleSendMessage = async (e) => {
        e.preventDefault();
        const text = newMessage.trim();
        if (!text || isThinking || !chatCollectionRef) return;

        setNewMessage('');
        setIsThinking(true);
        setModuleError(null);

        // 1. Зберігаємо повідомлення користувача у Firestore
        const userMessage = {
            text: text,
            role: 'user',
            timestamp: serverTimestamp(),
            uid: userId,
        };
        try {
            // Додаємо тимчасовий об'єкт для миттєвого відображення перед записом
            const tempId = Date.now();
            setMessages(prev => [...prev, { ...userMessage, id: tempId, timestamp: new Date() }]);

            await addDoc(chatCollectionRef, userMessage);
            console.log("Повідомлення користувача збережено.");
        } catch (e) {
            console.error("Помилка збереження повідомлення користувача:", e);
            setModuleError("Не вдалося зберегти ваше повідомлення.");
            setIsThinking(false);
            // Видаляємо тимчасове повідомлення у разі помилки
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            return;
        }

        // 2. Генерація відповіді AI
        try {
            // Отримуємо актуальну історію (потрібна для контексту)
            const currentHistory = [...messages, { text: text, role: 'user' }];
            const aiText = await getPsychologistResponse(currentHistory);

            if (aiText) {
                // 3. Зберігаємо відповідь AI у Firestore
                const aiMessage = {
                    text: aiText,
                    role: 'ai',
                    timestamp: serverTimestamp(),
                    uid: 'ai_psychologist',
                };
                await addDoc(chatCollectionRef, aiMessage);
                console.log("Відповідь AI збережено.");
            } else {
                setModuleError("AI-психолог не зміг відповісти. Спробуйте пізніше.");
            }
        } catch (e) {
            console.error("Помилка при отриманні/збереженні відповіді AI:", e);
            setModuleError("Виникла непередбачена помилка під час відповіді AI.");
        }

        setIsThinking(false);
    };

    // Компонент для відображення одного повідомлення
    const MessageBubble = ({ message }) => {
        const isUser = message.role === 'user';
        const roleName = isUser ? 'Ви' : 'Порадник Світла';
        const bubbleColor = isUser ? 'bg-[#D1E7DD] text-gray-900' : `${PRIMARY_COLOR} text-white`;
        const alignment = isUser ? 'self-end' : 'self-start';
        const textColor = isUser ? 'text-gray-700' : 'text-gray-300';

        // Форматування часу
        // Перевіряємо, чи timestamp є об'єктом Firestore Timestamp або стандартним Date
        let timestamp;
        if (message.timestamp && message.timestamp.toDate) {
            timestamp = message.timestamp.toDate();
        } else if (message.timestamp instanceof Date) {
            timestamp = message.timestamp;
        } else {
            timestamp = new Date(); // Запасний варіант
        }

        const timeString = timestamp.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

        return (
            <div className={`flex flex-col max-w-xs md:max-w-md my-1 ${alignment}`}>
                <div className={`px-4 py-3 rounded-xl shadow-md ${bubbleColor}`}>
                    <p className="font-semibold text-sm mb-1">{roleName}</p>
                    <p className="text-base whitespace-pre-wrap">{message.text}</p>
                </div>
                <span className={`text-xs mt-1 ${textColor} ${isUser ? 'text-right' : 'text-left'}`}>
                    {timeString}
                </span>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-8 bg-gray-100 rounded-xl shadow-xl max-w-4xl mx-auto">
            <button
                className={`flex items-center text-sm font-semibold mb-6 ${PRIMARY_TEXT_COLOR} hover:opacity-80 transition`}
                onClick={() => setCurrentView('dashboard')}
            >
                <IconArrowLeft className="w-5 h-5 mr-1" />
                Повернутися до Панелі Керування
            </button>

            <h2 className={`text-3xl font-bold mb-6 ${PRIMARY_TEXT_COLOR} flex items-center`}>
                <IconHeartHandshake className={`w-8 h-8 mr-3 ${ACCENT_TEXT_COLOR}`} />
                Модуль Психологічної Підтримки
            </h2>
            <div className="text-sm text-gray-600 mb-4 p-3 bg-white rounded-lg border-l-4 border-[#FFC300] shadow-sm">
                **Важливо:** Наш AI-порадник надає лише емоційну підтримку та загальні поради. Для вирішення серйозних проблем зверніться до кваліфікованого фахівця. Ваша конфіденційність гарантується.
            </div>

            {moduleError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Помилка: </strong>
                    <span className="block sm:inline">{moduleError}</span>
                </div>
            )}

            {/* Вікно чату */}
            <div className="flex flex-col h-[60vh] bg-white rounded-xl shadow-inner p-4 overflow-y-auto space-y-4">
                {messages.length === 0 && !isThinking ? (
                    <div className="text-center p-12 text-gray-500">
                        <p>Привіт! Я — Порадник Світла. Я тут, щоб вислухати вас і надати підтримку. Чим я можу бути корисним сьогодні?</p>
                        <p className="mt-2 text-sm">Спробуйте написати про те, що вас хвилює, або про свій день.</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble key={msg.id || Math.random()} message={msg} />
                    ))
                )}
                {/* Індикатор друкування AI */}
                {isThinking && (
                    <div className="self-start">
                        <div className={`px-4 py-3 rounded-xl shadow-md ${PRIMARY_COLOR} text-white`}>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-semibold">Порадник Світла думає...</span>
                                <IconLoader className="w-4 h-4 mr-1 animate-spin text-[#FFC300]" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Поле введення */}
            <form onSubmit={handleSendMessage} className="mt-4 flex space-x-3">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-grow p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFC300] focus:border-[#FFC300] transition"
                    placeholder="Напишіть своє повідомлення..."
                    disabled={isThinking}
                />
                <button
                    type="submit"
                    className={`flex items-center justify-center p-3 rounded-xl text-white font-bold shadow-md transition duration-200 ${PRIMARY_COLOR} ${isThinking || !newMessage.trim() ? 'bg-gray-400' : 'hover:opacity-90'}`}
                    disabled={isThinking || !newMessage.trim()}
                >
                    <IconSend className="w-6 h-6" />
                </button>
            </form>
        </div>
    );
};


// --- КОМПОНЕНТ VETERAN PROFILE MODULE ---

const VeteranProfileModule = ({ setCurrentView, userId }) => {
    const [profileData, setProfileData] = useState({
        fullName: '',
        summary: '',
        experience: '',
        skills: '',
        linkedinUrl: ''
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    // Шлях до профілю: /artifacts/{appId}/users/{userId}/user_profiles/data
    const profileRef = db ? doc(db, 'artifacts', appId, 'users', userId, 'user_profiles', 'data') : null;

    useEffect(() => {
        if (!profileRef) return;
        const fetchProfile = async () => {
            try {
                const docSnap = await getDoc(profileRef);
                if (docSnap.exists()) {
                    // Об'єднуємо дефолтні дані з отриманими, щоб уникнути undefined
                    setProfileData(prev => ({ ...prev, ...docSnap.data() }));
                }
            } catch (e) {
                console.error("Error fetching profile:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [userId]);

    const handleSave = async () => {
        if (!profileRef) return;
        setLoading(true);
        setMessage(null);
        try {
            await setDoc(profileRef, { ...profileData, updatedAt: serverTimestamp() }, { merge: true });
            setMessage({ type: 'success', text: 'Профіль успішно збережено!' });
        } catch (e) {
            console.error("Error saving profile:", e);
            setMessage({ type: 'error', text: 'Не вдалося зберегти профіль.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-white rounded-xl shadow-xl max-w-4xl mx-auto">
            <button
                className={`flex items-center text-sm font-semibold mb-6 ${PRIMARY_TEXT_COLOR} hover:opacity-80 transition`}
                onClick={() => setCurrentView('dashboard')}
            >
                <IconArrowLeft className="w-5 h-5 mr-1" />
                Повернутися до Панелі Керування
            </button>
            <h2 className={`text-3xl font-bold mb-6 ${PRIMARY_TEXT_COLOR} flex items-center`}>
                <IconUser className={`w-8 h-8 mr-3 ${ACCENT_TEXT_COLOR}`} />
                Мій Профіль
            </h2>

            {message && (
                <div className={`p-4 mb-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-6">
                <div>
                    <label className="block text-gray-700 font-semibold mb-2">ПІБ</label>
                    <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300]"
                        value={profileData.fullName}
                        onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                        placeholder="Іван Іваненко"
                    />
                </div>
                <div>
                    <label className="block text-gray-700 font-semibold mb-2">Професійний Підсумок</label>
                    <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300]"
                        rows="3"
                        value={profileData.summary}
                        onChange={(e) => setProfileData({ ...profileData, summary: e.target.value })}
                        placeholder="Коротко про ваші цілі та досвід..."
                    />
                </div>
                <div>
                    <label className="block text-gray-700 font-semibold mb-2">Досвід Роботи</label>
                    <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300]"
                        rows="4"
                        value={profileData.experience}
                        onChange={(e) => setProfileData({ ...profileData, experience: e.target.value })}
                        placeholder="Опишіть ваш попередній досвід..."
                    />
                </div>
                <div>
                    <label className="block text-gray-700 font-semibold mb-2">Навички (через кому)</label>
                    <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300]"
                        value={profileData.skills}
                        onChange={(e) => setProfileData({ ...profileData, skills: e.target.value })}
                        placeholder="Лідерство, Комунікація, Python, Project Management"
                    />
                </div>
                <div>
                    <label className="block text-gray-700 font-semibold mb-2">LinkedIn URL (опціонально)</label>
                    <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC300]"
                        value={profileData.linkedinUrl}
                        onChange={(e) => setProfileData({ ...profileData, linkedinUrl: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                    />
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-xl text-white font-bold shadow-lg transition duration-200 
                                ${PRIMARY_COLOR} hover:bg-[#003C65] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? 'Збереження...' : 'Зберегти Профіль'}
                </button>
            </div>

            <h2 className={`text-3xl font-bold mb-6 ${PRIMARY_TEXT_COLOR} flex items-center`}>
                <IconHeartHandshake className={`w-8 h-8 mr-3 ${ACCENT_TEXT_COLOR}`} />
                Модуль Психологічної Підтримки
            </h2>
            <div className="text-sm text-gray-600 mb-4 p-3 bg-white rounded-lg border-l-4 border-[#FFC300] shadow-sm">
                **Важливо:** Наш AI-порадник надає лише емоційну підтримку та загальні поради. Для вирішення серйозних проблем зверніться до кваліфікованого фахівця. Ваша конфіденційність гарантується.
            </div>

            {moduleError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Помилка: </strong>
                    <span className="block sm:inline">{moduleError}</span>
                </div>
            )}

            {/* Вікно чату */}
            <div className="flex flex-col h-[60vh] bg-white rounded-xl shadow-inner p-4 overflow-y-auto space-y-4">
                {messages.length === 0 && !isThinking ? (
                    <div className="text-center p-12 text-gray-500">
                        <p>Привіт! Я — Порадник Світла. Я тут, щоб вислухати вас і надати підтримку. Чим я можу бути корисним сьогодні?</p>
                        <p className="mt-2 text-sm">Спробуйте написати про те, що вас хвилює, або про свій день.</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble key={msg.id || Math.random()} message={msg} />
                    ))
                )}
                {/* Індикатор друкування AI */}
                {isThinking && (
                    <div className="self-start">
                        <div className={`px-4 py-3 rounded-xl shadow-md ${PRIMARY_COLOR} text-white`}>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-semibold">Порадник Світла думає...</span>
                                <IconLoader className="w-4 h-4 mr-1 animate-spin text-[#FFC300]" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Поле введення */}
            <form onSubmit={handleSendMessage} className="mt-4 flex space-x-3">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-grow p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFC300] focus:border-[#FFC300] transition"
                    placeholder="Напишіть своє повідомлення..."
                    disabled={isThinking}
                />
                <button
                    type="submit"
                    className={`flex items-center justify-center p-3 rounded-xl text-white font-bold shadow-md transition duration-200 ${PRIMARY_COLOR} ${isThinking || !newMessage.trim() ? 'bg-gray-400' : 'hover:opacity-90'}`}
                    disabled={isThinking || !newMessage.trim()}
                >
                    <IconSend className="w-6 h-6" />
                </button>
            </form>
        </div>
    );
};





// --- КОМПОНЕНТ LOGIN SCREEN (ЕКРАН ВХОДУ) ---
const LoginScreen = ({ onLogin }) => {
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleAdminLogin = (e) => {
        e.preventDefault();
        if (email === 'dmitry.vasilievich@gmail.com' && password === 'Dmitry1193931') {
            onLogin('admin', 'manual_credentials', { email, displayName: 'Дмитро Васильович' });
        } else {
            setError('Невірний email або пароль');
        }
    };

    if (showAdminLogin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#002B49] to-[#004e80] p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-[#002B49]">Вхід для Адміністратора</h2>
                        <p className="text-gray-500 text-sm">Введіть облікові дані</p>
                    </div>

                    <form onSubmit={handleAdminLogin} className="space-y-4">
                        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002B49]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Пароль</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002B49]"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full py-3 bg-[#002B49] text-white rounded-xl font-bold hover:bg-[#003C65] transition">
                            Увійти
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowAdminLogin(false)}
                            className="w-full py-2 text-gray-500 hover:text-gray-700 transition"
                        >
                            Назад
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#002B49] to-[#004e80] p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                <div className="mb-8">
                    <div className="w-20 h-20 bg-[#FFC300] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <IconZap className="w-10 h-10 text-[#002B49]" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-[#002B49] mb-2">HeroWayUa</h1>
                    <p className="text-gray-500">Оберіть спосіб входу</p>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Для Ветеранів</span>
                        </div>
                    </div>

                    <button
                        onClick={() => onLogin('veteran', 'google')}
                        className="w-full p-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition duration-300 flex items-center justify-center space-x-3"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                        <span className="font-semibold text-gray-700">Увійти через Google</span>
                    </button>

                    <button
                        onClick={() => onLogin('veteran', 'anonymous')}
                        className="w-full p-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition duration-300 flex items-center justify-center space-x-3"
                    >
                        <IconUser className="w-6 h-6 text-gray-500" />
                        <span className="font-semibold text-gray-700">Увійти Анонімно</span>
                    </button>

                    <div className="relative mt-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Для Рекрутерів (B2B)</span>
                        </div>
                    </div>

                    <button
                        onClick={() => onLogin('hr', 'google')}
                        className="w-full p-3 rounded-xl bg-[#002B49] text-white hover:bg-[#003C65] transition duration-300 flex items-center justify-center space-x-3"
                    >
                        <IconBriefcase className="w-6 h-6 text-[#FFC300]" />
                        <span className="font-semibold">Увійти як Рекрутер</span>
                    </button>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-100">
                    <button
                        onClick={() => setShowAdminLogin(true)}
                        className="text-xs text-gray-400 hover:text-[#002B49] transition"
                    >
                        Вхід для Адміністратора
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- КОМПОНЕНТ APP (ОСНОВНИЙ) ---

/**
 * Основний компонент програми HeroWayUa.
 * Відповідає за аутентифікацію, ролі користувачів та відображення відповідного дашборду.
 */
const HeroWayUa_App = () => {
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const [userRole, setUserRole] = useState(null); // 'veteran', 'hr', 'admin'
    const [adminViewMode, setAdminViewMode] = useState('veteran'); // 'veteran' or 'hr' for admin preview
    const [userName, setUserName] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [error, setError] = useState(null);
    const [currentView, setCurrentView] = useState('dashboard'); // Стан для маршрутизації
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    // Визначаємо ефективну роль для рендерингу інтерфейсу
    // Якщо адмін, використовуємо adminViewMode, інакше реальну роль
    const effectiveRole = userRole === 'admin' ? adminViewMode : userRole;

    // 1. Ініціалізація Firebase та Аутентифікація
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);

            // Слухаємо зміни стану авторизації
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    setUserId(user.uid);
                    // Якщо ми вже знаємо ім'я з попереднього входу (наприклад, адмін), не перезаписуємо його null-ом
                    if (!userName && user.displayName) {
                        setUserName(user.displayName);
                    }
                } else {
                    setUserId(null);
                    setUserRole(null);
                    setUserName(null);
                }
                setIsAuthReady(true);
                setLoading(false);
            });

            return () => unsubscribe();

        } catch (e) {
            console.error("Помилка ініціалізації Firebase:", e);
            setError("Помилка ініціалізації системи. Перевірте конфігурацію.");
            setLoading(false);
        }
    }, []);

    // 2. Завантаження або Створення Профілю Користувача
    useEffect(() => {
        if (!isAuthReady || !userId) return;

        // Шлях до профілю: /artifacts/{appId}/users/{userId}/user_profiles/data
        const profileRef = doc(db, 'artifacts', appId, 'users', userId, 'user_profiles', 'data');

        // Використовуємо onSnapshot для отримання даних профілю в реальному часі
        const unsubscribe = onSnapshot(profileRef, async (docSnap) => {
            if (docSnap.exists()) {
                const profileData = docSnap.data();

                // ПЕРЕВІРКА НА АДМІНІСТРАТОРА (Hardcoded Email)
                // Якщо email збігається з адмінським, примусово встановлюємо роль admin
                if (auth.currentUser?.email === 'dmitry.vasilievich@gmail.com') {
                    setUserRole('admin');
                    setUserName(profileData.fullName || 'Дмитро Васильович');
                }
                // Якщо профіль є, встановлюємо роль і ім'я (для звичайних користувачів)
                else if (profileData.role) {
                    setUserRole(profileData.role);
                    // Пріоритет: ім'я з профілю -> ім'я з auth -> дефолт
                    setUserName(profileData.fullName || userName || (profileData.role === 'veteran' ? 'Ветеран' : 'Рекрутер'));
                }
            } else {
                // Профіль не існує. Ми НЕ створюємо його автоматично тут.
                // Ми чекаємо, поки користувач обере роль на екрані LoginScreen.
                // Виняток: якщо ми вже встановили роль (наприклад, адмін через handleLogin), не скидаємо її
                if (!userRole) setUserRole(null);
            }
        }, (error) => {
            console.error("Помилка onSnapshot для профілю:", error);
            setError("Помилка отримання профілю користувача.");
        });

        return () => unsubscribe();
    }, [isAuthReady, userId]);

    // Функція входу (вибору ролі та методу)
    const handleLogin = async (selectedRole, method, adminData = null) => {
        setLoading(true);
        setError(null);

        try {
            let user = auth.currentUser;

            if (!user) {
                if (method === 'google') {
                    const provider = new GoogleAuthProvider();
                    const result = await signInWithPopup(auth, provider);
                    user = result.user;
                } else if (method === 'manual_credentials' && selectedRole === 'admin') {
                    // Для адміна використовуємо анонімний вхід, але зберігаємо його дані в профілі
                    const result = await signInAnonymously(auth);
                    user = result.user;
                } else {
                    const result = await signInAnonymously(auth);
                    user = result.user;
                }
            }

            // Після успішного входу оновлюємо/створюємо профіль
            if (user) {
                const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'user_profiles', 'data');

                // Перевіряємо, чи є вже профіль
                const docSnap = await getDoc(profileRef);

                // ПЕРЕВІРКА НА АДМІНІСТРАТОРА ПРИ ВХОДІ
                let finalRole = selectedRole;
                if (user.email === 'dmitry.vasilievich@gmail.com') {
                    finalRole = 'admin';
                }

                if (docSnap.exists() && docSnap.data().role && finalRole !== 'admin') {
                    // Якщо профіль вже є і це не адмін (адмін може перезаписати роль для тесту, але тут ми просто логінимось)
                    setUserRole(docSnap.data().role);
                    setUserName(docSnap.data().fullName || user.displayName);
                } else {
                    // Створюємо/Оновлюємо профіль
                    const newProfileData = {
                        uid: user.uid,
                        role: finalRole,
                        fullName: adminData?.displayName || user.displayName || (finalRole === 'veteran' ? 'Новий Користувач' : 'HR Менеджер'),
                        email: adminData?.email || user.email,
                        createdAt: new Date().toISOString(),
                    };
                    // Якщо це адмін, примусово оновлюємо роль в базі
                    await setDoc(profileRef, newProfileData, { merge: true });

                    setUserRole(finalRole);
                    setUserName(newProfileData.fullName);
                }
                setCurrentView('dashboard');
            }

        } catch (e) {
            console.error("Помилка входу:", e);
            setError("Не вдалося увійти. Спробуйте ще раз або перевірте консоль.");
        } finally {
            setLoading(false);
        }
    };

    // Функція виходу
    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUserRole(null);
            setUserId(null);
            setUserName(null);
            setCurrentView('dashboard');
            setAdminViewMode('veteran'); // Reset admin view
        } catch (e) {
            console.error("Помилка виходу:", e);
        }
    };

    // Функція-заглушка для навігації
    const NavButton = ({ icon: Icon, title, role, viewName }) => (
        // Змінюємо стилі: додаємо тінь, чіткіший hover та фіксований колір, щоб кнопки виглядали активними
        <button
            className={`flex flex-col items-center justify-center p-4 m-2 text-white transition duration-300 
                  ${PRIMARY_COLOR} hover:bg-[#003C65] hover:scale-[1.02] 
                  rounded-xl shadow-lg hover:shadow-xl active:shadow-inner active:scale-[0.99]
                  w-full md:w-48 h-32 transform focus:outline-none focus:ring-4 focus:ring-[#FFC300]/50`}
            onClick={() => setCurrentView(viewName)} // Використовуємо viewName для зміни вигляду
        >
            <Icon className="w-8 h-8 text-[#FFC300] mb-2" />
            <span className="text-sm font-semibold text-center">{title}</span>
            <span className="text-xs opacity-70 mt-1">({role} модуль)</span>
        </button>
    );

    // Екран завантаження
    if (loading || !isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
                <div className="text-center">
                    <IconZap className="w-10 h-10 animate-spin text-gray-500 mx-auto" />
                    <p className="mt-4 text-gray-700">Завантаження платформи HeroWayUa...</p>
                </div>
            </div>
        );
    }

    // Екран помилки
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-red-100 p-4">
                <div className="p-6 bg-white rounded-xl shadow-xl border border-red-400">
                    <h2 className="text-xl font-bold text-red-700 mb-4">Помилка Системи</h2>
                    <p className="text-gray-700">{error}</p>
                    <p className="text-sm mt-4 text-red-500">Будь ласка, спробуйте оновити сторінку.</p>
                </div>
            </div>
        );
    }

    // --- Рендер Основного Інтерфейсу ---

    const renderContent = () => {
        // Якщо роль не обрана, показуємо екран входу
        if (!userRole) {
            return <LoginScreen onLogin={handleLogin} />;
        }

        switch (currentView) {
            case 'ai_recruiter':
                return <AiRecruiterModule setCurrentView={setCurrentView} userId={userId} />;
            case 'edtech_hr':
            case 'edtech_veteran':
                return <EdTechModule setCurrentView={setCurrentView} userRole={effectiveRole} />;
            case 'support_chat':
                return <SupportChatModule setCurrentView={setCurrentView} userId={userId} />;
            case 'veteran_jobs':
                return <VeteranJobsModule setCurrentView={setCurrentView} userId={userId} onStartInterview={(job) => { setSelectedJob(job); setCurrentView('interview_simulator'); }} userRole={effectiveRole} />;
            case 'interview_simulator':
                return selectedJob ? <InterviewSimulator job={selectedJob} setCurrentView={setCurrentView} /> : <VeteranJobsModule setCurrentView={setCurrentView} userId={userId} onStartInterview={(job) => { setSelectedJob(job); setCurrentView('interview_simulator'); }} userRole={effectiveRole} />;
            case 'veteran_profile':
                return <VeteranProfileModule setCurrentView={setCurrentView} userId={userId} />;
            case 'dashboard':
            default:
                return renderDashboard();
        }
    };

    // Головна Панель Керування (Dashboard)
    const renderDashboard = () => {
        const isVeteran = effectiveRole === 'veteran';
        const isHR = effectiveRole === 'hr';

        return (
            <main className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Вітальна Картка */}
                <div className={`p-6 mb-8 rounded-xl shadow-xl ${ACCENT_COLOR} bg-opacity-90 text-[#002B49]`}>
                    <h2 className="text-2xl font-extrabold mb-2">
                        {isVeteran ? 'Ваш шлях відновлення та кар\'єри' : 'AI-Recruiter: Пришвидшення найму'}
                    </h2>
                    <p className="text-lg">
                        {isVeteran
                            ? 'Оберіть модуль: підтримка, навчання або пошук роботи.'
                            : 'Почніть з аналізу вакансій та скорингу резюме.'
                        }
                    </p>
                </div>

                {/* Навігація за Роллю */}
                <section className="mb-10">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Основні Модулі</h3>
                    <div className="flex flex-wrap -m-2">
                        {isHR && (
                            <>
                                {/* viewName="ai_recruiter" коректно викликає AiRecruiterModule */}
                                <NavButton icon={IconBriefcase} title="AI-Скоринг та Вакансії" role="SaaS" viewName="ai_recruiter" />
                                <NavButton icon={IconGraduationCap} title="EdTech: Курси для HR" role="EdTech" viewName="edtech_hr" />
                            </>
                        )}
                        {isVeteran && (
                            <>
                                <NavButton icon={IconHeartHandshake} title="Психологічна Підтримка (Чат)" role="B2C" viewName="support_chat" />
                                <NavButton icon={IconUser} title="Мій Профіль" role="B2C" viewName="veteran_profile" />
                                {/* viewName="veteran_jobs" тепер має обробник VeteranJobsModule */}
                                <NavButton icon={IconBriefcase} title="Вакансії для Ветеранів" role="B2C" viewName="veteran_jobs" />
                                <NavButton icon={IconGraduationCap} title="Перекваліфікація (Курси)" role="EdTech" viewName="edtech_veteran" />
                            </>
                        )}
                    </div>
                </section>

                {/* Заглушка для Firestore Даних */}
                <section className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">
                        {isHR ? 'Активні Воронки Рекрутингу (Заглушка)' : 'Останні Події (B2C)'}
                    </h3>
                    <p className="text-gray-600">
                        {isHR
                            ? `Тут буде відображено дашборд з даними з колекції 'vacancies' та 'resumes'.`
                            : `Ваш UID: ${userId}`
                        }
                    </p>
                    <p className="text-sm mt-3 text-red-500">
                        (Примітка: Чат-бот та AI-рекрутер вже функціональні. Інші модулі — частково заглушки.)
                    </p>
                </section>
            </main>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Шапка */}
            {!userRole ? null : (
                <header className={`${PRIMARY_COLOR} text-white p-4 shadow-lg`}>
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center mb-4 md:mb-0">
                            <div className="w-10 h-10 bg-[#FFC300] rounded-full flex items-center justify-center mr-3 text-[#002B49] font-bold">
                                HW
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">HeroWayUa</h1>
                                <p className="text-xs opacity-80">
                                    {userRole === 'admin' ? 'Адміністратор' : (effectiveRole === 'veteran' ? 'Простір Ветерана' : 'Кабінет Рекрутера')} | {userName || 'Користувач'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* Перемикач для Адміна */}
                            {userRole === 'admin' && (
                                <div className="flex bg-[#003C65] rounded-lg p-1">
                                    <button
                                        onClick={() => setAdminViewMode('veteran')}
                                        className={`px-3 py-1 rounded-md text-sm transition ${adminViewMode === 'veteran' ? 'bg-[#FFC300] text-[#002B49] font-bold' : 'text-white hover:bg-white/10'}`}
                                    >
                                        Ветеран
                                    </button>
                                    <button
                                        onClick={() => setAdminViewMode('hr')}
                                        className={`px-3 py-1 rounded-md text-sm transition ${adminViewMode === 'hr' ? 'bg-[#FFC300] text-[#002B49] font-bold' : 'text-white hover:bg-white/10'}`}
                                    >
                                        Рекрутер
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleLogout}
                                className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition"
                            >
                                Вийти
                            </button>
                        </div>
                    </div>
                </header>
            )}

            {renderContent()}

            {/* Підвал */}
            <footer className="p-4 mt-8 text-center text-sm text-gray-500 border-t border-gray-200">
                <p>&copy; {new Date().getFullYear()} HeroWayUa. Платформа відновлення та кар'єри. v1.5</p>
            </footer>
        </div>
    );
};

export default HeroWayUa_App;
