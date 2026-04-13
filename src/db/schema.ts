import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  date,
  numeric,
  jsonb,
  index,
  uniqueIndex,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const moveStatusEnum = pgEnum("move_status", [
  "planning",
  "packing",
  "in_transit",
  "unpacking",
  "done",
]);

export const roomKindEnum = pgEnum("room_kind", ["origin", "destination"]);

export const dispositionEnum = pgEnum("disposition", [
  "undecided",
  "moving",
  "storage",
  "donate",
  "trash",
  "sold",
]);

export const fragilityEnum = pgEnum("fragility", [
  "normal",
  "fragile",
  "very_fragile",
]);

export const boxTypeEnum = pgEnum("box_type", [
  "small",
  "medium",
  "large",
  "dish_pack",
  "wardrobe",
  "tote",
  "none",
]);

export const boxSizeEnum = pgEnum("box_size", [
  "small",
  "medium",
  "large",
  "dish_pack",
  "wardrobe",
  "tote",
]);

export const boxStatusEnum = pgEnum("box_status", [
  "empty",
  "packing",
  "sealed",
  "loaded",
  "in_transit",
  "delivered",
  "unpacked",
]);

export const moves = pgTable(
  "moves",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    name: text("name").notNull(),
    originAddress: text("origin_address"),
    destinationAddress: text("destination_address"),
    plannedMoveDate: date("planned_move_date"),
    status: moveStatusEnum("status").notNull().default("planning"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("moves_owner_status_idx").on(t.ownerUserId, t.status)],
);

export const rooms = pgTable(
  "rooms",
  {
    id: text("id").primaryKey(),
    moveId: text("move_id")
      .notNull()
      .references(() => moves.id, { onDelete: "cascade" }),
    kind: roomKindEnum("kind").notNull(),
    label: text("label").notNull(),
    parentRoomId: text("parent_room_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("rooms_unique_label").on(t.moveId, t.kind, t.label),
    index("rooms_move_idx").on(t.moveId, t.kind),
    index("rooms_parent_idx").on(t.parentRoomId),
  ],
);

export const itemCategories = pgTable("item_categories", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  volumeCuFtPerItem: numeric("volume_cu_ft_per_item", { precision: 6, scale: 3 }).notNull(),
  weightLbsPerItem: numeric("weight_lbs_per_item", { precision: 6, scale: 2 }).notNull(),
  recommendedBoxType: boxTypeEnum("recommended_box_type").notNull(),
  fragile: boolean("fragile").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DecisionAnswers = {
  lastUsedMonths?: number;
  replacementCostUsd?: number;
  sentimental?: boolean;
  wouldBuyAgain?: "yes" | "no" | "unsure";
};

export const items = pgTable(
  "items",
  {
    id: text("id").primaryKey(),
    moveId: text("move_id")
      .notNull()
      .references(() => moves.id, { onDelete: "cascade" }),
    ownerUserId: text("owner_user_id").notNull(),
    name: text("name").notNull(),
    categoryId: text("category_id").references(() => itemCategories.id, {
      onDelete: "set null",
    }),
    sourceRoomId: text("source_room_id").references(() => rooms.id, {
      onDelete: "set null",
    }),
    destinationRoomId: text("destination_room_id").references(() => rooms.id, {
      onDelete: "set null",
    }),
    disposition: dispositionEnum("disposition").notNull().default("undecided"),
    fragility: fragilityEnum("fragility").notNull().default("normal"),
    quantity: integer("quantity").notNull().default(1),
    estimatedValueUsd: numeric("estimated_value_usd", { precision: 10, scale: 2 }),
    volumeCuFtOverride: numeric("volume_cu_ft_override", { precision: 6, scale: 3 }),
    weightLbsOverride: numeric("weight_lbs_override", { precision: 6, scale: 2 }),
    notes: text("notes"),
    decisionAnswers: jsonb("decision_answers").$type<DecisionAnswers>(),
    decisionScore: numeric("decision_score", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("items_move_disposition_idx").on(t.moveId, t.disposition, t.deletedAt),
    index("items_move_source_room_idx")
      .on(t.moveId, t.sourceRoomId)
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const itemPhotos = pgTable("item_photos", {
  id: text("id").primaryKey(),
  itemId: text("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  blobPathname: text("blob_pathname").notNull(),
  blobUrl: text("blob_url").notNull(),
  width: integer("width"),
  height: integer("height"),
  byteSize: integer("byte_size"),
  contentType: text("content_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const boxes = pgTable(
  "boxes",
  {
    id: text("id").primaryKey(),
    moveId: text("move_id")
      .notNull()
      .references(() => moves.id, { onDelete: "cascade" }),
    ownerUserId: text("owner_user_id").notNull(),
    shortCode: text("short_code").notNull(),
    size: boxSizeEnum("size").notNull(),
    sourceRoomId: text("source_room_id").references(() => rooms.id, {
      onDelete: "set null",
    }),
    destinationRoomId: text("destination_room_id").references(() => rooms.id, {
      onDelete: "set null",
    }),
    status: boxStatusEnum("status").notNull().default("empty"),
    fragile: boolean("fragile").notNull().default(false),
    weightLbsActual: numeric("weight_lbs_actual", { precision: 6, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("boxes_move_shortcode_idx").on(t.moveId, t.shortCode),
    index("boxes_move_status_idx").on(t.moveId, t.status, t.deletedAt),
  ],
);

export const boxItems = pgTable(
  "box_items",
  {
    id: text("id").primaryKey(),
    boxId: text("box_id")
      .notNull()
      .references(() => boxes.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("box_items_unique").on(t.boxId, t.itemId),
    index("box_items_item_idx").on(t.itemId),
  ],
);
