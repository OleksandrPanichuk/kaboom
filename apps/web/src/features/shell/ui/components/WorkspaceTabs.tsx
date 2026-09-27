import { cn } from "cn";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import type { WorkspaceTab } from "@/features/shell/typedefs";

interface WorkspaceTabsProps {
  tabs: WorkspaceTab[];
  value: string;
  onValueChange: (value: string) => void;
}

export function WorkspaceTabs({
  tabs,
  value,
  onValueChange,
}: WorkspaceTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(String(next))}
      className="@container flex h-full min-h-0 flex-col gap-0"
    >
      <TabsList
        variant="line"
        className="h-10 w-full shrink-0 justify-start gap-1 border-b px-2"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            title={tab.label}
            className="flex-none px-2"
          >
            <tab.icon aria-hidden="true" />
            <span
              className={cn(
                tabs.length > 4 &&
                  tab.id !== value &&
                  "sr-only @[34rem]:not-sr-only",
              )}
            >
              {tab.label}
            </span>
            {tab.badge ? (
              <span className="min-w-5 rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-800 tabular-nums">
                {tab.badge}
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.id}
          value={tab.id}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
