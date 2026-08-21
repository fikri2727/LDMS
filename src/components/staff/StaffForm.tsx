"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { DESIGNATION_LABELS, GENDER_LABELS, ROLE_LABELS } from "@/lib/labels";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useConfirm } from "@/components/ui/ConfirmProvider";

interface SectionOpt {
  id: number;
  name: string;
}
interface DepartmentOpt {
  id: number;
  name: string;
  sections: SectionOpt[];
}
interface DivisionOpt {
  id: number;
  name: string;
  departments: DepartmentOpt[];
}

interface SupervisorOpt {
  id: number;
  staffNo: string;
  staffName: string;
}

interface StaffInitial {
  staffNo?: string;
  staffName?: string;
  email?: string | null;
  gender?: string;
  designation?: string;
  nationality?: string | null;
  divisionId?: number | null;
  departmentId?: number | null;
  sectionId?: number | null;
  supervisorId?: number | null;
  roleType?: string;
  status?: string;
  dateResign?: string | null;
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
        const message =
          label === "Save Changes"
            ? "Save changes to this staff record?"
            : label === "Create Staff"
              ? "Create this staff record?"
              : null;
        if (!message || (await confirm(message))) {
          form?.requestSubmit();
        }
      }}
      className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

export function StaffForm({
  action,
  divisions,
  supervisorOptions,
  initial,
  isNew,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  divisions: DivisionOpt[];
  supervisorOptions: SupervisorOpt[];
  initial?: StaffInitial;
  isNew: boolean;
  submitLabel: string;
}) {
  const [divisionId, setDivisionId] = useState<string>(
    initial?.divisionId ? String(initial.divisionId) : ""
  );
  const [departmentId, setDepartmentId] = useState<string>(
    initial?.departmentId ? String(initial.departmentId) : ""
  );
  const [sectionId, setSectionId] = useState<string>(
    initial?.sectionId ? String(initial.sectionId) : ""
  );
  const [supervisorId, setSupervisorId] = useState<string>(
    initial?.supervisorId ? String(initial.supervisorId) : ""
  );
  const [status, setStatus] = useState<string>(initial?.status ?? "ACTIVE");

  const departments = useMemo(
    () => divisions.find((d) => String(d.id) === divisionId)?.departments ?? [],
    [divisions, divisionId]
  );
  const sections = useMemo(
    () => departments.find((d) => String(d.id) === departmentId)?.sections ?? [],
    [departments, departmentId]
  );

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Staff No.</label>
          <input
            name="staffNo"
            defaultValue={initial?.staffNo}
            disabled={!isNew}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary disabled:bg-gray-100 disabled:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Full Name</label>
          <input
            name="staffName"
            defaultValue={initial?.staffName}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Nationality</label>
          <input
            name="nationality"
            defaultValue={initial?.nationality ?? ""}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Gender</label>
          <select
            name="gender"
            defaultValue={initial?.gender ?? ""}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              Select gender
            </option>
            {Object.entries(GENDER_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Designation</label>
          <select
            name="designation"
            defaultValue={initial?.designation ?? ""}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              Select designation
            </option>
            {Object.entries(DESIGNATION_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">
          Organization
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Division</label>
            <SearchableSelect
              name="divisionId"
              value={divisionId}
              onChange={(v) => {
                setDivisionId(v);
                setDepartmentId("");
                setSectionId("");
              }}
              options={divisions.map((d) => ({ value: String(d.id), label: d.name }))}
              placeholder="Search division..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Department</label>
            <SearchableSelect
              name="departmentId"
              value={departmentId}
              onChange={(v) => {
                setDepartmentId(v);
                setSectionId("");
              }}
              options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
              disabled={!divisionId}
              placeholder="Search department..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Section</label>
            <SearchableSelect
              name="sectionId"
              value={sectionId}
              onChange={setSectionId}
              options={sections.map((s) => ({ value: String(s.id), label: s.name }))}
              disabled={!departmentId}
              placeholder="Search section..."
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">
          Reporting Line
        </h3>
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-text-secondary mb-1">Supervisor</label>
          <SearchableSelect
            name="supervisorId"
            value={supervisorId}
            onChange={setSupervisorId}
            options={supervisorOptions.map((s) => ({
              value: String(s.id),
              label: `${s.staffName} (${s.staffNo})`,
            }))}
            placeholder="Search staff by name or no..."
          />
          <p className="text-xs text-text-muted mt-1">
            This is who performs this staff member&apos;s PME evaluation after training.
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">
          Access
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">System Role</label>
            <select
              name="roleType"
              defaultValue={initial?.roleType ?? "STAFF"}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-1">
              Whether this staff is a Head of Department is set from the Organization page.
            </p>
          </div>

          {!isNew && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ACTIVE">Active</option>
                <option value="RESIGN">Resigned</option>
              </select>
            </div>
          )}
        </div>

        {!isNew && status === "RESIGN" && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-text-secondary mb-1">Date Resigned</label>
            <input
              type="date"
              name="dateResign"
              defaultValue={initial?.dateResign ?? ""}
              className="w-full max-w-xs rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}
      </div>

      {isNew && (
        <p className="text-xs text-text-secondary bg-gray-50 border border-border rounded-xl px-3 py-2">
          New staff are created with the default password <code className="font-mono">P@ss1234</code>.
        </p>
      )}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
