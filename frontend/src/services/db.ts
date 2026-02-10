import PocketBase from 'pocketbase';
import { TypedPocketBase } from '../types.ts';

// 🛑 ACTION REQUIRED: Add your PocketBase URL to .env file
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL;

if (!POCKETBASE_URL) {
  throw new Error("VITE_POCKETBASE_URL is not set. Please add it to your .env file.");
}

// Create a new PocketBase instance
const pb = new PocketBase(POCKETBASE_URL) as TypedPocketBase;

// Globally disable auto-cancellation
pb.autoCancellation(false);

export default pb;
