const express = require('express');
const router = express.Router();
const pool = require('../db');
const path = require('path');
const fs = require('fs');
const db = require('../db'); // adjust path if needed

// GET /studios/:id → fetch studio info
router.get('/:id', async (req, res) => {
  const studioId = parseInt(req.params.id, 10);
  if (isNaN(studioId)) return res.status(400).json({ error: 'Invalid studio ID' });

  try {
    // Fetch studio
    const studioResult = await pool.query('SELECT * FROM studios WHERE id = $1', [studioId]);
    if (studioResult.rows.length === 0) return res.status(404).json({ error: 'Studio not found' });
    const studio = studioResult.rows[0];

    // Fetch owner username
    const ownerResult = await pool.query('SELECT username FROM users WHERE id = $1', [studio.owner_id]);
    const ownerUsername = ownerResult.rows[0]?.username || 'unknown';

    // Fetch curators
    const curatorsResult = await pool.query(
      'SELECT id, username FROM users WHERE id IN (SELECT user_id FROM studio_curators WHERE studio_id = $1)',
      [studioId]
    );

    const curators = curatorsResult.rows.map(user => {
      const avatarPath = path.join(__dirname, '../uploads/avatars', `${user.id}_90x90.png`);
      const avatarUrl = fs.existsSync(avatarPath)
        ? `http://localhost:3000/get_image/user/${user.id}_90x90.png`
        : `http://localhost:3000/uploads/avatars/default_90x90.png`;

      return {
        username: user.username,
        profile: {
          images: {
            "90x90": avatarUrl
          }
        }
      };
    });

    // Count projects
    const projectCountResult = await pool.query(
      'SELECT COUNT(*) FROM studio_projects WHERE studio_id = $1',
      [studioId]
    );

    // Count followers
    const followerCountResult = await pool.query(
      'SELECT COUNT(*) FROM studio_followers WHERE studio_id = $1',
      [studioId]
    );

    // Studio thumbnail
    const localPath = path.join(__dirname, '../uploads/studios/thumbnails', `${studioId}_90x90.png`);
    const thumbnail_url = fs.existsSync(localPath)
      ? `http://localhost:3000/uploads/studios/thumbnails/${studioId}_90x90.png`
      : `http://localhost:3000/uploads/studios/thumbnails/default_90x90.png`;

    // Final response
    res.json({
      id: studio.id,
      title: studio.title,
      description: studio.description || '',
      image: `http://localhost:3000/uploads/studios/thumbnails/${studioId}_90x90.png`,
      host: {
        id: studio.owner_id,
        username: ownerUsername
      },
      curators,
      stats: {
        projects: parseInt(projectCountResult.rows[0].count, 10),
        followers: parseInt(followerCountResult.rows[0].count, 10)
      },
      history: {
        created: studio.created_at
      },
      thumbnail_url
    });
  } catch (err) {
    console.error('❌ Error fetching studio:', err);
    res.status(500).json({ error: 'Failed to fetch studio' });
  }
});

// GET /studios/:id/projects → fetch projects in a studio
router.get('/:id/projects', async (req, res) => {
  const studioId = parseInt(req.params.id, 10);
  const limit = parseInt(req.query.limit, 10) || 24;
  const offset = parseInt(req.query.offset, 10) || 0;

  if (isNaN(studioId)) return res.status(400).json({ error: 'Invalid studio ID' });

  try {
    const result = await pool.query(
      `
      SELECT p.*
      FROM studio_projects sp
      JOIN projects p ON p.id = sp.project_id
      WHERE sp.studio_id = $1
      ORDER BY sp.added_at DESC
      LIMIT $2 OFFSET $3
      `,
      [studioId, limit, offset]
    );

    const projects = result.rows.map(row => {
      const thumbnailPath = path.join(__dirname, '../uploads/thumbnails', `${row.id}_90x90.png`);
      const thumbnailUrl = fs.existsSync(thumbnailPath)
        ? `http://localhost:3000/uploads/thumbnails/${row.id}_90x90.png`
        : `http://localhost:3000/uploads/thumbnails/default_90x90.png`;

      return {
        id: row.id,
        title: row.title,
        image: thumbnailUrl,
        avatar: { "90x90": thumbnailUrl },
        username: row.author_username,
        actor_id: row.actor_id || null
      };
    });

    res.json(projects);
  } catch (err) {
    console.error('❌ Error fetching studio projects:', err);
    res.status(500).json({ error: 'Failed to fetch studio projects' });
  }
});

// POST /studios/:id/curators → add a curator
router.post('/:id/curators', async (req, res) => {
  const studioId = parseInt(req.params.id, 10);
  const { userId } = req.body;

  if (isNaN(studioId) || isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid studio or user ID' });
  }

  try {
    await pool.query(
      'INSERT INTO studio_curators (studio_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [studioId, userId]
    );
    res.json({ message: '✅ Curator added' });
  } catch (err) {
    console.error('❌ Error adding curator:', err);
    res.status(500).json({ error: 'Failed to add curator' });
  }
});

// DELETE /studios/:id/curators/:userId → remove a curator
router.delete('/:id/curators/:userId', async (req, res) => {
  const studioId = parseInt(req.params.id, 10);
  const userId = parseInt(req.params.userId, 10);

  try {
    await pool.query(
      'DELETE FROM studio_curators WHERE studio_id = $1 AND user_id = $2',
      [studioId, userId]
    );
    res.json({ message: '✅ Curator removed' });
  } catch (err) {
    console.error('❌ Error removing curator:', err);
    res.status(500).json({ error: 'Failed to remove curator' });
  }
});

// GET /studios/:id/curators → fetch curators for a studio
router.get('/:id/curators', async (req, res) => {
  const studioId = parseInt(req.params.id, 10);
  if (isNaN(studioId)) {
    return res.status(400).json({ error: 'Invalid studio ID' });
  }

  try {
    // Grab all curator user records for this studio
    const result = await pool.query(
      `
      SELECT u.id, u.username
      FROM studio_curators sc
      JOIN users u ON sc.user_id = u.id
      WHERE sc.studio_id = $1
      ORDER BY sc.added_at DESC
      `,
      [studioId]
    );

    // Map each one into the shape StudioCurators expects
    const curators = result.rows.map(user => {
      const avatarPath = path.join(
        __dirname,
        '../uploads/avatars',
        `${user.id}_90x90.png`
      );
      const avatarUrl = fs.existsSync(avatarPath)
        ? `http://localhost:3000/get_image/user/${user.id}_90x90.png`
        : `http://localhost:3000/uploads/avatars/default_90x90.png`;

      return {
        id: user.id,
        username: user.username,
        profile: {
          images: {
            '90x90': avatarUrl
          }
        }
      };
    });

    // Return as an array — your redux module will stash it under `items`
    res.json(curators);
  } catch (err) {
    console.error('❌ Error fetching curators:', err);
    res.status(500).json({ error: 'Failed to fetch curators' });
  }
});

router.get('/:id/managers', async (req, res) => {
  const studioId = parseInt(req.params.id, 10);
  if (isNaN(studioId)) return res.status(400).json({ error: 'Invalid studio ID' });

  try {
    const result = await pool.query(
      `SELECT u.id, u.username
       FROM studio_managers sm
       JOIN users u ON sm.user_id = u.id
       WHERE sm.studio_id = $1
       ORDER BY sm.added_at DESC`,
      [studioId]
    );

    const managers = result.rows.map(user => {
      const avatarPath = path.join(__dirname, '../uploads/avatars', `${user.id}_90x90.png`);
      const avatarUrl = fs.existsSync(avatarPath)
        ? `http://localhost:3000/uploads/avatars/${user.id}_90x90.png`
        : `http://localhost:3000/uploads/avatars/default_90x90.png`;

      return {
        id: user.id,
        username: user.username,
        profile: {
          images: { '90x90': avatarUrl }
        }
      };
    });

    res.json(managers);
  } catch (err) {
    console.error('❌ Error fetching managers:', err);
    res.status(500).json({ error: 'Failed to fetch managers' });
  }
});

// POST /studios/:id/managers → add a manager
router.post('/:id/managers', async (req, res) => {
  const studioId = parseInt(req.params.id, 10);
  const { userId } = req.body;
  if (isNaN(studioId) || isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid studio or user ID' });
  }

  try {
    await pool.query(
      'INSERT INTO studio_managers (studio_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [studioId, userId]
    );
    res.json({ message: '✅ Manager added' });
  } catch (err) {
    console.error('❌ Error adding manager:', err);
    res.status(500).json({ error: 'Failed to add manager' });
  }
});

// DELETE /studios/:id/managers/:userId → remove a manager
router.delete('/:id/managers/:userId', async (req, res) => {
  const studioId = parseInt(req.params.id, 10);
  const userId = parseInt(req.params.userId, 10);

  try {
    await pool.query(
      'DELETE FROM studio_managers WHERE studio_id = $1 AND user_id = $2',
      [studioId, userId]
    );
    res.json({ message: '✅ Manager removed' });
  } catch (err) {
    console.error('❌ Error removing manager:', err);
    res.status(500).json({ error: 'Failed to remove manager' });
  }
});



module.exports = router;
