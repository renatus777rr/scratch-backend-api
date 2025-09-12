const express = require('express');
const router = express.Router();
const pool = require('../db');
const path = require('path');
const fs = require('fs');

// GET /search/projects?q=...&limit=...&offset=...
router.get('/projects', async (req, res) => {
  const { q = '', limit = 10, offset = 0 } = req.query;

  try {
    const query = q.trim();
    let sql, values;

    if (query) {
      sql = `
        SELECT id, title, image, author_username
        FROM projects
        WHERE title ILIKE $1
        ORDER BY history_created DESC
        LIMIT $2 OFFSET $3
      `;
      values = [`%${query}%`, parseInt(limit, 10), parseInt(offset, 10)];
    } else {
      sql = `
        SELECT id, title, image, author_username
        FROM projects
        ORDER BY history_created DESC
        LIMIT $1 OFFSET $2
      `;
      values = [parseInt(limit, 10), parseInt(offset, 10)];
    }

    const result = await pool.query(sql, values);

    const projects = result.rows.map(row => {
      // Check if local thumbnail exists
      const thumbPath = path.join(__dirname, '../uploads/thumbnails', `${row.id}_90x90.png`);
      const thumbUrl = fs.existsSync(thumbPath)
        ? `http://localhost:3000/uploads/thumbnails/${row.id}_90x90.png`
        : (row.image || `http://localhost:3000/uploads/thumbnails/default_90x90.png`);

      return {
        id: row.id,
        title: row.title,
        thumbnail_url: thumbUrl,
        author: {
          username: row.author_username
        }
      };
    });

    res.json(projects);
  } catch (err) {
    console.error('❌ Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;