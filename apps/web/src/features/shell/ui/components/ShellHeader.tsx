import { Separator } from "@/components/ui/Separator";
import { SidebarTrigger } from "@/components/ui/Sidebar";
import { useActiveNavItem } from "@/features/shell/hooks";

export function ShellHeader() {
  const active = useActiveNavItem();

  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur sm:px-4">
      <SidebarTrigger className="-ml-1 size-9" aria-label="Toggle navigation" />
      {active ? (
        <>
          <Separator
            orientation="vertical"
            className="mr-1 data-vertical:h-4 data-vertical:self-center"
          />
          <p className="min-w-0 truncate text-sm font-medium">{active.label}</p>
        </>
      ) : null}
    </header>
  );
}
