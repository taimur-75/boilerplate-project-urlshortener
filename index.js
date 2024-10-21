// Load environment variables from the .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

app.use(helmet());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, unique: true }
});

const Url = mongoose.model('Url', urlSchema);

// Initialize short URL counter
let shortUrlCounter = 1;

// Function to generate unique short URL
const generateShortUrl = () => {
  return shortUrlCounter++;
};

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', async (req, res) => {
  try {
    const originalUrl = req.body.url;
    const urlRegex = /^(https?:\/\/)(www\.)?[\w\-]+\.\w+/;
    if (!urlRegex.test(originalUrl)) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const urlObj = new URL(originalUrl);
    const hostname = urlObj.hostname;

    await new Promise((resolve, reject) => {
      dns.lookup(hostname, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const existingUrl = await Url.findOne({ original_url: originalUrl });
    if (existingUrl) {
      return res.json({ original_url: existingUrl.original_url, short_url: existingUrl.short_url });
    }

    const newUrl = new Url({
      original_url: originalUrl,
      short_url: generateShortUrl()
    });

    await newUrl.save();
    res.json({ original_url: newUrl.original_url, short_url: newUrl.short_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/shorturl/:short_url', async (req, res) => {
  try {
    const shortUrl = parseInt(req.params.short_url, 10);
    const foundUrl = await Url.findOne({ short_url: shortUrl });
    if (foundUrl) {
      res.redirect(foundUrl.original_url);
    } else {
      res.status(404).json({ error: 'Not Found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});