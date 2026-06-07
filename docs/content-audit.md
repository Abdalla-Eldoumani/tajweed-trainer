# Content accuracy

This file describes the accuracy guarantees behind the tajweed content and how
to check them. It is the companion to `docs/CONTENT.md` (which covers how to
author new questions). Read both before touching anything under `src/data/`.

## What is guaranteed

Two bodies of content carry these guarantees:

- The nine lesson files in `src/data/content/` (`makharij`, `noon-sakinah-tanween`,
  `meem-sakinah`, `qalqalah`, `madd-rules`, `laam-raa-rules`, `tafkheem-tarqeeq`,
  `ghunnah`, `waqf-symbols`).
- The practice question pool in `src/data/questions/` (one file per module).

Every rule, letter set, beat count, and mnemonic in the lessons was checked
against named tajweed authorities and against scholarly consensus for the
recitation of Hafs 'an 'Asim. The headline facts and their references:

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

Every Arabic string is in Uthmani script with full tashkeel. Each lesson example
and each question carries an exact surah:ayah reference. No verse text is written
from memory; it is reused from the reviewed content or pulled from the Quran.com
Foundation API and recorded in `src/data/verse-snapshots.json`.

## The maratib al-ghunnah are grouped, not a 1-to-5 list

The ghunnah lesson presents the ranks of ghunnah as grouped levels, because the
two contexts that sit at the same level carry the same prominence:

1. Most complete (akmal): Noon/Meem Mushaddad and Idgham with ghunnah.
2. Complete (kamilah): Ikhfa Haqiqi, Ikhfa Shafawi, and Iqlab.
3. Incomplete (naqisah): Izhar — only the letter's inherent ghunnah, not prolonged.
4. Most incomplete (anqas): a moving (voweled) noon or meem.

Do not flatten these into a strict 1-to-5 order. Iqlab sits with Ikhfa, not above
it; Idgham with ghunnah sits with the Mushaddad, not below it. See
`ghunnah_prominence_ranking_note` in `src/data/content/ghunnah.json` for the
reference.

## How question Arabic is checked

`scripts/verify-content.mjs` reads every question and confirms its `arabicText`
appears in the authenticated text of the verse it cites. The check folds the
orthographic differences that are not content differences (alif-wasla, the
superscript dagger alif, shadda, and the quranic pause marks in the Uthmani
snapshot versus the plain spelling a question may use), so the same Quranic word
compares equal across the two spellings while a different word or inflection
still does not match.

The structural checks are a hard gate: a question with no valid answer, a
duplicate id, or the wrong option count fails the run. The verse-membership check
is reported as a warning rather than a hard failure, because resolving a mismatch
is an editorial decision about the citation and the immutable verse text, not
something the script may change on its own.

A small set of question fragments raise that warning today. They are real Quran,
written in the simplified spelling rather than the Uthmani of the snapshot, so the
fold does not line them up exactly. They are left as warnings for a maintainer to
reconcile, not silently rewritten. When you add a question, keep the warning count
flat: cite the surah:ayah whose snapshot actually contains your fragment.

## Running the check

```
node scripts/verify-content.mjs
```

It is offline and needs no key. A clean run prints `7/7 checks passed`, the count
of questions whose Arabic was confirmed against its cited verse, and the standing
warning count. Your change should not raise that warning count or fail any
structural check. Run it alongside the type and lint checks before opening a pull
request:

```
npx tsc --noEmit
npm run lint
```
