import { useEffect, useEffectEvent, useRef, useState } from "react";

import { FieldDescription, FieldError } from "@/components/ui/Field";
import { challengeSiteKey, loadRecaptcha } from "@/features/auth/utils";

interface CaptchaChallengeProps {
  onSolved: (token: string) => void;
}

export function CaptchaChallenge({ onSolved }: CaptchaChallengeProps) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const siteKey = challengeSiteKey();
  const solved = useEffectEvent((token: string) => onSolved(token));

  useEffect(() => {
    const element = container.current;

    if (!siteKey || !element) return;

    const host = document.createElement("div");
    let active = true;

    element.append(host);

    loadRecaptcha()
      .then((grecaptcha) => {
        if (!active) return;

        grecaptcha.render(host, {
          sitekey: siteKey,
          callback: (token) => solved(token),
          "error-callback": () => setFailed(true),
        });
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      host.remove();
    };
  }, [siteKey]);

  if (!siteKey) {
    return (
      <FieldError>
        The captcha needs one more check, and it is not set up here.
      </FieldError>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-zinc-50/70 p-3">
      <FieldDescription>One more check before we continue.</FieldDescription>
      <div ref={container} />
      {failed ? (
        <FieldError>
          The captcha could not load. Reload and try again.
        </FieldError>
      ) : null}
    </div>
  );
}
