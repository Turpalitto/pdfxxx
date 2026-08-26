import { DEFAULT_MAX_FILE_SIZE_MB } from "@/lib/upload-limits";

export const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export interface Translations {
  nav: {
    tools: string;
    pricing: string;
    getPro: string;
  };
  hero: {
    badge: string;
    headline1: string;
    headline2: string;
    headline3: string;
    sub: string;
    startFree: string;
    viewPro: string;
    feat1: string;
    feat2: string;
    feat3: string;
  };
  stats: {
    filesProcessed: string;
    countries: string;
    pdfTools: string;
    freeToStart: string;
  };
  tools: {
    title: string;
    sub: string;
    allTools: string;
  };
  why: {
    title: string;
    sub: string;
    privateTitle: string;
    privateDesc: string;
    fastTitle: string;
    fastDesc: string;
    offlineTitle: string;
    offlineDesc: string;
  };
  faq: {
    title: string;
    q1: string; a1: string;
    q2: string; a2: string;
    q3: string; a3: string;
    q4: string; a4: string;
    q5: string; a5: string;
  };
  cta: {
    title: string;
    sub: string;
    btn: string;
  };
  footer: {
    desc: string;
    pdfTools: string;
    moreTools: string;
    company: string;
    pricing: string;
    privacy: string;
    terms: string;
    contact: string;
    badge: string;
  };
  tool: {
    backToAll: string;
    howToUse: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    related: string;
    privacy: string;
    privacyDesc: string;
    processing: string;
    download: string;
    processAnother: string;
    goPro: string;
    goProDesc: string;
    viewPlans: string;
    dropPdf: string;
    multipleFiles: string;
    singleFile: string;
    maxSize: string;
    chooseFiles: string;
    chooseFile: string;
    selectFile: string;
    proOnlyError: string;
    errorOccurred: string;
    notFound: string;
    backHome: string;
    doneLabel: string;
    tryAgain: string;
    orPasteText: string;
    pasteTextPlaceholder: string;
    fromPage: string;
    toPage: string;
    lastPage: string;
    rotationAngle: string;
    rot90: string;
    rot180: string;
    rot270: string;
    pagesDelete: string;
    pagesExtract: string;
    pagesReorder: string;
    compressionLevel: string;
    compressionLow: string;
    compressionMedium: string;
    compressionHigh: string;
    watermarkText: string;
    opacity: string;
    position: string;
    posBottomCenter: string;
    posBottomRight: string;
    posBottomLeft: string;
    posTopCenter: string;
    password: string;
    passwordPlaceholder: string;
    signatureText: string;
    signaturePlaceholder: string;
    signatureHint: string;
    qualityScale: string;
    qualityStandard: string;
    qualityHigh: string;
    qualityUltra: string;
    outputZip: string;
    headerText: string;
    footerText: string;
    headerPlaceholder: string;
    footerPlaceholder: string;
    noRegistration: string;
    cancel: string;
    splitModeRange: string;
    splitEveryN: string;
    splitAllPages: string;
    everyNPages: string;
    autoCrop: string;
    cropMargins: string;
    mTop: string;
    mRight: string;
    mBottom: string;
    mLeft: string;
    targetSize: string;
    intensity: string;
    pagesPerSheet: string;
    secondFile: string;
    needSecondFile: string;
    redactEmails: string;
    redactPhones: string;
    redactSsn: string;
    customRegex: string;
    regexPlaceholder: string;
    loadMetadata: string;
    saveMetadata: string;
    metaLoaded: string;
    metaTitle: string;
    metaAuthor: string;
    metaSubject: string;
    metaKeywords: string;
    formValuesJson: string;
    formValuesPlaceholder: string;
    invalidJson: string;
    prefixLabel: string;
    startNumber: string;
    digitsLabel: string;
    numberFormat: string;
    formatNumber: string;
    formatXofY: string;
    backgroundColor: string;
    blankPositions: string;
    maxSizeMbLabel: string;
    ocrLanguage: string;
    posTile: string;
    audioNotice: string;
    audioScanBefore: string;
    audioScanAfter: string;
  };
  pricing: {
    badge: string;
    title: string;
    sub: string;
    monthly: string;
    yearly: string;
    save: string;
    free: string;
    freeDesc: string;
    startFree: string;
    pro: string;
    proDesc: string;
    getPro: string;
    month: string;
    billedAs: string;
    popular: string;
    whatsIncluded: string;
    whatsIncludedSub: string;
    unlimitedTitle: string;
    unlimitedDesc: string;
    aiTitle: string;
    aiDesc: string;
    priorityTitle: string;
    priorityDesc: string;
    whatUsersSay: string;
    questions: string;
    questionsSub: string;
    cancelAnytime: string;
    moneyBack: string;
    noContracts: string;
  };
}

const FREE_PLAN_FILE_SIZE_MB = DEFAULT_MAX_FILE_SIZE_MB;

const en: Translations = {
  nav: { tools: "Tools", pricing: "Pricing", getPro: "Get Pro" },
  hero: {
    badge: "All Processing Happens In Your Browser",
    headline1: "All PDF Tools.",
    headline2: "Free.",
    headline3: "No Watermarks.",
    sub: "Powerful PDF tools that run entirely in your browser. Merge, split, compress, convert and protect PDFs — your files never leave your device.",
    startFree: "Start for Free",
    viewPro: "View Pro Plans",
    feat1: "No file uploads",
    feat2: "Instant processing",
    feat3: "Works offline",
  },
  stats: { filesProcessed: "Files Processed", countries: "Countries", pdfTools: "PDF Tools", freeToStart: "Free to Start" },
  tools: { title: "Every PDF Tool You'll Ever Need", sub: "Free browser-based PDF tools in every category. No sign-up required.", allTools: "All Tools" },
  why: {
    title: "Why Choose PDFX?",
    sub: "Built with privacy and performance as the top priority.",
    privateTitle: "100% Private",
    privateDesc: "All PDF processing happens in your browser using WebAssembly. No file uploads, no server storage — your documents stay on your device.",
    fastTitle: "Lightning Fast",
    fastDesc: "Client-side processing means zero upload/download wait times. Large files process instantly because they never leave your device.",
    offlineTitle: "Works Offline",
    offlineDesc: "Once loaded, PDFX tools continue to work without an internet connection. Process confidential documents anywhere, anytime.",
  },
  faq: {
    title: "Frequently Asked Questions",
    q1: "Are my files safe when using PDFX?", a1: "Absolutely. All PDF processing happens directly in your browser using your device's computing power. Your files never leave your device or get uploaded to any server.",
    q2: "Is PDFX really free?", a2: `Yes! All basic tools are completely free with no watermarks on your output files. Files up to ${FREE_PLAN_FILE_SIZE_MB}MB are supported.`,
    q3: "What's the file size limit?", a3: `You can process files up to ${FREE_PLAN_FILE_SIZE_MB}MB each, with up to 3 files per batch.`,
    q4: "Can I use PDFX on mobile?", a4: "Yes! PDFX is fully responsive and works on any device — phone, tablet, or desktop. The interface adapts to your screen size for the best experience.",
    q5: "What languages does OCR support?", a5: "Our OCR engine supports English, Russian, Spanish, French, German, Chinese, Arabic, and more. You can select your language from the OCR tool settings.",
  },
  cta: { title: "Ready to work with PDFs — privately?", sub: "Every tool runs locally in your browser. Free to start, no sign-up required.", btn: "Browse Tools" },
  footer: {
    desc: "The most complete PDF toolkit online. Process files locally — your data never leaves your device.",
    pdfTools: "PDF Tools", moreTools: "More Tools", company: "Company",
    pricing: "Pricing", privacy: "Privacy Policy", terms: "Terms of Service", contact: "Contact",
    badge: "Your files are processed locally and never stored on our servers",
  },
  tool: {
    backToAll: "All Tools",
    howToUse: "How to use",
    step1: "Upload your file",
    step2: "Adjust any options if needed",
    step3: "Click to process",
    step4: "Download your result instantly",
    related: "Related Tools",
    privacy: "Privacy Guarantee",
    privacyDesc: "Your files are processed entirely in your browser. Nothing is uploaded to our servers. Files are automatically cleared when you close this tab.",
    processing: "Processing...",
    download: "Download",
    processAnother: "Process Another",
    goPro: "Need more?",
    goProDesc: "Contact us for heavier workloads, support, and team workflows.",
    viewPlans: "View Plans",
    dropPdf: "Drop your PDF here",
    multipleFiles: "Multiple files supported",
    singleFile: "Single file",
    maxSize: "Max",
    chooseFiles: "Choose Files",
    chooseFile: "Choose File",
    selectFile: "Please select a file first.",
    proOnlyError: "This tool requires a Pro plan.",
    errorOccurred: "An error occurred during processing.",
    notFound: "Tool not found",
    backHome: "Back to home",
    doneLabel: "Done!",
    tryAgain: "Try again",
    orPasteText: "Or paste text content",
    pasteTextPlaceholder: "Type or paste your text here...",
    fromPage: "From page",
    toPage: "To page",
    lastPage: "Last page",
    rotationAngle: "Rotation angle",
    rot90: "90° Clockwise",
    rot180: "180°",
    rot270: "270° (Counter-clockwise)",
    pagesDelete: "Pages to delete (e.g. 1, 3, 5)",
    pagesExtract: "Pages to extract (e.g. 1, 3, 5)",
    pagesReorder: "New page order (e.g. 3, 1, 2)",
    compressionLevel: "Compression level",
    compressionLow: "Low",
    compressionMedium: "Medium",
    compressionHigh: "High",
    watermarkText: "Watermark text",
    opacity: "Opacity",
    position: "Position",
    posBottomCenter: "Bottom Center",
    posBottomRight: "Bottom Right",
    posBottomLeft: "Bottom Left",
    posTopCenter: "Top Center",
    password: "Password",
    passwordPlaceholder: "Enter a strong password",
    signatureText: "Signature text",
    signaturePlaceholder: "Your Name",
    signatureHint: "Will be placed in the bottom-right of the last page.",
    qualityScale: "Quality / Scale",
    qualityStandard: "Standard",
    qualityHigh: "High",
    qualityUltra: "Maximum",
    outputZip: "Output: ZIP archive with one image per page.",
    headerText: "Header text",
    footerText: "Footer text",
    headerPlaceholder: "Document header",
    footerPlaceholder: "Document footer",
    noRegistration: "No registration",
    cancel: "Cancel",
    splitModeRange: "Page range",
    splitEveryN: "Every N pages",
    splitAllPages: "All pages",
    everyNPages: "Pages per file",
    autoCrop: "Auto-detect content bounds",
    cropMargins: "Margins in points (applied to the detected or manual area)",
    mTop: "Top",
    mRight: "Right",
    mBottom: "Bottom",
    mLeft: "Left",
    targetSize: "Target page size",
    intensity: "Effect intensity",
    pagesPerSheet: "Pages per sheet",
    secondFile: "Second PDF file",
    needSecondFile: "Please select a second PDF file.",
    redactEmails: "Email addresses",
    redactPhones: "Phone numbers",
    redactSsn: "US SSN numbers",
    customRegex: "Custom regular expression",
    regexPlaceholder: "e.g. CONFID-[0-9]{4}",
    loadMetadata: "Load metadata",
    saveMetadata: "Save metadata",
    metaLoaded: "Metadata loaded. Edit the fields and press Save.",
    metaTitle: "Title",
    metaAuthor: "Author",
    metaSubject: "Subject",
    metaKeywords: "Keywords (comma-separated)",
    formValuesJson: "Field values (JSON)",
    formValuesPlaceholder: '{ "Full Name": "Jane Doe", "Agree": true }',
    invalidJson: "The field values are not valid JSON.",
    prefixLabel: "Prefix",
    startNumber: "Start number",
    digitsLabel: "Digits",
    numberFormat: "Number format",
    formatNumber: "1, 2, 3",
    formatXofY: "1 of N",
    backgroundColor: "Background color",
    blankPositions: "Insert blanks before pages",
    maxSizeMbLabel: "Max size per part (MB)",
    ocrLanguage: "Document language",
    posTile: "Tiled (repeat)",
    audioNotice: "PDFX reads your document aloud right in the browser. This tool does not create an audio file.",
    audioScanBefore: "If this is a scan, run ",
    audioScanAfter: " first to make the text selectable.",
  },
  pricing: {
    badge: "Simple, transparent pricing",
    title: "Start free. Scale when you need to.",
    sub: "All basic PDF tools are completely free forever.",
    monthly: "Monthly", yearly: "Yearly", save: "Save 33%",
    free: "Free", freeDesc: "Perfect for occasional use", startFree: "Start for Free",
    pro: "Pro", proDesc: "For power users and professionals", getPro: "Get Pro",
    month: "/month", billedAs: "Billed as", popular: "Most Popular",
    whatsIncluded: "What PDFX Pro includes", whatsIncludedSub: "Everything you need to work with PDFs professionally",
    unlimitedTitle: "Unlimited Operations", unlimitedDesc: "No hourly limits. Process as many files as you need, whenever you need.",
    aiTitle: "AI-Powered Tools", aiDesc: "Summarize, chat with, and translate your PDFs using advanced AI.",
    priorityTitle: "Priority Processing", priorityDesc: "Your files are processed first with dedicated resources for faster results.",
    whatUsersSay: "What users say",
    questions: "Have questions?",
    questionsSub: "All plans come with a 7-day money-back guarantee. No questions asked.",
    cancelAnytime: "Cancel anytime", moneyBack: "7-day money back", noContracts: "No contracts",
  },
};

const ru: Translations = {
  nav: { tools: "Инструменты", pricing: "Цены", getPro: "Купить Pro" },
  hero: {
    badge: "Вся обработка происходит в вашем браузере",
    headline1: "Все PDF инструменты.",
    headline2: "Бесплатно.",
    headline3: "Без водяных знаков.",
    sub: "Мощные PDF инструменты, которые работают прямо в вашем браузере. Объединяйте, разделяйте, сжимайте, конвертируйте и защищайте PDF — файлы никогда не покидают ваше устройство.",
    startFree: "Начать бесплатно",
    viewPro: "Смотреть Pro тарифы",
    feat1: "Файлы не загружаются",
    feat2: "Мгновенная обработка",
    feat3: "Работает офлайн",
  },
  stats: { filesProcessed: "Файлов обработано", countries: "Стран", pdfTools: "PDF Инструментов", freeToStart: "Бесплатно начать" },
  tools: { title: "Все PDF инструменты в одном месте", sub: "Бесплатные браузерные PDF инструменты на все случаи. Без регистрации.", allTools: "Все инструменты" },
  why: {
    title: "Почему PDFX?",
    sub: "Создан с приоритетом на конфиденциальность и производительность.",
    privateTitle: "100% Приватно",
    privateDesc: "Вся обработка PDF происходит в вашем браузере через WebAssembly. Никаких загрузок файлов, никакого серверного хранилища — ваши документы остаются на вашем устройстве.",
    fastTitle: "Молниеносно быстро",
    fastDesc: "Обработка на стороне клиента означает нулевое время загрузки. Большие файлы обрабатываются мгновенно, потому что они никогда не покидают ваше устройство.",
    offlineTitle: "Работает офлайн",
    offlineDesc: "После загрузки инструменты PDFX продолжают работать без интернета. Обрабатывайте конфиденциальные документы где угодно и когда угодно.",
  },
  faq: {
    title: "Часто задаваемые вопросы",
    q1: "Безопасны ли мои файлы при использовании PDFX?", a1: "Абсолютно. Вся обработка PDF происходит прямо в вашем браузере. Ваши файлы никогда не покидают устройство и не загружаются на сервер.",
    q2: "PDFX действительно бесплатный?", a2: `Да! Все базовые инструменты полностью бесплатны без водяных знаков. Поддерживаются файлы до ${FREE_PLAN_FILE_SIZE_MB} МБ.`,
    q3: "Какой максимальный размер файла?", a3: `Можно обрабатывать файлы до ${FREE_PLAN_FILE_SIZE_MB} МБ каждый, до 3 файлов за раз.`,
    q4: "Работает ли PDFX на мобильном?", a4: "Да! PDFX полностью адаптивен и работает на любом устройстве — телефоне, планшете или компьютере.",
    q5: "Какие языки поддерживает OCR?", a5: "Наш OCR поддерживает русский, английский, испанский, французский, немецкий, китайский, арабский и многие другие языки.",
  },
  cta: { title: "Работайте с PDF приватно", sub: "Каждый инструмент работает локально в вашем браузере. Бесплатно и без регистрации.", btn: "К инструментам" },
  footer: {
    desc: "Самый полный онлайн PDF инструментарий. Обработка файлов локально — ваши данные никогда не покидают устройство.",
    pdfTools: "PDF Инструменты", moreTools: "Ещё инструменты", company: "Компания",
    pricing: "Цены", privacy: "Политика конфиденциальности", terms: "Условия использования", contact: "Контакт",
    badge: "Ваши файлы обрабатываются локально и никогда не хранятся на наших серверах",
  },
  tool: {
    backToAll: "Все инструменты",
    howToUse: "Как использовать",
    step1: "Загрузите файл",
    step2: "Настройте параметры при необходимости",
    step3: "Нажмите для обработки",
    step4: "Скачайте результат мгновенно",
    related: "Похожие инструменты",
    privacy: "Гарантия конфиденциальности",
    privacyDesc: "Ваши файлы обрабатываются полностью в вашем браузере. Ничего не загружается на серверы. Файлы автоматически очищаются при закрытии вкладки.",
    processing: "Обработка...",
    download: "Скачать",
    processAnother: "Обработать ещё",
    goPro: "Нужно больше?",
    goProDesc: "Свяжитесь с нами для больших объёмов, поддержки и командных сценариев.",
    viewPlans: "Смотреть тарифы",
    dropPdf: "Перетащите PDF сюда",
    multipleFiles: "Несколько файлов поддерживается",
    singleFile: "Один файл",
    maxSize: "Макс.",
    chooseFiles: "Выбрать файлы",
    chooseFile: "Выбрать файл",
    selectFile: "Пожалуйста, выберите файл.",
    proOnlyError: "Этот инструмент доступен в тарифе Pro.",
    errorOccurred: "Произошла ошибка при обработке.",
    notFound: "Инструмент не найден",
    backHome: "На главную",
    doneLabel: "Готово!",
    tryAgain: "Попробовать снова",
    orPasteText: "Или вставьте текст",
    pasteTextPlaceholder: "Введите или вставьте текст сюда...",
    fromPage: "Со страницы",
    toPage: "По страницу",
    lastPage: "Последняя",
    rotationAngle: "Угол поворота",
    rot90: "90° по часовой",
    rot180: "180°",
    rot270: "270° (против часовой)",
    pagesDelete: "Страницы для удаления (напр. 1, 3, 5)",
    pagesExtract: "Страницы для извлечения (напр. 1, 3, 5)",
    pagesReorder: "Новый порядок страниц (напр. 3, 1, 2)",
    compressionLevel: "Уровень сжатия",
    compressionLow: "Низкий",
    compressionMedium: "Средний",
    compressionHigh: "Высокий",
    watermarkText: "Текст водяного знака",
    opacity: "Прозрачность",
    position: "Позиция",
    posBottomCenter: "Снизу по центру",
    posBottomRight: "Снизу справа",
    posBottomLeft: "Снизу слева",
    posTopCenter: "Сверху по центру",
    password: "Пароль",
    passwordPlaceholder: "Введите надёжный пароль",
    signatureText: "Текст подписи",
    signaturePlaceholder: "Ваше имя",
    signatureHint: "Будет размещено в правом нижнем углу последней страницы.",
    qualityScale: "Качество / Масштаб",
    qualityStandard: "Стандарт",
    qualityHigh: "Высокое",
    qualityUltra: "Максимальное",
    outputZip: "Результат: ZIP архив с одним изображением на страницу.",
    headerText: "Текст колонтитула",
    footerText: "Текст нижнего колонтитула",
    headerPlaceholder: "Заголовок документа",
    footerPlaceholder: "Подвал документа",
    noRegistration: "Без регистрации",
    cancel: "Отмена",
    splitModeRange: "Диапазон страниц",
    splitEveryN: "Каждые N страниц",
    splitAllPages: "Все страницы",
    everyNPages: "Страниц в файле",
    autoCrop: "Определить границы контента автоматически",
    cropMargins: "Поля в пунктах (применяются к выбранной области)",
    mTop: "Сверху",
    mRight: "Справа",
    mBottom: "Снизу",
    mLeft: "Слева",
    targetSize: "Целевой формат страницы",
    intensity: "Интенсивность эффекта",
    pagesPerSheet: "Страниц на листе",
    secondFile: "Второй PDF-файл",
    needSecondFile: "Выберите второй PDF-файл.",
    redactEmails: "Адреса email",
    redactPhones: "Номера телефонов",
    redactSsn: "Номера SSN (США)",
    customRegex: "Своё регулярное выражение",
    regexPlaceholder: "например: CONFID-[0-9]{4}",
    loadMetadata: "Загрузить метаданные",
    saveMetadata: "Сохранить метаданные",
    metaLoaded: "Метаданные загружены. Измените поля и нажмите «Сохранить».",
    metaTitle: "Название",
    metaAuthor: "Автор",
    metaSubject: "Тема",
    metaKeywords: "Ключевые слова (через запятую)",
    formValuesJson: "Значения полей (JSON)",
    formValuesPlaceholder: '{ "Полное имя": "Иван Иванов", "Согласен": true }',
    invalidJson: "Значения полей — не корректный JSON.",
    prefixLabel: "Префикс",
    startNumber: "Начальный номер",
    digitsLabel: "Количество цифр",
    numberFormat: "Формат номеров",
    formatNumber: "1, 2, 3",
    formatXofY: "1 из N",
    backgroundColor: "Цвет фона",
    blankPositions: "Вставить пустые перед страницами",
    maxSizeMbLabel: "Макс. размер части (МБ)",
    ocrLanguage: "Язык документа",
    posTile: "Плиткой (повтор)",
    audioNotice: "PDFX зачитывает документ вслух прямо в браузере. Этот инструмент не создаёт аудиофайл.",
    audioScanBefore: "Если это скан, сначала запустите ",
    audioScanAfter: ", чтобы текст стал выделяемым.",
  },
  pricing: {
    badge: "Простые и прозрачные цены",
    title: "Начните бесплатно. Масштабируйтесь по необходимости.",
    sub: "Все базовые PDF инструменты полностью бесплатны.",
    monthly: "Ежемесячно", yearly: "Ежегодно", save: "Сэкономить 33%",
    free: "Бесплатно", freeDesc: "Идеально для редкого использования", startFree: "Начать бесплатно",
    pro: "Pro", proDesc: "Для профессионалов и активных пользователей", getPro: "Купить Pro",
    month: "/месяц", billedAs: "Оплата как", popular: "Самый популярный",
    whatsIncluded: "Что входит в PDFX Pro", whatsIncludedSub: "Всё необходимое для профессиональной работы с PDF",
    unlimitedTitle: "Неограниченные операции", unlimitedDesc: "Никаких почасовых лимитов. Обрабатывайте столько файлов, сколько нужно.",
    aiTitle: "ИИ инструменты", aiDesc: "Суммируйте, задавайте вопросы и переводите PDF с помощью продвинутого ИИ.",
    priorityTitle: "Приоритетная обработка", priorityDesc: "Ваши файлы обрабатываются первыми с выделенными ресурсами.",
    whatUsersSay: "Что говорят пользователи",
    questions: "Есть вопросы?",
    questionsSub: "Все тарифы включают 7-дневную гарантию возврата средств. Без лишних вопросов.",
    cancelAnytime: "Отмена в любое время", moneyBack: "Возврат за 7 дней", noContracts: "Без контрактов",
  },
};

type PartialTranslations = Partial<Translations> & { nav: Partial<Translations["nav"]> };

const makeStub = (nativeName: string): PartialTranslations => ({
  nav: { tools: "Tools", pricing: "Pricing", getPro: "Get Pro" },
});

const translationMap: Record<string, Translations | PartialTranslations> = {
  en,
  ru,
  es: { ...en, nav: { tools: "Herramientas", pricing: "Precios", getPro: "Obtener Pro" }, hero: { ...en.hero, headline1: "Todas las herramientas PDF.", headline2: "Gratis.", headline3: "Sin marcas de agua.", startFree: "Comenzar gratis", viewPro: "Ver planes Pro", badge: "Todo el procesamiento ocurre en tu navegador", feat1: "Sin carga de archivos", feat2: "Procesamiento instantáneo", feat3: "Funciona sin conexión" } },
  fr: { ...en, nav: { tools: "Outils", pricing: "Tarifs", getPro: "Obtenir Pro" }, hero: { ...en.hero, headline1: "Tous les outils PDF.", headline2: "Gratuit.", headline3: "Sans filigrane.", startFree: "Commencer gratuitement", viewPro: "Voir les plans Pro", badge: "Tout le traitement se fait dans votre navigateur", feat1: "Pas de téléchargement", feat2: "Traitement instantané", feat3: "Fonctionne hors ligne" } },
  de: { ...en, nav: { tools: "Werkzeuge", pricing: "Preise", getPro: "Pro holen" }, hero: { ...en.hero, headline1: "Alle PDF-Werkzeuge.", headline2: "Kostenlos.", headline3: "Ohne Wasserzeichen.", startFree: "Kostenlos starten", viewPro: "Pro-Pläne ansehen", badge: "Die gesamte Verarbeitung erfolgt in Ihrem Browser", feat1: "Keine Datei-Uploads", feat2: "Sofortverarbeitung", feat3: "Funktioniert offline" } },
  it: { ...en, nav: { tools: "Strumenti", pricing: "Prezzi", getPro: "Ottieni Pro" }, hero: { ...en.hero, headline1: "Tutti gli strumenti PDF.", headline2: "Gratis.", headline3: "Senza filigrana.", startFree: "Inizia gratis", viewPro: "Vedi piani Pro", badge: "Tutta l'elaborazione avviene nel tuo browser", feat1: "Nessun upload", feat2: "Elaborazione istantanea", feat3: "Funziona offline" } },
  pt: { ...en, nav: { tools: "Ferramentas", pricing: "Preços", getPro: "Obter Pro" }, hero: { ...en.hero, headline1: "Todas as ferramentas PDF.", headline2: "Grátis.", headline3: "Sem marca d'água.", startFree: "Comece grátis", viewPro: "Ver planos Pro", badge: "Todo o processamento acontece no seu navegador", feat1: "Sem upload de arquivos", feat2: "Processamento instantâneo", feat3: "Funciona offline" } },
  zh: { ...en, nav: { tools: "工具", pricing: "定价", getPro: "获取Pro" }, hero: { ...en.hero, headline1: "全部PDF工具。", headline2: "免费。", headline3: "无水印。", startFree: "免费开始", viewPro: "查看Pro计划", badge: "所有处理在您的浏览器中进行", feat1: "无需上传文件", feat2: "即时处理", feat3: "离线可用" } },
  ja: { ...en, nav: { tools: "ツール", pricing: "料金", getPro: "Proを取得" }, hero: { ...en.hero, headline1: "すべてのPDFツール。", headline2: "無料。", headline3: "透かしなし。", startFree: "無料で始める", viewPro: "Proプランを見る", badge: "すべての処理はブラウザ内で行われます", feat1: "ファイルのアップロード不要", feat2: "即座に処理", feat3: "オフラインでも動作" } },
  ko: { ...en, nav: { tools: "도구", pricing: "가격", getPro: "Pro 구매" }, hero: { ...en.hero, headline1: "모든 PDF 도구.", headline2: "무료.", headline3: "워터마크 없음.", startFree: "무료 시작", viewPro: "Pro 플랜 보기", badge: "모든 처리는 브라우저에서 실행됩니다", feat1: "파일 업로드 없음", feat2: "즉시 처리", feat3: "오프라인 작동" } },
  ar: { ...en, nav: { tools: "أدوات", pricing: "الأسعار", getPro: "احصل على Pro" }, hero: { ...en.hero, headline1: "جميع أدوات PDF.", headline2: "مجاناً.", headline3: "بدون علامات مائية.", startFree: "ابدأ مجاناً", viewPro: "عرض خطط Pro", badge: "تتم جميع المعالجة في متصفحك", feat1: "بدون رفع ملفات", feat2: "معالجة فورية", feat3: "يعمل بدون إنترنت" } },
  tr: { ...en, nav: { tools: "Araçlar", pricing: "Fiyatlar", getPro: "Pro Al" }, hero: { ...en.hero, headline1: "Tüm PDF Araçları.", headline2: "Ücretsiz.", headline3: "Filigran Yok.", startFree: "Ücretsiz Başla", viewPro: "Pro Planları Gör", badge: "Tüm işlemler tarayıcınızda gerçekleşir", feat1: "Dosya yükleme yok", feat2: "Anında işleme", feat3: "Çevrimdışı çalışır" } },
  hi: { ...en, nav: { tools: "उपकरण", pricing: "मूल्य", getPro: "Pro लें" }, hero: { ...en.hero, headline1: "सभी PDF उपकरण।", headline2: "मुफ्त।", headline3: "कोई वॉटरमार्क नहीं।", startFree: "मुफ्त शुरू करें", viewPro: "Pro प्लान देखें", badge: "सभी प्रोसेसिंग आपके ब्राउज़र में होती है", feat1: "कोई फ़ाइल अपलोड नहीं", feat2: "तत्काल प्रोसेसिंग", feat3: "ऑफलाइन काम करता है" } },
  pl: { ...en, nav: { tools: "Narzędzia", pricing: "Cennik", getPro: "Kup Pro" }, hero: { ...en.hero, headline1: "Wszystkie narzędzia PDF.", headline2: "Bezpłatnie.", headline3: "Bez znaków wodnych.", startFree: "Zacznij bezpłatnie", viewPro: "Zobacz plany Pro", badge: "Całe przetwarzanie odbywa się w Twojej przeglądarce", feat1: "Bez przesyłania plików", feat2: "Błyskawiczne przetwarzanie", feat3: "Działa offline" } },
  nl: { ...en, nav: { tools: "Hulpmiddelen", pricing: "Prijzen", getPro: "Pro kopen" }, hero: { ...en.hero, headline1: "Alle PDF-hulpmiddelen.", headline2: "Gratis.", headline3: "Zonder watermerk.", startFree: "Gratis beginnen", viewPro: "Pro-plannen bekijken", badge: "Alle verwerking vindt plaats in uw browser", feat1: "Geen bestandsuploads", feat2: "Directe verwerking", feat3: "Werkt offline" } },
  uk: { ...en, nav: { tools: "Інструменти", pricing: "Ціни", getPro: "Купити Pro" }, hero: { ...en.hero, headline1: "Всі PDF інструменти.", headline2: "Безкоштовно.", headline3: "Без водяних знаків.", startFree: "Почати безкоштовно", viewPro: "Переглянути Pro тарифи", badge: "Вся обробка відбувається у вашому браузері", feat1: "Без завантаження файлів", feat2: "Миттєва обробка", feat3: "Працює офлайн" } },
  vi: { ...en, nav: { tools: "Công cụ", pricing: "Giá cả", getPro: "Mua Pro" }, hero: { ...en.hero, headline1: "Tất cả công cụ PDF.", headline2: "Miễn phí.", headline3: "Không có hình mờ.", startFree: "Bắt đầu miễn phí", viewPro: "Xem gói Pro", badge: "Tất cả xử lý diễn ra trong trình duyệt của bạn", feat1: "Không tải lên tệp", feat2: "Xử lý tức thì", feat3: "Hoạt động ngoại tuyến" } },
  id: { ...en, nav: { tools: "Alat", pricing: "Harga", getPro: "Dapatkan Pro" }, hero: { ...en.hero, headline1: "Semua Alat PDF.", headline2: "Gratis.", headline3: "Tanpa Tanda Air.", startFree: "Mulai Gratis", viewPro: "Lihat Paket Pro", badge: "Semua pemrosesan terjadi di browser Anda", feat1: "Tidak ada unggahan file", feat2: "Pemrosesan instan", feat3: "Bekerja offline" } },
  th: { ...en, nav: { tools: "เครื่องมือ", pricing: "ราคา", getPro: "รับ Pro" }, hero: { ...en.hero, headline1: "เครื่องมือ PDF ทั้งหมด", headline2: "ฟรี", headline3: "ไม่มีลายน้ำ", startFree: "เริ่มใช้ฟรี", viewPro: "ดูแผน Pro", badge: "การประมวลผลทั้งหมดเกิดขึ้นในเบราว์เซอร์ของคุณ", feat1: "ไม่มีการอัปโหลดไฟล์", feat2: "ประมวลผลทันที", feat3: "ทำงานออฟไลน์" } },
  cs: { ...en, nav: { tools: "Nástroje", pricing: "Ceny", getPro: "Získat Pro" }, hero: { ...en.hero, headline1: "Všechny nástroje PDF.", headline2: "Zdarma.", headline3: "Bez vodoznaku.", startFree: "Začít zdarma", viewPro: "Zobrazit plány Pro", badge: "Veškeré zpracování probíhá ve vašem prohlížeči", feat1: "Bez nahrávání souborů", feat2: "Okamžité zpracování", feat3: "Funguje offline" } },
};

export function getTranslations(lang: LangCode): Translations {
  const t = translationMap[lang];
  return { ...en, ...t } as Translations;
}
