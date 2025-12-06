const { Client } = require('pg');
const { execSync } = require('child_process');

module.exports = async () => {
  const client = new Client({
    user: 'testuser',
    host: 'localhost',
    password: 'testpassword',
    port: 5432,
    database: 'postgres', // connect to default DB to create test_db
  });

  await client.connect();

  try {
    await client.query('CREATE DATABASE test_db;');
    console.log('Test database created');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('Test database already exists, skipping creation');
    } else {
      throw e;
    }
  }


  await client.end();

  // Run migrations
  execSync('npx prisma migrate dev', { stdio: 'inherit' });
};
