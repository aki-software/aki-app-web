import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar el archivo .env local
dotenv.config({ path: path.join(__dirname, '.env') });

const { Client } = pg;

async function clearSessions() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: process.env.DATABASE_HOST !== 'localhost' ? { rejectUnauthorized: false } : false,
  });

  console.log('Connecting to database...');
  try {
    await client.connect();
    console.log('Connected successfully. Cleaning up sessions tables...');

    // Truncar las tablas de sesiones y sus relaciones en cascada
    await client.query('TRUNCATE TABLE session_swipes, session_results, sessions CASCADE;');
    
    console.log('SUCCESS: All sessions, results, and swipes have been cleared cleanly!');
  } catch (error) {
    console.error('ERROR cleaning up sessions:', error);
  } finally {
    await client.end();
  }
}

clearSessions();
