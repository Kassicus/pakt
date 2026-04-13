export type ChecklistCategory = "30d" | "2w" | "week" | "day" | "after";

export const CHECKLIST_CATEGORY_LABEL: Record<ChecklistCategory, string> = {
  "30d": "30 days out",
  "2w": "2 weeks out",
  week: "Week of",
  day: "Move day",
  after: "After move",
};

export const CHECKLIST_CATEGORY_ORDER: ChecklistCategory[] = [
  "30d",
  "2w",
  "week",
  "day",
  "after",
];

type DefaultTask = { text: string; category: ChecklistCategory };

export const DEFAULT_CHECKLIST: DefaultTask[] = [
  { text: "Reserve movers or book truck rental", category: "30d" },
  { text: "Notify landlord (if renting) or list home", category: "30d" },
  { text: "Order packing supplies", category: "30d" },
  { text: "Submit USPS change of address", category: "2w" },
  { text: "Update address with bank, credit cards, employer", category: "2w" },
  { text: "Schedule utility transfer (electric, gas, water, internet)", category: "2w" },
  { text: "Refill prescriptions; transfer pharmacy", category: "2w" },
  { text: "Pack a “first night” essentials box", category: "week" },
  { text: "Confirm movers / truck reservation", category: "week" },
  { text: "Defrost freezer; finish perishables", category: "week" },
  { text: "Take meter readings (gas, electric, water)", category: "day" },
  { text: "Final walkthrough; photos of empty rooms", category: "day" },
  { text: "Hand over keys / collect new keys", category: "day" },
  { text: "Update driver’s license + vehicle registration", category: "after" },
  { text: "Register to vote at new address", category: "after" },
];
