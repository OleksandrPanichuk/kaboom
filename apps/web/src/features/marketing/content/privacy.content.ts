import { LEGAL } from "@/features/marketing/constants";

const { product, operator, address, contactEmail } = LEGAL;

export const PRIVACY_CONTENT = `
This policy explains what ${product} collects about you, why, who it is shared with, and the choices you have. ${product} is operated by ${operator}, ${address}, which is responsible for your data. Write to ${contactEmail} with any question about it.

## What we collect

- **Account details:** your email address, your name, and a hash of your password, or the identity your Google or GitHub account confirms when you sign in with it.
- **Profile:** your handle, display name, bio, links and avatar, if you add them. A public profile is visible to other users.
- **Your work:** designs and their history, challenge submissions and their scores, problems you write, and your mock interviews, including what you and the interviewer said.
- **Sessions:** for each device you sign in on, its IP address, its browser's user agent and when you signed in, so you can see and end your sessions.
- **Billing:** if you buy Pro, your billing name and address, tax ids you add, your plan, and your invoices and payments. Card details are entered into Stripe's form and never reach our servers; we keep only the card's brand and last four digits.
- **Usage:** how many interview turns you use each day, to apply the daily limit.

## Why we use it

- To run your account and sign you in.
- To score your designs, run your mock interviews and write your reviews.
- To show your profile and standing on the leaderboard, if your profile is public.
- To take payments, issue invoices and meet tax and accounting duties.
- To keep ${product} secure, prevent abuse and fix problems.
- To send you the emails the service needs: confirming your address, resetting a password, security notices, review results and billing updates.

## Who we share it with

We use a small number of providers who process data on our behalf:

- **An AI model provider (Anthropic)**, which receives the conversation and the design of a mock interview to run the interviewer and write the review.
- **Stripe**, which processes payments and holds your card details and billing address.
- **Google reCAPTCHA**, which checks sign-up and sign-in forms for automated abuse.
- **Google and GitHub**, only if you choose to sign in with them.
- Hosting, storage and email delivery providers, which store and send data as we instruct them.

We do not sell your data, and we do not share it for advertising.

## How long we keep it

We keep your data while your account exists. When you delete your account, we delete your profile, your work and your sessions. Invoices and payment records are kept for as long as tax and accounting law requires, without your account attached.

## Your choices and rights

You can change your profile, hide it from others, end your sessions and delete your account at any time from the app. Depending on where you live, you may also have the right to access, correct, export or delete your data, and to object to or restrict how we use it. Write to ${contactEmail} to use them, and you may complain to your data protection authority.

## Changes to this policy

We will tell you about significant changes by email or in the app before they apply.
`.trim();
