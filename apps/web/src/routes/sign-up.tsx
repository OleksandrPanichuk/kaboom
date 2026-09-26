import { createFileRoute, redirect } from "@tanstack/react-router";

import {
  currentUserQuery,
  safeRedirect,
  SignUpView,
  validateAuthSearch,
} from "@/features/auth";

export const Route = createFileRoute("/sign-up")({
  validateSearch: validateAuthSearch,
  beforeLoad: async ({ context, search }) => {
    if (await context.queryClient.ensureQueryData(currentUserQuery)) {
      throw redirect({ href: safeRedirect(search.redirect) });
    }
  },
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
