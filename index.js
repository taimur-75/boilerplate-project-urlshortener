const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let urlCount = 1;
const urlDatabase = {};

app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;
  const urlRegex = /^(https?:\/\/)(www\.)?[\w\-]+\.\w{2,5}/;

  if (!urlRegex.test(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  if (urlDatabase[originalUrl]) {
    return res.json({ original_url: originalUrl, short_url: urlDatabase[originalUrl] });
  }

  const shortUrl = urlCount++;
  urlDatabase[originalUrl] = shortUrl;
  res.json({ original_url: originalUrl, short_url: shortUrl });
});

app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = req.params.short_url;
  for (const originalUrl in urlDatabase) {
    if (urlDatabase[originalUrl] == shortUrl) {
      return res.redirect(301, originalUrl);
    }
  }
  res.json({ error: 'Not Found' });
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});