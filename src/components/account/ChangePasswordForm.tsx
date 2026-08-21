"use client";

import { useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { changeOwnPassword } from "@/app/(app)/account/actions";
import { useConfirm } from "@/components/ui/ConfirmProvider";

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
        if (await confirm("Change your password?")) {
          form?.requestSubmit();
        }
      }}
      className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
    >
      {pending ? "Saving..." : "Change Password"}
    </button>
  );
}

export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await changeOwnPassword(formData);
        setSuccess(true);
        formRef.current?.reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4 max-w-sm">
      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
      )}
      {success && (
        <p className="text-sm text-primary-dark bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
          Password changed successfully.
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">New Password</label>
        <input
          type="password"
          name="newPassword"
          autoComplete="new-password"
          required
          minLength={6}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-text-muted mt-1">At least 6 characters.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Confirm New Password</label>
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={6}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
