import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";

import { healthQuery } from "../../api/home.queries";

export function HomeView() {
  const health = useQuery(healthQuery);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-10">
      <h1 className="text-3xl font-semibold tracking-tight">Kaboom</h1>
      <p className="text-muted-foreground">
        API:{" "}
        {health.isPending
          ? "checking…"
          : health.isError
            ? "unreachable"
            : `${health.data.status} (${health.data.environment})`}
      </p>
      <div>
        <Button onClick={() => void health.refetch()}>Check again</Button>
      </div>
    </main>
  );
}
