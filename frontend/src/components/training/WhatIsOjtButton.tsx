"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ArrowDown, ArrowRight, Clock, HelpCircle, X } from "lucide-react";

type Lang = "en" | "bm";
const LANG_KEY = "ldms-ojt-info-lang";
const LangContext = createContext<Lang>("en");

/** Picks the English or Bahasa Melayu text for the language chosen in the popup. */
function useText() {
  const lang = useContext(LangContext);
  return (en: string, bm: string) => (lang === "bm" ? bm : en);
}

/** The "Is it OJT?" decision chart: three yes/no questions, then how to record it. */
const QUESTIONS: { en: string; bm: string; no: string; noBm: string }[] = [
  {
    en: "Did you learn something new for your job?",
    bm: "Adakah anda belajar perkara baru untuk kerja anda?",
    no: "Normal daily work",
    noBm: "Kerja harian biasa",
  },
  {
    en: "Taught at work by a colleague or supervisor?",
    bm: "Diajar di tempat kerja oleh rakan sekerja atau penyelia?",
    no: "Record it as Public, Inhouse or E-Learning",
    noBm: "Rekod sebagai Public, Inhouse atau E-Learning",
  },
  {
    en: "Has a topic, a trainer and a time?",
    bm: "Ada topik, jurulatih dan masa?",
    no: "General meeting",
    noBm: "Mesyuarat biasa",
  },
];

function ChartBox({ text, tone }: { text: string; tone: "question" | "yes" | "no" }) {
  const style = {
    question: "border-border bg-surface text-text-primary",
    yes: "border-primary/40 bg-primary/10 text-primary-dark",
    no: "border-rose-200 bg-rose-50 text-rose-700",
  }[tone];
  return (
    <div className={`rounded-xl border px-3 py-2 text-center text-sm font-semibold ${style}`}>{text}</div>
  );
}

function DownArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-1 py-1 text-xs font-medium text-primary-dark">
      <ArrowDown size={14} /> {label}
    </div>
  );
}

function OjtDecisionChart() {
  const t = useText();
  const yes = t("Yes", "Ya");
  const no = t("No", "Tidak");
  return (
    <div className="rounded-xl border border-border bg-gray-50/60 p-3 sm:p-4">
      {QUESTIONS.map((q) => (
        <div key={q.en}>
          <div className="grid grid-cols-1 items-center gap-1 sm:grid-cols-[1fr_auto_10.5rem] sm:gap-2">
            <ChartBox text={t(q.en, q.bm)} tone="question" />
            <span className="flex items-center justify-center gap-1 text-xs font-medium text-rose-600">
              {no} <ArrowRight size={14} className="hidden sm:block" />
              <ArrowDown size={14} className="sm:hidden" />
            </span>
            <ChartBox text={t(`Not OJT: ${q.no}`, `Bukan OJT: ${q.noBm}`)} tone="no" />
          </div>
          <div className="sm:mr-[12.5rem]">
            <DownArrow label={yes} />
          </div>
        </div>
      ))}
      <div className="sm:mr-[12.5rem]">
        <ChartBox text={t("It's OJT! It counts toward your 16 hours", "Ini OJT! Ia dikira dalam 16 jam anda")} tone="yes" />
        <DownArrow label={t("Record it", "Rekod")} />
        <ChartBox text={t("Did HR or your clerk add you?", "Adakah HR atau kerani sudah tambah nama anda?")} tone="question" />
        <div className="mt-1 grid grid-cols-2 gap-2">
          <div>
            <DownArrow label={yes} />
            <ChartBox text={t("Click Evaluate in My Training", "Klik Evaluate di My Training")} tone="yes" />
          </div>
          <div>
            <DownArrow label={no} />
            <ChartBox text={t("Click Add My OJT in My Training", "Klik Add My OJT di My Training")} tone="yes" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Each item in English, then Bahasa Melayu. */
const EXAMPLES: [string, string][] = [
  [
    "Briefings, such as the MiCare, Insurance Benefit or Office Safety Awareness briefing",
    "Taklimat, contohnya taklimat MiCare, Insurance Benefit atau Office Safety Awareness",
  ],
  [
    "Induction for new joiners: company background, safety briefing and office tour",
    "Induksi pekerja baru: latar belakang syarikat, taklimat keselamatan dan lawatan pejabat",
  ],
  [
    "Learning a machine, tool or system (SAP, Power BI, a new form) from a senior, step by step",
    "Belajar menggunakan mesin, alat atau sistem (SAP, Power BI, borang baru) daripada senior, langkah demi langkah",
  ],
  [
    "Your supervisor teaches you a new SOP or process, such as QC inspection steps",
    "Penyelia mengajar SOP atau proses baru, contohnya langkah pemeriksaan QC",
  ],
  [
    "Knowledge sharing: a colleague shares what they learned at an outside course",
    "Perkongsian ilmu: rakan sekerja berkongsi apa yang dipelajari daripada kursus luar",
  ],
  [
    "Cross-training: learning a colleague's job so you can cover for them",
    "Cross-training: belajar kerja rakan sekerja supaya boleh menggantikan mereka",
  ],
  [
    "Toolbox or safety talks with a clear topic and trainer",
    "Toolbox talk atau taklimat keselamatan yang ada topik dan jurulatih",
  ],
];

const NOT_OJT: [string, string][] = [
  ["Your normal daily work", "Kerja harian biasa"],
  [
    "General meetings with no learning topic, such as a monthly or production meeting",
    "Mesyuarat biasa tanpa topik pembelajaran, contohnya mesyuarat bulanan atau mesyuarat produksi",
  ],
  [
    "Training already recorded as Public, Inhouse or E-Learning (do not record it twice)",
    "Latihan yang sudah direkod sebagai Public, Inhouse atau E-Learning (jangan rekod dua kali)",
  ],
];

const HOW: [string, string][] = [
  [
    "HR or your clerk already added you: find the OJT in My Training and click Evaluate.",
    "HR atau kerani sudah tambah nama anda: cari OJT di My Training dan klik Evaluate.",
  ],
  [
    "Nobody recorded it yet: click Add My OJT and fill in the form. It is saved as Complete straight away.",
    "Belum direkod: klik Add My OJT dan isi borang. Ia terus disimpan sebagai Complete.",
  ],
];

function List({ items, ordered }: { items: [string, string][]; ordered?: boolean }) {
  const t = useText();
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`space-y-2 pl-5 text-sm text-text-primary ${ordered ? "list-decimal" : "list-disc"}`}>
      {items.map(([en, bm]) => (
        <li key={en}>{t(en, bm)}</li>
      ))}
    </Tag>
  );
}

function Heading({ en, bm }: { en: string; bm: string }) {
  const t = useText();
  return <h3 className="text-sm font-semibold text-text-primary mb-2">{t(en, bm)}</h3>;
}

function LangSwitch({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  const options: [Lang, string][] = [
    ["en", "English"],
    ["bm", "Bahasa Melayu"],
  ];
  return (
    <div role="group" aria-label="Language / Bahasa" className="inline-flex rounded-xl border border-border bg-gray-50 p-0.5">
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={lang === value}
          onClick={() => onChange(value)}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
            lang === value ? "bg-primary-dark text-white shadow-sm" : "text-text-muted hover:text-text-primary"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const WHY_16: [string, string][] = [
  [
    "Every staff member must complete at least 16 training hours each year. It is a requirement for all staff.",
    "Setiap staf wajib melengkapkan sekurang-kurangnya 16 jam latihan setiap tahun. Ia syarat untuk semua staf.",
  ],
  [
    "All training types count: Public, Inhouse, OJT and E-Learning.",
    "Semua jenis latihan dikira: Public, Inhouse, OJT dan E-Learning.",
  ],
  [
    "Hours only count when the training is Complete. If HR or your clerk added you, click Evaluate in My Training to complete it.",
    "Jam hanya dikira apabila latihan berstatus Complete. Jika HR atau kerani tambah nama anda, klik Evaluate di My Training untuk melengkapkannya.",
  ],
  [
    "Check Balance Hours to Complete on your Dashboard to see how many hours you still need.",
    "Semak Balance Hours to Complete di Dashboard untuk melihat baki jam yang perlu dicapai.",
  ],
  [
    "Learned something at work this year? Record it as OJT. It adds to your hours.",
    "Ada belajar sesuatu di tempat kerja tahun ini? Rekod sebagai OJT. Ia menambah jam anda.",
  ],
];

/** A smaller popup on top of What is OJT?, explaining the 16-hour yearly requirement. */
function Why16Popup({ onClose }: { onClose: () => void }) {
  const t = useText();
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Why 16 hours?", "Kenapa 16 jam?")}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl bg-surface p-5 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("Close", "Tutup")}
          className="absolute right-3 top-3 rounded-full p-1.5 text-text-muted hover:bg-gray-100"
        >
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 pr-8">
          <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary-dark">
            <span className="text-lg font-bold leading-none">16</span>
            <span className="text-[10px] font-medium leading-none">{t("hours", "jam")}</span>
          </span>
          <h3 className="text-base font-semibold text-text-primary">{t("Why 16 hours?", "Kenapa 16 jam?")}</h3>
        </div>
        <ul className="mt-4 space-y-2 pl-5 text-sm text-text-primary list-disc">
          {WHY_16.map(([en, bm]) => (
            <li key={en}>{t(en, bm)}</li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium px-5 py-2 transition-colors"
          >
            {t("Got it", "Faham")}
          </button>
        </div>
      </div>
    </div>
  );
}

function OjtInfo({
  lang,
  setLang,
  onClose,
  onWhy16,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  onClose: () => void;
  onWhy16: () => void;
}) {
  const t = useText();
  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("Close", "Tutup")}
        className="absolute right-4 top-4 rounded-full p-1.5 text-text-muted hover:bg-gray-100"
      >
        <X size={18} />
      </button>

      <h2 className="text-lg font-semibold text-text-primary pr-8">{t("What is OJT?", "Apa itu OJT?")}</h2>
      <div className="mt-2">
        <LangSwitch lang={lang} onChange={setLang} />
      </div>

      <p className="mt-3 text-sm text-text-primary">
        {t(
          "OJT (On-the-Job Training) is learning at work, during working hours, from a colleague, supervisor or another department. Each OJT counts toward your 16 training hours a year.",
          "OJT (On-the-Job Training) ialah pembelajaran di tempat kerja, semasa waktu kerja, daripada rakan sekerja, penyelia atau jabatan lain. Setiap OJT dikira dalam 16 jam latihan setahun anda.",
        )}
      </p>
      <button
        type="button"
        onClick={onWhy16}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-primary-dark underline underline-offset-2 hover:text-primary"
      >
        <Clock size={15} /> {t("Why 16 hours?", "Kenapa 16 jam?")}
      </button>

      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-text-primary">
        {t(
          "Simple rule: someone taught you something new for your job, with a topic, a trainer and a time.",
          "Peraturan mudah: seseorang mengajar anda perkara baru untuk kerja anda, dengan topik, jurulatih dan masa.",
        )}
      </div>

      <div className="mt-5 space-y-5">
        <section>
          <Heading en="Is it OJT?" bm="Adakah ia OJT?" />
          <OjtDecisionChart />
        </section>
        <section>
          <Heading en="Can be recorded" bm="Boleh direkod" />
          <List items={EXAMPLES} />
        </section>
        <section>
          <Heading en="Not OJT" bm="Bukan OJT" />
          <List items={NOT_OJT} />
        </section>
        <section>
          <Heading en="How to record it" bm="Cara merekod" />
          <List items={HOW} ordered />
        </section>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium px-5 py-2 transition-colors"
        >
          {t("Got it", "Faham")}
        </button>
      </div>
    </>
  );
}

export function WhatIsOjtButton() {
  const [open, setOpen] = useState(false);
  const [why16, setWhy16] = useState(false);
  const [lang, setLangState] = useState<Lang>("en");

  function setLang(l: Lang) {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* storage blocked: the choice lasts until the page reloads */
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (why16) setWhy16(false);
      else setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, why16]);

  function close() {
    setWhy16(false);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          try {
            if (localStorage.getItem(LANG_KEY) === "bm") setLangState("bm");
          } catch {
            /* storage blocked: keep the current language */
          }
          setOpen(true);
        }}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-surface text-sm font-medium px-4 py-2 text-text-secondary hover:bg-gray-50 transition-colors"
      >
        <HelpCircle size={16} /> What is OJT?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={lang === "bm" ? "Apa itu OJT?" : "What is OJT?"}
            lang={lang === "bm" ? "ms" : "en"}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl"
          >
            <LangContext.Provider value={lang}>
              <OjtInfo lang={lang} setLang={setLang} onClose={close} onWhy16={() => setWhy16(true)} />
            </LangContext.Provider>
          </div>
          {why16 && (
            <LangContext.Provider value={lang}>
              <Why16Popup onClose={() => setWhy16(false)} />
            </LangContext.Provider>
          )}
        </div>
      )}
    </>
  );
}
