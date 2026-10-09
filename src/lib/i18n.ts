"use client";

import { useSettings } from "@/hooks/useSettings";
import type { Language } from "./types";

const translations: Record<string, { en: string; ar: string }> = {
  // App
  "app.title": { en: "Tajweed Trainer", ar: "معلّم التجويد" },
  "app.titleAr": { en: "تجويد القرآن", ar: "تجويد القرآن" },

  // Navigation
  "nav.practice": { en: "Practice", ar: "تدريب" },
  "nav.allModules": { en: "All Modules", ar: "جميع الوحدات" },
  "nav.closeMenu": { en: "Close menu", ar: "إغلاق القائمة" },
  "nav.toggleMenu": { en: "Toggle menu", ar: "فتح القائمة" },
  "nav.sidebar": { en: "Main navigation", ar: "التنقل الرئيسي" },
  "nav.bottomTabs": { en: "Quick navigation", ar: "التنقل السريع" },
  "nav.drawer": { en: "Menu navigation", ar: "تنقل القائمة" },

  // Connectivity
  "offline.notice": { en: "Offline, opened pages still work", ar: "غير متصل، الصفحات المفتوحة تعمل" },

  // Home page
  "home.title": { en: "Tajweed Trainer", ar: "معلّم التجويد" },
  "home.subtitle": {
    en: "Learn the rules of proper Quran recitation through interactive lessons, color-coded text, and audio examples.",
    ar: "تعلّم أحكام تلاوة القرآن الكريم من خلال دروس تفاعلية، ونصوص ملوّنة بأحكام التجويد، وأمثلة صوتية.",
  },
  "home.startLearning": { en: "Start Learning", ar: "ابدأ التعلّم" },
  "home.yourProgress": { en: "Your Progress", ar: "تقدّمك" },
  "home.riwaya": { en: "Rules follow the recitation of Hafs 'an 'Asim.", ar: "الأحكام وفق رواية حفص عن عاصم." },
  "home.nextLesson": { en: "Next lesson", ar: "الدرس التالي" },
  "home.learningPath": { en: "Learning Path", ar: "مسار التعلّم" },
  "home.dailyVerse": { en: "Verse of the day", ar: "آية اليوم" },
  "home.resumeReading": { en: "Continue reading", ar: "تابع القراءة" },
  "home.resumePage": { en: "Page", ar: "صفحة" },

  // Learn page
  "learn.title": { en: "Learn Tajweed", ar: "تعلّم التجويد" },
  "learn.description": {
    en: "Structured curriculum for learning Tajweed rules, ordered from foundational to advanced.",
    ar: "منهج منظّم لتعلّم أحكام التجويد، مرتّب من الأساسيات إلى المتقدّم.",
  },
  "learn.notStarted": { en: "Not started", ar: "لم تبدأ بعد" },
  "learn.prerequisite": { en: "Prerequisite", ar: "متطلب سابق" },
  "learn.locked": { en: "Locked", ar: "مقفل" },
  "learn.locked.body": {
    en: "This module is locked. Finish the previous module's practice quiz to unlock it.",
    ar: "هذه الوحدة مقفلة. أكمل اختبار التدريب في الوحدة السابقة لفتحها.",
  },
  "learn.locked.startPrereq": { en: "Review the lessons", ar: "راجع دروس الوحدة السابقة" },
  "learn.locked.takeQuiz": { en: "Take the practice quiz", ar: "ابدأ اختبار التدريب" },
  "learn.locked.backToList": { en: "Back to all modules", ar: "العودة إلى جميع الوحدات" },
  "learn.practiceThisModule": { en: "Practice this module", ar: "تدرّب على هذه الوحدة" },
  "learn.sectionsRead": { en: "{read} / {total} sections read", ar: "{read} / {total} أقسام مقروءة" },
  "learn.nextUnread": { en: "Jump to next unread section", ar: "اذهب إلى القسم التالي غير المقروء" },

  // Module common
  "module.letters": { en: "Letters", ar: "الحروف" },
  "module.quranicExamples": { en: "Quranic Examples", ar: "أمثلة قرآنية" },
  "module.commonMistakes": { en: "Common Mistakes", ar: "أخطاء شائعة" },
  "module.mnemonic": { en: "Mnemonic", ar: "طريقة الحفظ" },
  "module.quickReference": { en: "Quick Reference", ar: "مرجع سريع" },
  "module.rule": { en: "Rule", ar: "الحكم" },
  "module.count": { en: "Count", ar: "العدد" },

  // Module introduction
  "module.laam-raa.intro": {
    en: "The rules of Laam and Raa govern specific pronunciation behaviors. Laam Al-Ta'reef determines assimilation with sun and moon letters. Raa rules determine whether it is pronounced heavy or light based on surrounding vowels and letters.",
    ar: "تحكم أحكام اللام والراء سلوكيات نطقية محدّدة. لام التعريف تحدّد الإدغام مع الحروف الشمسية والإظهار مع القمرية. وأحكام الراء تحدّد تفخيمها أو ترقيقها بحسب الحركات والحروف المحيطة.",
  },

  // Makharij specific
  "makharij.diagram": { en: "Articulation Points Diagram", ar: "مخطط مخارج الحروف" },
  "makharij.articulationPoints": { en: "articulation point(s)", ar: "مخرج/مخارج" },
  "makharij.allLetters": { en: "All Letters by Region", ar: "جميع الحروف حسب المنطقة" },
  "makharij.totalPoints": { en: "Total articulation points", ar: "إجمالي المخارج" },
  "makharij.totalLetters": { en: "Total letters", ar: "إجمالي الحروف" },

  // Ghunnah specific
  "ghunnah.definition": { en: "Definition", ar: "التعريف" },
  "ghunnah.duration": { en: "Duration", ar: "المدة" },
  "ghunnah.ranking": { en: "Ghunnah Prominence Ranking", ar: "مراتب الغنّة" },
  "ghunnah.beats": { en: "beats", ar: "حركات" },

  // Qalqalah specific
  "qalqalah.fiveLetters": { en: "The Five Qalqalah Letters", ar: "حروف القلقلة الخمسة" },

  // Madd specific
  "madd.letters": { en: "Madd Letters", ar: "حروف المد" },
  "madd.summaryTable": { en: "Summary Table", ar: "جدول ملخّص" },
  "madd.type": { en: "Type", ar: "النوع" },
  "madd.beats": { en: "Beats", ar: "الحركات" },
  "madd.trigger": { en: "Trigger", ar: "السبب" },

  // Laam-Raa specific
  "laamRaa.example": { en: "Example", ar: "مثال" },
  "laamRaa.heavyRaa": { en: "Raa with Tafkheem (Heavy)", ar: "الراء المفخّمة" },
  "laamRaa.lightRaa": { en: "Raa with Tarqeeq (Light)", ar: "الراء المرقّقة" },

  // Tafkheem specific
  "tafkheem.alwaysHeavy": { en: "Always Heavy Letters", ar: "الحروف المفخّمة دائما" },
  "tafkheem.alwaysLight": { en: "Always Light Letters", ar: "الحروف المرقّقة دائما" },
  "tafkheem.levels": { en: "Levels of Tafkheem", ar: "مراتب التفخيم" },

  // Waqf specific
  "waqf.stoppingEffects": { en: "Effects When Stopping", ar: "أحكام عند الوقف" },

  // Practice
  "practice.title": { en: "Practice", ar: "تدريب" },
  "practice.description": {
    en: "Test your tajweed knowledge by identifying rules in Quranic examples.",
    ar: "اختبر معرفتك بالتجويد من خلال تحديد الأحكام في أمثلة قرآنية.",
  },
  "practice.allModules": { en: "All Modules", ar: "جميع الوحدات" },
  "practice.startQuiz": { en: "Start Quiz", ar: "ابدأ الاختبار" },
  "practice.quizComplete": { en: "Quiz Complete", ar: "اكتمل الاختبار" },
  "practice.correct": { en: "correct", ar: "إجابة صحيحة" },
  "practice.tryAgain": { en: "Try Again", ar: "حاول مجددا" },
  "practice.questionOf": { en: "Question {current} of {total}", ar: "السؤال {current} من {total}" },
  "practice.wellDone": { en: "Well done. You have demonstrated strong knowledge.", ar: "أحسنت. لقد أظهرت معرفة جيّدة." },
  "practice.goodProgress": { en: "Good progress. Continue reviewing the material.", ar: "تقدّم جيّد. واصل مراجعة المادة." },
  "practice.keepReviewing": { en: "Review the rules above and try again.", ar: "راجع الأحكام أعلاه وحاول مجددا." },
  "practice.streak": { en: "Practice Streak", ar: "سلسلة التدريب" },
  "practice.currentStreak": { en: "Current Streak", ar: "السلسلة الحالية" },
  "practice.longestStreak": { en: "Longest Streak", ar: "أطول سلسلة" },
  "practice.continue": { en: "Continue", ar: "متابعة" },
  "practice.finishQuiz": { en: "Finish quiz", ar: "إنهاء الاختبار" },
  "practice.hub.lockedHint": {
    en: "Finish the previous module's quiz to unlock",
    ar: "يُفتح بعد إكمال اختبار الوحدة السابقة",
  },
  "practice.feedback.correct": { en: "Correct", ar: "صحيح" },
  "practice.feedback.incorrect": { en: "Incorrect", ar: "غير صحيح" },
  "practice.feedback.rule": { en: "Rule", ar: "الحكم" },
  "practice.feedback.openLesson": { en: "Open the lesson section", ar: "افتح قسم الدرس" },

  // Practice hub (per-module practice)
  "practice.hub.title": { en: "Practice", ar: "التدريب" },
  "practice.hub.subtitle": {
    en: "Pick a module to practice on its own, or take a mixed review across every module.",
    ar: "اختر وحدة للتدريب عليها وحدها، أو خذ مراجعة مختلطة من كل الوحدات.",
  },
  "practice.hub.questions": { en: "questions", ar: "سؤال" },
  "practice.hub.taken": { en: "quizzes taken", ar: "اختبارات مأخوذة" },
  "practice.hub.lastScore": { en: "Last score", ar: "آخر نتيجة" },
  "practice.hub.notStarted": { en: "Not started yet", ar: "لم يبدأ بعد" },
  "practice.hub.start": { en: "Start", ar: "ابدأ" },
  "practice.hub.continue": { en: "Continue", ar: "تابع" },
  "practice.hub.mixedTitle": { en: "Mixed Review", ar: "مراجعة مختلطة" },
  "practice.hub.mixedDesc": {
    en: "Random questions from every module you have content for.",
    ar: "أسئلة عشوائية من كل وحدة فيها محتوى.",
  },
  "practice.hub.mixedBadge": { en: "All modules", ar: "كل الوحدات" },
  "practice.hub.backToHub": { en: "Practice hub", ar: "صفحة التدريب" },
  "practice.hub.reviewDesc": {
    en: "Questions you've answered before, scheduled by spaced repetition.",
    ar: "أسئلة أجبت عنها سابقا، مجدولة وفق المراجعة المتباعدة.",
  },
  "practice.hub.reviewBadge": { en: "Spaced", ar: "متباعد" },
  "review.title": { en: "Review Due", ar: "مراجعة مستحقّة" },
  "review.subtitle": {
    en: "Revisit questions on a spaced schedule. Missed answers come back tomorrow; mastered ones every 30 days.",
    ar: "راجع الأسئلة وفق جدول متباعد. تعود الأخطاء غدا، وما أتقنته كل 30 يوما.",
  },
  "review.dueCount": {
    en: "{count} question(s) due for review.",
    ar: "{count} سؤال/أسئلة جاهزة للمراجعة.",
  },
  "review.startReview": { en: "Start Review", ar: "ابدأ المراجعة" },
  "review.empty": {
    en: "No reviews due. Answer some practice questions to build a review queue.",
    ar: "لا توجد مراجعات مستحقّة. أجب على أسئلة التدريب لبناء قائمة المراجعة.",
  },
  "review.statsTitle": { en: "Spaced Review", ar: "المراجعة المتباعدة" },
  "review.statsTotal": { en: "Tracked", ar: "متابع" },
  "review.statsMastered": { en: "Mastered", ar: "متقَن" },
  "review.statsDue": { en: "Due now", ar: "مستحق الآن" },
  "review.statsHelp": {
    en: "Each question you answer is scheduled for review based on how well you remember it.",
    ar: "يُجدول كل سؤال أجبت عنه للمراجعة بحسب إتقانك له.",
  },

  // Progress
  "progress.title": { en: "Your Progress", ar: "تقدّمك" },
  "progress.description": { en: "Track your tajweed learning journey.", ar: "تابع مسيرتك في تعلّم التجويد." },
  "progress.localData": {
    en: "Your progress, bookmarks, and notes are stored only on this device. Back them up from Settings.",
    ar: "تُحفظ بياناتك ومفضّلاتك على هذا الجهاز فقط. يمكنك نسخها احتياطيًا من الإعدادات.",
  },
  "progress.overall": { en: "Overall Completion", ar: "نسبة الإكمال الكلّية" },
  "progress.streak": { en: "Streak", ar: "أيام متتالية" },
  "progress.current": { en: "Current", ar: "الحالية" },
  "progress.longest": { en: "Longest", ar: "الأطول" },
  "progress.moduleProgress": { en: "Module Progress", ar: "تقدّم الوحدات" },
  "progress.latestQuiz": { en: "Latest quiz", ar: "آخر اختبار" },
  "mastery.title": { en: "Rule mastery", ar: "إتقان الأحكام" },
  "mastery.empty": {
    en: "Take a module's practice quiz to start building mastery. Your progress will show here.",
    ar: "ابدأ اختبار التدريب لأي وحدة لبناء الإتقان. سيظهر تقدّمك هنا.",
  },
  "mastery.help": {
    en: "Mastery is drawn from your quiz scores and spaced-review progress, nothing is sent anywhere.",
    ar: "يُحتسب الإتقان من درجات اختباراتك وتقدّم المراجعة المتباعدة، لا يُرسل أي شيء لأي جهة.",
  },
  "mastery.level.untouched": { en: "Not started", ar: "لم يبدأ" },
  "mastery.level.started": { en: "Started", ar: "بدأت" },
  "mastery.level.practiced": { en: "Practiced", ar: "تمرّنت" },
  "mastery.level.strong": { en: "Strong", ar: "متقَن" },
  "mastery.best": { en: "Best", ar: "الأفضل" },
  "mastery.due": { en: "due", ar: "مستحقّ" },
  "mastery.mastered": { en: "mastered", ar: "متقَن" },
  "weakRules.title": { en: "Where to focus", ar: "أين تركّز" },
  "weakRules.subtitle": {
    en: "The rule areas you have missed most often in practice, drawn from your own quiz history.",
    ar: "أكثر أبواب الأحكام التي أخطأت فيها في التدريب، مأخوذة من سجلّ اختباراتك.",
  },
  "weakRules.missedLabel": { en: "{n} missed", ar: "{n} خطأ" },
  "weakRules.review": { en: "Review", ar: "راجع" },
  "weakRules.empty": {
    en: "No weak areas yet. Answer some practice questions and the areas to revisit will show here.",
    ar: "لا توجد مواطن ضعف بعد. أجب على أسئلة التدريب فتظهر هنا الأبواب التي ينبغي مراجعتها.",
  },
  "resume.listenTitle": { en: "Resume listening", ar: "متابعة الاستماع" },
  "resume.listenSubtitle": {
    en: "Pick up audio from the last verse you played.",
    ar: "تابع الصوت من آخر آية شغّلتها.",
  },
  "resume.listenButton": { en: "Resume listening", ar: "متابعة الاستماع" },
  "resume.listenAria": {
    en: "Resume listening from {surah}, verse {ref}",
    ar: "متابعة الاستماع من {surah}، الآية {ref}",
  },
  "progress.quizHistory": { en: "Quiz History", ar: "سجلّ الاختبارات" },
  "progress.resetProgress": { en: "Reset Progress", ar: "إعادة تعيين التقدّم" },
  "progress.resetDescription": {
    en: "Clear all completed lessons, quiz scores, and streaks. Your settings will be kept.",
    ar: "مسح جميع الدروس المكتملة ونتائج الاختبارات والسلاسل. سيتم الاحتفاظ بإعداداتك.",
  },
  "progress.areYouSure": { en: "Are you sure?", ar: "هل أنت متأكد؟" },
  "progress.yesReset": { en: "Yes, reset", ar: "نعم، إعادة تعيين" },
  "progress.cancel": { en: "Cancel", ar: "إلغاء" },
  "progress.resetAll": { en: "Reset All Progress", ar: "إعادة تعيين كل التقدّم" },

  // Settings
  "settings.title": { en: "Settings", ar: "الإعدادات" },
  "settings.description": { en: "Customize your learning experience.", ar: "خصّص تجربتك التعليمية." },
  "settings.reciter": { en: "Reciter", ar: "القارئ" },
  "settings.playbackSpeed": { en: "Playback Speed", ar: "سرعة التشغيل" },
  "settings.fontSize": { en: "Arabic Font Size", ar: "حجم الخط العربي" },
  "settings.displayOptions": { en: "Display Options", ar: "خيارات العرض" },
  "settings.showTransliteration": { en: "Show Transliteration", ar: "إظهار النقحرة" },
  "settings.showTranslation": { en: "Show Translation", ar: "إظهار الترجمة" },
  "settings.theme": { en: "Theme", ar: "المظهر" },
  "settings.themeHelp": {
    en: "Choose how the app looks. Your choice is saved on this device.",
    ar: "اختر مظهر التطبيق. يُحفظ اختيارك على هذا الجهاز.",
  },
  "settings.themeVellum": { en: "Vellum (warm light)", ar: "رَقّ (فاتح دافئ)" },
  "settings.themePearl": { en: "Pearl (cool light)", ar: "لؤلؤ (فاتح بارد)" },
  "settings.themeNight": { en: "Night (deep navy)", ar: "ليل (كحلي غامق)" },
  "settings.themeSepia": { en: "Sepia (warm dim)", ar: "بنّي (داكن دافئ)" },
  "settings.themeMihrab": { en: "Mihrab (emerald)", ar: "محراب (أخضر زمردي)" },
  "settings.onboardingTour": { en: "Show the welcome tour", ar: "عرض جولة الترحيب" },
  "settings.onboardingTourHelp": {
    en: "Turn this on to see the short tour of the app again. Turning it off hides it.",
    ar: "شغّل هذا لرؤية جولة التطبيق القصيرة مرة أخرى. وإيقافه يخفيها.",
  },
  "settings.reviewIntervalModifier": { en: "Review spacing", ar: "تباعد المراجعة" },
  "settings.reviewIntervalModifierHelp": {
    en: "Higher spacing means longer gaps between memorized-verse reviews.",
    ar: "التباعد الأعلى يعني فترات أطول بين مراجعات الآيات المحفوظة.",
  },
  "settings.peekBudget": { en: "Recall hint budget", ar: "رصيد تلميحات الاستذكار" },
  "settings.peekBudgetHelp": {
    en: "How many hints you can use per recall session before that verse's rating is capped at hard.",
    ar: "عدد التلميحات التي يمكنك استخدامها في كل جلسة استذكار قبل أن يُقيَّد تقييم تلك الآية عند «صعب».",
  },
  "settings.newVerseCap": { en: "New verses per day", ar: "الآيات الجديدة يوميًا" },
  "settings.newVerseCapHelp": {
    en: "The most new verses to introduce into revision each day. Due reviews of verses you already know are never capped.",
    ar: "أقصى عدد من الآيات الجديدة يُدخَل في المراجعة كل يوم. أما المراجعات المستحقة لآيات تعرفها فلا يُحدّ عددها أبدًا.",
  },
  "settings.revisionReminders": { en: "Revision reminders", ar: "تذكيرات المراجعة" },
  "settings.revisionRemindersHelp": {
    en: "Show a local reminder when you open the installed app and verses are due. This is a reminder on this device, not a server push. Nothing is sent while the app is closed.",
    ar: "أظهر تذكيرًا محليًا عند فتح التطبيق المثبَّت ووجود آيات مستحقة. هذا تذكير على هذا الجهاز، وليس إشعارًا من خادم. لا يُرسَل شيء والتطبيق مغلق.",
  },
  "settings.revisionRemindersDenied": {
    en: "Notifications are blocked for this app. Allow them in your browser settings to use reminders.",
    ar: "الإشعارات محظورة لهذا التطبيق. اسمح بها في إعدادات المتصفح لاستخدام التذكيرات.",
  },
  "settings.language": { en: "Language", ar: "اللغة" },
  "settings.normal": { en: "Normal", ar: "عادي" },
  "settings.large": { en: "Large", ar: "كبير" },
  "settings.xlarge": { en: "Extra Large", ar: "كبير جدا" },
  "settings.recitersDefault": { en: "default", ar: "افتراضي" },
  "settings.reciterSearch": { en: "Search reciters", ar: "ابحث عن قارئ" },
  "settings.reciterStyleMujawwad": { en: "Mujawwad", ar: "مجوّد" },
  "settings.reciterStyleMurattal": { en: "Murattal", ar: "مرتّل" },
  "settings.reciterNoResults": { en: "No reciters match your search.", ar: "لا يوجد قارئ مطابق لبحثك." },
  "settings.recitersHelp": {
    en: "Reciters come from Quran.com and EveryAyah recordings, grouped by style. Al-Husary (muallim) is the default for teaching-style learning.",
    ar: "القرّاء من تسجيلات Quran.com وEveryAyah، مرتّبون حسب النمط. والحصري (المعلّم) هو الافتراضي للتعلّم على نمط المعلّم.",
  },
  "settings.revisionReciter": { en: "Revision reciter", ar: "قارئ المراجعة" },
  "settings.revisionReciterHelp": {
    en: "The reciter used for memorization revision and recall playback only. Leave it as your reading reciter, or pick a different one just for revision.",
    ar: "القارئ المستخدم لتشغيل مراجعة الحفظ والاستذكار فقط. اتركه كقارئ القراءة، أو اختر قارئًا مختلفًا للمراجعة وحدها.",
  },
  "settings.revisionReciterSame": { en: "Same as reading reciter", ar: "نفس قارئ القراءة" },

  // Common
  "common.progress": { en: "Progress", ar: "التقدّم" },
  "common.previous": { en: "Previous", ar: "السابق" },
  "common.next": { en: "Next", ar: "التالي" },
  "common.markComplete": { en: "Mark as Complete", ar: "وضع علامة إتمام" },
  "common.completed": { en: "Completed", ar: "مكتمل" },
  "common.loading": { en: "Loading...", ar: "جاري التحميل..." },
  "common.colorLegend": { en: "Tajweed Color Legend", ar: "دليل ألوان التجويد" },
  "legend.group.ghunnahIdgham": { en: "Ghunnah & Idgham", ar: "الغنة والإدغام" },
  "legend.group.madd": { en: "Madd", ar: "المدّ" },
  "legend.group.qalqalah": { en: "Qalqalah", ar: "القلقلة" },
  "legend.group.ikhfaIqlab": { en: "Ikhfa & Iqlab", ar: "الإخفاء والإقلاب" },
  "legend.group.silentLaam": { en: "Silent & Laam", ar: "الصامت واللام" },

  // Audio player
  "player.play": { en: "Play", ar: "تشغيل" },
  "player.pause": { en: "Pause", ar: "إيقاف مؤقت" },
  "player.previous": { en: "Previous verse", ar: "الآية السابقة" },
  "player.next": { en: "Next verse", ar: "الآية التالية" },
  "player.close": { en: "Stop and close player", ar: "إيقاف وإغلاق المشغّل" },
  "player.hide": { en: "Hide player, keep playing", ar: "إخفاء المشغّل مع استمرار التشغيل" },
  "player.minimize": { en: "Minimize player", ar: "تصغير المشغّل" },
  "player.expand": { en: "Expand player", ar: "توسيع المشغّل" },
  "player.seek": { en: "Seek", ar: "تغيير الموضع" },
  "player.speed": { en: "Playback speed", ar: "سرعة التشغيل" },
  "player.playVerse": { en: "Play this verse", ar: "تشغيل هذه الآية" },
  "player.playFromHere": { en: "Play from here", ar: "تشغيل من هنا" },
  "player.playSurahFromHere": { en: "Play surah from this point onwards", ar: "تشغيل السورة من هذه الآية فصاعدًا" },
  "mushaf.playSurah": { en: "Play surah", ar: "تشغيل السورة" },
  "player.modeToContinuous": { en: "Switch to full surah", ar: "التبديل إلى السورة كاملة" },
  "player.modeToSingle": { en: "Switch to single verse", ar: "التبديل إلى آية واحدة" },
  "player.modeSingle": { en: "Single verse", ar: "آية واحدة" },
  "player.modeContinuous": { en: "Continuous", ar: "متتابع" },
  "player.studyOptions": { en: "Repeat and sleep options", ar: "خيارات التكرار والإيقاف" },
  "player.repeatVerse": { en: "Repeat verse", ar: "تكرار الآية" },
  "player.off": { en: "Off", ar: "إيقاف" },
  "player.times": { en: "×", ar: "×" },
  "player.loopRange": { en: "Loop ayah range", ar: "تكرار مقطع من الآيات" },
  "player.rangeFrom": { en: "From", ar: "من" },
  "player.rangeTo": { en: "To", ar: "إلى" },
  "player.loopStart": { en: "Loop", ar: "كرّر" },
  "player.sleep": { en: "Sleep timer", ar: "مؤقّت الإيقاف" },
  "player.min": { en: "min", ar: "دقيقة" },
  "player.sleepEndOfSurah": { en: "End of surah", ar: "نهاية السورة" },
  "player.dragHandle": {
    en: "Move player. Drag, or use the arrow keys.",
    ar: "تحريك المشغّل. اسحبه أو استخدم مفاتيح الأسهم.",
  },
  "player.addToSelection": { en: "Add to selection", ar: "إضافة إلى التحديد" },
  "player.removeFromSelection": { en: "Remove from selection", ar: "إزالة من التحديد" },
  "player.selectionSummary": { en: "{n} verses selected", ar: "{n} آيات محدّدة" },
  "player.selectionSummaryOne": { en: "1 verse selected", ar: "آية واحدة محدّدة" },
  "player.repeatEach": { en: "Repeat each", ar: "تكرار كل آية" },
  "player.loopSelection": { en: "Loop selection", ar: "تكرار التحديد" },
  "player.revealAsRecited": { en: "Reveal as recited", ar: "الكشف مع التلاوة" },
  "player.revealAsRecitedOn": { en: "Reveal words as recited", ar: "كشف الكلمات مع التلاوة" },
  "player.revealAsRecitedOff": { en: "Stop revealing as recited", ar: "إيقاف الكشف مع التلاوة" },
  "player.revealAsRecitedHint": {
    en: "Blur the verse and uncover each word as it is recited",
    ar: "إخفاء الآية وكشف كل كلمة أثناء تلاوتها",
  },
  "player.gapBetweenVerses": { en: "Gap between verses", ar: "الفاصل بين الآيات" },
  "player.gap0": { en: "0s", ar: "صفر ث" },
  "player.gap1": { en: "1s", ar: "١ ث" },
  "player.gap2": { en: "2s", ar: "٢ ث" },
  "player.gap4": { en: "4s", ar: "٤ ث" },
  "player.clearSelection": { en: "Clear selection", ar: "مسح التحديد" },
  "player.playSelection": { en: "Play selection", ar: "تشغيل التحديد" },
  "player.chipMore": { en: "+{n} more", ar: "+{n} أخرى" },
  "player.removeChip": { en: "Remove {ref}", ar: "إزالة {ref}" },
  "player.repeatOff": { en: "Off", ar: "إيقاف" },
  "player.selectRange": { en: "Select a range", ar: "تحديد نطاق" },
  "player.rangeSurah": { en: "Surah", ar: "السورة" },
  "player.rangeStart": { en: "From", ar: "من" },
  "player.rangeEnd": { en: "To", ar: "إلى" },
  "player.setRange": { en: "Set range", ar: "تعيين النطاق" },
  "player.subVerseLoop": { en: "Loop a word range", ar: "تكرار نطاق كلمات" },
  "player.subVerseFrom": { en: "From word", ar: "من كلمة" },
  "player.subVerseTo": { en: "To word", ar: "إلى كلمة" },
  "player.loopWords": { en: "Loop these words", ar: "كرّر هذه الكلمات" },
  "player.stopLoop": { en: "Stop loop", ar: "إيقاف التكرار" },
  "player.selectionControls": { en: "Range and repeat", ar: "النطاق والتكرار" },
  "player.readingDepth": { en: "Translation and tafsir", ar: "الترجمة والتفسير" },
  "player.grabHandle": { en: "Player controls, drag to expand or collapse", ar: "أدوات المشغّل، اسحب للتوسيع أو الطيّ" },
  "player.tryAgain": { en: "Try again", ar: "إعادة المحاولة" },
  "audio.unavailable": {
    en: "This reciter has no audio for this verse.",
    ar: "لا يتوفّر تسجيل لهذا القارئ في هذه الآية.",
  },
  "audio.changeReciter": { en: "Change reciter", ar: "تغيير القارئ" },
  "lesson.openInReader": { en: "Open in reader", ar: "افتح في المصحف" },

  // Tajweed rule popover (tap a colored letter to see which rule colors it)
  "ruleInfo.label": { en: "Tajweed rule", ar: "حكم التجويد" },
  "ruleInfo.learnMore": { en: "Learn about {rule}", ar: "تعلّم {rule}" },

  // Not found
  "notFound.title": { en: "Page Not Found", ar: "الصفحة غير موجودة" },
  "notFound.description": { en: "The page you are looking for does not exist.", ar: "الصفحة التي تبحث عنها غير موجودة." },
  "notFound.goHome": { en: "Go Home", ar: "العودة للرئيسية" },
  "notFound.startLearning": { en: "Start Learning", ar: "ابدأ التعلّم" },

  // Error boundary
  "error.title": { en: "Something went wrong", ar: "حدث خطأ ما" },
  "error.body": {
    en: "This page ran into a problem. You can try again, or head back home.",
    ar: "واجهت هذه الصفحة مشكلة. يمكنك إعادة المحاولة أو العودة إلى الرئيسية.",
  },
  "error.retry": { en: "Try again", ar: "إعادة المحاولة" },
  "error.goHome": { en: "Go Home", ar: "العودة للرئيسية" },

  // Weekday short labels (JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat)
  "weekday.short.0": { en: "S", ar: "ح" },
  "weekday.short.1": { en: "M", ar: "ن" },
  "weekday.short.2": { en: "T", ar: "ث" },
  "weekday.short.3": { en: "W", ar: "ر" },
  "weekday.short.4": { en: "T", ar: "خ" },
  "weekday.short.5": { en: "F", ar: "ج" },
  "weekday.short.6": { en: "S", ar: "س" },

  // Settings language option labels
  "settings.languageEn": { en: "English", ar: "الإنجليزية" },
  "settings.languageAr": { en: "Arabic", ar: "العربية" },

  // Mushaf reader
  "mushaf.title": { en: "Mushaf", ar: "المصحف" },
  "mushaf.subtitle": { en: "The complete Quran with tajweed coloring", ar: "المصحف الشريف ملوّنا بأحكام التجويد" },
  "mushaf.openReader": { en: "Open Mushaf", ar: "افتح المصحف" },
  "mushaf.continueReading": { en: "Continue from page {page}", ar: "تابع من الصفحة {page}" },
  "mushaf.resumeSurah": { en: "Resume", ar: "تابع" },
  "mushaf.resumeSurahHint": { en: "Resume {name} from page {page}", ar: "تابع {name} من الصفحة {page}" },
  "mushaf.surahIndex": { en: "Surah Index", ar: "فهرس السور" },
  "mushaf.juzIndex": { en: "Juz Index", ar: "فهرس الأجزاء" },
  "mushaf.bookmarks": { en: "Bookmarks", ar: "المفضلة" },
  "mushaf.tapToHear": { en: "Tap to hear this verse", ar: "اضغط لسماع الآية" },
  "mushaf.tapToPlayHint": { en: "Tap a verse to play it", ar: "اضغط على آية لتشغيلها" },
  "mushaf.verseActions": { en: "Translation, tafsir, and verse actions", ar: "الترجمة والتفسير وإجراءات الآية" },
  "mushaf.pageNumber": { en: "Page", ar: "الصفحة" },
  "mushaf.previousPage": { en: "Previous page", ar: "الصفحة السابقة" },
  "mushaf.nextPage": { en: "Next page", ar: "الصفحة التالية" },
  "mushaf.juz": { en: "Juz", ar: "الجزء" },
  "mushaf.surah": { en: "Surah", ar: "سورة" },
  "mushaf.versesCount": { en: "{count} verses", ar: "{count} آية" },
  "mushaf.revealedIn.makkah": { en: "Makki", ar: "مكية" },
  "mushaf.revealedIn.madinah": { en: "Madani", ar: "مدنية" },
  "mushaf.searchSurah": { en: "Search surah", ar: "ابحث عن سورة" },
  "mushaf.bookmarkAdd": { en: "Add bookmark", ar: "إضافة إلى المفضلة" },
  "mushaf.bookmarkRemove": { en: "Remove bookmark", ar: "إزالة من المفضلة" },
  "mushaf.verseBookmarks": { en: "Bookmarked verses", ar: "الآيات المفضّلة" },
  "mushaf.bookmarkVerse": { en: "Bookmark this verse", ar: "حفظ هذه الآية في المفضّلة" },
  "mushaf.bookmarkVerseRemove": { en: "Remove verse bookmark", ar: "إزالة الآية من المفضّلة" },
  "mushaf.verseOverlayTitle": { en: "Verse", ar: "الآية" },
  "mushaf.bookmarksViewAll": { en: "View all bookmarks", ar: "عرض كل الآيات المفضّلة" },
  "mushaf.bookmarksTitle": { en: "Bookmarked verses", ar: "الآيات المفضّلة" },
  "mushaf.bookmarksSubtitle": {
    en: "Verses you saved while reading.",
    ar: "آيات حفظتها أثناء القراءة.",
  },
  "mushaf.bookmarksCount": { en: "{count} saved", ar: "{count} محفوظة" },
  "mushaf.bookmarksEmpty": {
    en: "No bookmarked verses yet.",
    ar: "لا توجد آيات مفضّلة بعد.",
  },
  "mushaf.bookmarksEmptyHint": {
    en: "Open a verse in the reader and tap the bookmark to save it here.",
    ar: "افتح آية في القارئ واضغط على المفضّلة لحفظها هنا.",
  },
  "mushaf.bookmarksOpenReader": { en: "Open the Mushaf", ar: "افتح المصحف" },
  "mushaf.bookmarksBack": { en: "Back to index", ar: "العودة إلى الفهرس" },
  "bookmarks.filterLabel": { en: "Filter bookmarks", ar: "تصفية المفضّلة" },
  "bookmarks.filterPlaceholder": {
    en: "Filter by tag, surah, or reference…",
    ar: "تصفية حسب الوسم أو السورة أو الموضع…",
  },
  "bookmarks.filterEmpty": {
    en: "No bookmarks match your filter.",
    ar: "لا توجد آيات مفضّلة تطابق التصفية.",
  },
  "mushaf.bookmarkOpenVerse": { en: "Open in reader", ar: "افتح في القارئ" },
  "mushaf.memorizeOn": { en: "Hide memorized verses", ar: "إخفاء الآيات المحفوظة" },
  "mushaf.memorizeOff": { en: "Show memorized verses", ar: "إظهار الآيات المحفوظة" },
  "mushaf.recall": { en: "Recall", ar: "استذكار" },
  "mushaf.recallHint": {
    en: "Hide memorized verses to test your recall",
    ar: "إخفاء الآيات المحفوظة لاختبار استذكارك",
  },
  "mushaf.recallEmpty": { en: "Mark verses as memorized first", ar: "حدّد آيات كمحفوظة أولاً" },
  "mushaf.memorizeMark": { en: "Mark verse as memorized", ar: "تحديد الآية كمحفوظة" },
  "mushaf.memorizeUnmark": { en: "Unmark memorized verse", ar: "إلغاء تحديد الآية كمحفوظة" },
  "mushaf.memorizeReveal": { en: "Reveal", ar: "كشف" },
  "mushaf.followAlong": { en: "Follow along", ar: "تتبّع التلاوة" },
  "mushaf.followAlongOn": { en: "Highlight the recited word", ar: "تمييز الكلمة المتلوّة" },
  "mushaf.followAlongOff": { en: "Stop highlighting the recited word", ar: "إيقاف تمييز الكلمة المتلوّة" },
  "mushaf.followAlongHint": {
    en: "Light up each word as it is recited",
    ar: "إضاءة كل كلمة أثناء تلاوتها",
  },
  "mushaf.focusMode": { en: "Focus mode", ar: "وضع التركيز" },
  "mushaf.focusModeOn": { en: "Dim the other verses", ar: "تعتيم الآيات الأخرى" },
  "mushaf.focusModeOff": { en: "Show all verses", ar: "إظهار جميع الآيات" },
  "mushaf.focusModeHint": {
    en: "Dim every verse except the one playing or selected",
    ar: "تعتيم كل آية عدا الآية المشغّلة أو المحدّدة",
  },
  "mushaf.coverPage": { en: "Cover page", ar: "تغطية الصفحة" },
  "mushaf.coverPageOn": { en: "Cover the page to recall", ar: "غطّ الصفحة للاستذكار" },
  "mushaf.coverPageOff": { en: "Show the page", ar: "إظهار الصفحة" },
  "mushaf.coverPageHint": {
    en: "Blurs every verse; tap a verse to reveal it.",
    ar: "يعتّم كل آية؛ انقر آية لكشفها.",
  },
  "mushaf.drill": { en: "Highlight one rule", ar: "تمييز حكم واحد" },
  "mushaf.drillOff": { en: "All rules", ar: "كل الأحكام" },
  "mushaf.legend": { en: "Color legend", ar: "دليل الألوان" },
  "mushaf.quickJump": { en: "Jump to…", ar: "انتقال سريع" },
  "mushaf.quickJumpPlaceholder": { en: "Surah, juz, or page…", ar: "سورة أو جزء أو صفحة…" },
  "mushaf.quickJumpHint": { en: "Type a surah name, juz, or page number.", ar: "اكتب اسم سورة أو رقم جزء أو صفحة." },
  "mushaf.quickJumpNoResults": { en: "No surah, juz, or page matches.", ar: "لا توجد سورة أو جزء أو صفحة مطابقة." },
  "mushaf.quickJumpSurah": { en: "Surah {n}", ar: "سورة {n}" },
  "mushaf.quickJumpPage": { en: "Page {n}", ar: "الصفحة {n}" },
  "memorize.statsTitle": { en: "Memorization", ar: "الحفظ" },
  "memorize.statsCount": { en: "Memorized verses", ar: "الآيات المحفوظة" },
  "memorize.statsHelp": {
    en: "Mark verses as memorized in the Mushaf, then toggle the eye icon to test recall.",
    ar: "حدّد الآيات في المصحف كمحفوظة، ثم اضغط أيقونة العين لاختبار الاستذكار.",
  },
  "memorize.percentOfQuran": { en: "of the Quran", ar: "من القرآن" },
  "memorize.byJuz": { en: "By juz", ar: "حسب الجزء" },
  "memorize.bySurah": { en: "By surah", ar: "حسب السورة" },
  "memorize.juzShare": {
    en: "Juz {n}: {x} of {y} memorized",
    ar: "الجزء {n}: {x} من {y} محفوظة",
  },
  "memorize.surahShare": {
    en: "{name}: {x} of {y} memorized",
    ar: "{name}: {x} من {y} محفوظة",
  },
  "memorize.showAllSurahs": { en: "Show all surahs", ar: "إظهار جميع السور" },
  "memorize.bulkOpen": { en: "Add memorized verses", ar: "إضافة آيات محفوظة" },
  "memorize.emptyTitle": { en: "Track what you've memorized", ar: "تابع ما حفظته" },
  "memorize.emptyBody": {
    en: "Mark verses as memorized to see your progress through the Quran and review what you've learned.",
    ar: "حدّد الآيات كمحفوظة لترى تقدّمك في القرآن وتراجع ما تعلّمته.",
  },
  "memorize.bulkScope": { en: "What to mark", ar: "ما الذي تريد تحديده" },
  "memorize.scopeSurah": { en: "Whole surah", ar: "سورة كاملة" },
  "memorize.scopeJuz": { en: "Whole juz", ar: "جزء كامل" },
  "memorize.scopeRange": { en: "Verse range", ar: "نطاق آيات" },
  "memorize.rangeFrom": { en: "From verse", ar: "من الآية" },
  "memorize.rangeTo": { en: "To verse", ar: "إلى الآية" },
  "memorize.modeMark": { en: "Mark memorized", ar: "تحديد كمحفوظ" },
  "memorize.modeUnmark": { en: "Unmark", ar: "إلغاء التحديد" },
  "memorize.previewMark": { en: "Marks {n} verses memorized", ar: "سيُحدّد {n} آية كمحفوظة" },
  "memorize.previewUnmark": { en: "Unmarks {n} verses", ar: "سيُلغى تحديد {n} آية" },
  "memorize.previewNoop": { en: "Nothing to change", ar: "لا شيء للتغيير" },
  "memorize.confirmMark": { en: "Mark {n} verses", ar: "تحديد {n} آية" },
  "memorize.confirmUnmark": { en: "Unmark {n} verses", ar: "إلغاء تحديد {n} آية" },
  "memorize.reviewStart": { en: "Review memorized verses", ar: "مراجعة الآيات المحفوظة" },
  "memorize.reviewEmpty": {
    en: "No memorized verses are due for review right now.",
    ar: "لا توجد آيات محفوظة مستحقّة للمراجعة الآن.",
  },
  "memorize.reviewStatsTitle": { en: "Memorized review", ar: "مراجعة المحفوظ" },
  "memorize.reviewDueNow": { en: "Due now", ar: "مستحق الآن" },
  "memorize.reviewTotal": { en: "Memorized", ar: "محفوظ" },
  "memorize.reviewMastered": { en: "Mastered", ar: "متقَن" },
  "memorize.reviewStatsHelp": {
    en: "Each memorized verse is scheduled for recall review based on how well you remember it.",
    ar: "تُجدول كل آية محفوظة للاستذكار بحسب مدى تذكّرك لها.",
  },
  "memorize.gradeAgain": { en: "Again", ar: "مجددًا" },
  "memorize.gradeHard": { en: "Hard", ar: "صعب" },
  "memorize.gradeGood": { en: "Good", ar: "جيد" },
  "memorize.gradeEasy": { en: "Easy", ar: "سهل" },
  "memorize.gradeIntervalDays": { en: "{n}d", ar: "{n} يوم" },

  // Audio-led (blind) recall + the per-session peek/hint budget.
  // Operational UI copy, never Quran/tajweed content. The peek labels stay
  // DISTINCT from the free mushaf.memorizeReveal ("Reveal") so e2e locators for
  // the costed hint and the free self-check never collide.
  "blind.audioLed": { en: "Audio-led (blind) mode", ar: "الوضع الصوتي (استذكار بلا نص)" },
  "blind.audioLedHint": {
    en: "Play the verse with the text hidden, then reveal to check.",
    ar: "شغّل الآية والنص مخفيّ، ثم اكشفه للتحقّق.",
  },
  "peek.hint": { en: "Hint", ar: "تلميح" },
  "peek.remaining": { en: "{n} hints left", ar: "بقي {n} تلميح" },
  "peek.exhausted": { en: "No hints left", ar: "لا تلميحات متبقّية" },

  // Verse-chaining drill: recall the head of the next unit from the tail of the
  // current one, at three seam types (verse / page / juz). Operational UI copy,
  // never Quran/tajweed content. Grade buttons reuse the memorize.grade* keys.
  "chain.title": { en: "Chain memorized verses", ar: "تسلسل الآيات المحفوظة" },
  "chain.description": {
    en: "Recall the start of the next unit from the end of the current one.",
    ar: "استذكر بداية الوحدة التالية انطلاقًا من نهاية الوحدة الحالية.",
  },
  "chain.seamVerse": { en: "Verse to verse", ar: "آية إلى آية" },
  "chain.seamPage": { en: "Across pages", ar: "عبر الصفحات" },
  "chain.seamJuz": { en: "Across juz", ar: "عبر الأجزاء" },
  "chain.cuePrompt": { en: "What comes next?", ar: "ما الذي يأتي بعدها؟" },
  "chain.tailLabel": { en: "Current", ar: "الحالية" },
  "chain.headLabel": { en: "Next", ar: "التالية" },
  "chain.startChaining": { en: "Start chaining", ar: "ابدأ التسلسل" },
  "chain.empty": {
    en: "No chains available for this type yet. Memorize adjacent units to build them.",
    ar: "لا توجد سلاسل من هذا النوع بعد. احفظ وحدات متجاورة لتكوينها.",
  },

  // Segment drill: break ONE memorized verse into word-boundary chunks, drill each
  // chunk in isolation, then chain them. Operational UI copy, never Quran/tajweed
  // content. Distinct from chain.*/memorize.* so the three /progress keyboard
  // drills never share a title, start, or reveal label. Grade buttons and the
  // per-chunk play control reuse memorize.grade*/player.playVerse.
  "segment.title": { en: "Drill a verse in chunks", ar: "تدرّب على آية بالمقاطع" },
  "segment.description": {
    en: "Break a memorized verse into small chunks, master each, then chain them together.",
    ar: "قسّم آية محفوظة إلى مقاطع صغيرة، أتقن كلًّا منها، ثم اربطها معًا.",
  },
  "segment.pickVerse": { en: "Pick a memorized verse", ar: "اختر آية محفوظة" },
  "segment.chunkSize": { en: "Words per chunk", ar: "كلمات لكل مقطع" },
  "segment.noSplit": {
    en: "This verse is short. No split needed.",
    ar: "هذه الآية قصيرة، لا حاجة للتقسيم.",
  },
  "segment.startDrill": { en: "Start chunk drill", ar: "ابدأ تدريب المقاطع" },
  "segment.reveal": { en: "Reveal chunk", ar: "اكشف المقطع" },
  "segment.nextChunk": { en: "Next chunk", ar: "المقطع التالي" },
  "segment.beginChain": { en: "Chain the chunks", ar: "اربط المقاطع" },
  "segment.finish": { en: "Finish", ar: "إنهاء" },
  "segment.gradePrompt": { en: "Grade the whole verse (optional)", ar: "قيّم الآية كاملة (اختياري)" },
  "segment.skipGrade": { en: "Skip grading", ar: "تخطَّ التقييم" },
  "segment.drillProgress": { en: "Drilling chunks", ar: "تدريب المقاطع" },
  "segment.chainProgress": { en: "Chaining chunks", ar: "ربط المقاطع" },
  "segment.empty": {
    en: "Memorize a verse to drill it in chunks.",
    ar: "احفظ آية لتتدرّب عليها بالمقاطع.",
  },

  // Typing-recall drill: type a memorized verse back word by word, checked
  // against the real words (diacritic-insensitive when the setting is on).
  // Operational UI copy, never Quran/tajweed content. This is the FOURTH
  // keyboard drill on /progress, so its title, start, and reveal-word labels
  // stay DISTINCT from review.*/chain.*/segment.* (and mushaf.memorizeReveal)
  // in both locales: a /progress locator must address exactly one drill. Grade
  // buttons reuse memorize.grade*.
  "typing.title": { en: "Type the next word from memory", ar: "اكتب الكلمة التالية من الحفظ" },
  "typing.description": {
    en: "Recall a memorized verse word by word by typing each one in turn.",
    ar: "استذكر آية محفوظة كلمةً كلمةً بكتابة كل واحدة بالترتيب.",
  },
  "typing.pickVerse": { en: "Pick a verse to type", ar: "اختر آية للكتابة" },
  "typing.startDrill": { en: "Start typing recall", ar: "ابدأ استذكار الكتابة" },
  "typing.prompt": { en: "Type the next word", ar: "اكتب الكلمة التالية" },
  "typing.inputLabel": { en: "Type the word here", ar: "اكتب الكلمة هنا" },
  "typing.submit": { en: "Check", ar: "تحقّق" },
  "typing.correct": { en: "Correct", ar: "صحيح" },
  "typing.wrong": { en: "Not quite. Try again", ar: "ليس تمامًا. حاول مجددًا" },
  "typing.retry": { en: "Try again", ar: "حاول مجددًا" },
  "typing.revealWord": { en: "Show this word", ar: "أظهر هذه الكلمة" },
  "typing.progress": { en: "Word {n} of {total}", ar: "الكلمة {n} من {total}" },
  "typing.gradePrompt": { en: "Grade this verse (optional)", ar: "قيّم هذه الآية (اختياري)" },
  "typing.skipGrade": { en: "Skip grading", ar: "تخطَّ التقييم" },
  "typing.empty": {
    en: "Memorize a verse first to type it from memory.",
    ar: "احفظ آية أولًا لتكتبها من ذاكرتك.",
  },
  "typing.mistakesNote": {
    en: "You needed some help, so consider a lower grade.",
    ar: "احتجت بعض المساعدة، ففكّر في تقييم أقل.",
  },

  // Daily revision (murajaah) dashboard, home due-card, and the local reminder
  // Operational UI copy and counts only; never Quran
  // or hadith text; the notification body names a count via {n} and nothing more.
  // The beginRevision CTA stays DISTINCT from the four /progress drill start
  // labels (review/chain/segment/typing) in BOTH locales so it scrolls to the
  // existing review card without a locator or keyboard collision. Placeholders
  // {n} / {cap} are replaced at the call site (Arabic-Indic digits in AR).
  "murajaah.title": { en: "Today's revision", ar: "مراجعة اليوم" },
  "murajaah.description": {
    en: "A balanced plan from your memorized verses and their review schedule.",
    ar: "خطة متوازنة من آياتك المحفوظة وجدول مراجعتها.",
  },
  "murajaah.dueCount": { en: "{n} due for revision", ar: "{n} مستحقة للمراجعة" },
  "murajaah.newLabel": { en: "New", ar: "جديدة" },
  "murajaah.recentLabel": { en: "Recent", ar: "حديثة" },
  "murajaah.consolidatedLabel": { en: "Consolidated", ar: "راسخة" },
  "murajaah.newCapStatus": { en: "{n} of {cap} new introduced today", ar: "{n} من {cap} جديدة أُدخِلت اليوم" },
  "murajaah.introducingNew": { en: "Introducing {n} new today", ar: "إدخال {n} جديدة اليوم" },
  "murajaah.caughtUp": { en: "All caught up. Nothing due today.", ar: "أتممت كل شيء. لا مستحقات اليوم." },
  "murajaah.capReached": {
    en: "Today's new verses are done. {n} more will be introduced over the coming days.",
    ar: "انتهت آيات اليوم الجديدة. سيُدخَل {n} على مدى الأيام القادمة.",
  },
  "murajaah.beginRevision": { en: "Begin today's revision", ar: "ابدأ مراجعة اليوم" },
  "murajaah.homeDue": { en: "{n} verses due for revision", ar: "{n} آيات مستحقة للمراجعة" },
  "murajaah.review": { en: "Review", ar: "راجِع" },
  "murajaah.notifyTitle": { en: "Revision reminder", ar: "تذكير بالمراجعة" },
  "murajaah.notifyBody": { en: "{n} verses due for revision today", ar: "{n} آيات مستحقة للمراجعة اليوم" },

  // Memorization health: the freshness facet and the error heatmap
  // on /progress. Operational UI copy and counts only; never Quran
  // text; scope names come from the bundled index. The `heatmap.by*` dimension
  // labels are deliberately DISTINCT from the `memorize.by*` breakdown labels in
  // BOTH locales so an e2e locator addresses the right section. Placeholders
  // ({n}/{x}/{y}/{status}/{name}/{errors}/{count}) are replaced at the call site
  // (Arabic-Indic digits in AR).
  "strength.healthTitle": { en: "Memorization health", ar: "صحة الحفظ" },
  "strength.freshnessTitle": { en: "Freshness", ar: "نضارة المحفوظ" },
  "strength.freshnessHelp": {
    en: "Each juz ages toward red as time passes since your last successful recall.",
    ar: "يميل كل جزء نحو الأحمر كلما مضى الوقت منذ آخر استذكار ناجح.",
  },
  "strength.fresh": { en: "Fresh", ar: "نضِرة" },
  "strength.aging": { en: "Aging", ar: "تتقادم" },
  "strength.overdue": { en: "Overdue", ar: "فات موعدها" },
  "strength.unseen": { en: "Not yet recalled", ar: "لم تُستذكر بعد" },
  "strength.freshnessScope": {
    en: "Juz {n}: {status}, {count} memorized",
    ar: "الجزء {n}: {status}، {count} محفوظة",
  },
  "strength.revisionStreakTitle": { en: "Revision streak", ar: "سلسلة المراجعة" },
  "strength.revisionCurrent": { en: "Current streak", ar: "السلسلة الحالية" },
  "strength.revisionLongest": { en: "Longest streak", ar: "أطول سلسلة" },
  "strength.revisionStreakHelp": {
    en: "Consecutive days you've done at least one revision.",
    ar: "الأيام المتتالية التي راجعت فيها آية واحدة على الأقل.",
  },
  "heatmap.errorTitle": { en: "Recall errors", ar: "أخطاء الاستذكار" },
  "heatmap.errorHelp": {
    en: "Brighter cells are the memorized scopes you've missed most during recall review.",
    ar: "الخلايا الأكثر إشراقًا هي المواضع المحفوظة التي أخطأت فيها أكثر أثناء الاستذكار.",
  },
  "heatmap.byJuz": { en: "Errors by juz", ar: "الأخطاء حسب الجزء" },
  "heatmap.bySurah": { en: "Errors by surah", ar: "الأخطاء حسب السورة" },
  "heatmap.byPage": { en: "Errors by page", ar: "الأخطاء حسب الصفحة" },
  "heatmap.scopeLabel": {
    en: "{name}: {errors} recall errors across {count} memorized verses",
    ar: "{name}: {errors} أخطاء استذكار في {count} آية محفوظة",
  },
  "heatmap.pageShare": {
    en: "Page {n}: {x} recall errors across {y} memorized verses",
    ar: "الصفحة {n}: {x} أخطاء استذكار في {y} آية محفوظة",
  },
  "heatmap.showAll": { en: "Show all memorized surahs", ar: "إظهار كل السور المحفوظة" },
  "heatmap.noErrors": {
    en: "No recall errors recorded yet. Keep reviewing.",
    ar: "لا أخطاء استذكار مُسجّلة بعد. واصل المراجعة.",
  },

  // Tikrar (repetition) rep counter on /progress. Operational UI copy
  // and counts only; never Quran text (the verse renders through TajweedText).
  // It is the SIXTH drill-like surface on /progress, so its title / startDrill /
  // pickVerse labels are deliberately DISTINCT from the other five (review /
  // chain / segment / typing / murajaah) in BOTH locales so an e2e locator
  // addresses exactly this drill. Placeholders {done} / {target} / {n} are
  // replaced at the call site (Arabic-Indic digits in AR).
  "tikrar.title": { en: "Repeat a verse", ar: "كرّر آية" },
  "tikrar.description": {
    en: "Loop a memorized verse and count your repetitions toward a session target.",
    ar: "كرّر آية محفوظة واعدد تكراراتك نحو هدف الجلسة.",
  },
  "tikrar.pickVerse": { en: "Pick a verse to repeat", ar: "اختر آية للتكرار" },
  "tikrar.target": { en: "Repetition target", ar: "هدف التكرار" },
  "tikrar.decreaseTarget": { en: "Fewer repetitions", ar: "تكرارات أقل" },
  "tikrar.increaseTarget": { en: "More repetitions", ar: "تكرارات أكثر" },
  "tikrar.startDrill": { en: "Start repeating", ar: "ابدأ التكرار" },
  "tikrar.countRep": { en: "Count a repetition", ar: "احسب تكرارًا" },
  "tikrar.sessionProgress": { en: "{done} of {target} this session", ar: "{done} من {target} في هذه الجلسة" },
  "tikrar.runningTotal": { en: "Total for this verse: {n}", ar: "الإجمالي لهذه الآية: {n}" },
  "tikrar.finish": { en: "Finish session", ar: "أنهِ الجلسة" },
  "tikrar.empty": {
    en: "Memorize a verse first, then repeat it here to reinforce it.",
    ar: "احفظ آية أولًا، ثم كرّرها هنا لترسيخها.",
  },

  // Timed, no-peek, self-graded exam on /progress. A MEASUREMENT, not a
  // teaching drill: operational copy and counts only; never Quran text (the verse
  // renders through TajweedText). It is the SEVENTH drill-like surface on
  // /progress, so its title / start / pickScope (and reveal) labels are
  // deliberately DISTINCT from the other six (review / chain / segment / typing /
  // tikrar / the murajaah dashboard CTA) in BOTH locales so an e2e locator
  // addresses exactly this surface. Placeholders {n} / {total} / {percent} /
  // {recalled} / {time} are replaced at the call site (Arabic-Indic digits in AR).
  "exam.title": { en: "Timed recall exam", ar: "اختبار الاستذكار الموقوت" },
  "exam.description": {
    en: "Pick a scope, then recall each memorized verse from memory before revealing it. Your score and time are logged.",
    ar: "اختر نطاقًا، ثم استذكر كل آية محفوظة من ذاكرتك قبل كشفها. تُسجَّل نتيجتك ووقتك.",
  },
  "exam.pickScope": { en: "Choose a scope", ar: "اختر النطاق" },
  "exam.scopeSurah": { en: "By surah", ar: "حسب السورة" },
  "exam.scopeJuz": { en: "By juz", ar: "حسب الجزء" },
  "exam.scopeRange": { en: "By range", ar: "حسب المدى" },
  "exam.chooseSurah": { en: "Choose a surah", ar: "اختر سورة" },
  "exam.chooseJuz": { en: "Choose a juz", ar: "اختر جزءًا" },
  "exam.juzLabel": { en: "Juz {n}", ar: "الجزء {n}" },
  "exam.rangeStart": { en: "From ayah", ar: "من الآية" },
  "exam.rangeEnd": { en: "To ayah", ar: "إلى الآية" },
  "exam.inScope": { en: "{n} memorized verses in this scope", ar: "{n} آية محفوظة في هذا النطاق" },
  "exam.emptyScope": {
    en: "No memorized verses in this scope yet.",
    ar: "لا آيات محفوظة في هذا النطاق بعد.",
  },
  "exam.noPeekNote": {
    en: "The verse stays hidden until you mark it. Recall it from memory first.",
    ar: "تبقى الآية مخفية حتى تُقيّمها. استذكرها من ذاكرتك أولًا.",
  },
  "exam.start": { en: "Start the exam", ar: "ابدأ الاختبار" },
  "exam.progress": { en: "Verse {n} of {total}", ar: "الآية {n} من {total}" },
  "exam.markRecalled": { en: "I recalled it", ar: "استذكرتها" },
  "exam.markMissed": { en: "I missed it", ar: "فاتتني" },
  "exam.reveal": { en: "Reveal the verse", ar: "اكشف الآية" },
  "exam.restart": { en: "Start over", ar: "ابدأ من جديد" },
  "exam.score": { en: "You recalled {percent}%", ar: "استذكرت {percent}%" },
  "exam.scoreDetail": { en: "{recalled} of {total} recalled", ar: "{recalled} من {total} مستذكرة" },
  "exam.elapsed": { en: "Time: {time}", ar: "الوقت: {time}" },
  "exam.recentTitle": { en: "Recent attempts", ar: "المحاولات الأخيرة" },
  "exam.recentEmpty": { en: "No attempts logged yet.", ar: "لا محاولات مُسجّلة بعد." },

  // Per-day session journal on /progress: set today's memorize/revise
  // goals and watch today's tallies climb toward them. Operational copy and the
  // learner's own counts only; never Quran text. Its title is deliberately
  // DISTINCT from the neighbouring section titles it renders beside (the revision
  // streak, memorization health, tikrar, exam, and khatmah) in BOTH locales so an
  // e2e region locator addresses exactly this card. The {memorized} /
  // {memorizeGoal} / {revised} / {reviseGoal} placeholders are filled at the call
  // site (Arabic-Indic digits in AR).
  "journal.title": { en: "Session journal", ar: "دفتر الجلسة" },
  "journal.description": {
    en: "Set today's goals, then watch your memorized and revised counts climb toward them.",
    ar: "حدّد أهداف اليوم، ثم تابع تقدّم ما حفظته وراجعته نحوها.",
  },
  "journal.memorizeGoal": { en: "Memorize goal", ar: "هدف الحفظ" },
  "journal.reviseGoal": { en: "Revise goal", ar: "هدف المراجعة" },
  "journal.save": { en: "Save goals", ar: "احفظ الأهداف" },
  "journal.memorizedLabel": { en: "Memorized", ar: "المحفوظة" },
  "journal.revisedLabel": { en: "Revised", ar: "المراجَعة" },
  "journal.summary": {
    en: "Today: {memorized}/{memorizeGoal} memorized, {revised}/{reviseGoal} revised",
    ar: "اليوم: {memorized}/{memorizeGoal} محفوظة، {revised}/{reviseGoal} مراجَعة",
  },
  "journal.noGoals": {
    en: "Set a memorize or revise goal above to track today's progress.",
    ar: "حدّد هدفًا للحفظ أو المراجعة أعلاه لتتبع تقدّم اليوم.",
  },

  // Hizb & rub' al-hizb coverage rings on /progress. Operational copy
  // and derived counts only; never Quran text (the rings render only scope
  // numbers and percentages). The title stays DISTINCT from the neighbouring
  // memorization section titles in BOTH locales so its region locator addresses
  // exactly this surface. The {n} / {pct} / {count} / {total} placeholders are
  // filled at the call site (Arabic-Indic digits in AR).
  "hizb.title": { en: "Hizb & rub' coverage", ar: "تغطية الحزب والربع" },
  "hizb.help": {
    en: "How much of each hizb and rub' al-hizb you've memorized.",
    ar: "مقدار ما حفظته من كل حزب وربع الحزب.",
  },
  "hizb.ringLabel": {
    en: "Hizb {n}: {pct}% memorized ({count} of {total} verses)",
    ar: "الحزب {n}: {pct}% محفوظ ({count} من {total} آية)",
  },
  "hizb.rubRingLabel": {
    en: "Rub' {n}: {pct}% memorized ({count} of {total} verses)",
    ar: "الربع {n}: {pct}% محفوظ ({count} من {total} آية)",
  },
  "hizb.showRub": { en: "Show rub' al-hizb rings", ar: "أظهر حلقات ربع الحزب" },
  "hizb.hideRub": { en: "Hide rub' al-hizb rings", ar: "أخفِ حلقات ربع الحزب" },

  "mushaf.allSurahs": { en: "All surahs", ar: "جميع السور" },
  "mushaf.makkahSurahs": { en: "Makkah surahs", ar: "السور المكية" },
  "mushaf.madinahSurahs": { en: "Madinah surahs", ar: "السور المدنية" },

  // Backup and restore
  "settings.backup.title": { en: "Backup & Restore", ar: "النسخ الاحتياطي والاستعادة" },
  "settings.backup.description": {
    en: "Export your progress to a JSON file or restore from a previous backup. Useful when switching browsers or devices.",
    ar: "صدّر تقدّمك إلى ملف JSON أو استعد نسخة سابقة. مفيد عند تغيير المتصفح أو الجهاز.",
  },
  "settings.backup.export": { en: "Export backup", ar: "تصدير نسخة" },
  "settings.backup.import": { en: "Restore backup", ar: "استعادة نسخة" },
  "settings.backup.exported": { en: "Backup downloaded.", ar: "تم تنزيل النسخة." },
  "settings.backup.imported": { en: "Backup restored. Reloading…", ar: "تم استعادة النسخة. جارٍ إعادة التحميل…" },
  "settings.backup.invalid": {
    en: "That file isn't a valid Tajweed Trainer backup.",
    ar: "هذا الملف ليس نسخة احتياطية صالحة.",
  },
  "settings.backup.reminder": {
    en: "Your progress is only on this device. Export a backup to keep it safe.",
    ar: "تقدّمك محفوظ على هذا الجهاز فقط. صدّر نسخة احتياطية للحفاظ عليه.",
  },
  "settings.backup.reminderDismiss": { en: "Dismiss", ar: "إخفاء" },

  // Speech (TTS for prompts only, NOT for Quranic text)
  "speech.read": { en: "Read prompt aloud", ar: "اقرأ السؤال بصوت" },
  "speech.stop": { en: "Stop reading", ar: "إيقاف القراءة" },

  // Insights (anonymous local analytics)
  "insights.title": { en: "Insights", ar: "إحصائيات الاستخدام" },
  "insights.quizStarts": { en: "Quizzes started", ar: "اختبارات بُدئت" },
  "insights.quizFinishes": { en: "Quizzes finished", ar: "اختبارات مكتملة" },
  "insights.topRoutes": { en: "Most-visited screens", ar: "أكثر الشاشات زيارة" },
  "insights.localOnly": {
    en: "All usage data stays on this device. Nothing is sent to a server.",
    ar: "تبقى جميع بيانات الاستخدام على هذا الجهاز. لا يُرسل شيء إلى خادم.",
  },

  // Search
  "search.title": { en: "Search", ar: "بحث" },
  "search.subtitle": {
    en: "Find a surah, lesson module, tajweed rule, or waqf symbol.",
    ar: "ابحث عن سورة أو وحدة درس أو حكم تجويد أو رمز وقف.",
  },
  "search.placeholder": { en: "Search surahs, modules, rules…", ar: "ابحث في السور والوحدات والأحكام…" },
  "search.hint": { en: "Type at least 2 characters to search.", ar: "أدخل حرفين على الأقل للبحث." },
  "search.noResults": { en: "No matches.", ar: "لا توجد نتائج." },
  "search.verses": { en: "Quran verses", ar: "آيات القرآن" },
  "search.inApp": { en: "In the app", ar: "في التطبيق" },
  "search.verseError": {
    en: "Couldn't search Quran verses right now. App results still work.",
    ar: "تعذّر البحث في آيات القرآن الآن. نتائج التطبيق لا تزال تعمل.",
  },
  "search.retry": { en: "Try again", ar: "إعادة المحاولة" },
  "search.filterAll": { en: "All", ar: "الكل" },
  "search.filterLabel": { en: "Filter results", ar: "تصفية النتائج" },
  "search.filterMemorized": { en: "Memorized", ar: "المحفوظة" },
  "search.filterEmpty": { en: "No results in this filter.", ar: "لا توجد نتائج في هذه التصفية." },

  // Reading depth (translation and tafsir, fetched from the verified API)
  "reading.showTafsir": { en: "Show tafsir", ar: "إظهار التفسير" },
  "reading.hideTafsir": { en: "Hide tafsir", ar: "إخفاء التفسير" },
  "reading.unavailable": { en: "Could not load, try again from the reader.", ar: "تعذّر التحميل، حاول من القارئ." },
  "reading.noTafsir": { en: "No tafsir available for this verse.", ar: "لا يوجد تفسير لهذه الآية." },
  "reading.wordByWord": { en: "Word by word", ar: "كلمة بكلمة" },
  "reading.noWords": { en: "Word-by-word is unavailable for this verse.", ar: "التحليل كلمة بكلمة غير متاح لهذه الآية." },
  "compare.title": { en: "Compare your recitation", ar: "قارن تلاوتك" },
  "compare.privacy": {
    en: "For your own ears only. Your voice stays on this device, it is never uploaded, saved, or scored.",
    ar: "لسمعك وحدك. صوتك يبقى على هذا الجهاز، لا يُرفع ولا يُحفظ ولا يُقيَّم.",
  },
  "compare.reciter": { en: "The reciter", ar: "القارئ" },
  "compare.yourTake": { en: "Your take", ar: "تلاوتك" },
  "compare.record": { en: "Record", ar: "تسجيل" },
  "compare.recording": { en: "Recording, tap to stop", ar: "جارٍ التسجيل، اضغط للإيقاف" },
  "compare.stop": { en: "Stop", ar: "إيقاف" },
  "compare.playYours": { en: "Play your take", ar: "تشغيل تلاوتك" },
  "compare.playReciter": { en: "Play the reciter", ar: "تشغيل القارئ" },
  "compare.rerecord": { en: "Re-record", ar: "إعادة التسجيل" },
  "compare.denied": {
    en: "Microphone access is blocked. Allow it in your browser's site settings, then try again.",
    ar: "تم حظر الوصول إلى الميكروفون. اسمح به من إعدادات الموقع في متصفحك ثم حاول مجددًا.",
  },
  "compare.tryAgain": { en: "Try again", ar: "حاول مجددًا" },

  // Private per-verse study notes (local-only, the learner's own words)
  "notes.title": { en: "Your note", ar: "ملاحظتك" },
  "notes.add": { en: "Add a note", ar: "إضافة ملاحظة" },
  "notes.edit": { en: "Edit your note", ar: "تعديل ملاحظتك" },
  "notes.placeholder": { en: "A private note for this verse…", ar: "ملاحظة خاصة لهذه الآية…" },
  "notes.privacy": {
    en: "Private to this device, your own words, never uploaded.",
    ar: "خاصة بهذا الجهاز، كلماتك أنت، لا تُرفع أبدًا.",
  },
  "notes.save": { en: "Save note", ar: "حفظ الملاحظة" },
  "notes.saved": { en: "Saved", ar: "تم الحفظ" },
  "notes.clear": { en: "Delete note", ar: "حذف الملاحظة" },
  "notes.charsLeft": { en: "{n} left", ar: "بقي {n}" },
  "notes.hasNote": { en: "This verse has a note", ar: "لهذه الآية ملاحظة" },

  // Tags: the learner's own short labels for organizing notes and bookmarks
  "tags.title": { en: "Your tags", ar: "وسومك" },
  "tags.add": { en: "Add tag", ar: "إضافة وسم" },
  "tags.placeholder": { en: "Add a label…", ar: "أضف وسمًا…" },
  "tags.remove": { en: "Remove tag {tag}", ar: "إزالة الوسم {tag}" },
  "tags.privacy": {
    en: "Your own labels, private to this device, never uploaded.",
    ar: "وسومك أنت، خاصة بهذا الجهاز، لا تُرفع أبدًا.",
  },
  "tags.empty": { en: "No tags yet", ar: "لا توجد وسوم بعد" },

  // Reciter A/B compare: hear the same verse by two reciters back to back
  "recompare.title": { en: "Compare reciters", ar: "مقارنة القرّاء" },
  "recompare.hint": {
    en: "Hear this verse by two reciters to compare their recitation.",
    ar: "استمع لهذه الآية بصوت قارئين لمقارنة تلاوتهما.",
  },
  "recompare.reciterA": { en: "Reciter A", ar: "القارئ الأول" },
  "recompare.reciterB": { en: "Reciter B", ar: "القارئ الثاني" },
  "recompare.playA": { en: "Play A", ar: "تشغيل الأول" },
  "recompare.playB": { en: "Play B", ar: "تشغيل الثاني" },

  // Inline reciter / speed / translation-source controls in the verse overlay.
  // Chrome labels only (the reciter style and translation names come from the
  // catalogue); they write the same settings the Settings page does.
  "inlineControls.title": { en: "Playback", ar: "التشغيل" },
  "inlineControls.reciter": { en: "Reciter", ar: "القارئ" },
  "inlineControls.speed": { en: "Speed", ar: "السرعة" },
  "inlineControls.translation": { en: "Translation", ar: "الترجمة" },

  "reading.close": { en: "Close", ar: "إغلاق" },
  "settings.readingDepth": { en: "Reading depth", ar: "عمق القراءة" },
  "settings.translationResource": { en: "Translation", ar: "الترجمة" },
  "settings.tafsirResource": { en: "Tafsir", ar: "التفسير" },
  "settings.showWordByWord": { en: "Word-by-word breakdown", ar: "التحليل كلمة بكلمة" },
  "settings.diacriticInsensitive": { en: "Ignore diacritics when typing", ar: "تجاهل التشكيل عند الكتابة" },
  "settings.diacriticInsensitiveHelp": {
    en: "In the typing-recall drill, match a word even if its tashkeel differs, so a missing haraka is not marked wrong.",
    ar: "في تدريب الاستذكار بالكتابة، طابق الكلمة حتى لو اختلف تشكيلها، فلا تُحسب حركة ناقصة خطأً.",
  },
  "settings.resourceOnline": { en: "More options load when online.", ar: "تظهر خيارات أكثر عند الاتصال." },

  // Khatmah (Quran-completion) planner
  "khatmah.title": { en: "Khatmah plan", ar: "خطة ختمة" },
  "khatmah.emptyTitle": { en: "Plan a khatmah", ar: "خطّط لختمة" },
  "khatmah.emptyBody": {
    en: "Set a date to finish the whole Quran and we will suggest a gentle daily pace. Your reading in the mushaf moves the plan along on its own.",
    ar: "حدّد موعدًا لإتمام القرآن كاملًا وسنقترح وتيرة يومية هادئة. قراءتك في المصحف تُحرّك الخطة تلقائيًا.",
  },
  "khatmah.emptyHelp": {
    en: "Optional and private. No reminders, no check-ins.",
    ar: "اختياري وخاص. بلا تذكيرات ولا تسجيل يومي.",
  },
  "khatmah.start": { en: "Start a khatmah", ar: "ابدأ ختمة" },
  "khatmah.setupTitle": { en: "Set your pace", ar: "اضبط وتيرتك" },
  "khatmah.duration": { en: "Finish in", ar: "الإتمام خلال" },
  "khatmah.days30": { en: "30 days", ar: "٣٠ يومًا" },
  "khatmah.days60": { en: "60 days", ar: "٦٠ يومًا" },
  "khatmah.days90": { en: "90 days", ar: "٩٠ يومًا" },
  "khatmah.customDate": { en: "Or pick a date", ar: "أو اختر تاريخًا" },
  "khatmah.startPageNote": {
    en: "Starting from your current page ({page}). Reading onward fills the plan.",
    ar: "يبدأ من صفحتك الحالية ({page}). المتابعة في القراءة تملأ الخطة.",
  },
  "khatmah.save": { en: "Save plan", ar: "احفظ الخطة" },
  "khatmah.cancel": { en: "Cancel", ar: "إلغاء" },
  "khatmah.edit": { en: "Edit", ar: "تعديل" },
  "khatmah.end": { en: "End khatmah", ar: "إنهاء الختمة" },
  "khatmah.endConfirm": { en: "End this khatmah?", ar: "إنهاء هذه الختمة؟" },
  "khatmah.endYes": { en: "End", ar: "إنهاء" },
  "khatmah.percentLabel": { en: "of the Quran", ar: "من القرآن" },
  "khatmah.pagesRead": { en: "{read} of {total} pages", ar: "{read} من {total} صفحة" },
  "khatmah.dailyGoal": { en: "Daily goal", ar: "الهدف اليومي" },
  "khatmah.pagesPerDay": { en: "{n} pages/day", ar: "{n} صفحة/يوم" },
  "khatmah.daysLeft": { en: "{n} days left", ar: "باقٍ {n} يومًا" },
  "khatmah.dueToday": { en: "Due today", ar: "مستحقّ اليوم" },
  "khatmah.onTrack": { en: "On track", ar: "على المسار" },
  "khatmah.aheadDays": { en: "{n} days ahead", ar: "متقدّم بـ {n} يومًا" },
  "khatmah.behindDays": { en: "{n} days behind", ar: "متأخّر بـ {n} يومًا" },
  "khatmah.complete": { en: "Khatmah complete, may Allah accept it", ar: "تمّت الختمة، تقبّل الله" },

  // Milestone certificate. Operational achievement copy only: the
  // milestone reached, the date, and the app name. It NEVER contains verse or
  // hadith text. The AR side is a translation of this operational copy.
  "certificate.title": { en: "Certificate", ar: "شهادة" },
  "certificate.intro": {
    en: "Celebrate a milestone with a certificate you can save as an image, made on your device.",
    ar: "احتفِ بإنجاز بشهادة يمكنك حفظها كصورة، تُصنع على جهازك.",
  },
  "certificate.empty": {
    en: "Complete a juz or a khatmah to unlock a certificate.",
    ar: "أكمل جزءًا أو ختمة لفتح شهادة.",
  },
  "certificate.pick": { en: "Choose a milestone", ar: "اختر إنجازًا" },
  "certificate.optionJuz": { en: "Juz {n}", ar: "الجزء {n}" },
  "certificate.optionKhatmah": { en: "The whole Quran", ar: "القرآن كاملًا" },
  "certificate.save": { en: "Save as image", ar: "احفظ كصورة" },
  "certificate.canvasLabel": {
    en: "Milestone certificate, ready to save as an image",
    ar: "شهادة إنجاز، جاهزة للحفظ كصورة",
  },
  // The lines drawn on the canvas itself.
  "certificate.eyebrow": { en: "Certificate of completion", ar: "شهادة إتمام" },
  "certificate.juzTitle": { en: "Juz {n}", ar: "الجزء {n}" },
  "certificate.juzDetail": { en: "Memorized in full", ar: "حُفظ كاملًا" },
  "certificate.khatmahTitle": { en: "The whole Quran", ar: "القرآن الكريم كاملًا" },
  "certificate.khatmahDetail": { en: "Recited in full", ar: "تُلِي كاملًا" },
  "certificate.dateLabel": { en: "Completed {date}", ar: "أُتمّ في {date}" },
  "certificate.appName": { en: "Tajweed Trainer", ar: "معلّم التجويد" },

  // Onboarding
  "onboarding.title": { en: "Welcome to Tajweed Trainer", ar: "مرحباً بك في مدرّب التجويد" },
  "onboarding.skip": { en: "Skip", ar: "تخطّي" },
  "onboarding.back": { en: "Back", ar: "رجوع" },
  "onboarding.done": { en: "Got it", ar: "تمّ" },
  "onboarding.stepOf": { en: "{current} / {total}", ar: "{current} / {total}" },
  "onboarding.step.mushaf.title": { en: "Read and listen", ar: "اقرأ واستمع" },
  "onboarding.step.mushaf.body": {
    en: "Open the mushaf and tap any verse. A focused panel opens (a centred panel on desktop, a bottom sheet on your phone) where you play that verse, play on from there, mark it memorized, bookmark it, add a private note, and read its translation and tafsir.",
    ar: "افتح المصحف وانقر أي آية. تنفتح لوحة مركّزة (وسطية على الحاسوب، وورقة سفلية على الهاتف) حيث تشغّل تلك الآية، أو تتابع منها، وتحدّدها محفوظة، وتضيف إشارة مرجعية، وتكتب ملاحظة خاصة، وتقرأ ترجمتها وتفسيرها.",
  },
  "onboarding.step.themes.title": { en: "Make it yours", ar: "اجعله بأسلوبك" },
  "onboarding.step.themes.body": {
    en: "Choose from five curated themes (two light, three dark) in Settings. Your choice is saved on this device.",
    ar: "اختر من بين خمسة مظاهر منسّقة (اثنان فاتحان وثلاثة داكنة) من الإعدادات. ويُحفظ اختيارك على هذا الجهاز.",
  },
  "onboarding.step.followAlong.title": { en: "Follow along", ar: "تابع التلاوة" },
  "onboarding.step.followAlong.body": {
    en: "With a reciter that has word timing, each word lights up as it is recited. In recall, reveal-as-recited uncovers a memorized verse word by word as you go.",
    ar: "مع قارئ لديه توقيت للكلمات، تُضاء كل كلمة وهي تُتلى. وفي الاستذكار، يكشف وضع الكشف-مع-التلاوة الآية المحفوظة كلمةً كلمةً أثناء تقدّمك.",
  },
  "onboarding.step.tracker.title": { en: "Track your hifz", ar: "تابع حفظك" },
  "onboarding.step.tracker.body": {
    en: "Mark verses, whole surahs, or a juz as memorized. Your progress page shows your share of the Quran and what is due for review, and recall blurs memorized verses so you recite from memory.",
    ar: "حدّد آيات أو سورة كاملة أو جزءًا كمحفوظ. تعرض صفحة التقدّم نصيبك من القرآن وما حان وقت مراجعته، ويُخفي الاستذكار الآيات المحفوظة لتتلوها من ذاكرتك.",
  },

  // Warsh "different narration" surface. Operational copy only: it
  // states what the app shows and how this entry behaves, and links out to an
  // external reference. It must never explain what the Warsh narration is or
  // describe its rules. The AR side is a translation of this operational copy.
  "warsh.entryTitle": { en: "Listen in another narration (Warsh)", ar: "الاستماع برواية أخرى (ورش)" },
  "warsh.entrySubtitle": {
    en: "Per surah only. For this narration, per-verse playback is not available.",
    ar: "لكل سورة فقط. في هذه الرواية، التشغيل لكل آية غير متاح.",
  },
  "warsh.reciter": { en: "Reciter: Younes Souilass (Warsh ‘an Nāfi‘)", ar: "القارئ: يونس سويلص (ورش عن نافع)" },
  "warsh.disclaimerTitle": { en: "A different narration", ar: "رواية مختلفة" },
  "warsh.disclaimerBody": {
    en: "This is the Warsh narration. The Arabic text and tajweed colouring shown in this app are for Hafs an Asim and do not match this recitation. This app is built for Hafs an Asim. Per-verse playback is not available for this narration.",
    ar: "هذه رواية ورش. النصّ العربي وتلوين التجويد المعروضان في هذا التطبيق لرواية حفص عن عاصم ولا يطابقان هذه التلاوة. هذا التطبيق مبني على رواية حفص عن عاصم. التشغيل لكل آية غير متاح في هذه الرواية.",
  },
  "warsh.referenceLinkLabel": { en: "Learn more about the Qira'at and Warsh", ar: "اعرف المزيد عن القراءات ورواية ورش" },
  "warsh.acknowledge": { en: "I understand", ar: "فهمت" },
  "warsh.cancel": { en: "Cancel", ar: "إلغاء" },
  "warsh.playSurah": { en: "Play surah {surah}", ar: "تشغيل سورة {surah}" },
  "warsh.pause": { en: "Pause", ar: "إيقاف مؤقت" },
  "warsh.notAvailable": { en: "This surah is not available in this narration.", ar: "هذه السورة غير متاحة في هذه الرواية." },
  "warsh.surahSelectLabel": { en: "Choose a surah", ar: "اختر سورة" },
};

export function t(key: string, lang: Language): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en ?? key;
}

export function useTranslation() {
  const { settings } = useSettings();
  const lang = settings.language;

  return {
    t: (key: string) => t(key, lang),
    lang,
    isAr: lang === "ar",
    dir: lang === "ar" ? "rtl" as const : "ltr" as const,
  };
}
