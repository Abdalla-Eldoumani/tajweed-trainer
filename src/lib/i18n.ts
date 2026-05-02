"use client";

import { useSettings } from "@/hooks/useSettings";
import type { Language } from "./types";

const translations: Record<string, { en: string; ar: string }> = {
  // App
  "app.title": { en: "Tajweed Trainer", ar: "معلّم التجويد" },
  "app.titleAr": { en: "تجويد القرآن", ar: "تجويد القرآن" },

  // Navigation
  "nav.home": { en: "Home", ar: "الرئيسية" },
  "nav.learn": { en: "Learn", ar: "تعلّم" },
  "nav.practice": { en: "Practice", ar: "تدريب" },
  "nav.progress": { en: "Progress", ar: "تقدّم" },
  "nav.settings": { en: "Settings", ar: "إعدادات" },
  "nav.allModules": { en: "All Modules", ar: "جميع الوحدات" },
  "nav.closeMenu": { en: "Close menu", ar: "إغلاق القائمة" },
  "nav.toggleMenu": { en: "Toggle menu", ar: "فتح القائمة" },

  // Home page
  "home.title": { en: "Tajweed Trainer", ar: "معلّم التجويد" },
  "home.subtitle": {
    en: "Learn the rules of proper Quran recitation through interactive lessons, color-coded text, and audio examples.",
    ar: "تعلّم أحكام تلاوة القرآن الكريم من خلال دروس تفاعلية، ونصوص ملوّنة بأحكام التجويد، وأمثلة صوتية.",
  },
  "home.startLearning": { en: "Start Learning", ar: "ابدأ التعلّم" },
  "home.yourProgress": { en: "Your Progress", ar: "تقدّمك" },
  "home.streak": { en: "Streak", ar: "أيام متتالية" },
  "home.streakDays": { en: "days", ar: "يوم" },
  "home.best": { en: "Best", ar: "الأفضل" },
  "home.learningModules": { en: "Learning Modules", ar: "وحدات التعلّم" },
  "home.learningModulesDesc": {
    en: "From articulation points to stopping rules, covering all essential tajweed topics.",
    ar: "من مخارج الحروف إلى أحكام الوقف، تغطية شاملة لجميع أبواب التجويد الأساسية.",
  },
  "home.colorCodedText": { en: "Color-Coded Text", ar: "نصوص ملوّنة" },
  "home.colorCodedTextDesc": {
    en: "See tajweed rules highlighted in real Quranic text using the standard color-coding system.",
    ar: "شاهد أحكام التجويد مُظلّلة في النص القرآني باستخدام نظام الألوان المعتمد.",
  },
  "home.audioExamples": { en: "Audio Examples", ar: "أمثلة صوتية" },
  "home.audioExamplesDesc": {
    en: "Listen to correct pronunciation from renowned reciters like Al-Husary and Alafasy.",
    ar: "استمع إلى النطق الصحيح من قرّاء مشهورين كالحصري والعفاسي.",
  },
  "home.practiceQuizzes": { en: "Practice Quizzes", ar: "اختبارات تدريبية" },
  "home.practiceQuizzesDesc": {
    en: "Test your knowledge by identifying tajweed rules in real Quranic examples.",
    ar: "اختبر معرفتك بتحديد أحكام التجويد في أمثلة قرآنية حقيقية.",
  },
  "home.progressTracking": { en: "Progress Tracking", ar: "متابعة التقدّم" },
  "home.progressTrackingDesc": {
    en: "Track completed lessons, quiz scores, and maintain your daily practice streak.",
    ar: "تابع الدروس المكتملة، ونتائج الاختبارات، وحافظ على سلسلة تدريبك اليومية.",
  },
  "home.hafsAnAsim": { en: "Hafs 'an 'Asim", ar: "حفص عن عاصم" },
  "home.hafsAnAsimDesc": {
    en: "All rules follow the most widely used Qira'ah globally, with verified scholarly sources.",
    ar: "جميع الأحكام وفق رواية حفص عن عاصم، الأكثر انتشارا في العالم، بمصادر علمية موثّقة.",
  },
  "home.learningPath": { en: "Learning Path", ar: "مسار التعلّم" },

  // Learn page
  "learn.title": { en: "Learn Tajweed", ar: "تعلّم التجويد" },
  "learn.titleAr": { en: "تعلّم التجويد", ar: "تعلّم التجويد" },
  "learn.description": {
    en: "Structured curriculum for learning Tajweed rules, ordered from foundational to advanced.",
    ar: "منهج منظّم لتعلّم أحكام التجويد، مرتّب من الأساسيات إلى المتقدّم.",
  },
  "learn.lessons": { en: "lessons", ar: "دروس" },
  "learn.estimatedHours": { en: "estimated hours", ar: "ساعات تقديرية" },
  "learn.prerequisite": { en: "Prerequisite", ar: "متطلب سابق" },
  "learn.locked": { en: "Locked", ar: "مقفل" },
  "learn.completed": { en: "Completed", ar: "مكتمل" },
  "learn.locked.body": {
    en: "This module is locked. Complete a lesson in the prerequisite module to unlock it.",
    ar: "هذه الوحدة مقفلة. أكمل درسا واحدا من الوحدة السابقة لفتحها.",
  },
  "learn.locked.startPrereq": { en: "Start the prerequisite", ar: "ابدأ الوحدة السابقة" },
  "learn.locked.backToList": { en: "Back to all modules", ar: "العودة إلى جميع الوحدات" },
  "learn.practiceThisModule": { en: "Practice this module", ar: "تدرّب على هذه الوحدة" },

  // Module common
  "module.letters": { en: "Letters", ar: "الحروف" },
  "module.quranicExamples": { en: "Quranic Examples", ar: "أمثلة قرآنية" },
  "module.commonMistakes": { en: "Common Mistakes", ar: "أخطاء شائعة" },
  "module.mnemonic": { en: "Mnemonic", ar: "طريقة الحفظ" },
  "module.quickReference": { en: "Quick Reference", ar: "مرجع سريع" },
  "module.rule": { en: "Rule", ar: "الحكم" },
  "module.count": { en: "Count", ar: "العدد" },
  "module.definition": { en: "Definition", ar: "التعريف" },
  "module.duration": { en: "Duration", ar: "المدة" },

  // Module descriptions (Arabic translations for learning-path.json descriptions)
  "module.makharij.desc": {
    en: "Where each Arabic letter originates in the mouth, throat, and nasal cavity. The foundation of all tajweed.",
    ar: "مواضع خروج كل حرف من حروف اللغة العربية من الفم والحلق والتجويف الأنفي. أساس علم التجويد.",
  },
  "module.noon-sakinah.desc": {
    en: "The four rules governing the pronunciation of Noon with sukoon and Tanween: Izhar, Idgham, Iqlab, and Ikhfaa.",
    ar: "الأحكام الأربعة التي تحكم نطق النون الساكنة والتنوين: الإظهار، والإدغام، والإقلاب، والإخفاء.",
  },
  "module.meem-sakinah.desc": {
    en: "The three rules for Meem with sukoon: Ikhfaa Shafawi, Idgham Shafawi, and Izhar Shafawi.",
    ar: "الأحكام الثلاثة للميم الساكنة: الإخفاء الشفوي، والإدغام الشفوي، والإظهار الشفوي.",
  },
  "module.ghunnah.desc": {
    en: "The nasal sound produced when pronouncing Noon and Meem Mushaddad, held for 2 beats.",
    ar: "الصوت الذي يخرج من الخيشوم عند نطق النون والميم المشددتين، ومقداره حركتان.",
  },
  "module.qalqalah.desc": {
    en: "The bouncing or echoing sound applied to five specific letters when they have sukoon.",
    ar: "الاضطراب الذي يحدث عند نطق خمسة أحرف مخصوصة وهي ساكنة.",
  },
  "module.madd.desc": {
    en: "Rules for elongating vowel sounds, from natural 2-beat madd to obligatory 6-beat madd.",
    ar: "أحكام إطالة الصوت بحرف من حروف المد، من المد الطبيعي (حركتان) إلى المد اللازم (ست حركات).",
  },
  "module.laam-raa.desc": {
    en: "Sun and Moon letters (Shamsiyyah/Qamariyyah), plus when Raa is heavy or light.",
    ar: "الحروف الشمسية والقمرية، وأحكام تفخيم وترقيق حرف الراء.",
  },
  "module.tafkheem-tarqeeq.desc": {
    en: "Which letters are always heavy (Tafkheem), always light (Tarqeeq), or variable depending on context.",
    ar: "الحروف المفخّمة دائما، والمرقّقة دائما، والمتردّدة بين التفخيم والترقيق حسب السياق.",
  },
  "module.waqf.desc": {
    en: "Symbols and rules for where to stop, pause, or continue when reciting the Quran.",
    ar: "الرموز والأحكام المتعلّقة بمواضع الوقف والابتداء عند تلاوة القرآن الكريم.",
  },

  // Module introductions (Arabic translations)
  "module.makharij.intro": {
    en: "Makhraj (plural: Makharij) refers to the specific point in the mouth, throat, or nasal cavity where a letter's sound originates. According to Imam Ibn Al-Jazari and Imam Al-Khalil, there are 17 articulation points grouped into 5 major regions.",
    ar: "المخرج هو المكان الذي يخرج منه الحرف في الفم أو الحلق أو التجويف الأنفي. وعند الإمام ابن الجزري والإمام الخليل، هناك سبعة عشر مخرجا مقسّمة إلى خمس مناطق رئيسية.",
  },
  "module.noon-sakinah.intro": {
    en: "Noon Sakinah is the letter Noon with a sukoon. Tanween is the double vowel marks at the end of nouns, producing the same 'n' sound. Both follow the same four rules depending on the letter that comes after them.",
    ar: "النون الساكنة هي النون الخالية من الحركة. والتنوين هو نون ساكنة زائدة تلحق آخر الاسم لفظا لا خطا. وكلاهما يخضع لأربعة أحكام بحسب الحرف الذي يأتي بعدهما.",
  },
  "module.meem-sakinah.intro": {
    en: "Meem Sakinah is the letter Meem with a sukoon. It has three rules based on the letter that follows it.",
    ar: "الميم الساكنة هي الميم الخالية من الحركة. ولها ثلاثة أحكام بحسب الحرف الذي يأتي بعدها.",
  },
  "module.ghunnah.intro": {
    en: "Ghunnah is the nasal sound that resonates in the nasal cavity when pronouncing certain letters. It is an inherent quality of the letters Noon and Meem. The duration and prominence of Ghunnah varies depending on the tajweed rule being applied.",
    ar: "الغنّة هي صوت أغنّ يخرج من الخيشوم. وهي صفة لازمة للنون والميم. ويختلف مقدارها ودرجة وضوحها بحسب حكم التجويد المطبّق.",
  },
  "module.qalqalah.intro": {
    en: "Qalqalah means disturbance or vibration. It is the slight bouncing sound that occurs when pronouncing any of the five Qalqalah letters with a sukoon.",
    ar: "القلقلة لغة: الاضطراب. واصطلاحا: اضطراب المخرج عند النطق بالحرف الساكن حتى يُسمع له نبرة قوية. وحروفها خمسة مجموعة في: قطب جد.",
  },
  "module.madd.intro": {
    en: "Madd means to extend or elongate. In tajweed, it refers to lengthening the sound of a vowel letter. There are three letters of Madd: Alif, Waw, and Yaa, each with specific conditions.",
    ar: "المد لغة: الزيادة. واصطلاحا: إطالة الصوت بحرف من حروف المد الثلاثة: الألف، والواو، والياء، كل منها بشروط معيّنة.",
  },
  "module.laam-raa.intro": {
    en: "The rules of Laam and Raa govern specific pronunciation behaviors. Laam Al-Ta'reef determines assimilation with sun and moon letters. Raa rules determine whether it is pronounced heavy or light based on surrounding vowels and letters.",
    ar: "تحكم أحكام اللام والراء سلوكيات نطقية محدّدة. لام التعريف تحدّد الإدغام مع الحروف الشمسية والإظهار مع القمرية. وأحكام الراء تحدّد تفخيمها أو ترقيقها بحسب الحركات والحروف المحيطة.",
  },
  "module.tafkheem-tarqeeq.intro": {
    en: "Tafkheem (heaviness) and Tarqeeq (lightness) refer to the thickness or thinness of a letter's sound. Seven letters are always heavy, most letters are always light, and a few vary depending on their position and surrounding vowels.",
    ar: "التفخيم والترقيق: التفخيم هو تسمين الحرف، والترقيق هو تنحيفه. سبعة أحرف مفخّمة دائما، وأغلب الحروف مرقّقة دائما، وبعضها يتردّد بين التفخيم والترقيق حسب موقعه وحركته.",
  },
  "module.waqf.intro": {
    en: "Waqf means stopping the recitation at the end of a word, with the intention of continuing. The Quran uses specific symbols to guide the reciter on where to stop, where stopping is preferred, and where it should be avoided.",
    ar: "الوقف هو قطع الصوت عن آخر الكلمة زمنا يتنفّس فيه القارئ عادة بنية استئناف القراءة. ويستخدم المصحف رموزا محدّدة لتوجيه القارئ إلى مواضع الوقف المناسبة.",
  },

  // Makharij specific
  "makharij.diagram": { en: "Articulation Points Diagram", ar: "مخطط مخارج الحروف" },
  "makharij.selectRegion": { en: "Select a region to see its articulation points.", ar: "اختر منطقة لعرض مخارجها." },
  "makharij.articulationPoints": { en: "articulation point(s)", ar: "مخرج/مخارج" },
  "makharij.allLetters": { en: "All Letters by Region", ar: "جميع الحروف حسب المنطقة" },
  "makharij.totalPoints": { en: "Total articulation points", ar: "إجمالي المخارج" },
  "makharij.totalLetters": { en: "Total letters", ar: "إجمالي الحروف" },

  // Ghunnah specific
  "ghunnah.definition": { en: "Definition", ar: "التعريف" },
  "ghunnah.duration": { en: "Duration", ar: "المدة" },
  "ghunnah.ranking": { en: "Ghunnah Prominence Ranking", ar: "مراتب الغنّة" },
  "ghunnah.rank": { en: "Rank", ar: "المرتبة" },
  "ghunnah.context": { en: "Context", ar: "السياق" },
  "ghunnah.prominence": { en: "Prominence", ar: "الدرجة" },
  "ghunnah.beats": { en: "beats", ar: "حركات" },

  // Qalqalah specific
  "qalqalah.fiveLetters": { en: "The Five Qalqalah Letters", ar: "حروف القلقلة الخمسة" },

  // Madd specific
  "madd.letters": { en: "Madd Letters", ar: "حروف المد" },
  "madd.summaryTable": { en: "Summary Table", ar: "جدول ملخّص" },
  "madd.type": { en: "Type", ar: "النوع" },
  "madd.beats": { en: "Beats", ar: "الحركات" },
  "madd.trigger": { en: "Trigger", ar: "السبب" },
  "madd.obligation": { en: "Obligation", ar: "الحكم" },

  // Laam-Raa specific
  "laamRaa.example": { en: "Example", ar: "مثال" },
  "laamRaa.note": { en: "Note", ar: "ملاحظة" },
  "laamRaa.heavyRaa": { en: "Raa with Tafkheem (Heavy)", ar: "الراء المفخّمة" },
  "laamRaa.lightRaa": { en: "Raa with Tarqeeq (Light)", ar: "الراء المرقّقة" },
  "laamRaa.condition": { en: "Condition", ar: "الشرط" },
  "laamRaa.result": { en: "Result", ar: "النتيجة" },

  // Tafkheem specific
  "tafkheem.alwaysHeavy": { en: "Always Heavy Letters", ar: "الحروف المفخّمة دائما" },
  "tafkheem.alwaysLight": { en: "Always Light Letters", ar: "الحروف المرقّقة دائما" },
  "tafkheem.variable": { en: "Variable Letters", ar: "الحروف المتردّدة" },
  "tafkheem.levels": { en: "Levels of Tafkheem", ar: "مراتب التفخيم" },

  // Waqf specific
  "waqf.symbols": { en: "Waqf Symbols", ar: "رموز الوقف" },
  "waqf.stoppingEffects": { en: "Effects When Stopping", ar: "أحكام عند الوقف" },

  // Practice
  "practice.title": { en: "Practice", ar: "تدريب" },
  "practice.description": {
    en: "Test your tajweed knowledge by identifying rules in Quranic examples.",
    ar: "اختبر معرفتك بالتجويد من خلال تحديد الأحكام في أمثلة قرآنية.",
  },
  "practice.filterByModule": { en: "Filter by Module", ar: "تصفية حسب الوحدة" },
  "practice.allModules": { en: "All Modules", ar: "جميع الوحدات" },
  "practice.startQuiz": { en: "Start Quiz", ar: "ابدأ الاختبار" },
  "practice.quizComplete": { en: "Quiz Complete", ar: "اكتمل الاختبار" },
  "practice.correct": { en: "correct", ar: "إجابة صحيحة" },
  "practice.score": { en: "Score", ar: "النتيجة" },
  "practice.tryAgain": { en: "Try Again", ar: "حاول مجددا" },
  "practice.nextQuestion": { en: "Next Question", ar: "السؤال التالي" },
  "practice.questionOf": { en: "Question {current} of {total}", ar: "السؤال {current} من {total}" },
  "practice.identifyRule": { en: "What tajweed rule applies to the highlighted word?", ar: "ما حكم التجويد المطبّق على الكلمة المظلّلة؟" },
  "practice.wellDone": { en: "Well done. You have demonstrated strong knowledge.", ar: "أحسنت. لقد أظهرت معرفة جيّدة." },
  "practice.goodProgress": { en: "Good progress. Continue reviewing the material.", ar: "تقدّم جيّد. واصل مراجعة المادة." },
  "practice.keepReviewing": { en: "Review the rules above and try again.", ar: "راجع الأحكام أعلاه وحاول مجددا." },
  "practice.streak": { en: "Practice Streak", ar: "سلسلة التدريب" },
  "practice.currentStreak": { en: "Current Streak", ar: "السلسلة الحالية" },
  "practice.longestStreak": { en: "Longest Streak", ar: "أطول سلسلة" },
  "practice.loadingQuestion": { en: "Loading next question...", ar: "جاري تحميل السؤال التالي..." },
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

  // Progress
  "progress.title": { en: "Your Progress", ar: "تقدّمك" },
  "progress.description": { en: "Track your tajweed learning journey.", ar: "تابع مسيرتك في تعلّم التجويد." },
  "progress.overall": { en: "Overall Completion", ar: "نسبة الإكمال الكلّية" },
  "progress.streak": { en: "Streak", ar: "أيام متتالية" },
  "progress.current": { en: "Current", ar: "الحالية" },
  "progress.longest": { en: "Longest", ar: "الأطول" },
  "progress.moduleProgress": { en: "Module Progress", ar: "تقدّم الوحدات" },
  "progress.latestQuiz": { en: "Latest quiz", ar: "آخر اختبار" },
  "progress.quizHistory": { en: "Quiz History", ar: "سجلّ الاختبارات" },
  "progress.module": { en: "Module", ar: "الوحدة" },
  "progress.date": { en: "Date", ar: "التاريخ" },
  "progress.resetProgress": { en: "Reset Progress", ar: "إعادة تعيين التقدّم" },
  "progress.resetDescription": {
    en: "Clear all completed lessons, quiz scores, and streaks. Your settings will be kept.",
    ar: "مسح جميع الدروس المكتملة ونتائج الاختبارات والسلاسل. سيتم الاحتفاظ بإعداداتك.",
  },
  "progress.areYouSure": { en: "Are you sure?", ar: "هل أنت متأكد؟" },
  "progress.yesReset": { en: "Yes, reset", ar: "نعم، إعادة تعيين" },
  "progress.cancel": { en: "Cancel", ar: "إلغاء" },
  "progress.resetAll": { en: "Reset All Progress", ar: "إعادة تعيين كل التقدّم" },
  "progress.days": { en: "days", ar: "يوم" },
  "progress.noQuizzes": { en: "No quizzes taken yet.", ar: "لم يتم إجراء اختبارات بعد." },

  // Settings
  "settings.title": { en: "Settings", ar: "الإعدادات" },
  "settings.description": { en: "Customize your learning experience.", ar: "خصّص تجربتك التعليمية." },
  "settings.reciter": { en: "Reciter", ar: "القارئ" },
  "settings.playbackSpeed": { en: "Playback Speed", ar: "سرعة التشغيل" },
  "settings.fontSize": { en: "Arabic Font Size", ar: "حجم الخط العربي" },
  "settings.displayOptions": { en: "Display Options", ar: "خيارات العرض" },
  "settings.showTransliteration": { en: "Show Transliteration", ar: "إظهار النقحرة" },
  "settings.showTranslation": { en: "Show Translation", ar: "إظهار الترجمة" },
  "settings.darkMode": { en: "Dark Mode", ar: "الوضع الداكن" },
  "settings.language": { en: "Language", ar: "اللغة" },
  "settings.normal": { en: "Normal", ar: "عادي" },
  "settings.large": { en: "Large", ar: "كبير" },
  "settings.xlarge": { en: "Extra Large", ar: "كبير جدا" },
  "settings.recitersLoading": { en: "Updating list…", ar: "جاري التحديث…" },
  "settings.recitersDefault": { en: "default", ar: "افتراضي" },
  "settings.recitersHelp": {
    en: "More reciters appear once the editions list loads. Husary stays the default for teaching-style learning.",
    ar: "تظهر مزيد من القرّاء بعد تحميل قائمة الإصدارات. يبقى الحصري الافتراضي للتعلّم على نمط المعلّم.",
  },

  // Common
  "common.progress": { en: "Progress", ar: "التقدّم" },
  "common.previous": { en: "Previous", ar: "السابق" },
  "common.next": { en: "Next", ar: "التالي" },
  "common.markComplete": { en: "Mark as Complete", ar: "وضع علامة إتمام" },
  "common.completed": { en: "Completed", ar: "مكتمل" },
  "common.loading": { en: "Loading...", ar: "جاري التحميل..." },
  "common.error": { en: "An error occurred.", ar: "حدث خطأ." },
  "common.colorLegend": { en: "Tajweed Color Legend", ar: "دليل ألوان التجويد" },
  "common.bismillah": { en: "In the name of Allah, the Most Gracious, the Most Merciful", ar: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ" },

  // Not found
  "notFound.title": { en: "Page Not Found", ar: "الصفحة غير موجودة" },
  "notFound.description": { en: "The page you are looking for does not exist.", ar: "الصفحة التي تبحث عنها غير موجودة." },
  "notFound.goHome": { en: "Go Home", ar: "العودة للرئيسية" },
  "notFound.startLearning": { en: "Start Learning", ar: "ابدأ التعلّم" },

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

  // Mushaf reader (Phase 3)
  "mushaf.title": { en: "Mushaf", ar: "المصحف" },
  "mushaf.subtitle": { en: "The complete Quran with tajweed coloring", ar: "المصحف الشريف ملوّنا بأحكام التجويد" },
  "mushaf.openReader": { en: "Open Mushaf", ar: "افتح المصحف" },
  "mushaf.continueReading": { en: "Continue from page {page}", ar: "تابع من الصفحة {page}" },
  "mushaf.surahIndex": { en: "Surah Index", ar: "فهرس السور" },
  "mushaf.juzIndex": { en: "Juz Index", ar: "فهرس الأجزاء" },
  "mushaf.bookmarks": { en: "Bookmarks", ar: "المفضلة" },
  "mushaf.tapToHear": { en: "Tap to hear this verse", ar: "اضغط لسماع الآية" },
  "mushaf.pageNumber": { en: "Page", ar: "الصفحة" },
  "mushaf.previousPage": { en: "Previous page", ar: "الصفحة السابقة" },
  "mushaf.nextPage": { en: "Next page", ar: "الصفحة التالية" },
  "mushaf.juz": { en: "Juz", ar: "الجزء" },
  "mushaf.versesCount": { en: "{count} verses", ar: "{count} آية" },
  "mushaf.revealedIn.makkah": { en: "Makki", ar: "مكية" },
  "mushaf.revealedIn.madinah": { en: "Madani", ar: "مدنية" },
  "mushaf.searchSurah": { en: "Search surah", ar: "ابحث عن سورة" },
  "mushaf.bookmarkAdd": { en: "Add bookmark", ar: "إضافة إلى المفضلة" },
  "mushaf.bookmarkRemove": { en: "Remove bookmark", ar: "إزالة من المفضلة" },
  "mushaf.loadFailed": { en: "Could not load this page. Please try again.", ar: "تعذّر تحميل الصفحة. الرجاء المحاولة مرة أخرى." },
  "mushaf.retry": { en: "Retry", ar: "إعادة المحاولة" },
  "mushaf.allSurahs": { en: "All surahs", ar: "جميع السور" },
  "mushaf.makkahSurahs": { en: "Makkah surahs", ar: "السور المكية" },
  "mushaf.madinahSurahs": { en: "Madinah surahs", ar: "السور المدنية" },
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
