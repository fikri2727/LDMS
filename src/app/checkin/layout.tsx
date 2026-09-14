import { ConfirmProvider } from "@/components/ui/ConfirmProvider";

export default function CheckinLayout({ children }: { children: React.ReactNode }) {
  return <ConfirmProvider>{children}</ConfirmProvider>;
}
