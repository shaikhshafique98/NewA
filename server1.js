// server.js
const express = require('express');
const mysql   = require('mysql');
const cors    = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());

// MySQL connection setup
const db = mysql.createConnection({
  host:     'sql12.freesqldatabase.com',
  user:     'sql12775768',
  password: 'E9Uprmdq2d',
  database: 'sql12775768',
});

db.connect(err => {
  if (err) {
    console.error('MySQL connection error:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL.');
});

app.get('/labs', (req, res) => {
  const { city, search } = req.query;

  // No search => just filter by city
  if (!search) {
    if (!city) {
      return res.status(400).json({ error: 'City is required when not searching' });
    }
    const sql = 'SELECT DISTINCT * FROM labs_info WHERE city = ?';
    return db.query(sql, [city], (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    });
  }

  // Search mode: build two sub-queries
  const like = `%${search}%`;
  const parts = [];
  const params = [];

  // 1) City + search
  if (city) {
    parts.push(
      `SELECT DISTINCT * FROM labs_info
       WHERE city = ?
         AND (name  LIKE ?
           OR address LIKE ?
           OR phone  LIKE ?
           OR test   LIKE ?
           OR city   LIKE ?)`
    );
    params.push(city, like, like, like, like, like);
  }

  // 2) Global search across all cities
  parts.push(
    `SELECT DISTINCT * FROM labs_info
     WHERE name  LIKE ?
       OR address LIKE ?
       OR phone  LIKE ?
       OR test   LIKE ?
       OR city   LIKE ?`
  );
  params.push(like, like, like, like, like);

  // UNION the two queries (dedupes automatically)
  const sql = parts.join(' UNION ');

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});




// GET /hospital?search=term
app.get('/hosp', (req, res) => {
  const { city, search } = req.query;

  // No search => just filter by city
  if (!search) {
    if (!city) {
      return res.status(400).json({ error: 'City is required when not searching' });
    }
    const sql = 'SELECT DISTINCT * FROM hospital_info WHERE city = ?';
    return db.query(sql, [city], (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    });
  }

  // Search mode: build two sub-queries
  const like = `%${search}%`;
  const parts = [];
  const params = [];

  // 1) City + search
  if (city) {
    parts.push(
      `SELECT DISTINCT * FROM hospital_info
       WHERE city = ?
         AND (name  LIKE ?
           OR address LIKE ?
           OR phone  LIKE ?
           OR tag   LIKE ?
           OR city   LIKE ?)`
    );
    params.push(city, like, like, like, like, like);
  }

  // 2) Global search across all cities
  parts.push(
    `SELECT DISTINCT * FROM hospital_info
     WHERE name  LIKE ?
       OR address LIKE ?
       OR phone  LIKE ?
       OR tag   LIKE ?
       OR city   LIKE ?`
  );
  params.push(like, like, like, like, like);

  // UNION the two queries (dedupes automatically)
  const sql = parts.join(' UNION ');

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});



// GET /med?search=term
app.get('/med', (req, res) => {
  const { search } = req.query;

  // Base SQL query (distinct to avoid duplicates)
  let sql = 'SELECT DISTINCT * FROM med_info';
  const params = [];

  // Only search filter across multiple columns
  if (search) {
    const like = `%${search}%`;
    sql += ' WHERE ('
         + 'name LIKE ? OR '
         + 'disease LIKE ? OR '
         + 'manufacturer	 LIKE ? OR '
         + 'salt_comp LIKE ? OR '
         + 'med_Dec LIKE ?'
         + ')';
    params.push(like, like, like, like, like);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Query failed:', err);
      return res.status(500).json({ error: 'Database query failed' });
    }
    res.json(results);
  });
});



// ---- Document section ) 
// Get all documents
app.get('/documents', (req, res) => {
  const sql = 'SELECT * FROM documents';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// Delete a document
app.post('/documents/delete', express.json(), (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Document ID is required' });

  const sql = 'DELETE FROM documents WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Document deleted successfully' });
  });
});

// Edit a document name
app.post('/documents/edit', (req, res) => {
  const { id, new_name, new_number } = req.body;
  if (!id || !new_name) return res.status(400).json({ error: 'ID and new_name are required' });

  const sql = 'UPDATE documents SET doc_name = ?, doc_num = ? WHERE id = ?';
  db.query(sql, [new_name, new_number, id], (err, result) => {
    if (err) {
      console.error('Edit error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Document updated successfully' });
  });
});





// 404 handler
app.use((req, res) => {
  res.status(404).send('Route not found');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
