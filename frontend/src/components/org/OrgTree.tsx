"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import {
  createDivision,
  updateDivision,
  deleteDivision,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  assignHod,
  createSection,
  updateSection,
  deleteSection,
} from "@/app/(app)/organization/actions";
import { useConfirm } from "@/components/ui/ConfirmProvider";

interface StaffOption {
  id: number;
  staffNo: string;
  staffName: string;
  departmentId: number | null;
}

interface SectionData {
  id: number;
  name: string;
  shortName: string | null;
}

interface DepartmentData {
  id: number;
  name: string;
  shortName: string | null;
  hodUserId: number | null;
  sections: SectionData[];
}

interface DivisionData {
  id: number;
  name: string;
  shortName: string | null;
  departments: DepartmentData[];
}

function NameShortForm({
  initialName = "",
  initialShortName = "",
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initialName?: string;
  initialShortName?: string;
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const confirm = useConfirm();
  return (
    <form
      action={onSubmit}
      className="flex items-center gap-2 flex-1"
      onSubmit={() => onCancel?.()}
    >
      <input
        name="name"
        defaultValue={initialName}
        placeholder="Name"
        required
        className="flex-1 min-w-0 rounded-xl border border-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <input
        name="shortName"
        defaultValue={initialShortName}
        placeholder="Abbrev."
        className="w-24 rounded-xl border border-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        type="submit"
        onClick={async (e) => {
          e.preventDefault();
          const form = e.currentTarget.form;
          if (await confirm(`${submitLabel}?`)) {
            form?.requestSubmit();
          }
        }}
        className="rounded-xl bg-primary-dark text-white px-2 py-1 text-xs font-medium hover:bg-primary"
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

function SectionRow({
  section,
  onError,
}: {
  section: SectionData;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  if (editing) {
    return (
      <li className="flex items-center py-1.5 pl-6 pr-2">
        <NameShortForm
          initialName={section.name}
          initialShortName={section.shortName ?? ""}
          submitLabel="Save"
          onCancel={() => setEditing(false)}
          onSubmit={(fd) => startTransition(async () => {
            await updateSection(section.id, fd);
            setEditing(false);
          })}
        />
      </li>
    );
  }

  return (
    <li className="ml-6 mb-1.5 flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors group">
      <span className="text-text-primary">
        {section.name}
        {section.shortName && <span className="text-text-muted ml-1.5">({section.shortName})</span>}
      </span>
      <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)} className="p-1 text-text-muted hover:text-primary-dark">
          <Pencil size={14} />
        </button>
        <button
          disabled={pending}
          onClick={async () => {
            if (await confirm(`Delete section "${section.name}"?`)) {
              startTransition(async () => {
                try {
                  await deleteSection(section.id);
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

function DepartmentBlock({
  department,
  staffOptions,
  onError,
}: {
  department: DepartmentData;
  staffOptions: StaffOption[];
  onError: (message: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  const deptStaff = staffOptions.filter((s) => s.departmentId === department.id);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1.5 text-text-muted"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {editing ? (
          <NameShortForm
            initialName={department.name}
            initialShortName={department.shortName ?? ""}
            submitLabel="Save"
            onCancel={() => setEditing(false)}
            onSubmit={(fd) => startTransition(async () => {
              await updateDepartment(department.id, fd);
              setEditing(false);
            })}
          />
        ) : (
          <>
            <span className="flex-1 text-sm font-medium text-text-primary">
              {department.name}
              {department.shortName && (
                <span className="text-text-muted font-normal ml-1.5">({department.shortName})</span>
              )}
            </span>

            <form
              action={(fd) => startTransition(() => assignHod(department.id, fd))}
              className="flex items-center gap-1.5 mr-2"
            >
              <select
                key={department.hodUserId ?? "none"}
                name="hodUserId"
                defaultValue={department.hodUserId ?? ""}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="text-xs rounded-xl border border-border px-1.5 py-1 max-w-[160px] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">No HOD assigned</option>
                {deptStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.staffName} ({s.staffNo})
                  </option>
                ))}
              </select>
            </form>

            <button onClick={() => setEditing(true)} className="p-1 text-text-muted hover:text-primary-dark">
              <Pencil size={14} />
            </button>
            <button
              disabled={pending}
              onClick={async () => {
                if (await confirm(`Delete department "${department.name}" and all its sections?`)) {
                  startTransition(async () => {
                    try {
                      await deleteDepartment(department.id);
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
          </>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border pb-2">
          <ul className="pt-1.5">
            {department.sections.map((s) => (
              <SectionRow key={s.id} section={s} onError={onError} />
            ))}
          </ul>

          {addingSection ? (
            <div className="pl-6 pr-2 pt-1">
              <NameShortForm
                submitLabel="Add"
                onCancel={() => setAddingSection(false)}
                onSubmit={(fd) => startTransition(async () => {
                  await createSection(department.id, fd);
                  setAddingSection(false);
                })}
              />
            </div>
          ) : (
            <button
              onClick={() => setAddingSection(true)}
              className="flex items-center gap-1 text-xs text-primary-dark hover:text-primary pl-6 pr-2 pt-1"
            >
              <Plus size={13} /> Add section
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function OrgTree({
  divisions,
  staffOptions,
}: {
  divisions: DivisionData[];
  staffOptions: StaffOption[];
}) {
  const [editingDivision, setEditingDivision] = useState<number | null>(null);
  const [addingDept, setAddingDept] = useState<number | null>(null);
  const [addingDivision, setAddingDivision] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Manage divisions, departments, sections, and department heads (HOD).
        </p>
        {!addingDivision && (
          <button
            onClick={() => setAddingDivision(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary-dark text-white text-sm font-medium px-3 py-1.5 hover:bg-primary"
          >
            <Plus size={15} /> Add Division
          </button>
        )}
      </div>

      {addingDivision && (
        <div className="rounded-xl border border-border p-3 bg-primary/10">
          <NameShortForm
            submitLabel="Add Division"
            onCancel={() => setAddingDivision(false)}
            onSubmit={(fd) => startTransition(async () => {
              await createDivision(fd);
              setAddingDivision(false);
            })}
          />
        </div>
      )}

      <div className="space-y-3">
        {divisions.map((division) => (
          <div key={division.id} className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="flex items-center justify-between bg-primary/10 px-4 py-2.5">
              {editingDivision === division.id ? (
                <NameShortForm
                  initialName={division.name}
                  initialShortName={division.shortName ?? ""}
                  submitLabel="Save"
                  onCancel={() => setEditingDivision(null)}
                  onSubmit={(fd) => startTransition(async () => {
                    await updateDivision(division.id, fd);
                    setEditingDivision(null);
                  })}
                />
              ) : (
                <>
                  <span className="text-primary-dark font-semibold text-sm">
                    {division.name}
                    {division.shortName && (
                      <span className="text-primary-dark/60 font-normal ml-1.5">({division.shortName})</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingDivision(division.id)}
                      className="p-1 text-primary-dark/70 hover:text-primary-dark"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      disabled={pending}
                      onClick={async () => {
                        if (await confirm(`Delete division "${division.name}" and everything under it?`)) {
                          startTransition(async () => {
                            try {
                              await deleteDivision(division.id);
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Something went wrong.");
                            }
                          });
                        }
                      }}
                      className="p-1 text-primary-dark/70 hover:text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </>
              )}
            </div>

            <div className="p-3 space-y-2">
              {division.departments.map((dept) => (
                <DepartmentBlock key={dept.id} department={dept} staffOptions={staffOptions} onError={setError} />
              ))}

              {addingDept === division.id ? (
                <div className="rounded-xl border border-border p-2.5">
                  <NameShortForm
                    submitLabel="Add Department"
                    onCancel={() => setAddingDept(null)}
                    onSubmit={(fd) => startTransition(async () => {
                      await createDepartment(division.id, fd);
                      setAddingDept(null);
                    })}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setAddingDept(division.id)}
                  className="flex items-center gap-1.5 text-sm text-primary-dark hover:text-primary px-1"
                >
                  <Plus size={14} /> Add Department
                </button>
              )}
            </div>
          </div>
        ))}

        {divisions.length === 0 && !addingDivision && (
          <p className="text-sm text-text-muted text-center py-8">
            No divisions yet. Click &quot;Add Division&quot; to get started.
          </p>
        )}
      </div>
    </div>
  );
}
