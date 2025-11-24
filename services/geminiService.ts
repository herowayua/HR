// FIX: Removed non-exported member 'ConnectLiveRequest' from import.
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import type { Job } from '../utils/seed'; // Import the Job type

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("API_KEY середовища не встановлено.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export type LiveSession = ReturnType<typeof ai.live.connect> extends Promise<infer T> ? T : never;

const generateRecruiterAnalysis = async (jobDescription: string, resumeText: string): Promise<string> => {
    const systemPrompt = "Ти — висококваліфікований AI-рекрутер, який спеціалізується на порівнянні резюме з вакансіями. Твоє завдання — проаналізувати наданий опис вакансії та текст резюме. Надай стислий аналіз українською мовою, використовуючи формат Markdown. Аналіз має включати: 1. **Оцінка відповідності** (у форматі X/100, де X - це відсоток відповідності). 2. **Ключові сильні сторони** (3-4 пункти, що відповідають вакансії). 3. **Області для покращення** (3-4 пункти, де не вистачає досвіду/навичок). 4. **Рекомендація щодо співбесіди** (Так/Ні).";
    
    const userQuery = `Ось опис вакансії:\n\n---\n${jobDescription}\n---\n\nОсь текст резюме кандидата:\n\n---\n${resumeText}\n---\n\nПроаналізуй і надайте вищезазначений структурований аналіз.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ parts: [{ text: userQuery }] }],
            config: {
                systemInstruction: systemPrompt,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Помилка генерації аналізу рекрутера:", error);
        throw new Error("Не вдалося отримати аналіз від AI.");
    }
};

const generateSpeech = async (text: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Говори чітким та професійним голосом: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore' підтримує українську
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("Помилка генерації мовлення:", error);
        return null;
    }
};


// FIX: Correctly infer the 'callbacks' type from the SDK.
type LiveCallbacks = Parameters<typeof ai.live.connect>[0]['callbacks'];

const connectToLiveSession = (callbacks: LiveCallbacks): Promise<LiveSession> => {
    const systemPrompt = "Ти — 'Порадник Світла', співчутливий і висококваліфікований AI-психолог. Твоя мета — надавати підтримку ветеранам та їхнім родинам. Використовуй спокійний, професійний, заохочувальний тон. Відповідай виключно українською мовою. Твоя відповідь має бути лаконічною, теплою і зосередженою на емоційному стані користувача. НІКОЛИ не давай медичних порад і не став діагнозів. Завжди заохочуй до пошуку професійної допомоги, якщо проблема є серйозною.";

    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }, // 'Zephyr' - спокійний голос
            },
            systemInstruction: systemPrompt,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
        },
    });
};

const startInterviewSession = (job: Job, callbacks: LiveCallbacks): Promise<LiveSession> => {
    const systemPrompt = `Ти — Міра, привітний, але професійний AI-інтерв'юер від компанії ${job.company}. Твоя мета — провести коротку тренувальну співбесіду на посаду '${job.title}'.
    1. Почни з привітання кандидата та представся як Міра.
    2. Постав перше запитання, пов'язане з описом вакансії.
    3. Уважно вислухай відповідь.
    4. Постав друге, більш поглиблене запитання.
    5. Вислухай відповідь.
    6. Постав третє, фінальне запитання.
    7. Після третьої відповіді, подякуй кандидату та скажи: "Дякую, це завершує нашу тренувальну співбесіду. Ви отримаєте детальний відгук за мить." Після цього більше нічого не кажи.
    Говори чітко, професійно та виключно українською мовою.`;

    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            // FIX: The 'voiceName' property should be nested inside 'prebuiltVoiceConfig'.
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } }, // 'Charon' - приємний жіночий голос
            systemInstruction: systemPrompt,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
        },
    });
};

const generateInterviewFeedback = async (job: Job, transcript: string): Promise<string> => {
    const systemPrompt = `Ти — досвідчений AI-кар'єрний коуч, що спеціалізується на підготовці ветеранів до співбесід. Твоє завдання — надати конструктивний, підбадьорливий відгук на основі розшифровки тренувальної співбесіди.
    Проаналізуй розшифровку та надай відгук у форматі Markdown, який містить три чіткі розділи:
    1.  **Що вдалося добре:** (2-3 пункти, де кандидат проявив себе сиильно).
    2.  **Над чим варто попрацювати:** (2-3 пункти з конкретними порадами щодо покращення).
    3.  **Приклади кращих відповідей:** (Наведи 1-2 приклади, як можна було б переформулювати відповіді кандидата для більшого ефекту, пов'язуючи їхній досвід з вимогами вакансії).
    Відповідай українською мовою, зберігаючи позитивний та підтримуючий тон.`;
    
    const userQuery = `Ось опис вакансії:
    ---
    Посада: ${job.title}
    Компанія: ${job.company}
    Обов'язки: ${job.responsibilities.join(', ')}
    ---

    Ось розшифровка співбесіди:
    ---
    ${transcript}
    ---
    
    Будь ласка, надай свій відгук.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ parts: [{ text: userQuery }] }],
            config: {
                systemInstruction: systemPrompt,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Помилка генерації відгуку про співбесіду:", error);
        throw new Error("Не вдалося отримати відгук від AI-коуча.");
    }
};


const generateEdTechAnswer = async (courseContext: string, userQuestion: string): Promise<string> => {
    const systemPrompt = "Ти — доброзичливий та обізнаний EdTech-тьютор для HeroWayUa. Використовуй лише надані матеріали курсу як контекст. Якщо відповідь виходить за межі контексту, чітко зазнач: 'Я можу відповідати лише на запитання, що стосуються матеріалу курсу'.";

    const userQuery = `Базуючись на цьому тексті уроку: \n---\n${courseContext}\n---\n\nДай відповідь на запитання студента: "${userQuestion}"`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: userQuery }] }],
            config: {
                systemInstruction: systemPrompt,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Помилка генерації відповіді EdTech:", error);
        throw new Error("Не вдалося отримати відповідь від AI-помічника.");
    }
};

const generateJobFitAnalysis = async (veteranProfile: string, jobDescription: string): Promise<string> => {
    const systemPrompt = "Ти — підбадьорливий AI-кар'єрний тренер для ветеранів, які переходять до цивільної роботи. Твоє завдання — проаналізувати навички ветерана та опис вакансії, а потім написати короткий, позитивний підсумок (3-4 пункти у форматі Markdown), пояснюючи, чому ветеран є сильним кандидатом. Зосередься на навичках, що передаються. Використовуй підтримуючий та мотиваційний тон. Відповідай українською мовою.";
    
    const userQuery = `Профіль ветерана:\n---\n${veteranProfile}\n---\n\nОпис вакансії:\n---\n${jobDescription}\n---\n\nПроаналізуй відповідність та надай підсумок.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: userQuery }] }],
            config: {
                systemInstruction: systemPrompt,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Помилка генерації аналізу відповідності роботі:", error);
        throw new Error("Не вдалося отримати аналіз від AI-помічника.");
    }
};

export const geminiService = {
    generateRecruiterAnalysis,
    generateSpeech,
    connectToLiveSession,
    startInterviewSession,
    generateInterviewFeedback,
    generateEdTechAnswer,
    generateJobFitAnalysis,
};