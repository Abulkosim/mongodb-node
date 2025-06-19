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

  const fileExists = await fs.stat('src/collections.json').then(() => true).catch(() => false);
  if (!fileExists) {
    await fs.writeFile('src/collections.json', JSON.stringify(collections, null, 2))
  } else {
    console.log("collections.json already exists");
  }

  const users = await getCollectionData(client, "sample_mflix", "users")
  await resultSaver(users, "users")

  await client.close();
}
main().catch(console.error);

async function getAllDatabases(client: MongoClient) {
  const databasesList = await client.db().admin().listDatabases();
  return databasesList.databases;
}

async function resultSaver(data: any, filename: string) {
  const fileExists = await fs.stat(`src/${filename}.json`).then(() => true).catch(() => false);
  if (!fileExists) {
    await fs.writeFile(`src/${filename}.json`, JSON.stringify(data, null, 2))
  } else {
    console.log(`${filename}.json already exists`);
  }
}

async function getCollection(client: MongoClient, databaseName: string) {
  const db = client.db(databaseName);
  const collections = await db.listCollections().toArray();
  return collections;
}

async function getCollectionData(client: MongoClient, databaseName: string, collectionName: string) {
  const db = client.db(databaseName);
  const collection = db.collection(collectionName);
  const data = await collection.find({ name: "Ned Stark"}).toArray();
  return data;
}