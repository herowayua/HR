import React, { useState, useRef, useEffect, useCallback } from 'react';
import { geminiService, LiveSession } from '../services/geminiService';
import { IconArrowLeft, IconMic, IconMicOff, LoadingSpinner, IconMessageSquare, IconSparkles } from './icons';
import { audioUtils } from '../utils/audioUtils';
import type { Job } from '../utils/seed';

type InterviewStatus = 'IDLE' | 'CONNECTING' | 'INTERVIEWING' | 'ANALYZING' | 'FEEDBACK' | 'ERROR';
interface TranscriptMessage {
    id: number;
    role: 'user' | 'ai';
    text: string;
}

interface InterviewSimulatorProps {
    job: Job;
    onFinish: () => void;
}

const PRIMARY_TEXT_COLOR = 'text-[#002B49]';
const PRIMARY_COLOR = 'bg-[#002B49]';

const InterviewSimulator: React.FC<InterviewSimulatorProps> = ({ job, onFinish }) => {
    const [status, setStatus] = useState<InterviewStatus>('IDLE');
    const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
    const [finalFeedback, setFinalFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const sessionRef = useRef<LiveSession | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextId = useRef(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // FIX: Use refs to hold the latest state for callbacks to avoid stale closures.
    const statusRef = useRef(status);
    statusRef.current = status;
    const transcriptRef = useRef(transcript);
    transcriptRef.current = transcript;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [transcript]);

    const stopInterview = useCallback(async (shouldGenerateFeedback: boolean = true) => {
        const currentStatus = statusRef.current;
        const currentTranscript = transcriptRef.current;

        // Prevent re-entry if already stopping
        if (currentStatus === 'ANALYZING' || currentStatus === 'FEEDBACK') {
            return;
        }
        setStatus('ANALYZING'); // Move to analyzing state

        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        // ... (rest of cleanup logic)
        if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();
        if (mediaStreamSourceRef.current) mediaStreamSourceRef.current.disconnect();
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') await inputAudioContextRef.current.close();
        if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(track => track.stop());
        
        audioUtils.cleanup();

        if (shouldGenerateFeedback && currentStatus === 'INTERVIEWING' && currentTranscript.length > 1) {
            try {
                const fullTranscript = currentTranscript.map(t => `${t.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.text}`).join('\n');
                const feedback = await geminiService.generateInterviewFeedback(job, fullTranscript);
                setFinalFeedback(feedback);
                setStatus('FEEDBACK');
            } catch (e) {
                console.error("Error generating feedback:", e);
                setError("Не вдалося згенерувати відгук.");
                setStatus('ERROR');
            }
        } else if (!shouldGenerateFeedback) {
            setStatus('IDLE'); // Or some other final state if no feedback is generated
        } else {
             setStatus('FEEDBACK'); // Move to feedback even if there's nothing to show
        }
    }, [job]);

    const startInterview = useCallback(async () => {
        if (statusRef.current !== 'IDLE' && statusRef.current !== 'ERROR') return;
        
        setError(null);
        setTranscript([]);
        setFinalFeedback(null);
        setStatus('CONNECTING');

        const updateTranscript = (role: 'user' | 'ai', text: string) => {
            setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === role) {
                    return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                }
                return [...prev, { id: nextId.current++, role, text }];
            });
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;

            const sessionPromise = geminiService.startInterviewSession(job, {
                onmessage: (message) => {
                    if (message.serverContent?.outputTranscription) {
                        updateTranscript('ai', message.serverContent.outputTranscription.text);
                    }
                    if (message.serverContent?.inputTranscription) {
                        updateTranscript('user', message.serverContent.inputTranscription.text);
                    }
                    if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
                        audioUtils.playAudio(message.serverContent.modelTurn.parts[0].inlineData.data);
                    }
                    if (message.serverContent?.turnComplete) {
                        // The AI might signal the end. We listen for specific keywords in its speech.
                         // FIX: Replaced `findLast` with a compatible alternative and used a ref to get the latest transcript.
                         const lastAiMessage = [...transcriptRef.current].reverse().find(m => m.role === 'ai');
                         if (lastAiMessage?.text.includes("завершує нашу тренувальну співбесіду")) {
                             stopInterview();
                         }
                    }
                },
                onerror: (e) => {
                    console.error("Помилка Live сесії:", e);
                    setError("Сталася помилка з'єднання.");
                    setStatus('ERROR');
                },
                onclose: () => {
                   // FIX: Use ref to check current status, resolving the unintentional comparison error.
                   if (statusRef.current !== 'ANALYZING' && statusRef.current !== 'FEEDBACK') {
                       stopInterview();
                   }
                }
            });
            
            const session = await sessionPromise;
            sessionRef.current = session;
            setStatus('INTERVIEWING');

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                session.sendRealtimeInput({ media: audioUtils.createBlob(inputData) });
            };
            
            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
            
        } catch (err) {
            console.error('Помилка доступу до медіа:', err);
            setError('Доступ до мікрофона відхилено. Надайте доступ у налаштуваннях браузера.');
            setStatus('ERROR');
        }
    }, [job, stopInterview]);

    useEffect(() => {
        // Automatically start the interview when the component mounts
        startInterview();
        return () => {
            // Ensure cleanup happens on unmount
            stopInterview(false);
        };
    }, [startInterview, stopInterview]);

    const MessageBubble: React.FC<{ message: TranscriptMessage }> = ({ message }) => {
        const isUser = message.role === 'user';
        return (
            <div className={`flex flex-col max-w-xs md:max-w-md my-1 ${isUser ? 'self-end' : 'self-start'}`}>
                <span className={`text-sm font-bold mb-1 px-1 ${isUser ? 'text-right text-gray-800' : 'text-left text-[#003C65]'}`}>{isUser ? 'Ви' : 'Інтерв\'юер'}</span>
                <div className={`px-4 py-3 rounded-xl shadow-md ${isUser ? 'bg-[#D1E7DD] text-gray-900' : `${PRIMARY_COLOR} text-white`}`}>
                    <p className="text-base whitespace-pre-wrap">{message.text}</p>
                </div>
            </div>
        );
    };
    
    const renderContent = () => {
        switch (status) {
            case 'CONNECTING':
                return <div className="text-center p-12"><LoadingSpinner text="Підключення до симулятора..." size="lg" /></div>;
            case 'INTERVIEWING':
                return transcript.length === 0 ? (
                    <div className="text-center p-12 text-gray-500">
                        <p>AI-інтерв'юер зараз поставить перше запитання...</p>
                    </div>
                ) : (
                    transcript.map((msg) => <MessageBubble key={msg.id} message={msg} />)
                );
            case 'ANALYZING':
                return <div className="text-center p-12"><LoadingSpinner text="Аналіз вашої співбесіди..." size="lg" /></div>;
            case 'FEEDBACK':
                return (
                    <div className="p-4 bg-white rounded-lg shadow-inner">
                        <h3 className="text-2xl font-bold text-center mb-6 text-[#002B49] flex items-center justify-center">
                           <IconSparkles className="w-7 h-7 mr-2 text-yellow-500"/>
                            Звіт про тренувальну співбесіду
                        </h3>
                        {finalFeedback ? (
                            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: finalFeedback.replace(/\n/g, '<br/>') }} />
                        ) : (
                            <p className="text-center text-gray-600">Відгук не згенеровано. Можливо, співбесіду було завершено достроково.</p>
                        )}
                    </div>
                );
             case 'ERROR':
                 return (
                    <div className="text-center p-12 text-red-600">
                         <p><strong>Помилка:</strong> {error || "Сталася невідома помилка."}</p>
                         <p className="mt-2 text-sm text-gray-500">Спробуйте оновити сторінку та надати доступ до мікрофона.</p>
                     </div>
                 );
            default:
                return null;
        }
    }

    return (
        <div className="p-4 md:p-8 bg-gray-100 rounded-xl shadow-xl max-w-4xl mx-auto">
             <button
                className={`flex items-center text-sm font-semibold mb-6 ${PRIMARY_TEXT_COLOR} hover:opacity-80 transition`}
                onClick={onFinish}
            >
                <IconArrowLeft className="w-5 h-5 mr-1"/>
                {status === 'FEEDBACK' ? 'Повернутися до вакансії' : 'Скасувати співбесіду'}
            </button>
            <h2 className={`text-3xl font-bold mb-2 ${PRIMARY_TEXT_COLOR} flex items-center`}>
                <IconMessageSquare className={`w-8 h-8 mr-3 text-blue-500`}/>
                Тренувальна співбесіда
            </h2>
            <p className="text-gray-600 mb-4">Посада: <strong>{job.title}</strong></p>
            
            <div className="flex flex-col h-[60vh] bg-gray-200 rounded-xl shadow-inner p-4 overflow-y-auto space-y-4">
                {renderContent()}
                <div ref={messagesEndRef} />
            </div>
            
            <div className="mt-6 flex flex-col items-center justify-center space-y-3">
                {status === 'INTERVIEWING' && (
                    <button
                        onClick={() => stopInterview()}
                        className="w-20 h-20 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-lg bg-red-500 hover:bg-red-600 transform active:scale-95"
                        aria-label="Зупинити співбесіду"
                    >
                        <IconMicOff className="w-8 h-8"/>
                    </button>
                )}
                 {status === 'FEEDBACK' && (
                     <button
                        onClick={onFinish}
                        className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition"
                    >
                        Завершити та повернутися
                    </button>
                 )}
                 <div className="h-6 text-gray-600 font-semibold">
                    {status === 'INTERVIEWING' && 'Співбесіда триває...'}
                 </div>
            </div>
        </div>
    );
};

export default InterviewSimulator;