import { useRealtimeConnectionState } from "@/realtime/realtime-context";

export function RealtimeConnectionIndicator() {
  const state = useRealtimeConnectionState();

  return (
    <div
      className={
        state === "connected"
          ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          : "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
      }
      role="status"
    >
      {state === "connected"
        ? "Realtime updates connected."
        : state === "connecting"
          ? "Reconnecting realtime updates. Existing data and actions remain available."
          : "Realtime updates unavailable. Existing data remains available and refreshes every 15 seconds."}
    </div>
  );
}
