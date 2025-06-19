import { MongoClient } from "mongodb";
import dotenv from "dotenv";

import fs from "fs/promises";

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  const client = new MongoClient(uri);
  await client.connect();

  const collections = await getCollection(client, "sample_mflix")
  await resultSaver(collections, "collections")

  const users = await getCollectionData(client, "sample_mflix", "users")
  await resultSaver(users, "users")

  const usersPractice = await practice(client);
  await resultSaver(usersPractice, "users_practice")
  await client.close();
}
main().catch(console.error);

async function getAllDatabases(client: MongoClient) {
  const databasesList = await client.db().admin().listDatabases();
  return databasesList.databases;
}

async function resultSaver(data: any, filename: string) {
  await fs.writeFile(`src/${filename}.json`, JSON.stringify(data, null, 2))
  console.log(`${filename}.json saved`);
}

async function getCollection(client: MongoClient, databaseName: string) {
  const db = client.db(databaseName);
  const collections = await db.listCollections().toArray();
  return collections;
}

async function getCollectionData(client: MongoClient, databaseName: string, collectionName: string) {
  const db = client.db(databaseName);
  const collection = db.collection(collectionName);
  const data = await collection.find({}).toArray();
  return data;
}

async function practice(client: MongoClient) {
  const db = client.db('sample_mflix');
  const users = await db.collection('users').find({}).limit(10).toArray();
  return users;
}