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
  "offline.notice": { en: "Offline — opened pages still work", ar: "غير متصل — الصفحات المفتوحة تعمل" },

  // Home page
  "home.title": { en: "Tajweed Trainer", ar: "معلّم التجويد" },
  "home.subtitle": {
    en: "Learn the rules of proper Quran recitation through interactive lessons, color-coded text, and audio examples.",
    ar: "تعلّم أحكام تلاوة القرآن الكريم من خلال دروس تفاعلية، ونصوص ملوّنة بأحكام التجويد، وأمثلة صوتية.",
  },
  "home.startLearning": { en: "Start Learning", ar: "ابدأ التعلّم" },
  "home.yourProgress": { en: "Your Progress", ar: "تقدّمك" },
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
  "home.dailyVerse": { en: "Verse of the day", ar: "آية اليوم" },
  "home.resumeReading": { en: "Continue reading", ar: "تابع القراءة" },
  "home.resumePage": { en: "Page", ar: "صفحة" },

  // Learn page
  "learn.title": { en: "Learn Tajweed", ar: "تعلّم التجويد" },
  "learn.description": {
    en: "Structured curriculum for learning Tajweed rules, ordered from foundational to advanced.",
    ar: "منهج منظّم لتعلّم أحكام التجويد، مرتّب من الأساسيات إلى المتقدّم.",
  },
  "learn.lessons": { en: "lessons", ar: "دروس" },
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
  "practice.identifyRule": { en: "What tajweed rule applies to the highlighted word?", ar: "ما حكم التجويد المطبّق على الكلمة المظلّلة؟" },
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
    en: "Mastery is drawn from your quiz scores and spaced-review progress — nothing is sent anywhere.",
    ar: "يُحتسب الإتقان من درجات اختباراتك وتقدّم المراجعة المتباعدة — لا يُرسل أي شيء لأي جهة.",
  },
  "mastery.level.untouched": { en: "Not started", ar: "لم يبدأ" },
  "mastery.level.started": { en: "Started", ar: "بدأت" },
  "mastery.level.practiced": { en: "Practiced", ar: "تمرّنت" },
  "mastery.level.strong": { en: "Strong", ar: "متقَن" },
  "mastery.best": { en: "Best", ar: "الأفضل" },
  "mastery.due": { en: "due", ar: "مستحقّ" },
  "mastery.mastered": { en: "mastered", ar: "متقَن" },
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
  "settings.darkMode": { en: "Dark Mode", ar: "الوضع الداكن" },
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
    en: "Reciters come from the Quran.com recitations, grouped by style. Al-Husary (muallim) is the default for teaching-style learning.",
    ar: "القرّاء من تسجيلات Quran.com، مرتّبون حسب النمط. والحصري (المعلّم) هو الافتراضي للتعلّم على نمط المعلّم.",
  },

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
  "common.bismillah": { en: "In the name of Allah, the Most Gracious, the Most Merciful", ar: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ" },

  // Audio player
  "player.play": { en: "Play", ar: "تشغيل" },
  "player.pause": { en: "Pause", ar: "إيقاف مؤقت" },
  "player.previous": { en: "Previous verse", ar: "الآية السابقة" },
  "player.next": { en: "Next verse", ar: "الآية التالية" },
  "player.close": { en: "Stop and close player", ar: "إيقاف وإغلاق المشغّل" },
  "player.minimize": { en: "Minimize player", ar: "تصغير المشغّل" },
  "player.expand": { en: "Expand player", ar: "توسيع المشغّل" },
  "player.seek": { en: "Seek", ar: "تغيير الموضع" },
  "player.speed": { en: "Playback speed", ar: "سرعة التشغيل" },
  "player.playVerse": { en: "Play this verse", ar: "تشغيل هذه الآية" },
  "player.playFromHere": { en: "Play from here", ar: "تشغيل من هنا" },
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
  "player.collapsePlayer": { en: "Collapse player", ar: "طيّ المشغّل" },
  "player.expandPlayer": { en: "Expand player", ar: "توسيع المشغّل" },
  "player.closePlayer": { en: "Close player", ar: "إغلاق المشغّل" },
  "player.grabHandle": { en: "Player controls, drag to expand or collapse", ar: "أدوات المشغّل، اسحب للتوسيع أو الطيّ" },
  "player.tryAgain": { en: "Try again", ar: "إعادة المحاولة" },
  "audio.unavailable": {
    en: "This reciter has no audio for this verse.",
    ar: "لا يتوفّر تسجيل لهذا القارئ في هذه الآية.",
  },
  "audio.changeReciter": { en: "Change reciter", ar: "تغيير القارئ" },
  "lesson.openInReader": { en: "Open in reader", ar: "افتح في المصحف" },

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
  "mushaf.drill": { en: "Highlight one rule", ar: "تمييز حكم واحد" },
  "mushaf.drillOff": { en: "All rules", ar: "كل الأحكام" },
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

  // Speech (TTS for prompts only — NOT for Quranic text)
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

  // Reading depth (translation and tafsir, fetched from the verified API)
  "reading.showTafsir": { en: "Show tafsir", ar: "إظهار التفسير" },
  "reading.hideTafsir": { en: "Hide tafsir", ar: "إخفاء التفسير" },
  "reading.unavailable": { en: "Could not load — try again from the reader.", ar: "تعذّر التحميل — حاول من القارئ." },
  "reading.noTafsir": { en: "No tafsir available for this verse.", ar: "لا يوجد تفسير لهذه الآية." },
  "reading.wordByWord": { en: "Word by word", ar: "كلمة بكلمة" },
  "reading.noWords": { en: "Word-by-word is unavailable for this verse.", ar: "التحليل كلمة بكلمة غير متاح لهذه الآية." },
  "compare.title": { en: "Compare your recitation", ar: "قارن تلاوتك" },
  "compare.privacy": {
    en: "For your own ears only. Your voice stays on this device — it is never uploaded, saved, or scored.",
    ar: "لسمعك وحدك. صوتك يبقى على هذا الجهاز — لا يُرفع ولا يُحفظ ولا يُقيَّم.",
  },
  "compare.reciter": { en: "The reciter", ar: "القارئ" },
  "compare.yourTake": { en: "Your take", ar: "تلاوتك" },
  "compare.record": { en: "Record", ar: "تسجيل" },
  "compare.recording": { en: "Recording — tap to stop", ar: "جارٍ التسجيل — اضغط للإيقاف" },
  "compare.stop": { en: "Stop", ar: "إيقاف" },
  "compare.playYours": { en: "Play your take", ar: "تشغيل تلاوتك" },
  "compare.playReciter": { en: "Play the reciter", ar: "تشغيل القارئ" },
  "compare.rerecord": { en: "Re-record", ar: "إعادة التسجيل" },
  "compare.denied": {
    en: "Microphone access is blocked. Allow it in your browser's site settings, then try again.",
    ar: "تم حظر الوصول إلى الميكروفون. اسمح به من إعدادات الموقع في متصفحك ثم حاول مجددًا.",
  },
  "compare.tryAgain": { en: "Try again", ar: "حاول مجددًا" },
  "reading.close": { en: "Close", ar: "إغلاق" },
  "settings.readingDepth": { en: "Reading depth", ar: "عمق القراءة" },
  "settings.translationResource": { en: "Translation", ar: "الترجمة" },
  "settings.tafsirResource": { en: "Tafsir", ar: "التفسير" },
  "settings.showWordByWord": { en: "Word-by-word breakdown", ar: "التحليل كلمة بكلمة" },
  "settings.resourceOnline": { en: "More options load when online.", ar: "تظهر خيارات أكثر عند الاتصال." },

  // Onboarding
  "onboarding.title": { en: "Welcome to Tajweed Trainer", ar: "مرحباً بك في مدرّب التجويد" },
  "onboarding.skip": { en: "Skip", ar: "تخطّي" },
  "onboarding.back": { en: "Back", ar: "رجوع" },
  "onboarding.done": { en: "Start", ar: "ابدأ" },
  "onboarding.stepOf": { en: "{current} / {total}", ar: "{current} / {total}" },
  "onboarding.step.mushaf.title": { en: "Read and listen", ar: "اقرأ واستمع" },
  "onboarding.step.mushaf.body": {
    en: "Tap any verse in the mushaf to hear it. A playback surface appears (a side panel on desktop, a bottom sheet on your phone) so you can play one verse, play from a point, or queue several for revision.",
    ar: "انقر أي آية في المصحف لسماعها. تظهر لوحة تشغيل (جانبية على الحاسوب، وورقة سفلية على الهاتف) لتشغيل آية واحدة، أو المتابعة من موضع، أو ضمّ عدة آيات للمراجعة.",
  },
  "onboarding.step.recall.title": { en: "Test yourself", ar: "اختبر نفسك" },
  "onboarding.step.recall.body": {
    en: "Turn on Recall to blur the verses you have memorized, recite them from memory, then reveal each one to check.",
    ar: "شغّل وضع الاستذكار لإخفاء الآيات التي حفظتها، فتتلوها من ذاكرتك، ثم تكشف كلّ آية للتأكد.",
  },
  "onboarding.step.tracker.title": { en: "Track your hifz", ar: "تابع حفظك" },
  "onboarding.step.tracker.body": {
    en: "Mark verses, whole surahs, or a juz as memorized. Your progress page shows the share of the Quran you have memorized and what is due for review.",
    ar: "حدّد آيات أو سورة كاملة أو جزءًا كمحفوظ. تعرض صفحة التقدّم نسبة ما حفظته من القرآن وما حان وقت مراجعته.",
  },
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
