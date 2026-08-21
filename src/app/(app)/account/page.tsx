import { requireSession } from "@/lib/guard";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";

export default async function AccountPage() {
  const session = await requireSession();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">My Account</h1>
      <p className="text-text-secondary text-sm mt-1 mb-6">
        {session.staffName} ({session.staffNo})
      </p>

      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
        Change Password
      </h3>
      <ChangePasswordForm />
    </div>
  );
}
