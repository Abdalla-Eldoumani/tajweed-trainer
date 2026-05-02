import type { Question } from "@/lib/types";

// Provenance note. Every Arabic and English string in this file is reused
// verbatim from src/data/content/qalqalah.json examples — the maintainer's
// pre-verified content. No verse text was authored from memory or pulled from
// the API for this module; reuse covered all 30 questions. translationEditionId
// is null because the existing translations were authored by the maintainer,
// not pulled from a numbered Quran.com edition. Lesson anchors target ids on
// src/app/learn/qalqalah/page.tsx.
const PROVENANCE = "src/data/content/qalqalah.json";

export const questions: Question[] = [
  // EASY (10) — definitions, basic identification.
  {
    id: "qalqalah-easy-letters-count",
    moduleId: "qalqalah",
    difficulty: "easy",
    prompt: {
      en: "How many qalqalah letters are there?",
      ar: "كم عدد حروف القلقلة؟",
    },
    arabicText: "يَقْطَعُونَ",
    englishGloss: "they cut",
    options: [
      { id: "opt-a", label: { en: "3", ar: "٣" } },
      { id: "opt-b", label: { en: "5", ar: "٥" } },
      { id: "opt-c", label: { en: "6", ar: "٦" } },
      { id: "opt-d", label: { en: "7", ar: "٧" } },
    ],
    correctOptionId: "opt-b",
    explanation: {
      en: "There are five qalqalah letters: ق ط ب ج د. The mnemonic is قُطْبُ جَدٍّ.",
      ar: "حروف القلقلة خمسة: ق ط ب ج د. وضابطها: قُطْبُ جَدٍّ.",
      lessonAnchor: "qalqalah-letters",
    },
    source: { surah: 2, ayah: 27, translationEditionId: null, provenance: PROVENANCE },
  },
  {
    id: "qalqalah-easy-sughra-strength",
    moduleId: "qalqalah",
    difficulty: "easy",
    prompt: {
      en: "How strong should the echo be in Qalqalah Sughra?",
      ar: "ما مقدار القلقلة في القلقلة الصغرى؟",
    },
    arabicText: "يَقْطَعُونَ",
    englishGloss: "they cut",
    options: [
      { id: "opt-a", label: { en: "Subtle and quick", ar: "خفيفة سريعة" } },
      { id: "opt-b", label: { en: "Moderate", ar: "متوسّطة" } },
      { id: "opt-c", label: { en: "The strongest of the three levels", ar: "أقوى المراتب الثلاث" } },
      { id: "opt-d", label: { en: "Always silent", ar: "ساكنة دون قلقلة" } },
    ],
    correctOptionId: "opt-a",
    explanation: {
      en: "Qalqalah Sughra is the lightest level — the echo is subtle and quick because the letter is in the middle of a word.",
      ar: "القلقلة الصغرى هي أخفّ المراتب لأن الحرف يقع في وسط الكلمة، فتكون القلقلة فيها خفيفة سريعة.",
      lessonAnchor: "qalqalah-sughra",
    },
    source: { surah: 2, ayah: 27, translationEditionId: null, provenance: PROVENANCE },
  },
  {
    id: "qalqalah-easy-pure-bounce",
    moduleId: "qalqalah",
    difficulty: "easy",
    prompt: {
      en: "The echo of qalqalah should be a pure bounce. Which sound must be avoided?",
      ar: "قلقلة الحرف يجب أن تكون نبرة خالصة. أيّ صوت يجب اجتنابه؟",
    },
    arabicText: "يَجْعَلُونَ",
    englishGloss: "they make",
    options: [
      { id: "opt-a", label: { en: "Any vowel-like sound (a, i, u)", ar: "أيّ صوت يشبه الفتحة أو الكسرة أو الضمّة" } },
      { id: "opt-b", label: { en: "A subtle echo", ar: "نبرة خفيفة" } },
      { id: "opt-c", label: { en: "A clear pause after the letter", ar: "وقفة واضحة بعد الحرف" } },
      { id: "opt-d", label: { en: "The natural sound of the letter itself", ar: "صوت الحرف الأصلي" } },
    ],
    correctOptionId: "opt-a",
    explanation: {
      en: "Qalqalah must be a pure bounce — adding a vowel-like sound (such as 'ba', 'bu', or 'bi') is a common mistake.",
      ar: "يجب أن تكون القلقلة نبرة خالصة. إلحاق حركة بها كالفتحة أو الكسرة أو الضمّة من الأخطاء الشائعة.",
      lessonAnchor: "qalqalah-mistakes",
    },
    source: { surah: 6, ayah: 136, translationEditionId: null, provenance: PROVENANCE },
  },
  {
    id: "qalqalah-easy-sughra-echo",
    moduleId: "qalqalah",
    difficulty: "easy",
    prompt: {
      en: "The echo of Qalqalah Sughra should be...",
      ar: "صوت القلقلة في القلقلة الصغرى يكون...",
    },
    arabicText: "يَجْعَلُونَ",
    englishGloss: "they make",
    options: [
      { id: "opt-a", label: { en: "Subtle", ar: "خفيفة" } },
      { id: "opt-b", label: { en: "The strongest", ar: "أقوى ما يكون" } },
      { id: "opt-c", label: { en: "Stronger than Kubra", ar: "أقوى من الكبرى" } },
      { id: "opt-d", label: { en: "Identical in strength to Kubra", ar: "مساوية للكبرى في القوّة" } },
    ],
    correctOptionId: "opt-a",
    explanation: {
      en: "The lesson teaches that Qalqalah Sughra has a subtle, quick echo. Making it too strong is a common mistake.",
      ar: "تعلّم القلقلة الصغرى بأنها خفيفة سريعة. والمبالغة فيها من الأخطاء الشائعة.",
      lessonAnchor: "qalqalah-sughra",
    },
    source: { surah: 6, ayah: 136, translationEditionId: null, provenance: PROVENANCE },
  },
  {
    id: "qalqalah-easy-levels-count",
    moduleId: "qalqalah",
    difficulty: "easy",
    prompt: {
      en: "How many levels (degrees) of qalqalah are there?",
      ar: "كم مرتبة للقلقلة؟",
    },
    arabicText: "لَمْ يَلِدْ وَلَمْ يُولَدْ",
    englishGloss: "He neither begets nor was He begotten",
    options: [
      { id: "opt-a", label: { en: "2", ar: "٢" } },
      { id: "opt-b", label: { en: "3", ar: "٣" } },
      { id: "opt-c", label: { en: "4", ar: "٤" } },
      { id: "opt-d", label: { en: "5", ar: "٥" } },
    ],
    correctOptionId: "opt-b",
    explanation: {
      en: "Three levels: Sughra (minor), Wusta (medium), and Kubra (major).",
      ar: "ثلاث مراتب: الصغرى، والوسطى، والكبرى.",
      lessonAnchor: "qalqalah-sughra",
    },
    source: { surah: 112, ayah: 3, translationEditionId: null, provenance: PROVENANCE },
  },
  {
    id: "qalqalah-easy-wusta-strength",
    moduleId: "qalqalah",
    difficulty: "easy",
    prompt: {
      en: "How strong is the echo in Qalqalah Wusta?",
      ar: "ما مقدار القلقلة في القلقلة الوسطى؟",
    },
    arabicText: "لَمْ يَلِدْ وَلَمْ يُولَدْ",
    englishGloss: "He neither begets nor was He begotten",
    options: [
      { id: "opt-a", label: { en: "Moderate", ar: "متوسّطة" } },
      { id: "opt-b", label: { en: "Subtle", ar: "خفيفة" } },
      { id: "opt-c", label: { en: "The strongest", ar: "الأقوى" } },
      { id: "opt-d", label: { en: "Silent", ar: "ساكنة" } },
    ],
    correctOptionId: "opt-a",
    explanation: {
      en: "Qalqalah Wusta is the middle degree — moderate in strength, between Sughra and Kubra.",
      ar: "القلقلة الوسطى متوسّطة بين الصغرى والكبرى.",
      lessonAnchor: "qalqalah-wusta",
    },
    source: { surah: 112, ayah: 3, translationEditionId: null, provenance: PROVENANCE },
  },
  {
    id: "qalqalah-easy-kubra-strength",
    moduleId: "qalqalah",
    difficulty: "easy",
    prompt: {
      en: "Qalqalah Kubra has...",
      ar: "القلقلة الكبرى...",
    },
    arabicText: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ",
    englishGloss: "Say: I seek refuge in the Lord of daybreak",
    options: [
      { id: "opt-a", label: { en: "The strongest, most pronounced echo", ar: "أقوى وأظهر القلقلات" } },
      { id: "opt-b", label: { en: "The subtlest echo", ar: "أخفّ القلقلات" } },
      { id: "opt-c", label: { en: "No echo at all", ar: "بلا قلقلة" } },
      { id: "opt-d", label: { en: "An echo equal to Sughra", ar: "كقلقلة الصغرى تماما" } },
    ],
    correctOptionId: "opt-a",
    explanation: {
      en: "Qalqalah Kubra has the strongest, most pronounced echo. Making it too weak is a common mistake.",
      ar: "القلقلة الكبرى أقوى وأظهر ما تكون. وضعفها من الأخطاء الشائعة.",
      lessonAnchor: "qalqalah-kubra",
    },
    source: { surah: 113, ayah: 1, translationEditionId: null, provenance: PROVENANCE },
  },
  {
    id: "qalqalah-easy-kubra-position",
    moduleId: "qalqalah",
    difficulty: "easy",
    prompt: {
      en: "Qalqalah Kubra applies when the qalqalah letter is...",
      ar: "تقع القلقلة الكبرى عندما يكون حرف القلقلة...",
    },
    arabicText: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ",
    englishGloss: "Say: I seek refuge in the Lord of daybreak",
    options: [
      { id: "opt-a", label: { en: "The last letter of an ayah, or you stop on a word ending with one", ar: "آخر حرف في الآية، أو يُوقف على كلمة تنتهي به" } },
      { id: "opt-b", label: { en: "In the middle of a word", ar: "في وسط الكلمة" } },
      { id: "opt-c", label: { en: "Followed by a fatha", ar: "متبوعا بفتحة" } },
      { id: "opt-d", label: { en: "Preceded by a hamza", ar: "مسبوقا بهمزة" } },
    ],
    correctOptionId: "opt-a",
    explanation: {
      en: "Kubra applies when the qalqalah letter is the last letter of an ayah, or when you stop on a word ending with one of the five qalqalah letters.",
      ar: "تقع القلقلة الكبرى إذا كان حرف القلقلة آخر حرف في الآية أو وُقف على كلمة تنتهي بحرف من حروف القلقلة.",
      lessonAnchor: "qalqalah-kubra",
    },
    source: { surah: 113, ayah: 1, translationEditionId: null, provenance: PROVENANCE },
  },
  {
    id: "qalqalah-easy-non-qalqalah-letter",
    moduleId: "qalqalah",
    difficulty: "easy",
    prompt: {
      en: "Which of these letters is NOT a qalqalah letter?",
      ar: "أيّ هذه الحروف ليس من حروف القلقلة؟",
    },
    arabicText: "تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ",
    englishGloss: "May the hands of Abu Lahab perish, and may he perish",
    options: [
      { id: "opt-a", label: { en: "ق", ar: "ق" } },
      { id: "opt-b", label: { en: "ب", ar: "ب" } },
      { id: "opt-c", label: { en: "س", ar: "س" } },
      { id: "opt-d", label: { en: "د", ar: "د" } },
    ],
    correctOptionId: "opt-c",
    explanation: {
      en: "The five qalqalah letters are ق ط ب ج د (the mnemonic قُطْبُ جَدٍّ). Seen (س) is not among them.",
      ar: "حروف القلقلة خمسة: ق ط ب ج د (وضابطها قُطْبُ جَدٍّ). والسين ليست منها.",
      lessonAnchor: "qalqalah-letters",
    },
    source: { surah: 111, ayah: 1, translationEditionId: null, provenance: PROVENANCE },
  },
  {
    id: "qalqalah-easy-trigger-sukoon",
    moduleId: "qalqalah",
    difficulty: "easy",
    prompt: {
      en: "Qalqalah is triggered when the qalqalah letter has...",
      ar: "تجب القلقلة على الحرف عندما يكون عليه...",
    },
    arabicText: "تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ",
    englishGloss: "May the hands of Abu Lahab perish, and may he perish",
    options: [
      { id: "opt-a", label: { en: "Sukoon", ar: "سكون" } },
      { id: "opt-b", label: { en: "Fatha", ar: "فتحة" } },
      { id: "opt-c", label: { en: "Kasra", ar: "كسرة" } },
      { id: "opt-d", label: { en: "Damma", ar: "ضمّة" } },
    ],
    correctOptionId: "opt-a",
    explanation: {
      en: "Qalqalah only applies when the letter has a sukoon. With a vowel (fatha, kasra, damma), there is no qalqalah.",
      ar: "لا تقع القلقلة إلا على الحرف الساكن من حروفها. أمّا مع الحركة فلا قلقلة.",
      lessonAnchor: "qalqalah-letters",
    },
    source: { surah: 111, ayah: 1, translationEditionId: null, provenance: PROVENANCE },
  },
];
