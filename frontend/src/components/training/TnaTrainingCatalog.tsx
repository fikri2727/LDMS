"use client";

import { useId, useState, useTransition } from "react";
import { Pencil, Trash2, Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import {
  createTnaTrainingOption,
  updateTnaTrainingOption,
  deleteTnaTrainingOption,
} from "@/app/(app)/tna/actions";
import { TNA_SECTIONS, type TnaSectionKey } from "@/lib/tna-options";
import { useConfirm } from "@/components/ui/ConfirmProvider";

interface OptionRow {
  id: number;
  groupName: string | null;
  label: string;
}

function OptionForm({
  initialLabel = "",
  initialGroupName = "",
  showGroup,
  groupLocked,
  existingGroups,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialLabel?: string;
  initialGroupName?: string;
  showGroup: boolean;
  /** When true, the group is fixed (e.g. adding into a specific group's list) and shown read-only instead of editable. */
  groupLocked?: boolean;
  existingGroups?: string[];
  submitLabel: string;
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
}) {
  const listId = useId();
  return (
    <form action={onSubmit} className="flex items-center gap-2 flex-1 flex-wrap">
      {showGroup && groupLocked ? (
        <>
          <input type="hidden" name="groupName" value={initialGroupName} />
          <span className="w-44 truncate rounded-xl bg-gray-100 px-2 py-1 text-sm text-text-secondary" title={initialGroupName}>
            {initialGroupName}
          </span>
        </>
      ) : (
        showGroup && (
          <>
            <input
              name="groupName"
              defaultValue={initialGroupName}
              placeholder="Group (optional)"
              list={existingGroups?.length ? listId : undefined}
              className="w-44 rounded-xl border border-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {existingGroups && existingGroups.length > 0 && (
              <datalist id={listId}>
                {existingGroups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            )}
          </>
        )
      )}
      <input
        name="label"
        defaultValue={initialLabel}
        placeholder="Training name"
        required
        className="flex-1 min-w-[220px] rounded-xl border border-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        type="submit"
        className="rounded-xl bg-primary-dark text-white px-2.5 py-1 text-xs font-medium hover:bg-primary"
      >
        {submitLabel}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-border px-2 py-1 text-xs text-text-secondary hover:bg-gray-50"
        >
          Cancel
        </button>
      )}
    </form>
  );
}

function OptionRowItem({
  option,
  existingGroups,
  onError,
}: {
  option: OptionRow;
  existingGroups: string[];
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  if (editing) {
    return (
      <li className="flex items-center py-1.5 pl-4 pr-2">
        <OptionForm
          initialLabel={option.label}
          initialGroupName={option.groupName ?? ""}
          showGroup
          existingGroups={existingGroups}
          submitLabel="Save"
          onCancel={() => setEditing(false)}
          onSubmit={(fd) =>
            startTransition(async () => {
              try {
                await updateTnaTrainingOption(option.id, fd);
                setEditing(false);
              } catch (e) {
                onError(e instanceof Error ? e.message : "Something went wrong.");
              }
            })
          }
        />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-1.5 pl-4 pr-2 text-sm hover:bg-gray-50 rounded-xl group">
      <span className="text-text-primary">{option.label}</span>
      <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)} className="p-1 text-text-muted hover:text-primary-dark">
          <Pencil size={14} />
        </button>
        <button
          disabled={pending}
          onClick={async () => {
            if (await confirm(`Remove "${option.label}" from the catalogue?`)) {
              startTransition(async () => {
                try {
                  await deleteTnaTrainingOption(option.id);
                } catch (e) {
                  onError(e instanceof Error ? e.message : "Something went wrong.");
                }
              });
            }
          }}
          className="p-1 text-text-muted hover:text-rose-600"
        >
          <Trash2 size={14} />
        </button>
      </span>
    </li>
  );
}

function GroupAddRow({
  sectionKey,
  group,
  onError,
}: {
  sectionKey: TnaSectionKey;
  /** Empty string = the ungrouped bucket. */
  group: string;
  onError: (message: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  if (adding) {
    return (
      <div className="pl-4 pr-2 pt-1">
        <OptionForm
          initialGroupName={group}
          showGroup={!!group}
          groupLocked={!!group}
          submitLabel="Add"
          onCancel={() => setAdding(false)}
          onSubmit={(fd) =>
            startTransition(async () => {
              try {
                await createTnaTrainingOption(sectionKey, fd);
                setAdding(false);
              } catch (e) {
                onError(e instanceof Error ? e.message : "Something went wrong.");
              }
            })
          }
        />
      </div>
    );
  }

  return (
    <button
      disabled={pending}
      onClick={() => setAdding(true)}
      className="flex items-center gap-1.5 text-xs text-primary-dark hover:text-primary pl-4 pr-2 pt-0.5"
    >
      <Plus size={12} /> Add to {group || "Ungrouped"}
    </button>
  );
}

function SectionBlock({
  sectionKey,
  sectionLabel,
  options,
  onError,
}: {
  sectionKey: TnaSectionKey;
  sectionLabel: string;
  options: OptionRow[];
  onError: (message: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingNewGroup, setAddingNewGroup] = useState(false);
  const [pending, startTransition] = useTransition();

  const groups = new Map<string, OptionRow[]>();
  for (const o of options) {
    const g = o.groupName ?? "";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(o);
  }
  const hasGroups = [...groups.keys()].some((g) => g !== "");
  const existingGroups = [...groups.keys()].filter((g) => g !== "");

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 bg-gray-50 px-4 py-2.5 text-left"
      >
        {expanded ? (
          <ChevronDown size={16} className="text-text-muted shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-text-muted shrink-0" />
        )}
        <span className="text-text-primary font-semibold text-sm">{sectionLabel}</span>
        <span className="text-text-muted text-xs">({options.length} trainings)</span>
      </button>

      {expanded && (
        <div className="p-3 space-y-3">
          {[...groups.entries()].map(([group, rows]) => (
            <div key={group || "_flat"}>
              {hasGroups && (
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1 pl-1">
                  {group || "Ungrouped"}
                </p>
              )}
              <ul>
                {rows.map((o) => (
                  <OptionRowItem key={o.id} option={o} existingGroups={existingGroups} onError={onError} />
                ))}
              </ul>
              {hasGroups && <GroupAddRow sectionKey={sectionKey} group={group} onError={onError} />}
            </div>
          ))}

          {options.length === 0 && (
            <p className="text-sm text-text-muted italic pl-1">No trainings yet for this section.</p>
          )}

          {addingNewGroup ? (
            <div className="rounded-xl border border-border p-2.5">
              <OptionForm
                showGroup
                existingGroups={existingGroups}
                submitLabel="Add"
                onCancel={() => setAddingNewGroup(false)}
                onSubmit={(fd) =>
                  startTransition(async () => {
                    try {
                      await createTnaTrainingOption(sectionKey, fd);
                      setAddingNewGroup(false);
                    } catch (e) {
                      onError(e instanceof Error ? e.message : "Something went wrong.");
                    }
                  })
                }
              />
            </div>
          ) : (
            <button
              disabled={pending}
              onClick={() => setAddingNewGroup(true)}
              className="flex items-center gap-1.5 text-sm text-primary-dark hover:text-primary px-1"
            >
              <Plus size={14} /> {hasGroups ? "Add Training (new group)" : "Add Training"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function TnaTrainingCatalog({ options }: { options: (OptionRow & { section: TnaSectionKey })[] }) {
  const [error, setError] = useState<string | null>(null);

  const bySection = new Map<TnaSectionKey, OptionRow[]>();
  for (const s of TNA_SECTIONS) bySection.set(s.key, []);
  for (const o of options) bySection.get(o.section)?.push(o);

  return (
    <div className="space-y-4">
      {error && (
        <p className="flex items-center justify-between text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {error}
          <button onClick={() => setError(null)} className="p-1 text-rose-400 hover:text-rose-600">
            <X size={14} />
          </button>
        </p>
      )}

      <div className="space-y-3">
        {TNA_SECTIONS.map((s) => (
          <SectionBlock
            key={s.key}
            sectionKey={s.key}
            sectionLabel={s.label}
            options={bySection.get(s.key) ?? []}
            onError={setError}
          />
        ))}
      </div>
    </div>
  );
}
