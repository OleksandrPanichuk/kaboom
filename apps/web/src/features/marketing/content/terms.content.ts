import { LEGAL } from "@/features/marketing/constants";

const { product, operator, address, contactEmail, governingLaw } = LEGAL;

export const TERMS_CONTENT = `
These terms govern your use of ${product}, a platform for practising system design, DevOps and data modelling through challenges, mock interviews and reviews. ${product} is operated by ${operator}, ${address} ("we", "us"). By creating an account or using ${product}, you agree to these terms.

## Your account

You must be at least 16 years old to use ${product}. You are responsible for your account and for keeping your password and the accounts you sign in with (such as Google or GitHub) secure. Tell us at ${contactEmail} if you think someone else has used your account.

You may delete your account at any time from your security settings. Deleting it removes your profile and your work, and ends any subscription you have.

## Using ${product}

You may use ${product} to practise and to learn. You agree not to:

- break or probe the service, its limits or other people's accounts;
- use automated means to create accounts, solve problems or collect content at scale;
- upload anything unlawful, or anything you do not have the right to share;
- harass other people, or post content meant to deceive or mislead.

We may suspend or close an account that breaks these rules.

## Your content

Designs, submissions, problems and other content you create stay yours. You give us a licence to store, process and display it as needed to run ${product}: to score your submissions, to review your interviews, and to show the parts you choose to make public, such as your profile and the problems you publish.

When you publish a community problem, you also allow other users to solve it, and to fork it into problems of their own. When you solve a problem, your best design may be shown to other people who have solved it, without your name or notes.

## AI interviews and reviews

Mock interviews and reviews are produced with the help of an AI model. They are meant for practice and feedback. They can be wrong, and they are not an assessment by a person or an offer of employment.

## Plans and payments

${product} has a free plan and a paid plan, Pro, sold as a monthly subscription or as a one-off lifetime purchase. Prices are shown before you pay, and tax is added or included as shown at checkout. Payments are processed by Stripe.

- **Monthly subscriptions** renew every month until you cancel. When you cancel, you keep Pro until the end of the period you have paid for, and you are not charged again.
- **Lifetime** is a single payment that gives you Pro for as long as ${product} offers it. Buying lifetime while on the monthly plan ends the subscription immediately, without a refund for the current month.
- **Refunds** are at our discretion unless the law where you live requires otherwise. A refunded or charged-back lifetime purchase returns the account to the free plan.

We may change prices for future periods, and will tell you before a change applies to a subscription you already have.

## Availability and changes

We work to keep ${product} available, but it is provided as it is, without a promise that it will always be available or free of errors. We may change or discontinue features. If we discontinue ${product}, we will give reasonable notice.

## Liability

To the extent the law allows, we are not liable for indirect or consequential losses, and our total liability to you is limited to the amount you paid us in the twelve months before the claim. Nothing in these terms limits liability that cannot be limited by law.

## Changes to these terms

We may update these terms. When a change is significant, we will tell you by email or in the app before it takes effect. Continuing to use ${product} after that means you accept the updated terms.

## Law and contact

These terms are governed by the law of ${governingLaw}. Questions about them go to ${contactEmail}.
`.trim();
