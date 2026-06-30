import dns from 'dns';
import { promisify } from 'util';
import mongoose from 'mongoose';

const resolveSrv = promisify(dns.resolveSrv);

dns.setDefaultResultOrder('ipv4first');

const PUBLIC_DNS = ['8.8.8.8', '8.8.4.4', '1.1.1.1'];

const MONGODB_URI = process.env.MONGODB_URI_DIRECT || process.env.MONGODB_URI || 'mongodb://localhost:27017/dwpl';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

function maskUri(uri: string) {
  return uri.replace(/\/\/.*@/, '//***:***@');
}

function parseSrvUri(uri: string) {
  const withoutProtocol = uri.replace('mongodb+srv://', '');
  const atIndex = withoutProtocol.lastIndexOf('@');
  if (atIndex === -1) throw new Error('Invalid mongodb+srv URI');

  const credentials = withoutProtocol.slice(0, atIndex);
  const rest = withoutProtocol.slice(atIndex + 1);
  const slashIndex = rest.indexOf('/');
  const host = slashIndex === -1 ? rest : rest.slice(0, slashIndex);
  const pathAndQuery = slashIndex === -1 ? '' : rest.slice(slashIndex + 1);
  const qIndex = pathAndQuery.indexOf('?');
  const db = qIndex === -1 ? pathAndQuery : pathAndQuery.slice(0, qIndex);
  const query = qIndex === -1 ? '' : pathAndQuery.slice(qIndex + 1);

  return { credentials, host, db, query };
}

async function resolveSrvWithFallback(srvHost: string) {
  try {
    return await resolveSrv(srvHost);
  } catch {
    const previousServers = dns.getServers();
    try {
      dns.setServers(PUBLIC_DNS);
      return await resolveSrv(srvHost);
    } finally {
      dns.setServers(previousServers);
    }
  }
}

async function srvToStandardUri(srvUri: string): Promise<string> {
  const { credentials, host, db, query } = parseSrvUri(srvUri);
  const records = await resolveSrvWithFallback(`_mongodb._tcp.${host}`);

  if (!records.length) {
    throw new Error(`No MongoDB hosts found for ${host}`);
  }

  const hosts = records.map((record) => `${record.name}:${record.port}`).join(',');
  const params = new URLSearchParams(query);
  params.set('ssl', 'true');
  if (!params.has('authSource')) params.set('authSource', 'admin');

  return `mongodb://${credentials}@${hosts}/${db}?${params.toString()}`;
}

function isDnsError(message: string) {
  return (
    message.includes('querySrv') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('ESERVFAIL')
  );
}

const CONNECT_OPTS = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  family: 4 as const,
};

async function connectWithRetries(uri: string, attempts = 3) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await mongoose.connect(uri, CONNECT_OPTS);
    } catch (error: any) {
      lastError = error;
      const retryable =
        isDnsError(error.message) ||
        error.message.includes('ETIMEOUT');

      if (!retryable || attempt === attempts) break;

      console.warn(`MongoDB connect attempt ${attempt} failed, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError;
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      console.log('🔌 Attempting to connect to MongoDB...');
      console.log('📍 Connection string:', maskUri(MONGODB_URI));

      // Use reliable public DNS resolvers for Atlas SRV lookups on flaky networks.
      if (MONGODB_URI.startsWith('mongodb+srv://') && !process.env.MONGODB_URI_DIRECT) {
        dns.setServers([...new Set([...dns.getServers(), ...PUBLIC_DNS])]);
      }

      try {
        return await connectWithRetries(MONGODB_URI);
      } catch (error: any) {
        if (!MONGODB_URI.startsWith('mongodb+srv://') || !isDnsError(error.message)) {
          throw error;
        }

        console.warn('SRV DNS lookup failed, resolving hosts via fallback DNS...');
        const standardUri = await srvToStandardUri(MONGODB_URI);
        console.log('📍 Fallback connection string:', maskUri(standardUri));
        return connectWithRetries(standardUri);
      }
    })();
  }

  try {
    cached.conn = await cached.promise;
    console.log('✅ Successfully connected to MongoDB');
    console.log('📊 Database:', cached.conn.connection.db?.databaseName || 'unknown');
  } catch (e: any) {
    cached.promise = null;
    console.error('❌ MongoDB connection failed!');
    console.error('Error:', e.message);

    if (isDnsError(e.message)) {
      console.error('\n💡 DNS / CONNECTION ERROR:');
      console.error('  - Check internet connection and disable VPN if active');
      console.error('  - Ensure MongoDB Atlas cluster is running (not paused)');
      console.error('  - Add MONGODB_URI_DIRECT in .env.local with a standard mongodb:// URI to bypass SRV DNS');
    } else if (e.message.includes('ETIMEOUT')) {
      console.error('\n💡 TIMEOUT ERROR - Possible causes:');
      console.error('  1. MongoDB Atlas cluster is paused → Resume it in Atlas dashboard');
      console.error('  2. IP not whitelisted → Add your IP in Network Access (or use 0.0.0.0/0)');
      console.error('  3. Network/firewall blocking connection');
    } else if (e.message.includes('authentication failed')) {
      console.error('\n💡 AUTHENTICATION ERROR:');
      console.error('  - Check username and password in MONGODB_URI');
      console.error('  - Ensure password special characters are URL-encoded');
    }

    throw e;
  }

  return cached.conn;
}
