"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useConfirm } from "@/components/ui/ConfirmProvider";

interface StaffOption {
  id: number;
  staffNo: string;
  staffName: string;
}

interface DepartmentOption {
  id: number;
  name: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const confirm = useConfirm();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={async (e) => {
        e.preventDefault();
        const form = e.currentTarget.form;
        if (await confirm("Assign this module to the selected learners?")) {
          form?.requestSubmit();
        }
      }}
      className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
    >
      {pending ? "Assigning..." : "Assign Module"}
    </button>
  );
}

export function AssignForm({
  action,
  staffOptions,
  departmentOptions,
}: {
  action: (formData: FormData) => void;
  staffOptions: StaffOption[];
  departmentOptions: DepartmentOption[];
}) {
  const [target, setTarget] = useState<"individual" | "department" | "all">("individual");
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [staffPicker, setStaffPicker] = useState("");

  function addStaff(value: string) {
    if (value && !selectedStaff.includes(value)) {
      setSelectedStaff((prev) => [...prev, value]);
    }
    setStaffPicker("");
  }

  return (
    <form action={action} className="space-y-6 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Assign To</label>
        <select
          name="target"
          value={target}
          onChange={(e) => setTarget(e.target.value as typeof target)}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="individual">Individual employee(s)</option>
          <option value="department">Department</option>
          <option value="all">All employees</option>
        </select>
      </div>

      {target === "individual" && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Learners</label>
          <SearchableSelect
            name="_staffPicker"
            value={staffPicker}
            onChange={addStaff}
            options={staffOptions
              .filter((s) => !selectedStaff.includes(String(s.id)))
              .map((s) => ({ value: String(s.id), label: `${s.staffName} (${s.staffNo})` }))}
            placeholder="Search staff by name or no..."
            emptyLabel="Select staff..."
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedStaff.map((id) => {
              const s = staffOptions.find((o) => String(o.id) === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary-dark text-xs px-2.5 py-1"
                >
                  {s?.staffName ?? id}
                  <input type="hidden" name="userIds" value={id} />
                  <button
                    type="button"
                    onClick={() => setSelectedStaff((prev) => prev.filter((x) => x !== id))}
                    className="text-primary-dark/60 hover:text-primary-dark"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {target === "department" && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Department</label>
          <select
            name="departmentId"
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select department</option>
            {departmentOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Start Date</label>
          <input
            type="date"
            name="startDate"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Due Date</label>
          <input
            type="date"
            name="dueDate"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" name="mandatory" defaultChecked />
        Mandatory
      </label>

      <SubmitButton />
    </form>
  );
}
