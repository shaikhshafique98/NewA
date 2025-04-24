const express = require('express');
const mysql   = require('mysql');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so Flutter Web or mobile can call this API
app.use(cors());
app.use(express.json());

// Create a MySQL connection
const db = mysql.createConnection({
  host:     'localhost',
  user:     'root',           // your MySQL user
  password: '',               // your MySQL password
  database: 'flutter_app'
});

// Connect to MySQL
db.connect(err => {
  if (err) {
    console.error('❌ MySQL connection error:', err);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL');
});

// Define GET /users to fetch all records
app.get('/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) {
      console.error('❌ Error querying users:', err);
      return res.status(500).json({ error: 'Database query failed' });
    }
    res.json(results);
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
