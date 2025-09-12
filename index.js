require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const pool = require('./db'); // PostgreSQL connection
const path = require('path');
const router = express.Router();

const app = express();
const csrfProtection = csurf({ cookie: true });

// Middleware
app.use(cors({ origin: 'http://localhost:8333', credentials: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// CSRF Token Route
app.get('/csrf_token/', csrfProtection, (req, res) => {
  const token = req.csrfToken();
  res.cookie('scratchcsrftoken', token);
  res.json({ token });
});

// Root Info Route
app.get('/', (req, res) => {
  res.json({
    api: "localhost:3000",
    help: "support@renat.dev",
    website: "localhost:8333"
  });
});

app.get('/get_image/user/:filename', (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', 'avatars', fileName);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('Avatar not found');
    }
  });
});




app.get('/news', (req, res) => {
  res.json([
    {
      id: 1,
      headline: 'Welcome to Local Scratch!',
      copy: 'This is a placeholder news item.',
      username: 'renat',
      image: 'http://localhost:3000/uploads/thumbnails/default_90x90.png'
    },
    {
      id: 2,
      headline: 'Another test news item',
      copy: 'More placeholder content.',
      username: 'renat',
      image: 'http://localhost:3000/uploads/thumbnails/default_90x90.png'
    }
  ]);
});



router.get('/internalapi/asset/:md5ext/get/', (req, res) => {
    const md5ext = req.params.md5ext; // e.g. "abcd1234.svg" or "efgh5678.wav"
    const filePath = path.join(__dirname, '..', 'uploads', 'assets', md5ext);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Asset not found');
    }

    // Set content type based on extension
    if (md5ext.endsWith('.svg')) res.type('image/svg+xml');
    else if (md5ext.endsWith('.png')) res.type('image/png');
    else if (md5ext.endsWith('.wav')) res.type('audio/wav');
    else if (md5ext.endsWith('.mp3')) res.type('audio/mpeg');
    else res.type('application/octet-stream');

    res.sendFile(filePath);
});


// Request Logger
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.originalUrl}`);
  console.log('🧠 Headers:', req.headers);
  if (req.method !== 'GET') {
    console.log('📦 Body:', req.body);
  }
  next();
});

// Modular Routes
const accountsRoutes = require('./routes/accounts');
const usersRoutes = require('./routes/users');
const proxyRoutes = require('./routes/proxy');
const projectsRoutes = require('./routes/projects');
const searchRoutes = require('./routes/search');
const studiosRouter = require('./routes/studios');

app.use('/accounts', accountsRoutes);
app.use('/users', usersRoutes);
app.use('/proxy', proxyRoutes);
app.use('/projects', projectsRoutes);
app.use('/search', searchRoutes);
app.use('/studios', studiosRouter);
app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads/avatars')));
app.use('/uploads/thumbnails', express.static(path.join(__dirname, 'uploads/thumbnails')));
app.use('/uploads/studios/thumbnails', express.static(path.join(__dirname, 'uploads/studios/thumbnails')));



// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Scratch API running at http://localhost:${PORT}`);
});