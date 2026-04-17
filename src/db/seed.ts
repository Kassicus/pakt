import { getDb } from "./index";
import { itemCategories } from "./schema";

type Seed = {
  id: string;
  label: string;
  volumeCuFtPerItem: string;
  weightLbsPerItem: string;
  recommendedBoxType: string;
  fragile: boolean;
  sortOrder: number;
};

const SEEDS: Seed[] = [
  { id: "cat_books", label: "Books", volumeCuFtPerItem: "0.150", weightLbsPerItem: "1.80", recommendedBoxType: "small", fragile: false, sortOrder: 10 },
  { id: "cat_documents_files", label: "Documents & files", volumeCuFtPerItem: "0.300", weightLbsPerItem: "4.00", recommendedBoxType: "small", fragile: false, sortOrder: 20 },
  { id: "cat_tools", label: "Tools", volumeCuFtPerItem: "0.300", weightLbsPerItem: "3.00", recommendedBoxType: "small", fragile: false, sortOrder: 30 },
  { id: "cat_kitchen_dishes", label: "Dishes & glassware", volumeCuFtPerItem: "0.250", weightLbsPerItem: "1.20", recommendedBoxType: "dish_pack", fragile: true, sortOrder: 40 },
  { id: "cat_kitchen_cookware", label: "Pots & pans", volumeCuFtPerItem: "0.600", weightLbsPerItem: "3.00", recommendedBoxType: "medium", fragile: false, sortOrder: 50 },
  { id: "cat_kitchen_small_appliance", label: "Small kitchen appliances", volumeCuFtPerItem: "1.500", weightLbsPerItem: "6.00", recommendedBoxType: "medium", fragile: true, sortOrder: 60 },
  { id: "cat_kitchen_pantry", label: "Pantry / food", volumeCuFtPerItem: "0.200", weightLbsPerItem: "1.50", recommendedBoxType: "small", fragile: false, sortOrder: 70 },
  { id: "cat_clothes_hanging", label: "Hanging clothes", volumeCuFtPerItem: "0.400", weightLbsPerItem: "0.50", recommendedBoxType: "wardrobe", fragile: false, sortOrder: 80 },
  { id: "cat_clothes_folded", label: "Folded clothes", volumeCuFtPerItem: "0.250", weightLbsPerItem: "0.80", recommendedBoxType: "large", fragile: false, sortOrder: 90 },
  { id: "cat_shoes", label: "Shoes", volumeCuFtPerItem: "0.200", weightLbsPerItem: "1.50", recommendedBoxType: "medium", fragile: false, sortOrder: 100 },
  { id: "cat_linens_bedding", label: "Bedding & pillows", volumeCuFtPerItem: "0.600", weightLbsPerItem: "1.50", recommendedBoxType: "large", fragile: false, sortOrder: 110 },
  { id: "cat_towels", label: "Towels", volumeCuFtPerItem: "0.300", weightLbsPerItem: "1.00", recommendedBoxType: "large", fragile: false, sortOrder: 120 },
  { id: "cat_electronics_small", label: "Small electronics", volumeCuFtPerItem: "0.400", weightLbsPerItem: "2.00", recommendedBoxType: "medium", fragile: true, sortOrder: 130 },
  { id: "cat_electronics_monitor", label: "Monitor / display", volumeCuFtPerItem: "3.000", weightLbsPerItem: "15.00", recommendedBoxType: "medium", fragile: true, sortOrder: 140 },
  { id: "cat_decor_small", label: "Small décor", volumeCuFtPerItem: "0.300", weightLbsPerItem: "1.00", recommendedBoxType: "medium", fragile: true, sortOrder: 150 },
  { id: "cat_decor_art_framed", label: "Framed art / mirror", volumeCuFtPerItem: "2.000", weightLbsPerItem: "5.00", recommendedBoxType: "none", fragile: true, sortOrder: 160 },
  { id: "cat_toys", label: "Toys & games", volumeCuFtPerItem: "0.500", weightLbsPerItem: "1.00", recommendedBoxType: "medium", fragile: false, sortOrder: 170 },
  { id: "cat_furniture_small", label: "Small furniture", volumeCuFtPerItem: "8.000", weightLbsPerItem: "30.00", recommendedBoxType: "none", fragile: false, sortOrder: 180 },
  { id: "cat_furniture_medium", label: "Medium furniture", volumeCuFtPerItem: "20.000", weightLbsPerItem: "80.00", recommendedBoxType: "none", fragile: false, sortOrder: 190 },
  { id: "cat_furniture_large", label: "Large furniture", volumeCuFtPerItem: "50.000", weightLbsPerItem: "180.00", recommendedBoxType: "none", fragile: false, sortOrder: 200 },
  { id: "cat_mattress_queen", label: "Mattress (queen)", volumeCuFtPerItem: "35.000", weightLbsPerItem: "65.00", recommendedBoxType: "none", fragile: false, sortOrder: 210 },
  { id: "cat_mattress_king", label: "Mattress (king)", volumeCuFtPerItem: "45.000", weightLbsPerItem: "80.00", recommendedBoxType: "none", fragile: false, sortOrder: 220 },
  { id: "cat_other", label: "Other", volumeCuFtPerItem: "0.500", weightLbsPerItem: "2.00", recommendedBoxType: "medium", fragile: false, sortOrder: 999 },
];

export async function seed() {
  const db = getDb();
  for (const s of SEEDS) {
    await db
      .insert(itemCategories)
      .values(s)
      .onConflictDoUpdate({
        target: itemCategories.id,
        set: {
          label: s.label,
          volumeCuFtPerItem: s.volumeCuFtPerItem,
          weightLbsPerItem: s.weightLbsPerItem,
          recommendedBoxType: s.recommendedBoxType,
          fragile: s.fragile,
          sortOrder: s.sortOrder,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`Seeded ${SEEDS.length} item categories.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
