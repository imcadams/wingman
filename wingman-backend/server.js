require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Import models
const User = require('./models/User');
const ChatHistory = require('./models/ChatHistory');

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt for username:', username);

  try {
    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found:', username);
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Invalid password for user:', username);
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Login successful for user:', username);
    res.json({ 
      token, 
      userId: user._id,
      jobRequirements: user.jobRequirements 
    });
  } catch (error) {
    console.error('Server error during login:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Fetch chat history
app.get('/chat-history', authenticateToken, async (req, res) => {
  try {
    const chatHistory = await ChatHistory.findOne({ userId: req.user.userId });
    if (!chatHistory) {
      return res.json({ messages: [] });
    }
    res.json({ messages: chatHistory.messages });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add message to chat history
app.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    let chatHistory = await ChatHistory.findOne({ userId: req.user.userId });
    
    if (!chatHistory) {
      chatHistory = new ChatHistory({ userId: req.user.userId, messages: [] });
    }
    
    chatHistory.messages.push({ role: 'user', content: message });
    
    // Here you would typically generate an AI response
    const aiResponse = "This is a placeholder AI response.";
    chatHistory.messages.push({ role: 'assistant', content: aiResponse });
    
    await chatHistory.save();
    
    res.json({ message: aiResponse });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add this new route for saving job requirements
app.post('/api/job-requirements', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const jobRequirements = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.jobRequirements = jobRequirements;
    await user.save();

    res.json({ message: 'Job requirements saved successfully', jobRequirements });
  } catch (error) {
    console.error('Error saving job requirements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'An unexpected error occurred' });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running on port ${port}`));