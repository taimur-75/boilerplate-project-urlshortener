// Import required modules
require('dotenv').config(); 
const express = require('express'); 
const cors = require('cors'); 
const bodyParser = require('body-parser'); 
const http = require('http');
const https = require('https'); 
const URL = require('url-parse');
const isUrl = require('is-url');

// Create an Express app instance
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000; 

// Enable CORS middleware to allow cross-origin requests
app.use(cors());

// Enable body-parser middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve static files from the /public directory
app.use('/public', express.static(`${process.cwd()}/public`));

// Root route to serve the index.html file
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Example API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// Initialize URL counter and database
let urlCount = 1;
const urlDatabase = {};

// Function to verify URL existence using HTTPS request
function verifyUrlExistence(url, callback) {
  const protocol = url.startsWith('https') ? https : http;

  protocol.get(url, (res) => {
    callback(true); 
  }).on('error', (err) => {
    callback(false); 
  });
}

// API endpoint to shorten URL
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;

  // Validate URL format
  if (!isUrl(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  // Verify URL existence using HTTPS request
  verifyUrlExistence(originalUrl, (exists) => {
    if (!exists) {
      return res.json({ error: 'invalid url' });
    }

    if (urlDatabase[originalUrl]) {
      return res.json({ original_url: originalUrl, short_url: urlDatabase[originalUrl] });
    }

    const shortUrl = urlCount++;

    urlDatabase[originalUrl] = shortUrl;

    res.json({ original_url: originalUrl, short_url: shortUrl });
  });
});

// API endpoint to redirect to original URL
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = req.params.short_url;

  for (const originalUrl in urlDatabase) {
    if (urlDatabase[originalUrl] == shortUrl) {
      return res.redirect(301, originalUrl);
    }
  }

  res.status(404).json({ error: 'Not Found' });
});

// Start the server and listen on the specified port
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});