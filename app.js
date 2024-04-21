// Import required modules
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/userModel');
const passport = require('passport');
const connectMongoDB = require('./db/mongodb');
const albumController = require('./albumController');
const jwt = require('jsonwebtoken');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');

const app = express();
const PORT = process.env.PORT || 3000;
let server;

// Middleware to parse JSON request body
app.use(bodyParser.json());

// Configure session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));
// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());
// Configure Passport to serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});


// Configure passport-local strategy for registration and login
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username });
    if (!user ) {
      return done(null, false, { message: 'Invalid username or password.' });
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));
// Configure Passport to use JWT strategy
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: 'your-secret-key' // Use the same secret key that was used to sign the JWT
}, async (jwtPayload, done) => {
  try {
    // Find the user by ID extracted from JWT payload
    const user = await User.findById(jwtPayload.userId);
    if (!user) {
      return done(null, false);
    }
    // If user is found, return user object
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}));

// Define register route
app.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, role } = req.body;
    // Check if the password and confirmPassword match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    // Check if a user with the provided username already exists in the database
    const user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'Username already exists.' });
    }
    // Create a new user with the provided username, email, and password
    const newUser = new User({ username, email, password, role });
    await newUser.save();
    res.json({ message: 'Registration successful', user: newUser });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Define login route using passport.authenticate
app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Error during authentication:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (!user) {
      console.log('Authentication failed:', info.message);
      return res.status(401).json({ message: 'Authentication failed', error: info.message });
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error('Error logging in user:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      console.log('User authenticated successfully:', user);
      
      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, 'your-secret-key', { expiresIn: '12h' }); 
      
      // Return the token along with the user object in the response
      return res.json({ message: 'Login successful', user, token });
    });
  })(req, res, next);
});

// Define logout route
app.get('/logout', (req, res) => {
  req.logout(() => {
    res.json({ message: 'Logout successful' });
  });
});

// Connect to MongoDB and start the server
async function startServer() {
  try {
    await connectMongoDB();
    console.log('Connected to MongoDB');
    server = app.listen(PORT, () => { // Assign server instance to the 'server' variable
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit the process if MongoDB connection fails
  }
}

// Stop the server - for use in testing
async function stopServer() {
  if (server) {
    await server.close();
    console.log('Server stopped');
  }
}

// Attach stopServer method to app object
app.stopServer = stopServer;

// Start the server
startServer();

app.use('/', albumController);


module.exports = app;