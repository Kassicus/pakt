import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = neon(url);

async function run() {
  console.log("Creating checklist_category enum…");
  await sql`
    DO $$ BEGIN
      CREATE TYPE checklist_category AS ENUM ('30d', '2w', 'week', 'day', 'after');
    EXCEPTION WHEN duplicate_object THEN null; END $$
  `;

  console.log("Creating checklist_items table…");
  await sql`
    CREATE TABLE IF NOT EXISTS checklist_items (
      id text PRIMARY KEY,
      move_id text NOT NULL REFERENCES moves(id) ON DELETE CASCADE,
      text text NOT NULL,
      category checklist_category NOT NULL,
      done_at timestamptz,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  console.log("Creating index…");
  await sql`
    CREATE INDEX IF NOT EXISTS checklist_items_move_idx
      ON checklist_items (move_id, category, sort_order)
  `;

  console.log("Done.");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
