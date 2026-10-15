import { LEGAL } from "@/features/marketing/constants";

const { product, contactEmail } = LEGAL;

export const COOKIES_CONTENT = `
${product} uses only the cookies and browser storage it needs to work. There are no advertising or tracking cookies.

## Cookies we set

- **Session cookie:** keeps you signed in. It is set when you sign in, cannot be read by scripts on the page, and expires when your session does or when you sign out.

## Browser storage

These preferences are kept in your browser's local storage and never sent to us:

- your theme (light, dark or the system's);
- whether the sidebar is open;
- how you last arranged the design workspace.

## Third parties

- **Stripe** sets its own cookies on the checkout and billing pages, to process payments and prevent fraud.
- **Google reCAPTCHA** sets its own cookies on the sign-up and sign-in forms, to tell people from automated abuse.

Their own policies explain what these cookies do.

## Your choices

You can block or delete cookies in your browser's settings. Without the session cookie you cannot stay signed in. Questions go to ${contactEmail}.
`.trim();
