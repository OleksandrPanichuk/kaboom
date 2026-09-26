const CAPTCHA_TOKEN_HEADER = "x-captcha-token";
const CAPTCHA_KIND_HEADER = "x-captcha-kind";
const DEVELOPMENT_TOKEN = "captcha-disabled";
const SCRIPT_URL = "https://www.google.com/recaptcha/api.js";

export interface ChallengeWidgetOptions {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
}

interface Grecaptcha {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
  render: (container: HTMLElement, options: ChallengeWidgetOptions) => number;
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

const fromEnv = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined;

const scoreSiteKey = (): string | undefined =>
  fromEnv(import.meta.env.VITE_RECAPTCHA_SITE_KEY);

export const challengeSiteKey = (): string | undefined =>
  fromEnv(import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY);

let loading: Promise<Grecaptcha> | undefined;

export const loadRecaptcha = (): Promise<Grecaptcha> => {
  const render = scoreSiteKey() ?? "explicit";

  loading ??= new Promise<Grecaptcha>((resolve, reject) => {
    const script = document.createElement("script");

    script.src = `${SCRIPT_URL}?render=${encodeURIComponent(render)}`;
    script.async = true;
    script.onerror = () => reject(new Error("The captcha could not load"));
    script.onload = () => {
      const grecaptcha = window.grecaptcha;

      if (!grecaptcha) {
        reject(new Error("The captcha could not load"));

        return;
      }

      grecaptcha.ready(() => resolve(grecaptcha));
    };

    document.head.append(script);
  });

  return loading;
};

export const captchaHeaders = async (
  action: string,
  challengeToken?: string,
): Promise<Record<string, string>> => {
  if (challengeToken) {
    return {
      [CAPTCHA_TOKEN_HEADER]: challengeToken,
      [CAPTCHA_KIND_HEADER]: "challenge",
    };
  }

  const key = scoreSiteKey();

  if (!key) {
    return {
      [CAPTCHA_TOKEN_HEADER]: DEVELOPMENT_TOKEN,
      [CAPTCHA_KIND_HEADER]: "score",
    };
  }

  const grecaptcha = await loadRecaptcha();
  const token = await grecaptcha.execute(key, { action });

  return { [CAPTCHA_TOKEN_HEADER]: token, [CAPTCHA_KIND_HEADER]: "score" };
};
