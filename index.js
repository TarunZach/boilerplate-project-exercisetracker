const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

// Basic Configuration
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/exercise-tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected successfully');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Define Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ username: username });
    
    if (existingUser) {
      return res.json({
        username: existingUser.username,
        _id: existingUser._id
      });
    }
    
    // Create new user
    const newUser = new User({ username: username });
    const savedUser = await newUser.save();
    
    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add exercise to user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;
  
  try {
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create new exercise
    const newExercise = new Exercise({
      userId: userId,
      description: description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });
    
    const savedExercise = await newExercise.save();
    
    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;
  
  try {
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build query for exercises
    let dateQuery = { userId: userId };
    
    if (from || to) {
      dateQuery.date = {};
      if (from) {
        dateQuery.date.$gte = new Date(from);
      }
      if (to) {
        dateQuery.date.$lte = new Date(to);
      }
    }
    
    // Find exercises
    let exerciseQuery = Exercise.find(dateQuery);
    
    if (limit) {
      exerciseQuery = exerciseQuery.limit(parseInt(limit));
    }
    
    const exercises = await exerciseQuery.exec();
    
    // Format log data
    const log = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));
    
    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: log
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Your app is listening on port ${port}`);
});