import React, { useState, useRef, useEffect, useCallback } from 'react';
import { geminiService, LiveSession } from '../services/geminiService';
import { IconArrowLeft, IconHeartHandshake, IconMic, IconMicOff, LoadingSpinner } from './icons';
import { audioUtils } from '../utils/audioUtils';

type ConnectionStatus = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'ERROR';
interface TranscriptMessage {
    id: number;
    role: 'user' | 'ai';
    text: string;
}

interface LiveSupportModuleProps {
    setCurrentView: (view: string) => void;
}

const PRIMARY_TEXT_COLOR = 'text-[#002B49]';
const ACCENT_TEXT_COLOR = 'text-[#FFC300]';
const PRIMARY_COLOR = 'bg-[#002B49]';

const starterTopics = [
    "Обговорити, як минув мій день",
    "Як впоратися зі стресом та тривогою",
    "Відчуваю себе самотнім",
    "Проблеми зі сном",
];

const LiveSupportModule: React.FC<LiveSupportModuleProps> = ({ setCurrentView }) => {
    const [status, setStatus] = useState<ConnectionStatus>('IDLE');
    const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    const sessionRef = useRef<LiveSession | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextId = useRef(0); // For unique message keys

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [transcript]);

    const stopConversation = useCallback(async () => {
        setStatus('IDLE');
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            await inputAudioContextRef.current.close();
        }
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }
        audioUtils.cleanup();
    }, []);

    const startConversation = async () => {
        if (status !== 'IDLE' && status !== 'ERROR') return;
        
        setError(null);
        setTranscript([]);
        setStatus('CONNECTING');

        // Helper to safely update transcript state
        const updateTranscript = (role: 'user' | 'ai', text: string) => {
            setTranscript(prev => {
                const last = prev[prev.length - 1];
                // If the last message is from the same speaker, append text
                if (last?.role === role) {
                    const updatedLast = { ...last, text: last.text + text };
                    return [...prev.slice(0, -1), updatedLast];
                }
                // Otherwise, add a new message with a unique ID
                return [...prev, { id: nextId.current++, role, text }];
            });
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;

            const sessionPromise = geminiService.connectToLiveSession({
                onmessage: (message) => {
                    if (message.serverContent?.outputTranscription) {
                        updateTranscript('ai', message.serverContent.outputTranscription.text);
                    }
                    if (message.serverContent?.inputTranscription) {
                        updateTranscript('user', message.serverContent.inputTranscription.text);
                    }
                    if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
                        const audioData = message.serverContent.modelTurn.parts[0].inlineData.data;
                        audioUtils.playAudio(audioData);
                    }
                },
                onerror: (e) => {
                    console.error("Помилка Live сесії:", e);
                    setError("Сталася помилка з'єднання. Будь ласка, спробуйте ще раз.");
                    stopConversation();
                },
                onclose: () => {
                    stopConversation();
                }
            });

            sessionPromise.then(session => {
              sessionRef.current = session;
              setStatus('LISTENING');
              
              inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
              mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
              scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
              
              scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                  const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                  const pcmBlob = audioUtils.createBlob(inputData);
                  session.sendRealtimeInput({ media: pcmBlob });
              };
              
              mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
              scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
            }).catch(e => {
                console.error("Не вдалося встановити сесію", e);
                setError("Не вдалося підключитися до служби підтримки.");
                setStatus('ERROR');
            });
            
        } catch (err) {
            console.error('Помилка доступу до медіа:', err);
            setError('Доступ до мікрофона було відхилено. Будь ласка, надайте доступ у налаштуваннях вашого браузера.');
            setStatus('ERROR');
        }
    };
    
    useEffect(() => {
        return () => {
            stopConversation();
        };
    }, [stopConversation]);

    const getStatusIndicator = () => {
        switch (status) {
            case 'IDLE':
                return <p className="text-gray-500">Натисніть кнопку, щоб почати сесію</p>;
            case 'CONNECTING':
                return <LoadingSpinner text="Підключення..." size="sm" />;
            case 'LISTENING':
                return <p className="text-green-500 font-semibold">Слухаю...</p>;
            case 'ERROR':
                 return <p className="text-red-500 font-semibold">Помилка. Спробуйте ще раз.</p>;
            default:
                return <p className="text-gray-500">Сесію завершено</p>;
        }
    };
    
    const MessageBubble: React.FC<{ message: TranscriptMessage }> = ({ message }) => {
        const isUser = message.role === 'user';
        const roleName = isUser ? 'Ви' : 'AI Порадник';
        const bubbleColor = isUser ? 'bg-[#D1E7DD] text-gray-900' : `${PRIMARY_COLOR} text-white`;
        const alignment = isUser ? 'self-end' : 'self-start';
        const textAlign = isUser ? 'text-right' : 'text-left';
        const roleColor = isUser ? 'text-gray-800' : 'text-[#003C65]';

        return (
            <div className={`flex flex-col max-w-xs md:max-w-md my-1 ${alignment}`}>
                <span className={`text-sm font-bold mb-1 px-1 ${textAlign} ${roleColor}`}>{roleName}</span>
                <div className={`px-4 py-3 rounded-xl shadow-md ${bubbleColor}`}>
                    <p className="text-base whitespace-pre-wrap">{message.text}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-8 bg-gray-100 rounded-xl shadow-xl max-w-4xl mx-auto">
            <button
                className={`flex items-center text-sm font-semibold mb-6 ${PRIMARY_TEXT_COLOR} hover:opacity-80 transition`}
                onClick={() => setCurrentView('dashboard')}
            >
                <IconArrowLeft className="w-5 h-5 mr-1"/>
                Повернутися до Панелі Керування
            </button>
            
            <h2 className={`text-3xl font-bold mb-6 ${PRIMARY_TEXT_COLOR} flex items-center`}>
                <IconHeartHandshake className={`w-8 h-8 mr-3 ${ACCENT_TEXT_COLOR}`}/>
                Психологічна Підтримка (Наживо)
            </h2>
             <div className="text-sm text-gray-600 mb-4 p-3 bg-white rounded-lg border-l-4 border-[#FFC300] shadow-sm">
                <strong>Важливо:</strong> Наш AI-порадник надає лише емоційну підтримку та загальні поради. Для вирішення серйозних проблем, будь ласка, зверніться до кваліфікованого фахівця. Ваша конфіденційність гарантована.
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Помилка: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}
            
            <div className="flex flex-col h-[60vh] bg-white rounded-xl shadow-inner p-4 overflow-y-auto space-y-4">
                 {transcript.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 flex flex-col justify-center items-center h-full">
                         <div>
                            <p className="text-lg">Привіт! Я — Порадник Світла.</p>
                            <p>Я тут, щоб вислухати вас і надати підтримку. Натисніть кнопку мікрофона, щоб почати розмову.</p>
                        </div>
                        <div className="mt-8 pt-6 border-t border-gray-200 w-full max-w-md">
                            <h4 className="text-base font-semibold text-gray-600 mb-4">Не знаєте, з чого почати? Оберіть тему:</h4>
                            <div className="flex flex-wrap justify-center gap-3">
                                {starterTopics.map((topic, index) => (
                                    <button
                                        key={index}
                                        onClick={startConversation}
                                        className="bg-white text-[#002B49] border border-gray-300 rounded-full px-4 py-2 text-sm font-medium hover:bg-gray-100 hover:border-[#002B49] transition"
                                    >
                                        {topic}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    transcript.map((msg) => <MessageBubble key={msg.id} message={msg} />)
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="mt-6 flex flex-col items-center justify-center space-y-4">
                <button
                    onClick={status === 'IDLE' || status === 'ERROR' ? startConversation : stopConversation}
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-lg transform active:scale-95 ${
                        status === 'LISTENING' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                    }`}
                    aria-label={status === 'LISTENING' ? "Зупинити сесію" : "Почати сесію"}
                >
                    {status === 'LISTENING' ? <IconMicOff className="w-8 h-8"/> : <IconMic className="w-8 h-8"/>}
                </button>
                <div className="h-6 flex items-center justify-center">{getStatusIndicator()}</div>
            </div>
        </div>
    );
};

export default LiveSupportModule;