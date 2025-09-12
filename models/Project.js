const pool = require('../db');

// Create a new project
async function createProject(project) {
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
    )
    RETURNING *;
  `;
  const values = [
    project.id,
    project.title,
    project.description,
    project.instructions,
    project.image,
    project.author.id,
    project.author.username,
    project.history.created,
    project.history.modified,
    project.history.shared,
    project.stats.views,
    project.stats.loves,
    project.stats.favorites,
    project.stats.comments,
    project.remix.root || null
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
}

// Get a project by ID
async function getProjectById(id) {
  const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
  return result.rows[0];
}

// Export functions
module.exports = {
  createProject,
  getProjectById
};