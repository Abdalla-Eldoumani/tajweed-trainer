# Content accuracy

This file owns the accuracy guarantees behind the tajweed content and how to
check them; [CONTENT.md](CONTENT.md) covers authoring. Read both before touching
`src/data/`.

## What is guaranteed

Two bodies of content carry them:

- The nine lesson files in `src/data/content/` (listed in the
  [Files table in content-schema.md](content-schema.md#files)).
- The practice question pool in `src/data/questions/` (one file per module).

Every rule, letter set, beat count, and mnemonic was checked against named tajweed
authorities and scholarly consensus for Hafs 'an 'Asim. Headline facts and
references:

- Izhar is the six throat letters ء ه ع ح غ خ; Idgham is the six of يرملون,
  split into يَنْمُو (with ghunnah) and ل ر (without); Iqlab is the single letter
  ب; Ikhfa is the remaining fifteen. The four يَنْمُو/within-one-word exceptions
  (دُنْيَا، بُنْيَان، صِنْوَان، قِنْوَان) read as Izhar Mutlaq.
- Meem Sakinah has three rules: Ikhfa Shafawi before ب, Idgham Shafawi before م,
  Izhar Shafawi before the other twenty-six.
- Qalqalah is the five letters of قطب جد, taught at three strengths (Sughra,
  Wusta, Kubra).
- Madd counts follow Hafs: Tabee'i 2, Muttasil and Munfasil 4-5, Lazim 6,
  'Arid 2/4/6, Badal 2, Leen 2/4/6 at a stop.
- The always-heavy letters are the seven of isti'la خص ضغط قظ; the laam of the
  name Allah and the letter ra are variable; tafkheem has five degrees
  (the Al-Mutawali maratib).
- The ra heavy/light conditions distinguish an original kasra (light) from the
  temporary kasra on hamzat al-wasl (heavy), as in فِرْعَوْنَ versus ارْجِعُوا.

Every Arabic string is Uthmani with full tashkeel, each with an exact surah:ayah.
Verse text is reused from reviewed content or the Quran.com API (recorded in
`src/data/verse-snapshots.json`), never from memory.

## The maratib al-ghunnah are grouped, not a 1-to-5 list

The ghunnah lesson groups the ranks into levels, because contexts at the same
level carry the same prominence:

1. Most complete (akmal): Noon/Meem Mushaddad and Idgham with ghunnah.
2. Complete (kamilah): Ikhfa Haqiqi, Ikhfa Shafawi, and Iqlab.
3. Incomplete (naqisah): Izhar, only the letter's inherent ghunnah, not prolonged.
4. Most incomplete (anqas): a moving (voweled) noon or meem.

Do not flatten these into a strict 1-to-5 order: Iqlab sits with Ikhfa, not above
it, and Idgham with ghunnah sits with the Mushaddad, not below it. See
`ghunnah_prominence_ranking_note` in `src/data/content/ghunnah.json`.

## How question Arabic is checked

`scripts/verify-content.mjs` reads every question and confirms its `arabicText`
appears in the authenticated text of the cited verse. It folds orthographic
differences that are not content differences (alif-wasla, the superscript dagger
alif, shadda, and Uthmani pause marks versus a plainer spelling), so the same word
compares equal across spellings while a different word or inflection does not.

Structural checks are a hard gate: a question with no valid answer, a duplicate id,
or the wrong option count fails the run. So does a question whose Arabic is not in
the verse it cites. Resolving that is an editorial decision about the citation,
not something the script may change.

A question that cites a verse with no entry in `src/data/verse-snapshots.json`
raises a warning instead, since the script cannot check it offline. When adding a
question, keep the warning count flat: cite a verse that has a snapshot, or add
its snapshot.

## Running the check

```
node scripts/verify-content.mjs
```

Offline, no key. A clean run prints `8/8 checks passed`, the question-pool size,
and the standing warning count; your change should not raise that count or fail a
structural check. Run it with the type and lint checks before a pull request:

```
npx tsc --noEmit
npm run lint
```

## Why these constraints

Tajweed is an oral science with no chain of transmission for synthesized content,
so the verified data is immutable input and the app only renders it (the rule is
in [../README.md](../README.md#how-it-stays-accurate)). That is how the guarantees
above stay honest.
