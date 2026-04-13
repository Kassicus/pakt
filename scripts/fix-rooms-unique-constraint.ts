import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = neon(url);

async function run() {
  console.log("Dropping old (move_id, kind, label) unique constraint…");
  await sql`ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_unique_label`;

  // Separately: there may also be an index with the same name from the
  // original schema — best-effort drop.
  await sql`DROP INDEX IF EXISTS rooms_unique_label`;

  console.log(
    "Creating new unique index including parent_room_id (NULL treated as empty)…",
  );
  await sql`
    CREATE UNIQUE INDEX rooms_unique_label
      ON rooms (move_id, kind, COALESCE(parent_room_id, ''), label)
  `;
  console.log("Done.");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
