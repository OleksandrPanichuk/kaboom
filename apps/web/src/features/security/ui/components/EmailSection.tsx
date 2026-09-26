import { Badge } from "@/components/ui/Badge";
import { useCurrentUser } from "@/features/auth";

import { ChangeEmailForm } from "./ChangeEmailForm";
import { SettingsSection } from "./SettingsSection";

interface EmailSectionProps {
  hasPassword: boolean;
}

export function EmailSection({ hasPassword }: EmailSectionProps) {
  const user = useCurrentUser();

  return (
    <SettingsSection
      title="Email"
      description="Where we send links, and what you sign in with."
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{user.email}</span>
        <Badge variant={user.emailVerified ? "secondary" : "outline"}>
          {user.emailVerified ? "Verified" : "Not verified"}
        </Badge>
      </div>
      <ChangeEmailForm hasPassword={hasPassword} />
    </SettingsSection>
  );
}
