const CAPTCHA_TOKEN_HEADER = "x-captcha-token";
const CAPTCHA_KIND_HEADER = "x-captcha-kind";
const DEVELOPMENT_TOKEN = "captcha-disabled";

interface Grecaptcha {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

const siteKey = (): string | undefined => {
  const key: unknown = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  return typeof key === "string" && key !== "" ? key : undefined;
};

let loading: Promise<Grecaptcha> | undefined;

const loadRecaptcha = (key: string): Promise<Grecaptcha> => {
  loading ??= new Promise<Grecaptcha>((resolve, reject) => {
    const script = document.createElement("script");

    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`;
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
): Promise<Record<string, string>> => {
  const key = siteKey();

  if (!key) {
    return {
      [CAPTCHA_TOKEN_HEADER]: DEVELOPMENT_TOKEN,
      [CAPTCHA_KIND_HEADER]: "score",
    };
  }

  const grecaptcha = await loadRecaptcha(key);
  const token = await grecaptcha.execute(key, { action });

  return { [CAPTCHA_TOKEN_HEADER]: token, [CAPTCHA_KIND_HEADER]: "score" };
};
