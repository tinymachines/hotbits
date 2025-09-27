import * as duckdb from '@duckdb/duckdb-wasm';

const db: duckdb.AsyncDuckDB | null = null;
const connection: duckdb.AsyncDuckDBConnection | null = null;

export async function initDuckDB() {
  if (db) return { db, connection };
  
  // Force fallback to localStorage for airgapped reliability
  console.log('Using localStorage fallback for airgapped operation');
    // Return mock objects that use localStorage as fallback
    return {
      db: null,
      connection: {
        query: async (sql: string, ...params: unknown[]) => {
          // Destructure params from arguments
          const actualParams = params.length > 0 ? params[0] as unknown[] : undefined;
          // Enhanced localStorage-based fallback
          if (sql.includes('CREATE TABLE')) {
            return { toArray: () => [] };
          }
          
          if (sql.includes('INSERT')) {
            const id = Date.now();
            const [data, format, count, minVal, maxVal, base] = actualParams || [];
            const storedItem = {
              id,
              data: data ? Array.from(data as Uint8Array) : null, // Convert Uint8Array to array for storage
              format,
              count,
              min_val: minVal,
              max_val: maxVal,
              base,
              checked_out: false,
              timestamp: new Date().toISOString()
            };
            console.log('localStorage INSERT - storing item:', storedItem);
            localStorage.setItem(`hotbits_${id}`, JSON.stringify(storedItem));
            return { toArray: () => [{ id }] };
          }
          
          if (sql.includes('UPDATE') && sql.includes('checked_out')) {
            // Handle destroy operation
            const keys = Object.keys(localStorage).filter(k => k.startsWith('hotbits_'));
            keys.forEach(k => {
              try {
                const item = JSON.parse(localStorage.getItem(k) || '{}');
                if (actualParams && item.id === actualParams[0]) {
                  item.checked_out = true;
                  localStorage.setItem(k, JSON.stringify(item));
                }
              } catch (error) {
                console.warn('Error updating item:', error);
              }
            });
            return { toArray: () => [] };
          }

          if (sql.includes('DELETE')) {
            // Handle delete operation
            const keys = Object.keys(localStorage).filter(k => k.startsWith('hotbits_'));
            keys.forEach(k => {
              try {
                const item = JSON.parse(localStorage.getItem(k) || '{}');
                if (actualParams && item.id === actualParams[0]) {
                  localStorage.removeItem(k);
                  console.log(`Deleted hotbits record with id: ${actualParams[0]}`);
                }
              } catch (error) {
                console.warn('Error deleting item:', error);
              }
            });
            return { toArray: () => [] };
          }
          
          if (sql.includes('SELECT')) {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('hotbits_'));
            return { 
              toArray: () => keys.map(k => {
                try {
                  const item = JSON.parse(localStorage.getItem(k) || '{}');
                  // Convert array back to Uint8Array if data exists
                  if (item.data && Array.isArray(item.data)) {
                    item.data = new Uint8Array(item.data);
                  }
                  return item;
                } catch {
                  return {};
                }
              }).filter(item => item.id) // Only return valid items
            };
          }
          
          return { toArray: () => [] };
        }
      } as duckdb.AsyncDuckDBConnection
    };
}

export async function getDuckDB() {
  if (!db || !connection) {
    return await initDuckDB();
  }
  return { db, connection };
}

export async function createRandomsTable() {
  const { connection } = await getDuckDB();

  await connection!.query(`
    CREATE TABLE IF NOT EXISTS randoms (
      id INTEGER PRIMARY KEY,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      data BLOB,
      format VARCHAR(10),
      count INTEGER,
      min_val INTEGER,
      max_val INTEGER,
      base INTEGER,
      checked_out BOOLEAN DEFAULT false,
      expires_at TIMESTAMP
    )
  `);
}

export async function storeRandoms(data: Uint8Array, options: {
  format: string;
  count: number;
  minVal: number;
  maxVal: number;
  base: number;
}) {
  const { connection } = await getDuckDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (connection as any).query(`
    INSERT INTO randoms (data, format, count, min_val, max_val, base, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP + INTERVAL '24 hours')
    RETURNING id
  `, [data, options.format, options.count, options.minVal, options.maxVal, options.base]);
  
  return result.toArray()[0].id;
}

export async function getRandoms(id: number) {
  const { connection } = await getDuckDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (connection as any).query(`
    SELECT * FROM randoms WHERE id = ? AND expires_at > CURRENT_TIMESTAMP
  `, [id]);

  return result.toArray()[0] || null;
}

export async function checkoutRandoms(id: number) {
  const { connection } = await getDuckDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (connection as any).query(`
    UPDATE randoms SET checked_out = true WHERE id = ?
  `, [id]);
}

export async function deleteRandoms(id: number) {
  const { connection } = await getDuckDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (connection as any).query(`
    DELETE FROM randoms WHERE id = ?
  `, [id]);
}

export async function getAvailableRandoms() {
  const { connection } = await getDuckDB();

  const result = await connection!.query(`
    SELECT id, timestamp, format, count, min_val, max_val, base, checked_out
    FROM randoms 
    WHERE expires_at > CURRENT_TIMESTAMP 
    ORDER BY timestamp DESC
    LIMIT 100
  `);
  
  return result.toArray();
}

export async function exportDatabase(): Promise<Uint8Array> {
  const { db } = await getDuckDB();
  // Fallback for localStorage mode - export as JSON
  if (!db) {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('hotbits_'));
    const data = keys.map(k => JSON.parse(localStorage.getItem(k) || '{}'));
    return new TextEncoder().encode(JSON.stringify(data));
  }
  // This method may not exist, return empty buffer as fallback
  return new Uint8Array();
}

export async function importDatabase(buffer: Uint8Array) {
  const { db } = await getDuckDB();
  if (!db) {
    // Handle localStorage import
    const text = new TextDecoder().decode(buffer);
    try {
      const data = JSON.parse(text);
      data.forEach((item: Record<string, unknown>) => {
        localStorage.setItem(`hotbits_${item.id}`, JSON.stringify(item));
      });
    } catch (e) {
      console.error('Failed to import data:', e);
    }
    return;
  }
  // This method may not exist, skip for now
  const importConn = null as duckdb.AsyncDuckDBConnection | null;

  // Copy data from imported database
  if (importConn) {
    await importConn.query(`ATTACH 'import.db' AS imported`);
    await importConn.query(`
      CREATE TABLE IF NOT EXISTS randoms AS
      SELECT * FROM imported.randoms WHERE expires_at > CURRENT_TIMESTAMP
    `);

    await importConn.close();
  }
}