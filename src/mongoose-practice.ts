import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, IUser } from './models/User';
import { Movie, IMovie } from './models/Movie';

dotenv.config();

async function connectToDatabase() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not set');
    }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB with Mongoose');

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('📡 MongoDB disconnected');
    });

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function userCRUDExamples() {
  console.log('\n=== User CRUD Examples with Mongoose ===');

  try {
    console.log('\n--- Creating Users ---');
    
    const user1 = new User({
      name: 'Jon Snow',
      email: 'jon.snow@winterfell.com',
      password: 'ghost123'
    });
    await user1.save();
    console.log('✅ User created (Method 1):', user1.getPublicProfile());

    const user2 = await User.create({
      name: 'Daenerys Targaryen',
      email: 'dany@dragonstone.com',
      password: 'dragons123'
    });
    console.log('✅ User created (Method 2):', user2.getPublicProfile());

    const users = await User.create([
      {
        name: 'Tyrion Lannister',
        email: 'tyrion@casterly-rock.com',
        password: 'wine123'
      },
      {
        name: 'Arya Stark',
        email: 'arya@winterfell.com',
        password: 'needles123'
      }
    ]);
    console.log(`✅ Created ${users.length} users at once`);

    console.log('\n--- Reading Users ---');
    
    const allUsers = await User.find();
    console.log(`📊 Total users: ${allUsers.length}`);

    const jonSnow = await User.findOne({ name: 'Jon Snow' });
    console.log('🔍 Found user:', jonSnow?.getPublicProfile());

    const dany = await User.findByEmail('dany@dragonstone.com');
    console.log('🔍 Found by email:', dany?.getPublicProfile());

    const starks = await User.find({ 
      email: { $regex: /@winterfell\.com$/ } 
    });
    console.log(`🏰 Stark family members: ${starks.length}`);

    const userNames = await User.find({}, 'name email');
    console.log('📋 User names only:', userNames.map(u => u.name));

    console.log('\n--- Updating Users ---');
    
    const updatedUser = await User.findByIdAndUpdate(
      user1._id,
      { name: 'Jon Snow (King in the North)' },
      { new: true } 
    );
    console.log('✅ Updated user:', updatedUser?.getPublicProfile());

    const updateResult = await User.updateMany(
      { email: { $regex: /@winterfell\.com$/ } },
      { $set: { house: 'Stark' } }
    );
    console.log(`✅ Updated ${updateResult.modifiedCount} Stark members`);

    console.log('\n--- Deleting Users ---');
    
    const deleteResult = await User.deleteOne({ email: 'tyrion@casterly-rock.com' });
    console.log(`✅ Deleted ${deleteResult.deletedCount} user`);

    const cleanup = await User.deleteMany({ 
      email: { $in: ['jon.snow@winterfell.com', 'dany@dragonstone.com', 'arya@winterfell.com'] }
    });
    console.log(`🧹 Cleaned up ${cleanup.deletedCount} test users`);

  } catch (error) {
    console.error('❌ User CRUD error:', error);
  }
}

async function advancedQueryExamples() {
  console.log('\n=== Advanced Query Examples ===');

  try {
    const highRatedMovies = await Movie
      .find({ 'imdb.rating': { $gte: 8.0 } })
      .select('title year imdb.rating genres')
      .sort({ 'imdb.rating': -1 })
      .limit(5);
    
    console.log('🎬 Top 5 highest rated movies:');
    highRatedMovies.forEach(movie => {
      console.log(`   ${movie.title} (${movie.year}) - ${movie.imdb?.rating}/10`);
    });

    const actionMovies = await Movie
      .where('genres').in(['Action'])
      .where('year').gte(2000)
      .select('title year genres')
      .limit(3);

    console.log('\n🎯 Recent Action movies:');
    actionMovies.forEach(movie => {
      console.log(`   ${movie.title} (${movie.year})`);
    });

    const genreStats = await Movie.aggregate([
      { $unwind: '$genres' },
      { $group: { 
          _id: '$genres', 
          count: { $sum: 1 },
          avgRating: { $avg: '$imdb.rating' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    console.log('\n📊 Genre statistics:');
    genreStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} movies, avg rating: ${stat.avgRating?.toFixed(1)}`);
    });

  } catch (error) {
    console.error('❌ Advanced query error:', error);
  }
}

async function validationExamples() {
  console.log('\n=== Validation Examples ===');

  try {
    const invalidUser = new User({
      name: 'A', // Too short
      email: 'invalid-email', // Invalid format
      password: '123' // Too short
    });

    await invalidUser.save();

  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      console.log('❌ Validation failed as expected:');
      Object.values(error.errors).forEach(err => {
        console.log(`   - ${err.path}: ${err.message}`);
      });
    }
  }

  try {
    const validUser = new User({
      name: 'Valid User',
      email: 'valid@email.com',
      password: 'validpassword123'
    });

    await validUser.save();
    console.log('✅ Valid user created successfully');
    
    await User.deleteOne({ email: 'valid@email.com' });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Transaction Examples with Mongoose
async function transactionExamples() {
  console.log('\n=== Transaction Examples with Mongoose ===');

  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const user = await User.create([{
        name: 'Transaction User',
        email: 'transaction@test.com',
        password: 'password123'
      }], { session });

      const movie = await Movie.findOne({}, null, { session });
      if (movie) {
        movie.rentedCount = (movie.rentedCount || 0) + 1;
        movie.lastRented = new Date();
        await movie.save({ session });
        
        console.log(`✅ Transaction completed: User ${user[0].name} rented "${movie.title}"`);
      }
    });

  } catch (error) {
    console.error('❌ Transaction failed:', error);
  } finally {
    await session.endSession();
    
    await User.deleteOne({ email: 'transaction@test.com' });
  }
}

async function main() {
  await connectToDatabase();
  
  await userCRUDExamples();
  await advancedQueryExamples();
  await validationExamples();
  await transactionExamples();
  
  await mongoose.connection.close();
  console.log('\n🏁 Mongoose practice completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

export { connectToDatabase, userCRUDExamples, advancedQueryExamples }; 