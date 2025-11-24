import { collection, addDoc, Timestamp, Firestore } from 'firebase/firestore';

export interface Job {
    id: number;
    title: string;
    company: string;
    location: string;
    description: string;
    responsibilities: string[];
    qualifications: string[];
    type: 'Державна' | 'Приватна' | 'Некомерційна';
    companyLogo?: string;
    companyDescription?: string;
}

// Function to generate a random date within the last week, with sequential progression
const getRandomTimestamp = (start: Date): Date => {
    const newDate = new Date(start.getTime());
    // Add a random interval between 5 and 60 minutes to make the conversation feel natural
    const randomMinutes = Math.floor(Math.random() * 55) + 5;
    newDate.setMinutes(newDate.getMinutes() + randomMinutes);
    return newDate;
};

/**
 * Seeds the support chat collection for a new user with a sample conversation.
 * @param db - The Firestore instance.
 * @param appId - The application ID from Canvas.
 * @param userId - The ID of the user to seed data for.
 */
export const seedSupportChat = async (db: Firestore, appId: string, userId: string): Promise<void> => {
    const chatCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'support_messages');
    
    // Start the conversation at a random point in the last 7 days
    const now = new Date();
    const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
    const randomStartOffset = Math.random() * sevenDaysInMillis;
    let currentTimestamp = new Date(now.getTime() - randomStartOffset);

    const messages = [
        {
            role: 'user',
            text: "Останнім часом я почуваюся дуже пригніченим.",
        },
        {
            role: 'ai',
            text: "Я чую вас. Звучить так, ніби у вас багато думок. Чи можете ви розповісти більше про те, що відбувається?",
        },
        {
            role: 'user',
            text: "Це просто стрес на роботі та в родині, все накопичується. Я не почуваюся собою.",
        },
        {
            role: 'ai',
            text: "Цілком зрозуміло, що ви так почуваєтеся, коли жонглюєте стількома речами. Пам'ятайте, що потрібно бути добрим до себе. Що одне маленьке ви могли б зробити для себе сьогодні?",
        },
        {
            role: 'user',
            text: "Можливо, просто прогулятися під час обідньої перерви. Це було б добре.",
        }
    ];

    try {
        for (const message of messages) {
            currentTimestamp = getRandomTimestamp(currentTimestamp); // Ensure timestamps are sequential
            await addDoc(chatCollectionRef, {
                ...message,
                timestamp: Timestamp.fromDate(currentTimestamp),
                uid: message.role === 'user' ? userId : 'ai_psychologist',
            });
        }
        console.log("Дані чату підтримки успішно завантажені для нового користувача.");
    } catch (error) {
        console.error("Помилка завантаження даних чату:", error);
    }
};


// --- Public App Content Data (used as fallback if Firestore is empty) ---

export const coursesData = [
    {
        id: 1,
        title: "Основи кібербезпеки для ветеранів",
        content: "Кібербезпека — це практика захисту систем, мереж та програм від цифрових атак. Ці атаки зазвичай спрямовані на доступ, зміну або знищення конфіденційної інформації; вимагання грошей від користувачів; або переривання нормальних бізнес-процесів. Основні принципи включають конфіденційність, цілісність та доступність. Конфіденційність гарантує, що дані доступні лише авторизованим сторонам. Цілісність забезпечує точність і надійність даних. Доступність означає, що інформація доступна, коли це необхідно.",
    },
    {
        id: 2,
        title: "Вступ до управління проєктами",
        content: "Управління проєктами — це застосування знань, навичок, інструментів та методів до проєктної діяльності для задоволення вимог проєкту. Життєвий цикл проєкту зазвичай складається з п'яти етапів: ініціація, планування, виконання, моніторинг та контроль, і закриття. Популярні методології включають Agile, Scrum та Waterfall. Agile є ітеративним підходом, тоді як Waterfall — послідовним. Ключові ролі в проєкті — менеджер проєкту, спонсор та команда проєкту.",
    }
];

export const jobsData: Job[] = [
    {
        id: 1,
        title: "Менеджер з логістики",
        company: "Nova Poshta",
        location: "Київ, Україна",
        description: "Ми шукаємо організованого та відповідального менеджера з логістики для управління ланцюгами постачання та координації складських операцій.",
        responsibilities: [
            "Планування та управління логістикою, складом, транспортуванням та обслуговуванням клієнтів.",
            "Оптимізація та координація повного циклу замовлень.",
            "Відстеження якості, кількості, рівня запасів, термінів доставки та транспортних витрат."
        ],
        qualifications: [
            "Доведений досвід роботи на посаді менеджера з логістики.",
            "Вміння працювати з логістичним та складським програмним забезпеченням.",
            "Відмінні аналітичні, вирішувальні та організаторські навички."
        ],
        type: 'Приватна',
        companyLogo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Nova_Poshta_2016_logo.svg/1200px-Nova_Poshta_2016_logo.svg.png",
        companyDescription: "Нова пошта — українська компанія, що надає послуги експрес-доставки документів, вантажів та посилок для фізичних осіб та бізнесу. Лідер на ринку логістики в Україні.",
    },
    {
        id: 2,
        title: "Спеціаліст з кібербезпеки",
        company: "CyberGuard UA",
        location: "Львів, Україна (Віддалено)",
        description: "Приєднуйтесь до нашої команди для захисту цифрових активів компанії. Ви будете відповідати за моніторинг, виявлення та реагування на загрози безпеці.",
        responsibilities: [
            "Моніторинг комп'ютерних мереж на предмет порушень безпеки.",
            "Розслідування інцидентів безпеки та проведення експертизи.",
            "Розробка та впровадження політик безпеки для захисту систем."
        ],
        qualifications: [
            "Досвід роботи в галузі кібербезпеки або аналогічній ролі.",
            "Знання інструментів тестування на проникнення та методів аналізу.",
            "Розуміння брандмауерів, проксі-серверів, SIEM, антивірусних систем та IDPS/IPS."
        ],
        type: 'Приватна',
        companyLogo: "https://cdn-icons-png.flaticon.com/512/1006/1006545.png",
        companyDescription: "CyberGuard UA — провідний постачальник послуг у сфері кібербезпеки, що спеціалізується на захисті критичної інфраструктури та корпоративних даних від сучасних загроз.",
    },
    {
        id: 3,
        title: "Керівник проектів",
        company: "BuildForce",
        location: "Дніпро, Україна",
        description: "Ми шукаємо досвідченого керівника проектів для нагляду за будівельними проектами від початку до завершення.",
        responsibilities: [
            "Координація внутрішніх ресурсів та третіх сторін/постачальників для бездоганного виконання проектів.",
            "Забезпечення своєчасної реалізації всіх проектів у межах бюджету та обсягу.",
            "Розробка детальних планів проектів для відстеження прогресу."
        ],
        qualifications: [
            "Досвід роботи в управлінні будівельними проектами.",
            "Сильні лідерські та комунікативні навички.",
            "Вміння керувати кількома проектами одночасно."
        ],
        type: 'Приватна',
        companyDescription: "BuildForce — динамічна будівельна компанія, що реалізує масштабні інфраструктурні та комерційні проекти по всій Україні, використовуючи інноваційні технології.",
    },
    {
        id: 4,
        title: "Координатор гуманітарних проектів",
        company: "Veteran Hub",
        location: "Київ, Україна",
        description: "Координація та реалізація проектів для підтримки ветеранів та їхніх сімей.",
        responsibilities: [
            "Розробка планів проектів та контроль їх виконання.",
            "Співпраця з партнерськими організаціями.",
            "Підготовка звітів та аналіз ефективності проектів."
        ],
        qualifications: [
            "Досвід в управлінні соціальними або гуманітарними проектами.",
            "Розуміння потреб ветеранської спільноти.",
            "Високі комунікативні навички та емпатія."
        ],
        type: 'Некомерційна',
        companyLogo: "https://veteranhub.com.ua/images/logo-veteran-hub-ua.svg",
        companyDescription: "Veteran Hub — це простір для ветеранів та громадських організацій, що працюють у сфері ветеранських справ. Ми надаємо послуги для успішної реінтеграції у цивільне життя.",
    },
    {
        id: 5,
        title: "Аналітик даних (Сили Оборони)",
        company: "Міністерство Оборони України",
        location: "Київ, Україна",
        description: "Аналіз великих масивів даних для підтримки прийняття стратегічних рішень в секторі оборони.",
        responsibilities: [
            "Збір, обробка та аналіз оперативних даних.",
            "Побудова моделей та прогнозів.",
            "Створення візуалізацій та звітів для командування."
        ],
        qualifications: [
            "Досвід роботи з SQL, Python або R.",
            "Розуміння статистичних методів аналізу.",
            "Здатність працювати з конфіденційною інформацією."
        ],
        type: 'Державна',
        companyLogo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Small_coat_of_arms_of_Ukraine.svg/1200px-Small_coat_of_arms_of_Ukraine.svg.png",
        companyDescription: "Міністерство оборони України є центральним органом виконавчої влади, що забезпечує проведення державної політики у сфері оборони та військового будівництва.",
    }
];