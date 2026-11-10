"use client";

import { useEffect, useState } from "react";
import { HelpCircle, X } from "lucide-react";

/** Each line in English, with the Bahasa Melayu version below it. */
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

function Line({ en, bm }: { en: string; bm: string }) {
  return (
    <>
      <span className="block text-text-primary">{en}</span>
      <span className="block text-text-muted italic">{bm}</span>
    </>
  );
}

function List({ items, ordered }: { items: [string, string][]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`space-y-2 pl-5 text-sm ${ordered ? "list-decimal" : "list-disc"}`}>
      {items.map(([en, bm]) => (
        <li key={en}>
          <Line en={en} bm={bm} />
        </li>
      ))}
    </Tag>
  );
}

function Heading({ en, bm }: { en: string; bm: string }) {
  return (
    <h3 className="text-sm font-semibold text-text-primary mb-2">
      {en} <span className="font-normal text-text-muted">/ {bm}</span>
    </h3>
  );
}

export function WhatIsOjtButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-surface text-sm font-medium px-4 py-2 text-text-secondary hover:bg-gray-50 transition-colors"
      >
        <HelpCircle size={16} /> What is OJT?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="What is OJT?"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1.5 text-text-muted hover:bg-gray-100"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-semibold text-text-primary pr-8">
              What is OJT? <span className="font-normal text-text-muted">/ Apa itu OJT?</span>
            </h2>
            <div className="mt-3 space-y-1 text-sm">
              <Line
                en="OJT (On-the-Job Training) is learning at work, during working hours, from a colleague, supervisor or another department. Each OJT counts toward your 16 training hours a year."
                bm="OJT ialah pembelajaran di tempat kerja, semasa waktu kerja, daripada rakan sekerja, penyelia atau jabatan lain. Setiap OJT dikira dalam 16 jam latihan setahun anda."
              />
            </div>

            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
              <Line
                en="Simple rule: someone taught you something new for your job, with a topic, a trainer and a time."
                bm="Peraturan mudah: seseorang mengajar anda perkara baru untuk kerja anda, dengan topik, jurulatih dan masa."
              />
            </div>

            <div className="mt-5 space-y-5">
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
                onClick={() => setOpen(false)}
                className="rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium px-5 py-2 transition-colors"
              >
                Got it / Faham
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
