import { createFileRoute } from "@tanstack/react-router";

import { ForgotPasswordView } from "@/features/auth";

export const Route = createFileRoute("/_guest/forgot-password")({
  component: ForgotPasswordRoute,
});

function ForgotPasswordRoute() {
  return <ForgotPasswordView />;
}
