import { createFileRoute, redirect } from "@tanstack/react-router";

import {
  currentUserQuery,
  safeRedirect,
  SignInView,
  validateAuthSearch,
} from "@/features/auth";

export const Route = createFileRoute("/sign-in")({
  validateSearch: validateAuthSearch,
  beforeLoad: async ({ context, search }) => {
    if (await context.queryClient.ensureQueryData(currentUserQuery)) {
      throw redirect({ href: safeRedirect(search.redirect) });
    }
  },
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
