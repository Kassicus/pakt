"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

const NOTIFICATION_ID = 1001; // stable id; rescheduling replaces the prior one

/**
 * On native, schedules a daily 9 AM local notification reminding the user to
 * open their checklist. If `pendingCount === 0`, cancels the existing schedule
 * instead. No-op on web.
 */
export function ChecklistNudgeScheduler({
  moveName,
  pendingCount,
}: {
  moveName: string;
  pendingCount: number;
}) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    (async () => {
      try {
        const { LocalNotifications } = await import(
          "@capacitor/local-notifications"
        );

        const perm = await LocalNotifications.checkPermissions();
        let granted = perm.display === "granted";
        if (!granted) {
          const req = await LocalNotifications.requestPermissions();
          granted = req.display === "granted";
        }
        if (!granted || cancelled) return;

        if (pendingCount === 0) {
          await LocalNotifications.cancel({
            notifications: [{ id: NOTIFICATION_ID }],
          });
          return;
        }

        // Schedule for 9 AM tomorrow, repeating daily. Capacitor will replace
        // any existing notification with the same id.
        const next = new Date();
        next.setHours(9, 0, 0, 0);
        if (next.getTime() < Date.now()) {
          next.setDate(next.getDate() + 1);
        }

        await LocalNotifications.schedule({
          notifications: [
            {
              id: NOTIFICATION_ID,
              title: "Checklist nudge",
              body:
                pendingCount === 1
                  ? `1 task left for ${moveName}.`
                  : `${pendingCount} tasks left for ${moveName}.`,
              schedule: { at: next, repeats: true, every: "day" },
              extra: { url: "/moves" },
            },
          ],
        });
      } catch (err) {
        console.error("[local-notifications] schedule failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [moveName, pendingCount]);

  return null;
}
