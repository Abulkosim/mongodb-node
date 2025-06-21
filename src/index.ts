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

  // Original code
  const collections = await getCollection(client, "sample_mflix")
  await resultSaver(collections, "collections")

  const usersPractice = await practice(client);
  await resultSaver(usersPractice, "users_practice")

  const users = await getCollectionData(client, "sample_mflix", "users")
  await resultSaver(users, "users")

  // Transaction examples
  console.log("\n=== Transaction Examples ===");
  
  // Example 1: Basic transaction with error handling
  await basicTransactionExample(client);
  
  // Example 2: Movie rental simulation
  await movieRentalTransaction(client);
  
  // Example 3: User profile update with transaction
  await userProfileUpdateTransaction(client);
  
  // Example 4: Batch operations in transaction
  await batchOperationsTransaction(client);

  await client.close();
}

// Example 1: Basic Transaction with Error Handling
async function basicTransactionExample(client: MongoClient) {
  console.log("\n--- Basic Transaction Example ---");
  
  const session = client.startSession();
  
  try {
    await session.withTransaction(async () => {
      const db = client.db('sample_mflix');
      
      // Create a test collection for our transaction
      const testCollection = db.collection('transaction_test');
      
      // Insert multiple documents atomically
      await testCollection.insertOne(
        { name: "Transaction Test 1", timestamp: new Date() },
        { session }
      );
      
      await testCollection.insertOne(
        { name: "Transaction Test 2", timestamp: new Date() },
        { session }
      );
      
      console.log("✅ Basic transaction completed successfully");
    });
  } catch (error) {
    console.error("❌ Basic transaction failed:", error);
  } finally {
    await session.endSession();
  }
}

// Example 2: Movie Rental Simulation
async function movieRentalTransaction(client: MongoClient) {
  console.log("\n--- Movie Rental Transaction Example ---");
  
  const session = client.startSession();
  
  try {
    await session.withTransaction(async () => {
      const db = client.db('sample_mflix');
      const moviesCollection = db.collection('movies');
      const rentalsCollection = db.collection('rentals');
      
      // Find a movie to "rent"
      const movie = await moviesCollection.findOne(
        { title: { $exists: true } },
        { session }
      );
      
      if (!movie) {
        throw new Error("No movie found to rent");
      }
      
      // Create rental record
      const rental = {
        movieId: movie._id,
        movieTitle: movie.title,
        userId: "user123",
        rentedAt: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: "active"
      };
      
      await rentalsCollection.insertOne(rental, { session });
      
      // Update movie to mark as rented (simulate inventory)
      await moviesCollection.updateOne(
        { _id: movie._id },
        { 
          $inc: { rentedCount: 1 },
          $set: { lastRented: new Date() }
        },
        { session }
      );
      
      console.log(`✅ Movie rental transaction completed: "${movie.title}"`);
    });
  } catch (error) {
    console.error("❌ Movie rental transaction failed:", error);
  } finally {
    await session.endSession();
  }
}

// Example 3: User Profile Update with Related Data
async function userProfileUpdateTransaction(client: MongoClient) {
  console.log("\n--- User Profile Update Transaction ---");
  
  const session = client.startSession();
  
  try {
    await session.withTransaction(async () => {
      const db = client.db('sample_mflix');
      const usersCollection = db.collection('users');
      const userActivityCollection = db.collection('user_activity');
      
      // Find a user to update
      const user = await usersCollection.findOne({}, { session });
      
      if (!user) {
        throw new Error("No user found to update");
      }
      
      // Update user profile
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            lastLogin: new Date(),
            profileUpdated: new Date()
          },
          $inc: { loginCount: 1 }
        },
        { session }
      );
      
      // Log the activity
      await userActivityCollection.insertOne({
        userId: user._id,
        action: "profile_update",
        timestamp: new Date(),
        details: "Profile updated via transaction"
      }, { session });
      
      console.log(`✅ User profile update transaction completed for: ${user.name || user.email}`);
    });
  } catch (error) {
    console.error("❌ User profile update transaction failed:", error);
  } finally {
    await session.endSession();
  }
}

// Example 4: Batch Operations with Transaction
async function batchOperationsTransaction(client: MongoClient) {
  console.log("\n--- Batch Operations Transaction ---");
  
  const session = client.startSession();
  
  try {
    await session.withTransaction(async () => {
      const db = client.db('sample_mflix');
      const batchCollection = db.collection('batch_operations');
      
      // Create multiple related documents
      const batchData = [
        { type: "order", orderId: "ORD001", amount: 100, status: "pending" },
        { type: "payment", orderId: "ORD001", amount: 100, status: "processing" },
        { type: "inventory", productId: "PROD001", change: -1, reason: "sold" }
      ];
      
      // Insert all documents atomically
      await batchCollection.insertMany(batchData, { session });
      
      // Update a summary document
      await batchCollection.updateOne(
        { type: "summary" },
        { 
          $inc: { totalOrders: 1, totalRevenue: 100 },
          $set: { lastUpdated: new Date() }
        },
        { upsert: true, session }
      );
      
      console.log("✅ Batch operations transaction completed");
    });
  } catch (error) {
    console.error("❌ Batch operations transaction failed:", error);
  } finally {
    await session.endSession();
  }
}

// Example 5: Transaction with Manual Control (Alternative Pattern)
async function manualTransactionExample(client: MongoClient) {
  console.log("\n--- Manual Transaction Control Example ---");
  
  const session = client.startSession();
  
  try {
    // Start transaction manually
    session.startTransaction();
    
    const db = client.db('sample_mflix');
    const collection = db.collection('manual_transaction_test');
    
    // Perform operations
    await collection.insertOne(
      { name: "Manual Transaction Test", timestamp: new Date() },
      { session }
    );
    
    // Simulate some condition that might cause rollback
    const shouldFail = false; // Change to true to see rollback
    if (shouldFail) {
      throw new Error("Simulated error - transaction will rollback");
    }
    
    // Commit transaction
    await session.commitTransaction();
    console.log("✅ Manual transaction committed successfully");
    
  } catch (error) {
    console.error("❌ Manual transaction failed:", error);
    await session.abortTransaction();
    console.log("🔄 Transaction rolled back");
  } finally {
    await session.endSession();
  }
}

// Example 6: Transaction with Retry Logic
async function transactionWithRetry(client: MongoClient) {
  console.log("\n--- Transaction with Retry Logic ---");
  
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        const db = client.db('sample_mflix');
        const collection = db.collection('retry_test');
        
        await collection.insertOne({
          attempt: retryCount + 1,
          timestamp: new Date(),
          message: "Transaction with retry"
        }, { session });
        
        console.log(`✅ Retry transaction succeeded on attempt ${retryCount + 1}`);
      });
      
      break; // Success, exit retry loop
      
    } catch (error) {
      retryCount++;
      console.error(`❌ Transaction attempt ${retryCount} failed:`, error.message);
      
      if (retryCount >= maxRetries) {
        console.error("🚫 Max retries exceeded, giving up");
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } finally {
      await session.endSession();
    }
  }
}

// ... existing functions remain the same ...
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
  const users = await db.collection('users').deleteOne({
    name: "Jaime Lannister",
  })
  console.log(users.deletedCount)
  return users;
}

main().catch(console.error);