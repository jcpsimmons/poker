import { useEffect, useRef } from "react";
import { Panel } from "./layout/Panel";
import type { ActivityEntry } from "../lib/activityLogger";

interface TacticalFeedProps {
  activities: ActivityEntry[];
}

export const TacticalFeed = ({ activities }: TacticalFeedProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new activities arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activities]);

  return (
    <Panel 
      title="ACTIVITY LOG" 
      className="w-full md:w-1/2 flex flex-col"
      contentClassName="flex flex-col flex-1 p-0"
    >
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin max-h-[300px]"
      >
        {activities.length === 0 ? (
          <div className="text-xs font-mono text-muted-foreground text-center py-4">
            No activity recorded
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="text-xs font-mono text-foreground leading-relaxed"
            >
              <span className="text-muted-foreground">{activity.formatted}</span>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
};

