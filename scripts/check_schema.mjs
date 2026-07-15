import pg from 'pg';
const { Client } = pg;
const client = new Client({
  host: "aws-1-us-east-2.pooler.supabase.com",
  port: 5432,
  user: "postgres.wyaugtdgmcesoryhyois",
  password: "antigravityacces",
  database: "postgres",
  ssl: { rejectUnauthorized: false }
});
await client.connect();
const table = process.argv[2] || 'budget_items';
const res = await client.query(`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = $1;
`, [table]);
console.log(res.rows.map(r => r.column_name).join(', '));
process.exit(0);
