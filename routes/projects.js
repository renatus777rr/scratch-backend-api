const express = require('express');
const router = express.Router();
const pool = require('../db');
const path = require('path');
const fs = require('fs');

// POST /projects/
router.post('/', async (req, res) => {
  try {
    const {
      id = 1,
      title = 'Untitled Project',
      description = '',
      instructions = '',
      author = {},
      image = '',
      history = {},
      stats = {},
      remix = {}
    } = req.body;

    const query = `
      INSERT INTO projects (
        id, title, description, instructions, image,
        author_id, author_username,
        history_created, history_modified, history_shared,
        stats_views, stats_loves, stats_favorites, stats_comments,
        remix_root_id
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8, $9, $10,
        $11, $12, $13, $14,
        $15
      ) RETURNING *;
    `;

    const values = [
      id,
      title,
      description,
      instructions,
      image,
      author.id || 2,
      author.username || 'renat',
      history.created ? new Date(history.created) : new Date(),
      history.modified ? new Date(history.modified) : new Date(),
      history.shared ? new Date(history.shared) : new Date(),
      stats.views || 0,
      stats.loves || 0,
      stats.favorites || 0,
      stats.comments || 0,
      remix.root || null
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error creating project:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /projects/count/all
router.get('/count/all', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM projects');
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to count projects' });
  }
});

// GET /projects/:id
router.get('/:id', async (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const row = result.rows[0];

    const project = {
      id: row.id,
      title: row.title,
      description: row.description,
      instructions: row.instructions,
      author: {
        id: row.author_id,
        username: row.author_username
      },
      image: row.image || '',
      history: {
        created: row.history_created,
        modified: row.history_modified,
        shared: row.history_shared
      },
      stats: {
        views: row.stats_views || 0,
        loves: row.stats_loves || 0,
        favorites: row.stats_favorites || 0,
        comments: row.stats_comments || 0,
        remixes: 0 // optional; set if you track it
      },
      remix: {
        root: row.remix_root_id
      },
      // Provide a token so logged-in flows don’t hang
      project_token: req.query.token || 'local-token'
    };

    res.json(project);
  } catch (err) {
    console.error('❌ Error fetching project:', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// GET /projects/:id/remixes
router.get('/:id/remixes', async (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  const limit = Math.min(parseInt(req.query.limit || '5', 10), 20);
  try {
    const result = await pool.query(
      `SELECT p.*
       FROM projects p
       WHERE p.remix_root_id = $1
       ORDER BY p.history_created DESC
       LIMIT $2`,
      [projectId, limit]
    );

    const remixes = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      image: row.image || '',
      author: {
        id: row.author_id,
        username: row.author_username || 'Unknown'
      },
      stats: {
        loves: row.stats_loves || 0,
        favorites: row.stats_favorites || 0,
        comments: row.stats_comments || 0,
        remixes: 0
      },
      history: {
        created: row.history_created,
        modified: row.history_modified,
        shared: row.history_shared
      }
    }));

    res.json(remixes);
  } catch (err) {
    console.error('❌ Error fetching remixes:', err);
    res.status(500).json({ error: 'Failed to fetch remixes' });
  }
});

// PATCH /projects/:id
router.patch('/:id', async (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid project ID' });

  try {
    const fields = [];
    const values = [];
    let i = 1;

    const addField = (key, value) => {
      fields.push(`${key} = $${i++}`);
      values.push(value);
    };

    const { title, description, instructions, image, author, history, stats, remix } = req.body;

    if (title !== undefined) addField('title', title);
    if (description !== undefined) addField('description', description);
    if (instructions !== undefined) addField('instructions', instructions);
    if (image !== undefined) addField('image', image);

    if (author?.id !== undefined) addField('author_id', author.id);
    if (author?.username !== undefined) addField('author_username', author.username);

    if (history?.created) addField('history_created', new Date(history.created));
    if (history?.modified) addField('history_modified', new Date(history.modified));
    if (history?.shared) addField('history_shared', new Date(history.shared));

    if (stats?.views !== undefined) addField('stats_views', stats.views);
    if (stats?.loves !== undefined) addField('stats_loves', stats.loves);
    if (stats?.favorites !== undefined) addField('stats_favorites', stats.favorites);
    if (stats?.comments !== undefined) addField('stats_comments', stats.comments);

    if (remix?.root !== undefined) addField('remix_root_id', remix.root);

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const query = `
      UPDATE projects SET ${fields.join(', ')}
      WHERE id = $${i} RETURNING *;
    `;
    values.push(projectId);

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: '✅ Project updated', project: result.rows[0] });
  } catch (err) {
    console.error('❌ Update failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /internalapi/project/:id/get/  (serve sb3)
router.get('/internalapi/project/:id/get/', async (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  const filePath = path.join(__dirname, '../uploads', `${projectId}.sb3`);

  if (fs.existsSync(filePath)) {
    res.type('application/zip');
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Project file not found' });
  }
});

module.exports = router;
