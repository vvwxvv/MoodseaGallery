import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { artworkApiConfig } from '@/app/api/_config/artwork_api_config';
import { normalizeArtworkOrder } from '@/utils/artworkOrder';

const uri = process.env.MONGODB_URL || '';
const dbName = process.env.MONGODB_DB || '';
const collectionName = artworkApiConfig.collectionName;

// Which sub-key of the JSON `order` the reorder route writes by default.
const DEFAULT_ORDER_KEY = 'artist_page_order';

let cachedClient = null;
let cachedDb = null;

async function connectDB() {
  if (cachedDb) return cachedDb;
  if (!cachedClient) {
    cachedClient = new MongoClient(uri);
    await cachedClient.connect();
  }
  cachedDb = cachedClient.db(dbName);
  return cachedDb;
}

// POST /api/artwork/reorder
// Body: { reorderedImages? | reorderedWorks? | orderedIds, orderKey? }
//   orderedIds: [id, …]  → index+1 becomes the value for orderKey
//   orderKey:   which per-page order to write (default artist_page_order)
export async function POST(request) {
  try {
    const db = await connectDB();
    const collection = db.collection(collectionName);

    const body = await request.json();
    const { orderedIds, groups, reorderedWorks, reorderedImages, orderKey } = body;
    const key = orderKey || DEFAULT_ORDER_KEY;

    let pairs = [];
    const explicit = reorderedWorks || reorderedImages;
    if (Array.isArray(groups) && groups.length > 0) {
      // Per-group numbering: each inner array becomes 1..N for that group.
      for (const gIds of groups) {
        (Array.isArray(gIds) ? gIds : []).forEach((id, idx) =>
          pairs.push([id, String(idx + 1)])
        );
      }
    } else if (Array.isArray(orderedIds) && orderedIds.length > 0) {
      pairs = orderedIds.map((id, idx) => [id, String(idx + 1)]);
    } else if (Array.isArray(explicit) && explicit.length > 0) {
      pairs = explicit.map((item, idx) => [
        item._id || item.id,
        item.order !== undefined && item.order !== null ? String(item.order) : String(idx + 1),
      ]);
    } else {
      return NextResponse.json(
        { message: 'orderedIds or groups must be a non-empty array' },
        { status: 400 }
      );
    }

    // Merge into the existing JSON `order` object — read once, write once.
    const ids = pairs
      .map(([id]) => id)
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const existingDocs = await collection
      .find({ _id: { $in: ids } }, { projection: { order: 1 } })
      .toArray();
    const orderById = new Map(existingDocs.map((d) => [d._id.toString(), d.order]));

    const ops = pairs
      .filter(([id]) => ObjectId.isValid(id))
      .map(([id, value]) => {
        const _id = new ObjectId(id);
        const merged = normalizeArtworkOrder(orderById.get(_id.toString()));
        merged[key] = value;
        return { updateOne: { filter: { _id }, update: { $set: { order: merged } } } };
      });

    if (ops.length) await collection.bulkWrite(ops, { ordered: false });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Artwork reorder error:', error);
    return NextResponse.json(
      { message: 'Failed to reorder artworks', error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/artwork/reorder?orderKey=artist_page_order
export async function GET(request) {
  try {
    const db = await connectDB();
    const collection = db.collection(collectionName);

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('orderKey') || DEFAULT_ORDER_KEY;

    const artworks = await collection.find().sort({ [`order.${key}`]: 1 }).toArray();

    // Normalise _id → id (the reorder page reads item.id || item._id)
    const data = artworks.map((item) => {
      const { _id, ...rest } = item;
      return { ...rest, id: _id ? _id.toString() : item.id, _id: _id ? _id.toString() : item.id };
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch artworks for reorder:', error);
    return NextResponse.json(
      { message: 'Failed to fetch artworks', error: error.message },
      { status: 500 }
    );
  }
}
