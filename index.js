// Import required modules
require('dotenv').config(); // Load environment variables from .env file
const express = require('express'); // Web framework for Node.js
const cors = require('cors'); // Middleware for enabling CORS
const bodyParser = require('body-parser'); // Middleware for parsing request bodies
const dns = require('dns'); // Module for DNS lookup
const isUrl = require('is-url');

// Create an Express app instance
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000; // Set port from environment variable or default to 3000

// Enable CORS middleware to allow cross-origin requests
app.use(cors());

// Enable body-parser middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve static files from the /public directory
app.use('/public', express.static(`${process.cwd()}/public`));

// Root route to serve the index.html file
app.get('/', function(req, res) {
  // Send the index.html file from the views directory
  res.sendFile(process.cwd() + '/views/index.html');
});

// Example API endpoint
app.get('/api/hello', function(req, res) {
  // Return a JSON response with a greeting message
  res.json({ greeting: 'hello API' });
});

// Initialize URL counter and database
let urlCount = 1;
const urlDatabase = {};

// Function to verify URL existence using DNS lookup
function verifyUrlExistence(url, callback) {
  dns.lookup(url, (err) => {
    // If DNS lookup fails, return false
    if (err) {
      callback(false);
    } else {
      // If DNS lookup succeeds, return true
      callback(true);
    }
  });
}

// API endpoint to shorten URL
app.post('/api/shorturl', (req, res) => {
  // Get the original URL from the request body
  const originalUrl = req.body.url;

  // Validate URL format
  /*if (!isUrl(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }*/

  // Verify URL existence using DNS lookup
  verifyUrlExistence(originalUrl, (exists) => {
    // Return error response if URL does not exist
    if (!exists) {
      return res.json({ error: 'invalid url' });
    }

    // Check if URL is already shortened
    if (urlDatabase[originalUrl]) {
      // Return existing shortened URL
      return res.json({ original_url: originalUrl, short_url: urlDatabase[originalUrl] });
    }

    // Generate new shortened URL
    const shortUrl = urlCount++;

    // Store original URL and shortened URL in database
    urlDatabase[originalUrl] = shortUrl;

    // Return shortened URL response
    res.json({ original_url: originalUrl, short_url: shortUrl });
  });
});

// API endpoint to redirect to original URL
app.get('/api/shorturl/:short_url', (req, res) => {
  // Get the shortened URL from the route parameter
  const shortUrl = req.params.short_url;

  // Find the original URL in the database
  for (const originalUrl in urlDatabase) {
    if (urlDatabase[originalUrl] == shortUrl) {
      // Redirect to original URL
      return res.redirect(301, originalUrl);
    }
  }

  // Return error response if shortened URL is not found
  res.status(404).json({ error: 'Not Found' });
});

// Start the server and listen on the specified port
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
