import { z } from "zod";

const DEFAULT_ROOMS = [
  "Kitchen",
  "Living room",
  "Primary bedroom",
  "Bathroom",
  "Office",
  "Storage / closet",
];

export const createMoveSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  originAddress: z.string().trim().max(200).optional().or(z.literal("")),
  destinationAddress: z.string().trim().max(200).optional().or(z.literal("")),
  plannedMoveDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, "Use YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
});
export type CreateMoveInput = z.infer<typeof createMoveSchema>;

export const roomKinds = ["origin", "destination"] as const;
export const roomKindSchema = z.enum(roomKinds);

export const addRoomSchema = z.object({
  moveId: z.string().min(1),
  kind: roomKindSchema.default("origin"),
  label: z.string().trim().min(1, "Room name is required").max(80),
});

export const renameRoomSchema = z.object({
  roomId: z.string().min(1),
  label: z.string().trim().min(1).max(80),
});

export const deleteRoomSchema = z.object({
  roomId: z.string().min(1),
});

export const dispositions = [
  "undecided",
  "moving",
  "storage",
  "donate",
  "trash",
  "sold",
] as const;
export const dispositionSchema = z.enum(dispositions);
export type Disposition = z.infer<typeof dispositionSchema>;

export const fragilities = ["normal", "fragile", "very_fragile"] as const;
export const fragilitySchema = z.enum(fragilities);

export const addItemSchema = z.object({
  moveId: z.string().min(1),
  sourceRoomId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(120),
  categoryId: z.string().min(1, "Pick a category"),
  quantity: z.coerce.number().int().min(1).max(999).default(1),
  disposition: dispositionSchema.default("undecided"),
  fragility: fragilitySchema.default("normal"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type AddItemInput = z.infer<typeof addItemSchema>;

export const updateDispositionSchema = z.object({
  itemId: z.string().min(1),
  disposition: dispositionSchema,
});

export const deleteItemSchema = z.object({
  itemId: z.string().min(1),
});

export const boxSizes = [
  "small",
  "medium",
  "large",
  "dish_pack",
  "wardrobe",
  "tote",
] as const;
export const boxSizeSchema = z.enum(boxSizes);
export type BoxSize = z.infer<typeof boxSizeSchema>;

export const boxStatuses = [
  "empty",
  "packing",
  "sealed",
  "loaded",
  "in_transit",
  "delivered",
  "unpacked",
] as const;
export const boxStatusSchema = z.enum(boxStatuses);
export type BoxStatus = z.infer<typeof boxStatusSchema>;

export const createBoxSchema = z.object({
  moveId: z.string().min(1),
  size: boxSizeSchema,
  sourceRoomId: z.string().min(1).optional().or(z.literal("")),
  destinationRoomId: z.string().min(1).optional().or(z.literal("")),
  fragile: z
    .union([z.literal("on"), z.literal("true"), z.literal(""), z.undefined()])
    .transform((v) => v === "on" || v === "true")
    .optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type CreateBoxInput = z.infer<typeof createBoxSchema>;

export const updateBoxStatusSchema = z.object({
  boxId: z.string().min(1),
  status: boxStatusSchema,
});

export const addItemsToBoxSchema = z.object({
  boxId: z.string().min(1),
  itemIds: z.array(z.string().min(1)).min(1),
});

export const removeItemFromBoxSchema = z.object({
  boxId: z.string().min(1),
  itemId: z.string().min(1),
});

export const deleteBoxSchema = z.object({
  boxId: z.string().min(1),
});

export { DEFAULT_ROOMS };
