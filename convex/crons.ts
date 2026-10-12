import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.daily(
  "Extend approved household dues horizon",
  { hourUTC: 13, minuteUTC: 30 },
  internal.households.extendDues,
  { cursor: null },
);
crons.interval(
  "Refresh read-only bank activity",
  { hours: 6 },
  internal.bankRecords.scheduleSync,
  { cursor: null },
);
crons.daily(
  "Refresh connected primary calendars",
  { hourUTC: 10, minuteUTC: 15 },
  internal.calendarRecords.scheduleSync,
  { cursor: null },
);
export default crons;
