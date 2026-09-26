import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import type { OAuthProvider } from "../../../typedefs/auth.typedefs";
import { oauthSignInUrl } from "../../../utils/oauthSignInUrl";
import { GitHubIcon } from "./GitHubIcon";
import { GoogleIcon } from "./GoogleIcon";
import { OAUTH_PROVIDERS } from "./OAuthButtons.constants";

const ICONS: Record<OAuthProvider, typeof GoogleIcon> = {
  google: GoogleIcon,
  github: GitHubIcon,
};

interface OAuthButtonsProps {
  redirect: string | undefined;
}

export function OAuthButtons({ redirect }: OAuthButtonsProps) {
  return (
    <div className="flex flex-col gap-2">
      {OAUTH_PROVIDERS.map(({ provider, label }) => {
        const Icon = ICONS[provider];

        return (
          <a
            key={provider}
            href={oauthSignInUrl(provider, redirect)}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            <Icon className="size-4" />
            {label}
          </a>
        );
      })}
    </div>
  );
}
