import { useCurrentUser } from "@/features/auth";

export function HomeView() {
  const user = useCurrentUser();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-6 sm:p-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Hi, {user.name}
        </h1>
        <p className="text-muted-foreground">
          Your designs and interviews will live here.
        </p>
      </div>
    </div>
  );
}
