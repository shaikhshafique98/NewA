// server.js
const nodemailer = require('nodemailer');


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
// right after you do `app.use(cors());`
app.use(express.json());    // <-- add this

// Get all documents
app.get('/documents', (req, res) => {
  const sql = 'SELECT * FROM documents';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// Delete a document
// (you can now remove the inline express.json() here if you want)
app.post('/documents/delete', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Document ID is required' });

  const sql = 'DELETE FROM documents WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Document deleted successfully' });
  });
});

// Edit a document name & number
app.post('/documents/edit', (req, res) => {
  const { id, new_name, new_number } = req.body;
  if (!id || !new_name) {
    return res.status(400).json({ error: 'ID and new_name are required' });
  }

  const sql = 'UPDATE documents SET doc_name = ?, doc_num = ? WHERE id = ?';
  db.query(sql, [new_name, new_number, id], (err, result) => {
    if (err) {
      console.error('Edit error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Document updated successfully' });
  });
});


// signup section 
const crypto = require('crypto');

function generateUserID() {
  const digits = Math.floor(10000 + Math.random() * 90000); // 5 digits
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  return `AS${digits}${letter}`;
}

app.post('/signup', (req, res) => {
  const { name, email, mobile, password } = req.body;
  if (!name || !email || !mobile || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const user_ID = generateUserID();
  const otp_ver = 'N';

  const checkSql = 'SELECT * FROM user_info WHERE email = ? OR mobile = ? OR user_ID = ?';
  db.query(checkSql, [email, mobile, user_ID], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length > 0) {
      return res.status(409).json({ error: 'User already exists.' });
    }

    const insertSql = 'INSERT INTO user_info (user_ID, name, email, mobile, password, otp_ver) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(insertSql, [user_ID, name, email, mobile, password, otp_ver], (err) => {
      if (err) return res.status(500).json({ error: 'Insert failed' });
      res.json({ message: 'Signup successful', user_ID, name, mobile });
    });
  });
});


// otp section
//check if otp generate 3 mins ago 
app.post('/checkgenerateotp', (req, res) => {
  const { user_ID } = req.body;
  db.query('SELECT time FROM otp WHERE user_ID = ? ORDER BY id DESC LIMIT 1', [user_ID], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (results.length > 0) {
      const lastTime = results[0].time;
      const [lastHour, lastMinute] = lastTime.split(':').map(Number);
      const now = new Date();
      const diff = now.getHours() * 60 + now.getMinutes() - (lastHour * 60 + lastMinute);
      return res.json({ recent: diff < 3 });
    }
    res.json({ recent: false });
  });
});

//generate otp
app.post('/generateotp', (req, res) => {
  const { user_ID, otp, time } = req.body;
  db.query('INSERT INTO otp (user_id, otp, time) VALUES (?, ?, ?)', [user_ID, otp, time], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true });
  });
});

//email sending if otp is correct
app.post('/sendmail', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Missing email or OTP' });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'arogyasevi@gmail.com',
      pass: 'Enter@123', // Use Gmail App Password
    },
  });

  const mailOptions = {
    from: 'Enter@123',
    to: email,
    subject: 'Your OTP Code for Aroyasevi',
    text: `Your OTP code for completing registeration is: ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Email error:', error);
      return res.status(500).json({ error: 'Email sending failed' });
    }
    res.json({ success: true, message: 'Email sent' });
  });
});




// 404 handler
app.use((req, res) => {
  res.status(404).send('Route not found');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
