import pg from 'pg';
const { Client } = pg;
const client = new Client({ host:'aws-1-us-east-2.pooler.supabase.com', port:5432, user:'postgres.wyaugtdgmcesoryhyois', password:'antigravityacces', database:'postgres', ssl:{rejectUnauthorized:false} });
await client.connect();
const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
console.log(res.rows.map(r=>r.table_name).join('\n'));
process.exit(0);
