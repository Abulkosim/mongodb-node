import mongoose, { Schema, Document } from 'mongoose';

export interface IMovie extends Document {
  title: string;
  year?: number;
  genres?: string[];
  directors?: string[];
  cast?: string[];
  plot?: string;
  runtime?: number;
  rated?: string;
  imdb?: {
    rating?: number;
    votes?: number;
    id?: string;
  };
  tomatoes?: {
    viewer?: {
      rating?: number;
      numReviews?: number;
    };
    critic?: {
      rating?: number;
      numReviews?: number;
    };
  };
  rentedCount?: number;
  lastRented?: Date;
}

const movieSchema = new Schema<IMovie>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    index: true // For faster queries
  },
  year: {
    type: Number,
    min: [1800, 'Year must be after 1800'],
    max: [new Date().getFullYear() + 5, 'Year cannot be too far in the future']
  },
  genres: [{
    type: String,
    trim: true
  }],
  directors: [{
    type: String,
    trim: true
  }],
  cast: [{
    type: String,
    trim: true
  }],
  plot: {
    type: String,
    trim: true,
    maxlength: [1000, 'Plot cannot exceed 1000 characters']
  },
  runtime: {
    type: Number,
    min: [1, 'Runtime must be at least 1 minute']
  },
  rated: {
    type: String,
    enum: ['G', 'PG', 'PG-13', 'R', 'NC-17', 'UNRATED', 'NOT RATED']
  },
  imdb: {
    rating: { type: Number, min: 0, max: 10 },
    votes: { type: Number, min: 0 },
    id: String
  },
  tomatoes: {
    viewer: {
      rating: { type: Number, min: 0, max: 5 },
      numReviews: { type: Number, min: 0 }
    },
    critic: {
      rating: { type: Number, min: 0, max: 10 },
      numReviews: { type: Number, min: 0 }
    }
  },
  rentedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastRented: Date
}, {
  timestamps: true
});

// Indexes for better query performance
movieSchema.index({ title: 'text', plot: 'text' }); // Text search
movieSchema.index({ genres: 1 });
movieSchema.index({ year: 1 });
movieSchema.index({ 'imdb.rating': -1 });

// Instance methods
movieSchema.methods.rent = function() {
  this.rentedCount = (this.rentedCount || 0) + 1;
  this.lastRented = new Date();
  return this.save();
};

movieSchema.methods.getBasicInfo = function() {
  return {
    _id: this._id,
    title: this.title,
    year: this.year,
    genres: this.genres,
    rated: this.rated,
    imdb: this.imdb
  };
};

// Static methods
movieSchema.statics.findByGenre = function(genre: string) {
  return this.find({ genres: { $in: [genre] } });
};

movieSchema.statics.findHighRated = function(minRating = 7) {
  return this.find({ 'imdb.rating': { $gte: minRating } });
};

export const Movie = mongoose.model<IMovie>('Movie', movieSchema); 