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

export { DEFAULT_ROOMS };
