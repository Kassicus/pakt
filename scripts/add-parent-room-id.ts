import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = neon(url);

async function run() {
  console.log("Adding parent_room_id column…");
  await sql`
    ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS parent_room_id TEXT
  `;
  console.log("Creating index…");
  await sql`
    CREATE INDEX IF NOT EXISTS rooms_parent_idx ON rooms (parent_room_id)
  `;
  console.log("Done.");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
