"use client";

import { useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, ImagePlus, X } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmProvider";

const CERTIFICATE_PRESETS = ["1", "2", "3", "4", "5", "6", "7", "10"].map((id) => ({
  id,
  src: `/certificate-presets/${id}.png`,
}));

interface CategoryOption {
  id: number;
  name: string;
}

interface ModuleInitial {
  title?: string;
  categoryId?: number | null;
  description?: string | null;
  objectives?: string | null;
  passThreshold?: number;
  certificateBackgroundName?: string | null;
}

function CertificatePresetPicker({
  selectedPreset,
  loadingPreset,
  onChoose,
  onClose,
}: {
  selectedPreset: string | null;
  loadingPreset: string | null;
  onChoose: (preset: { id: string; src: string }) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[count-up-fade_0.2s_ease-out_forwards]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-surface shadow-2xl p-5 animate-[count-up-fade_0.2s_ease-out_forwards]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Choose a Certificate Design</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {CERTIFICATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChoose(preset)}
              disabled={loadingPreset === preset.id}
              className={`relative aspect-[3/2] rounded-xl border-2 overflow-hidden transition-colors disabled:opacity-60 ${
                selectedPreset === preset.id ? "border-primary" : "border-border hover:border-gray-300"
              }`}
            >
              <Image src={preset.src} alt="" fill sizes="220px" className="object-cover" unoptimized />
              {selectedPreset === preset.id && (
                <span className="absolute top-1.5 right-1.5 rounded-full bg-primary-dark text-white p-1">
                  <Check size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const confirm = useConfirm();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={async (e) => {
        e.preventDefault();
        const form = e.currentTarget.form;
        const message = label === "Save Changes" ? "Save changes to this module?" : "Create this module?";
        if (await confirm(message)) form?.requestSubmit();
      }}
      className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

export function ModuleForm({
  action,
  initial,
  submitLabel,
  categories,
}: {
  action: (formData: FormData) => void;
  initial?: ModuleInitial;
  submitLabel: string;
  categories: CategoryOption[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function choosePreset(preset: { id: string; src: string }) {
    setLoadingPreset(preset.id);
    try {
      const res = await fetch(preset.src);
      const blob = await res.blob();
      const file = new File([blob], `certificate-preset-${preset.id}.png`, { type: blob.type || "image/png" });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (fileInputRef.current) fileInputRef.current.files = dataTransfer.files;
      setSelectedPreset(preset.id);
    } finally {
      setLoadingPreset(null);
      setPickerOpen(false);
    }
  }

  const selectedPresetSrc = CERTIFICATE_PRESETS.find((p) => p.id === selectedPreset)?.src;

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Module Title</label>
        <input
          name="title"
          defaultValue={initial?.title}
          required
          placeholder="e.g. Working at Heights Safety"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Category</label>
        <select
          name="categoryId"
          defaultValue={initial?.categoryId ?? ""}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
        <textarea
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={3}
          placeholder="What will learners be able to do after completing this module?"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Learning Objectives</label>
        <textarea
          name="objectives"
          defaultValue={initial?.objectives ?? ""}
          rows={4}
          placeholder={"One objective per line, e.g.\nUnderstand working-at-height hazards.\nIdentify appropriate fall protection equipment."}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-text-muted mt-1">One objective per line.</p>
      </div>

      <div className="max-w-xs">
        <label className="block text-sm font-medium text-text-secondary mb-1">Pass Threshold (%)</label>
        <input
          type="number"
          name="passThreshold"
          defaultValue={initial?.passThreshold ?? 80}
          min={0}
          max={100}
          required
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Certificate Background <span className="text-text-muted font-normal">(optional)</span>
        </label>
        {initial?.certificateBackgroundName && (
          <div className="flex items-center gap-2 mb-2 text-sm text-text-secondary">
            <span>Current file: {initial.certificateBackgroundName}</span>
            <label className="flex items-center gap-1 text-xs text-red-600">
              <input type="checkbox" name="removeCertificateBackground" /> Remove
            </label>
          </div>
        )}

        <div className="flex items-center gap-3 mb-3">
          {selectedPresetSrc && (
            <div className="relative w-16 aspect-[3/2] rounded-xl border-2 border-primary overflow-hidden shrink-0">
              <Image src={selectedPresetSrc} alt="" fill sizes="64px" className="object-cover" unoptimized />
            </div>
          )}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface text-sm font-medium px-3 py-1.5 text-text-secondary hover:bg-gray-50 transition-colors"
          >
            <ImagePlus size={15} /> {selectedPresetSrc ? "Change Preset Design" : "Choose a Preset Design"}
          </button>
        </div>

        {pickerOpen && (
          <CertificatePresetPicker
            selectedPreset={selectedPreset}
            loadingPreset={loadingPreset}
            onChoose={choosePreset}
            onClose={() => setPickerOpen(false)}
          />
        )}

        <p className="text-xs text-text-muted mb-1">Or upload your own image:</p>
        <input
          ref={fileInputRef}
          type="file"
          name="certificateBackground"
          accept="image/*"
          onChange={() => setSelectedPreset(null)}
          className="w-full text-sm text-text-secondary file:mr-3 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary-dark file:px-3 file:py-1.5 file:text-sm"
        />
        <p className="text-xs text-text-muted mt-1">
          Used as the background for this module&apos;s completion certificate. Leave blank for the default design.
        </p>
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
