const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config();

const run = async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const hash = bcrypt.hashSync('admin123', 10);
  
  await client.query(`
    INSERT INTO users (username, password_hash, role) 
    VALUES ('admin_warnet', $1, 'admin')
    ON CONFLICT (username) DO UPDATE 
    SET password_hash = EXCLUDED.password_hash
  `, [hash]);

  console.log('Database updated: admin_warnet password reset to admin123');
  await client.end();
};

run().catch(console.error);
