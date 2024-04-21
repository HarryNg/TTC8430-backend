const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
  },
  artist: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
  },
  genre: {
    type: String,
    required: true,
    enum: [
      'Rock',
      'Pop',
      'Jazz',
      'Hip-Hop',
      'Country',
      'Classical',
      'Electronic',
    ], // Example predefined list of acceptable genres
  },
  year: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear(), // Current year
  },
  tracks: {
    type: Number,
    min: 1,
    max: 100,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

albumSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Album = mongoose.model('Album', albumSchema);

module.exports = Album;
