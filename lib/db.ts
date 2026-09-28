import "server-only";

import dns from "node:dns";
import mongoose from "mongoose";

// Local fix for "querySrv ECONNREFUSED" on some Windows networks.
// Only runs when MONGODB_DNS_SERVERS is set (local .env). Never set it on Vercel.
// Both resolvers are set: the MongoDB driver uses dns.promises, which inside
// Next.js does not pick up servers set through the callback API.
const dnsServers = process.env.MONGODB_DNS_SERVERS;
if (dnsServers) {
  const servers = dnsServers.split(",").map((server) => server.trim());
  dns.setServers(servers);
  dns.promises.setServers(servers);
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Cache the connection on globalThis so it survives hot reloads in dev and is
// reused across invocations of the same serverless instance on Vercel.
const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache: MongooseCache = globalForMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
};
globalForMongoose.mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local (see .env.example)."
    );
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Reset so the next request retries instead of reusing a rejected promise.
    cache.promise = null;
    console.error("MongoDB connection failed:", error);
    throw error;
  }

  return cache.conn;
}
