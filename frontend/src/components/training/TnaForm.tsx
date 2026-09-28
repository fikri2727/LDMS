"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import {
  TNA_SECTIONS,
  TNA_SKILL_LEVELS,
  TNA_TRAINING_TYPE_LABELS,
  TNA_MONTHS,
  TNA_MAX_TASKS_PER_SECTION,
  isGrouped,
  defaultTnaRow as emptyRow,
  type TnaOptionGroup,
  type TnaSectionKey,
  type TnaRowState,
  type TnaFormState,
} from "@/lib/tna-options";
import { useConfirm } from "@/components/ui/ConfirmProvider";

export type { TnaRowState, TnaFormState };

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
        if (await confirm(`${label} this TNA record?`)) {
          form?.requestSubmit();
        }
      }}
      className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 transition-colors"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

function TrainingSelect({
  options,
  value,
  onChange,
}: {
  options: string[] | TnaOptionGroup[];
  value: string;
  onChange: (v: string) => void;
}) {
  // A saved item may reference a training that an admin has since renamed/removed
  // from the catalogue — keep it selectable so the historical value still displays.
  const known = isGrouped(options) ? options.flatMap((g) => g.options) : options;
  const missing = value && !known.includes(value) ? value : null;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="w-full rounded-xl border border-border px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="" disabled>
        Select training
      </option>
      {missing && <option value={missing}>{missing} (no longer in catalogue)</option>}
      {isGrouped(options)
        ? options.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </optgroup>
          ))
        : options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
    </select>
  );
}

function SectionTable({
  options,
  rows,
  readOnly,
  onChange,
}: {
  options: string[] | TnaOptionGroup[];
  rows: TnaRowState[];
  readOnly: boolean;
  onChange: (rows: TnaRowState[]) => void;
}) {
  function updateRow(idx: number, patch: Partial<TnaRowState>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() {
    if (rows.length >= TNA_MAX_TASKS_PER_SECTION) {
      alert("You can add up to 3 task only.");
      return;
    }
    const last = rows[rows.length - 1];
    if (last && (!last.problem.trim() || !last.training)) {
      alert("Please complete previous task details!");
      return;
    }
    onChange([...rows, emptyRow()]);
  }

  function removeRow(idx: number) {
    onChange(rows.filter((_, i) => i !== idx));
  }

  return (
    <div className="mb-3">
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted italic mb-2">No task added for this section.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border mb-2">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 font-medium w-8">No.</th>
                <th className="px-3 py-2 font-medium min-w-[200px]">Problem Statement</th>
                <th className="px-3 py-2 font-medium min-w-[220px]">Training Required</th>
                <th className="px-3 py-2 font-medium w-32">Skills Target</th>
                <th className="px-3 py-2 font-medium w-32">Skills Current</th>
                <th className="px-3 py-2 font-medium w-16">Gap</th>
                <th className="px-3 py-2 font-medium w-44">How Will This Be Achieved?</th>
                <th className="px-3 py-2 font-medium w-28">When</th>
                {!readOnly && <th className="px-3 py-2 font-medium w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, idx) => {
                const gap = row.target - row.current;
                return (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-text-secondary align-top">{idx + 1}</td>
                    <td className="px-3 py-2 align-top">
                      <textarea
                        value={row.problem}
                        onChange={(e) => updateRow(idx, { problem: e.target.value })}
                        required
                        disabled={readOnly}
                        rows={2}
                        className="w-full rounded-xl border border-border px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <fieldset disabled={readOnly} className="space-y-1.5">
                        <TrainingSelect
                          options={options}
                          value={row.training}
                          onChange={(v) => updateRow(idx, { training: v })}
                        />
                        {row.training === "OTHERS" && (
                          <input
                            value={row.trainingOther}
                            onChange={(e) => updateRow(idx, { trainingOther: e.target.value })}
                            required
                            placeholder="Please specify"
                            disabled={readOnly}
                            className="w-full rounded-xl border border-border px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50"
                          />
                        )}
                      </fieldset>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <select
                        value={row.target}
                        onChange={(e) => updateRow(idx, { target: Number(e.target.value) })}
                        disabled={readOnly}
                        className="w-full rounded-xl border border-border px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50"
                      >
                        {TNA_SKILL_LEVELS.map((l) => (
                          <option key={l.value} value={l.value}>
                            {l.value}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <select
                        value={row.current}
                        onChange={(e) => updateRow(idx, { current: Number(e.target.value) })}
                        disabled={readOnly}
                        className="w-full rounded-xl border border-border px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50"
                      >
                        {TNA_SKILL_LEVELS.map((l) => (
                          <option key={l.value} value={l.value}>
                            {l.value}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 align-top text-center font-medium text-text-primary">{gap}</td>
                    <td className="px-3 py-2 align-top">
                      <select
                        value={row.type}
                        onChange={(e) => updateRow(idx, { type: e.target.value })}
                        disabled={readOnly}
                        className="w-full rounded-xl border border-border px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50"
                      >
                        {Object.entries(TNA_TRAINING_TYPE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <select
                        value={row.month}
                        onChange={(e) => updateRow(idx, { month: e.target.value })}
                        disabled={readOnly}
                        className="w-full rounded-xl border border-border px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50"
                      >
                        {TNA_MONTHS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </td>
                    {!readOnly && (
                      <td className="px-3 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="text-rose-500 hover:text-rose-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 text-xs font-medium text-primary-dark hover:text-primary"
        >
          <Plus size={13} /> Add Task
        </button>
      )}
    </div>
  );
}

export function TnaForm({
  action,
  initial,
  readOnly,
  submitLabel,
  trainingOptions,
}: {
  action?: (formData: FormData) => void;
  initial: TnaFormState;
  readOnly: boolean;
  submitLabel: string;
  trainingOptions: Record<TnaSectionKey, string[] | TnaOptionGroup[]>;
}) {
  const [state, setState] = useState<TnaFormState>(initial);

  const payload = useMemo(() => {
    const items: {
      section: TnaSectionKey;
      order: number;
      problemStatement: string;
      training: string;
      targetSkill: number;
      currentSkill: number;
      trainingType: string;
      monthApply: string;
    }[] = [];
    for (const s of TNA_SECTIONS) {
      state[s.key].forEach((row, idx) => {
        items.push({
          section: s.key,
          order: idx,
          problemStatement: row.problem,
          training: row.training === "OTHERS" ? row.trainingOther : row.training,
          targetSkill: row.target,
          currentSkill: row.current,
          trainingType: row.type,
          monthApply: row.month,
        });
      });
    }
    return JSON.stringify(items);
  }, [state]);

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="payload" value={payload} />

      <div className="bg-surface rounded-2xl border border-border p-4 shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Level Description</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-1.5 font-medium w-16">Level</th>
                <th className="px-3 py-1.5 font-medium w-40">Description</th>
                <th className="px-3 py-1.5 font-medium">Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TNA_SKILL_LEVELS.map((l) => (
                <tr key={l.value}>
                  <td className="px-3 py-1.5 text-text-primary font-medium">{l.value}</td>
                  <td className="px-3 py-1.5 text-text-primary">{l.label.replace(`${l.value} - `, "")}</td>
                  <td className="px-3 py-1.5 text-text-secondary">{l.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {TNA_SECTIONS.map((s) => (
        <div key={s.key}>
          <h3 className="text-sm font-semibold text-text-primary mb-2">{s.label}</h3>
          <SectionTable
            options={trainingOptions[s.key]}
            rows={state[s.key]}
            readOnly={readOnly}
            onChange={(rows) => setState((prev) => ({ ...prev, [s.key]: rows }))}
          />
        </div>
      ))}

      {!readOnly && <SubmitButton label={submitLabel} />}
    </form>
  );
}
