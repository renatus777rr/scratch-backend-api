const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /users/:username
router.get('/:username', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [req.params.username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      history: {
        joined: user.created_at,
        login: user.last_login || user.created_at
      },
      id: user.id,
      profile: {
        avatar: user.avatar || null,
        bio: user.bio || '',
        id: user.profile_id || null,
        status: user.status || ''
      },
      username: user.username
    });
  } catch (err) {
    console.error('❌ Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /users/:username/projects
router.get('/:username/projects', async (req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM projects WHERE author_username = $1 LIMIT $2 OFFSET $3',
      [req.params.username, parseInt(limit), parseInt(offset)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching user projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /users/:username/projects/:project
router.get('/:username/projects/:project', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM projects WHERE author_username = $1 AND id = $2',
      [req.params.username, parseInt(req.params.project)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error fetching project:', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// GET /users/:username/favorites
router.get('/:username/favorites', async (req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM projects LIMIT $1 OFFSET $2',
      [parseInt(limit), parseInt(offset)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching favorites:', err);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Studios I follow
router.get('/:username/following/studios', async (req, res) => {
  const username = req.params.username;
  try {
    const query = `
      SELECT s.id, s.title, u.id AS owner_id, u.username
      FROM users AS me
      JOIN studio_followers sf ON sf.user_id = me.id
      JOIN studios s ON s.id = sf.studio_id
      LEFT JOIN users u ON s.owner_id = u.id
      WHERE me.username = $1
      ORDER BY s.created_at DESC
      LIMIT 20;
    `;
    const result = await pool.query(query, [username]);

    const studios = result.rows.map(studio => ({
      id: studio.id,
      title: studio.title,
      type: 'gallery',
      image: `http://localhost:3000/uploads/studios/thumbnails/${studio.id}_90x90.png`,
      username: studio.username || 'Unknown',
      host: {
        id: studio.owner_id || 0,
        username: studio.username || 'Unknown'
      }
    }));

    res.json(studios);
  } catch (err) {
    console.error('❌ Error fetching followed studios:', err);
    res.status(500).json({ error: 'Failed to fetch followed studios' });
  }
});

// Projects from studios I follow
router.get('/:username/following/studios/projects', async (req, res) => {
  const username = req.params.username;
  try {
    const query = `
      SELECT p.*, u.username AS author_username
      FROM users me
      JOIN studio_followers sf ON sf.user_id = me.id
      JOIN studio_projects sp ON sp.studio_id = sf.studio_id
      JOIN projects p ON p.id = sp.project_id
      JOIN users u ON p.author_id = u.id
      WHERE me.username = $1
      ORDER BY sp.added_at DESC
      LIMIT 20;
    `;
    const result = await pool.query(query, [username]);

    const projects = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      thumbnail_url: row.image || '',
      username: row.author_username || 'Unknown',
      type: 'project'
    }));

    res.json(projects);
  } catch (err) {
    console.error('❌ Error fetching followed studio projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects from followed studios' });
  }
});

// Projects from users I follow
router.get('/:username/following/users/projects', async (req, res) => {
  const username = req.params.username;
  try {
    const query = `
      SELECT p.id, p.title, p.image AS thumbnail_url, u.username
      FROM users me
      JOIN user_follows uf ON uf.follower_id = me.id
      JOIN projects p ON p.author_id = uf.followee_id
      JOIN users u ON p.author_id = u.id
      WHERE me.username = $1
      ORDER BY p.history_created DESC
      LIMIT 20;
    `;
    const result = await pool.query(query, [username]);
    const projects = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      thumbnail_url: row.thumbnail_url || '',
      username: row.username || 'Unknown',
      type: 'project'
    }));
    res.json(projects);
  } catch (err) {
    console.error('❌ Error fetching followed user projects:', err);
    res.status(500).json({ error: 'Failed to fetch followed user projects' });
  }
});

// Loved by users I follow
router.get('/:username/following/users/loves', async (req, res) => {
  const username = req.params.username;
  try {
    const query = `
      SELECT p.id, p.title, p.image AS thumbnail_url, u.username
      FROM users me
      JOIN user_follows uf ON uf.follower_id = me.id
      JOIN loves l ON l.user_id = uf.followee_id
      JOIN projects p ON p.id = l.project_id
      JOIN users u ON p.author_id = u.id
      WHERE me.username = $1
      ORDER BY l.created_at DESC
      LIMIT 20;
    `;
    const result = await pool.query(query, [username]);
    const lovedProjects = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      thumbnail_url: row.thumbnail_url || '',
      username: row.username || 'Unknown',
      type: 'project'
    }));
    res.json(lovedProjects);
  } catch (err) {
    console.error('❌ Error fetching followed user loves:', err);
    res.status(500).json({ error: 'Failed to fetch followed user loves' });
  }
});

// Activity feed (placeholder)
router.get('/:username/activity', async (req, res) => {
  res.json([
    {
      actor: {
        username: "DemoUser",
        pk: 123,
        thumbnail_url: "https://cdn.scratch.mit.edu/static/site/users/avatars/123/0001.png",
        admin: false
      },
      datetime_created: new Date().toISOString(),
      extra_data: { project_title: "Demo Project" },
      message: 'loved <a href="/projects/1">Demo Project</a>',
      obj_id: 1,
      pk: 999,
      type: 2
    }
  ]);
});

// Activity count (placeholder)
router.get('/:username/activity/count', async (req, res) => {
  res.json({ msg_count: 0 });
});

// NEW: messages count (what the UI calls after login)
router.get('/:username/messages/count', async (req, res) => {
  // Always return a consistent numeric count
  res.json({ count: 0 });
});

// Activity from users I follow (project-like items)
router.get('/:username/following/users/activity', async (req, res) => {
  try {
    const username = req.params.username;
    const query = `
      SELECT p.id, p.title, p.image AS thumbnail_url, u.username
      FROM users me
      JOIN user_follows uf ON uf.follower_id = me.id
      JOIN projects p ON p.author_id = uf.followee_id
      JOIN users u ON p.author_id = u.id
      WHERE me.username = $1
      ORDER BY p.history_created DESC
      LIMIT 5;
    `;
    const result = await pool.query(query, [username]);

    const activity = (result.rows || [])
      .filter(Boolean)
      .map(row => ({
        id: row.id,
        title: row.title,
        thumbnail_url: row.thumbnail_url || 'http://localhost:3000/uploads/thumbnails/default_90x90.png',
        username: row.username || 'Unknown',
        type: 'project'
      }));

    res.json(activity);
  } catch (err) {
    console.error('❌ Error fetching followed user activity:', err);
    res.json([]); // safe fallback
  }
});

router.get('/:username/projects/:project/visibility', async (req, res) => {
  // Minimal shape to keep UI happy
  // Alternatives seen in the wild: { visibility: "visible" } or { public: true, status: "visible" }
  res.json({ visibility: 'visible' });
});

module.exports = router;
