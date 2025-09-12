const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /proxy/featured
router.get('/featured', async (req, res) => {
    try {
        const lovedResult = await db.query(`
            SELECT p.id, p.title, p.image AS thumbnail_url, u.username
            FROM projects p
            JOIN users u ON p.author_id = u.id
            ORDER BY p.stats_loves DESC
            LIMIT 5
        `);

        const remixedResult = await db.query(`
            SELECT p.id, p.title, p.image AS thumbnail_url, u.username
            FROM projects p
            JOIN users u ON p.author_id = u.id
            WHERE p.remix_root_id IS NOT NULL
            ORDER BY p.remix_root_id DESC
            LIMIT 5
        `);

        const newestResult = await db.query(`
            SELECT p.id, p.title, p.image AS thumbnail_url, u.username
            FROM projects p
            JOIN users u ON p.author_id = u.id
            ORDER BY p.history_created DESC
            LIMIT 5
        `);

        const featuredProjects = lovedResult.rows.slice(0, 2).map(project => ({
            id: project.id,
            thumbnail_url: project.thumbnail_url || '',
            title: project.title,
            username: project.username || 'Unknown',
            type: 'project'
        }));

        // Studios now joined with users to get username
        const studiosResult = await db.query(`
            SELECT s.id, s.title, u.id AS owner_id, u.username
            FROM studios s
            LEFT JOIN users u ON s.owner_id = u.id
            ORDER BY s.created_at DESC
            LIMIT 3
        `);

        const featuredStudios = studiosResult.rows.map(studio => ({
            id: studio.id,
            title: studio.title,
            type: 'gallery',
            image: `http://localhost:3000/uploads/studios/thumbnails/${studio.id}_90x90.png`,
            username: studio.username || 'Unknown', // top-level username for carousel.jsx
            host: {
                id: studio.owner_id || 0,
                username: studio.username || 'Unknown'
            }
        }));

        const mostLoved = lovedResult.rows.map(project => ({
            id: project.id,
            thumbnail_url: project.thumbnail_url || '',
            title: project.title,
            username: project.username || 'Unknown',
            type: 'project'
        }));

        const mostRemixed = remixedResult.rows.map(project => ({
            id: project.id,
            thumbnail_url: project.thumbnail_url || '',
            title: project.title,
            username: project.username || 'Unknown',
            type: 'project'
        }));

        const newest = newestResult.rows.map(project => ({
            id: project.id,
            thumbnail_url: project.thumbnail_url || '',
            title: project.title,
            username: project.username || 'Unknown',
            type: 'project'
        }));

        res.json({
            community_featured_projects: featuredProjects || [],
            community_featured_studios: featuredStudios || [],
            community_most_loved_projects: mostLoved || [],
            community_most_remixed_projects: mostRemixed || [],
            community_newest_projects: newest || []
        });
    } catch (err) {
        console.error('❌ Error fetching featured content:', err);
        res.status(500).json({ error: 'Failed to fetch featured content' });
    }
});

// GET /proxy/users/:id/featured
router.get('/users/:id/featured', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    try {
        const result = await db.query(`
            SELECT p.id, p.title, p.image AS thumbnail_url, u.username
            FROM projects p
            JOIN users u ON p.author_id = u.id
            WHERE p.author_id = $1
            ORDER BY p.history_created DESC
            LIMIT 5
        `, [userId]);

        const featured = result.rows.map(project => ({
            id: project.id,
            thumbnail_url: project.thumbnail_url || '',
            title: project.title,
            username: project.username || 'Unknown',
            type: 'project'
        }));

        res.json({
            community_featured_projects: featured || [],
            community_featured_studios: [],
            community_most_loved_projects: featured || [],
            community_most_remixed_projects: featured || [],
            community_newest_projects: featured || []
        });
    } catch (err) {
        console.error('❌ Error fetching user featured projects:', err);
        res.status(500).json({ error: 'Failed to fetch user featured content' });
    }
});

// GET /proxy/comments/studio/:studioId
router.get('/comments/studio/:studioId', async (req, res) => {
    const { studioId } = req.params;
    try {
        const result = await db.query(`
            SELECT c.id, c.content, c.created_at,
                   u.id AS user_id, u.username, u.avatar
            FROM studio_comments AS c
            JOIN users AS u ON c.user_id::int = u.id
            WHERE c.studio_id = $1
            ORDER BY c.created_at DESC
        `, [studioId]);

        const formatted = result.rows.map(row => ({
            id: row.id,
            content: row.content,
            datetime_created: row.created_at,
            author: {
                id: String(row.user_id),
                username: row.username || 'Unknown',
                image: row.avatar || `http://localhost:3000/uploads/avatars/${row.user_id}_90x90.png`
            },
            visibility: 'visible',
            reply_count: 0,
            parent_id: null,
            moreRepliesToLoad: false
        }));

        res.json({
            comments: formatted,
            more: false
        });
    } catch (err) {
        console.error('Error fetching comments:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /proxy/comments/studio/:studioId
router.post('/comments/studio/:studioId', async (req, res) => {
    const { studioId } = req.params;
    const { userId, content } = req.body;

    if (!content || !userId) {
        return res.status(400).json({ error: 'Missing data' });
    }

    try {
        await db.query(
            'INSERT INTO studio_comments (studio_id, user_id, content, created_at) VALUES ($1, $2, $3, $4)',
            [studioId, userId, content, new Date()]
        );
        res.status(201).json({ message: 'Comment posted' });
    } catch (err) {
        console.error('Error posting comment:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /proxy/news — stub to prevent 404 on splash page
router.get('/news', (req, res) => {
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

module.exports = router;
