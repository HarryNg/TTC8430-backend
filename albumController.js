const express = require('express');
const Album = require('./models/Album');

const router = express.Router();

const passport = require('passport');

function isAuthenticated(req, res, next) {
  // Use passport.authenticate middleware with 'jwt' strategy to authenticate the request
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      // Error during authentication
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (!user) {
      // Authentication failed
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Authentication successful, continue to the next middleware/route handler
    req.user = user; // Attach user object to the request
    next();
  })(req, res, next); // Call passport.authenticate as a middleware
}


// Middleware to check if user is an admin
function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden' });
}

// Middleware to check if the authenticated user is the owner of the requested album
const isResourceOwner = async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }
    // Check if the authenticated user is the owner of the album
    if (album.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized: You are not the owner of this album' });
    }
    next(); // Move to the next middleware or route handler
  } catch (error) {
    console.error('Error checking album ownership:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



// Protected route to get all albums
router.get('/albums', isAuthenticated, async (req, res) => {
  try {
    let albums;
    // Check if the authenticated user is an admin
    if (req.user.role === 'admin') {
      // If user is admin, retrieve all albums
      albums = await Album.find({});
    } else {
      // If user is not admin, retrieve albums owned by the authenticated user or without owner
      albums = await Album.find({ $or: [{ owner: null }, { owner: req.user._id }] });
    }
    res.status(200).json({ albums });
  } catch (error) {
    console.error('Error retrieving albums:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Protected route to get album by id (requires authentication)
router.get('/albums/:id', isAuthenticated, async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }

    // Check if the authenticated user is the owner or is an admin
    if (req.user.role === 'admin' || album.owner.toString() === req.user._id.toString()) {
      // Return the album if the user is the owner or is an admin
      return res.status(200).json({ album });
    } else {
      // Otherwise, return a Forbidden error
      return res.status(403).json({ message: 'Forbidden: You are not allowed to access this album' });
    }
  } catch (error) {
    console.error('Error retrieving album:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Protected route to create an album (requires authentication)
router.post('/albums', isAuthenticated, async (req, res) => {
  try {
    const { title, artist, genre, year } = req.body;
    
    // Retrieve the ObjectId of the authenticated user
    const owner = req.user._id;

    // Create a new album object with the owner field automatically set
    const newAlbum = new Album({ title, artist, genre, year, owner });

    // Save the album document to MongoDB
    await newAlbum.save();

    // Return a success response with the created album document
    res.status(201).json({ message: 'Album created successfully', album: newAlbum });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error('Error creating album:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Protected route to update an album (requires authentication)
router.put('/albums/:id', isAuthenticated, async (req, res) => {
  try {
    const { title, artist,genre, year,tracks } = req.body;
    const album = await Album.findById(req.params.id);
    
    // Check if the album exists
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }

    // Check if the authenticated user is the owner or is an admin
    if (req.user.role === 'admin' || album.owner.toString() === req.user._id.toString()) {
      // Update the album if the user is the owner or is an admin
      const updatedAlbum = await Album.findByIdAndUpdate(req.params.id, { title, artist,genre, year,tracks } , { new: true });
      return res.status(200).json({ message: 'Album updated successfully', album: updatedAlbum });
    } else {
      // Otherwise, return a Forbidden error
      return res.status(403).json({ message: 'Forbidden: You are not allowed to update this album' });
    }
  } catch (error) {
    console.error('Error updating album:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Protected route to delete an album (requires authentication)
router.delete('/albums/:id', isAuthenticated, async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    
    // Check if the album exists
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }

    // Check if the authenticated user is an admin
    if (req.user.role === 'admin') {
      // Admin can delete any album, regardless of ownership
      await Album.findByIdAndDelete(req.params.id);
      return res.status(200).json({ message: 'Album deleted successfully' });
    } else {
      // Regular users can only delete their own albums
      if (album.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden: You are not allowed to delete this album' });
      }

      // Regular user is the owner of the album, allow deletion
      await Album.findByIdAndDelete(req.params.id);
      return res.status(200).json({ message: 'Album deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;
