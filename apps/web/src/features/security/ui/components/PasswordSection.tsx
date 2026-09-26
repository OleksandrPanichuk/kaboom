import { ChangePasswordForm } from "./ChangePasswordForm";
import { SetPasswordForm } from "./SetPasswordForm";
import { SettingsSection } from "./SettingsSection";

interface PasswordSectionProps {
  hasPassword: boolean;
}

export function PasswordSection({ hasPassword }: PasswordSectionProps) {
  return hasPassword ? (
    <SettingsSection
      title="Password"
      description="Changing it signs out every other device."
      icon={KeyRound}
    >
      <ChangePasswordForm />
    </SettingsSection>
  ) : (
    <SettingsSection
      title="Password"
      description="You sign in with Google or GitHub. Add a password to sign in with your email as well."
      icon={KeyRound}
    >
      <SetPasswordForm />
    </SettingsSection>
  );
}
import { KeyRound } from "lucide-react";
