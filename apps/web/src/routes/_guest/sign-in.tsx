import { createFileRoute } from "@tanstack/react-router";

import { safeRedirect, SignInView, validateAuthSearch } from "@/features/auth";

export const Route = createFileRoute("/_guest/sign-in")({
  validateSearch: validateAuthSearch,
  component: SignInRoute,
});

function SignInRoute() {
  const { redirect: target, error } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <SignInView
      redirect={target}
      oauthError={error}
      onSignedIn={() => void navigate({ href: safeRedirect(target) })}
    />
  );
}
