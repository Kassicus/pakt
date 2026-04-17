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

export function qualifiedRoomLabel(
  roomId: string,
  rows: Pick<RoomRow, "id" | "label" | "parentRoomId">[],
  separator = " ",
): string | null {
  const byId = new Map(rows.map((r) => [r.id, r] as const));
  const target = byId.get(roomId);
  if (!target) return null;
  const parent = target.parentRoomId ? byId.get(target.parentRoomId) : null;
  return parent ? `${parent.label}${separator}${target.label}` : target.label;
}

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
