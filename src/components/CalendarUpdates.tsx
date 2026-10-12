import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { GatheringChange } from "../lib/calendarChanges";
export function CalendarUpdates({
  onChange,
}: {
  onChange: (changes: GatheringChange[]) => void;
}) {
  const changes = useQuery(api.calendarRecords.changes);
  useEffect(() => {
    if (changes) onChange(changes);
  }, [changes, onChange]);
  return null;
}
