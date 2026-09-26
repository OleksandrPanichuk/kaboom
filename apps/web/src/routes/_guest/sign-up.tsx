import { createFileRoute } from "@tanstack/react-router";

import { safeRedirect, SignUpView, validateAuthSearch } from "@/features/auth";

export const Route = createFileRoute("/_guest/sign-up")({
  validateSearch: validateAuthSearch,
  component: SignUpRoute,
});

function SignUpRoute() {
  const { redirect: target } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <SignUpView
      redirect={target}
      onSignedUp={() => void navigate({ href: safeRedirect(target) })}
    />
  );
}
