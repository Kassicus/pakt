import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = neon(url);

async function run() {
  console.log("Wiping user-owned data (keeping item_categories)…");
  await sql`TRUNCATE TABLE box_items, boxes, item_photos, items, rooms, moves RESTART IDENTITY CASCADE`;

  console.log("Dropping local users table…");
  await sql`DROP TABLE IF EXISTS users`;

  console.log("Renaming owner_clerk_user_id → owner_user_id…");
  await sql`ALTER TABLE moves RENAME COLUMN owner_clerk_user_id TO owner_user_id`;
  await sql`ALTER TABLE items RENAME COLUMN owner_clerk_user_id TO owner_user_id`;
  await sql`ALTER TABLE boxes RENAME COLUMN owner_clerk_user_id TO owner_user_id`;

  console.log("Done.");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
