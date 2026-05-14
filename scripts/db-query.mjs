import pg from 'pg';
const { Client } = pg;

const DB_CONFIG = {
  host    : 'aws-1-us-east-2.pooler.supabase.com',
  port    : 5432,
  user    : 'postgres.wyaugtdgmcesoryhyois',
  password: '***REMOVED***',
  database: 'postgres',
  ssl     : { rejectUnauthorized: false },
};

async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  const res = await client.query("SELECT * FROM organization_members");
  console.log('Miembros Org: ', JSON.stringify(res.rows, null, 2));
  console.log(JSON.stringify(res.rows, null, 2));
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(console.error);
