import { z } from "zod";

type RoomSide = "origin" | "destination";

type DefaultRoom = {
  label: string;
  sides: RoomSide[];
};

const DEFAULT_ROOMS: DefaultRoom[] = [
  { label: "Kitchen", sides: ["origin", "destination"] },
  { label: "Living room", sides: ["origin", "destination"] },
  { label: "Primary bedroom", sides: ["origin", "destination"] },
  { label: "Bathroom", sides: ["origin", "destination"] },
  { label: "Office", sides: ["origin", "destination"] },
  // Offsite storage unit — only a destination concept.
  { label: "Storage", sides: ["destination"] },
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

const emptyToUndefined = (v: unknown) => (v === "" || v == null ? undefined : v);

const emptyStringToUndefined = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional(),
);

export const addRoomSchema = z.object({
  moveId: z.string().min(1),
  kind: roomKindSchema.default("origin"),
  label: z.string().trim().min(1, "Room name is required").max(80),
  parentRoomId: emptyStringToUndefined,
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
  clientItemId: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^itm_[A-Za-z0-9]{6,40}$/u, "Invalid client item id")
      .optional(),
  ),
});
export type AddItemInput = z.infer<typeof addItemSchema>;

export const updateDispositionSchema = z.object({
  itemId: z.string().min(1),
  disposition: dispositionSchema,
});

export const deleteItemSchema = z.object({
  itemId: z.string().min(1),
});

export const restoreItemSchema = z.object({
  itemId: z.string().min(1),
});

export const updateItemSchema = z.object({
  itemId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(120),
  categoryId: z.string().min(1, "Pick a category"),
  quantity: z.coerce.number().int().min(1).max(999),
  fragility: fragilitySchema,
  sourceRoomId: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  destinationRoomId: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  volumeCuFtOverride: z.preprocess(
    emptyToUndefined,
    z.coerce.number().positive().max(500).optional(),
  ),
  weightLbsOverride: z.preprocess(
    emptyToUndefined,
    z.coerce.number().positive().max(5000).optional(),
  ),
});
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

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

export const attachPhotoSchema = z.object({
  itemId: z.string().min(1),
  blobPathname: z.string().min(1).max(500),
  url: z.string().url(),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  byteSize: z.number().int().nonnegative().max(50 * 1024 * 1024).optional(),
  contentType: z.string().max(100).optional(),
});

export const deletePhotoSchema = z.object({
  photoId: z.string().min(1),
});

export const decisionAnswersSchema = z
  .object({
    lastUsedMonths: z.number().int().min(0).max(600).optional(),
    replacementCostUsd: z.number().nonnegative().max(1_000_000).optional(),
    sentimental: z.boolean().optional(),
    wouldBuyAgain: z.enum(["yes", "no", "unsure"]).optional(),
  })
  .strict();
export type DecisionAnswersInput = z.infer<typeof decisionAnswersSchema>;

export const saveDecisionSchema = z.object({
  itemId: z.string().min(1),
  answers: decisionAnswersSchema,
  apply: dispositionSchema.optional(),
});
export type SaveDecisionInput = z.infer<typeof saveDecisionSchema>;

export { DEFAULT_ROOMS };

export const checklistCategories = ["30d", "2w", "week", "day", "after"] as const;
export const checklistCategorySchema = z.enum(checklistCategories);
export type ChecklistCategory = z.infer<typeof checklistCategorySchema>;

export const addChecklistItemSchema = z.object({
  moveId: z.string().min(1),
  text: z.string().trim().min(1, "Task is required").max(200),
  category: checklistCategorySchema,
});

export const toggleChecklistItemSchema = z.object({
  itemId: z.string().min(1),
  done: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .transform((v) => v === "on" || v === "true"),
});

export const updateChecklistItemSchema = z.object({
  itemId: z.string().min(1),
  text: z.string().trim().min(1).max(200).optional(),
  category: checklistCategorySchema.optional(),
});

export const deleteChecklistItemSchema = z.object({
  itemId: z.string().min(1),
});
