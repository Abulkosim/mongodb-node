import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  const client = new MongoClient(uri);
  await client.connect();
  const databases: any = await getAllDatabases(client);

  for (const database of databases) {
    console.log("database name: ", database.name);
    const collections = await getCollection(client, database.name);
    for (const collection of collections) {
      console.log("collection name: ", collection.name);
    }
  }

  await client.db("sample_supplies").dropDatabase();
  await client.close();
}
main().catch(console.error);

async function getAllDatabases(client: MongoClient) {
  const databasesList = await client.db().admin().listDatabases();
  return databasesList.databases;
}

async function getCollection(client: MongoClient, databaseName: string) {
  const db = client.db(databaseName);
  const collections = await db.listCollections().toArray();
  return collections;
}