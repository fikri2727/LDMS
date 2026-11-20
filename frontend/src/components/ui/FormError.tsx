"use client";

import { useEffect, useRef, useState } from "react";
import { isActionError } from "@/lib/actionError";

/** Put submitted values back into a form (React clears a `<form action>` after every submit). */
function refill(form: HTMLFormElement, data: FormData) {
  const seen = new Map<string, number>();
  for (const el of Array.from(form.elements)) {
    const f = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (!f.name || f.type === "file" || f.type === "submit" || f.type === "button") continue;
    const values = data.getAll(f.name).map(String);
    if (f instanceof HTMLInputElement && (f.type === "checkbox" || f.type === "radio")) {
      f.checked = values.includes(f.value);
    } else if (f instanceof HTMLSelectElement && f.multiple) {
      for (const o of Array.from(f.options)) o.selected = values.includes(o.value);
    } else {
      const i = seen.get(f.name) ?? 0; // several fields can share a name
      seen.set(f.name, i + 1);
      if (i < values.length) f.value = values[i];
    }
  }
}

/**
 * For a plain `<form action={...}>`: runs the server action and keeps the message it returns when the
 * backend refuses (see lib/actionError.ts), with what the user typed put back. Redirects on success
 * work as before.
 *
 *   const { formAction, formRef, error } = useFormAction(action);
 *   <form ref={formRef} action={formAction}><FormError error={error} />...</form>
 */
export function useFormAction(action: (formData: FormData) => unknown) {
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function formAction(formData: FormData) {
    setError(null);
    const r = await action(formData); // a guarded server action, or a plain function
    if (!isActionError(r)) return;
    setError(r.actionError);
    // React resets the form when this submit finishes; put the values back right after that reset.
    const form = formRef.current;
    if (form) {
      const onReset = () => setTimeout(() => refill(form, formData));
      form.addEventListener("reset", onReset, { once: true });
      setTimeout(() => form.removeEventListener("reset", onReset), 2000); // not a later, deliberate reset
    }
  }

  return { formAction, formRef, error };
}

/** The message box shown at the top of a form; scrolls itself into view when it appears. */
export function FormError({ error }: { error: string | null }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);
  if (!error) return null;
  return (
    <p
      ref={ref}
      role="alert"
      className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 whitespace-pre-wrap"
    >
      {error}
    </p>
  );
}
