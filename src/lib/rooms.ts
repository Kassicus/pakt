export type RoomRow = {
  id: string;
  label: string;
  kind: "origin" | "destination";
  parentRoomId: string | null;
};

export type RoomPickerOption = {
  id: string;
  label: string;
};

/**
 * Format a room list for a dropdown picker, prefixing sub-rooms with their
 * parent's name (e.g. "Primary bedroom › Walk-in closet"). Returned options
 * are sorted alphabetically by the formatted label so closets naturally
 * cluster under their parent.
 */
export function pickerRoomsFor(
  kind: "origin" | "destination",
  rows: RoomRow[],
): RoomPickerOption[] {
  const labelById = new Map(rows.map((r) => [r.id, r.label] as const));
  return rows
    .filter((r) => r.kind === kind)
    .map((r) => {
      const parentLabel = r.parentRoomId ? labelById.get(r.parentRoomId) : null;
      return {
        id: r.id,
        label: parentLabel ? `${parentLabel} › ${r.label}` : r.label,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
