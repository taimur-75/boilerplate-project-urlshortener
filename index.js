const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const dns = require('dns');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let urlCount = 1;
const urlDatabase = {};

// Function to validate URL
function isValidUrl(url) {
  const urlRegex = /^(https?:\/\/)(www\.)?[\w\-]+\.\w{2,5}/;
  return urlRegex.test(url);
}

// Function to verify URL existence
function verifyUrlExistence(url, callback) {
  dns.lookup(url, (err) => {
    if (err) {
      callback(false);
    } else {
      callback(true);
    }
  });
}

// Function to generate short URL
function generateShortUrl() {
  return urlCount++;
}

// POST route to shorten URL
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;

  if (!isValidUrl(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  verifyUrlExistence(originalUrl, (exists) => {
    if (!exists) {
      return res.json({ error: 'invalid url' });
    }

    if (urlDatabase[originalUrl]) {
      return res.json({ original_url: originalUrl, short_url: urlDatabase[originalUrl] });
    }

    const shortUrl = generateShortUrl();
    urlDatabase[originalUrl] = shortUrl;
    res.json({ original_url: originalUrl, short_url: shortUrl });
  });
});

// GET route to redirect to original URL
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = req.params.short_url;
  for (const originalUrl in urlDatabase) {
    if (urlDatabase[originalUrl] == shortUrl) {
      return res.redirect(301, originalUrl);
    }
  }
  res.status(404).json({ error: 'Not Found' });
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});