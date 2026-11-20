/**
 * Server actions and error messages.
 *
 * In a production build, Next.js hides the text of any error a server action throws (the browser only
 * gets "An error occurred in the Server Components render..."). So actions don't throw the backend's
 * message: `guard()` (in lib/api.ts) returns it as data, `{ actionError }`, and the browser calls the
 * action through `unwrap()`, which throws it again as a normal Error there. Errors thrown in the
 * browser keep their text, so every form's existing `catch (err) { setError(err.message) }` works.
 */

export interface ActionError {
  actionError: string;
}

/** What a guarded server action returns: its normal result, or the message to show. */
export type ActionResult<T> = T | ActionError;

export function isActionError(v: unknown): v is ActionError {
  return !!v && typeof v === "object" && typeof (v as ActionError).actionError === "string";
}

/** Browser side: await a guarded server action; a returned message is thrown as an Error. */
export async function unwrap<T>(result: Promise<ActionResult<T>> | ActionResult<T>): Promise<T> {
  const r = await result;
  if (isActionError(r)) throw new Error(r.actionError);
  return r;
}
