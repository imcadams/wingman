require('dotenv').config(); // This loads the .env file if it exists

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Use environment variables for configuration
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/wingman';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];

// Import models
const User = require('./models/User');
const ChatHistory = require('./models/ChatHistory');

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
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
      JWT_SECRET,
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
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
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

// Protected chat route
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { recruiterMessage, jobRequirements } = req.body;
    const userId = req.user.userId;

    // Fetch existing chat history from MongoDB
    let chatHistory = await ChatHistory.findOne({ userId });
    if (!chatHistory) {
      chatHistory = new ChatHistory({ userId, messages: [] });
    }

    const messages = [
      {
        role: "system",
        content: `You are Wingman, an AI assistant helping job seekers respond to recruiter messages. 
        The job seeker has the following requirements:
        - Desired Job Title: ${jobRequirements.title}
        - Salary Range: ${jobRequirements.salaryRange}
        - Work Arrangement: ${jobRequirements.workArrangement}
        - Minimum Vacation Time: ${jobRequirements.vacationTime} days/year
        - Additional Instructions: ${jobRequirements.additionalInstructions}
        
        Your task is to craft a polite and professional response to the recruiter's message, 
        asking for more information about the job opportunity and how it aligns with the job seeker's requirements. 
        Be concise but thorough in your response.

        Response Strategy:
        - If work arrangements, salary, or other key details aren't provided in the initial message, request additional information before declining.
        - Politely decline opportunities that do not meet the specified criteria while expressing openness to future opportunities that better align.
        - If an opportunity is not of interest, mention a preference for being kept in mind for fully remote, direct hire roles.

        Communication Preferences:
        - Provide only the final version of response messages for easy copying.
        - Focus on concise, professional language in all responses.
        - If necessary, guide the recruiter to clarify role details before making a decision.`
      },
      ...chatHistory.messages,
      {
        role: "user",
        content: `Recruiter's message: ${recruiterMessage}`
      }
    ];

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4",
      messages: messages,
      max_tokens: 300,
      n: 1,
      temperature: 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const aiResponse = response.data.choices[0].message.content.trim();

    // Update chat history in MongoDB
    chatHistory.messages.push({ role: "user", content: recruiterMessage });
    chatHistory.messages.push({ role: "assistant", content: aiResponse });

    // Limit chat history to last 20 messages
    if (chatHistory.messages.length > 20) {
      chatHistory.messages = chatHistory.messages.slice(-20);
    }

    await chatHistory.save();

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});