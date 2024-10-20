// Load environment variables from the .env file
require('dotenv').config();

const express = require('express');        // Import Express for creating the web server
const cors = require('cors');              // Import CORS for cross-origin resource sharing
const mongoose = require('mongoose');      // Import Mongoose for MongoDB interaction
const bodyParser = require('body-parser'); // Import body-parser for handling POST request body
const dns = require('dns');                // Import DNS for validating URLs

const app = express();                     // Initialize Express application

// Load port from environment variables or default to 3000
const port = process.env.PORT || 3000;

// Establish MongoDB connection using Mongoose
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Log if MongoDB connection is successful
mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

// Middleware setup
app.use(cors());                           // Enable CORS for all routes
app.use(bodyParser.urlencoded({ extended: false })); // Parse incoming POST requests

// Serve static files from the 'public' directory
app.use('/public', express.static(`${process.cwd()}/public`));

// Define the Mongoose schema for URL storage
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true }, // Original URL to be shortened
  short_url: { type: Number, unique: true }       // Shortened URL ID (unique)
});

// Create a model from the schema to interact with the database
const Url = mongoose.model('Url', urlSchema);

// Serve the index.html file when accessing the root URL
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Placeholder for generating unique short URL IDs
let shortUrlCounter = 1;

// POST endpoint to create a shortened URL
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;              // Get the URL from the request body

  // Validate the format of the URL using a simple regex pattern
  const urlRegex = /^(https?:\/\/)(www\.)?[\w\-]+\.\w+/;
  if (!urlRegex.test(originalUrl)) {
    return res.json({ error: 'invalid url' });  // If the URL is invalid, return an error
  }

  // Extract the hostname for DNS lookup to verify if the domain is valid
  const urlObj = new URL(originalUrl);
  const hostname = urlObj.hostname;

  // Perform DNS lookup to check if the hostname resolves to a valid IP
  dns.lookup(hostname, (err) => {
    if (err) {
      return res.json({ error: 'invalid url' }); // If DNS lookup fails, return an error
    }

    // Check if the URL has already been shortened by looking it up in the database
    Url.findOne({ original_url: originalUrl }, (err, foundUrl) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      
      if (foundUrl) {
        // If the URL is already in the database, return the existing short URL
        return res.json({ original_url: foundUrl.original_url, short_url: foundUrl.short_url });
      } else {
        // If the URL is new, create a new entry in the database with a unique short_url
        const newUrl = new Url({
          original_url: originalUrl,
          short_url: shortUrlCounter
        });

        // Save the new URL entry to the database
        newUrl.save((err, data) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal Server Error' });
          }

          // Respond with the original URL and the new short URL
          res.json({ original_url: data.original_url, short_url: data.short_url });
          shortUrlCounter++; // Increment the counter for the next short URL
        });
      }
    });
  });
});

// GET endpoint to redirect users to the original URL based on the short_url
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = parseInt(req.params.short_url, 10); // Get the short_url from the URL parameters

  // Find the original URL in the database using the short_url
  Url.findOne({ short_url: shortUrl }, (err, foundUrl) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (foundUrl) {
      // If the short_url is found, redirect to the original URL
      res.redirect(foundUrl.original_url);
    } else {
      // If the short_url is not found, return an error
      res.json({ error: 'No short URL found' });
    }
  });
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
