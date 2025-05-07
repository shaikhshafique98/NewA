// server.js
const nodemailer = require('nodemailer');
const express = require('express');
const mysql   = require('mysql');
const cors    = require('cors');
const bodyParser = require('body-parser');


const app = express();
const PORT = 3000;

const fs   = require('fs');
const path = require('path');


// Enable CORS
app.use(cors());
app.use(express.json());              // <— first JSON
app.use(bodyParser.urlencoded({ extended: true  }));



// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'arogyasevi@gmail.com',
    pass: 'gkwtemykthwhbbeb' // App password
  }
});


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


app.post('/sendmail', (req, res) => {
  const { email, otp } = req.body;

  // OPTIONAL: Use external HTML template file
  const templatePath = path.join(__dirname, 'otp_template.html');
  let htmlTemplate = `<h2>Your OTP Code</h2><p style="font-size:18px;"><strong>${otp}</strong></p><p>Use this code to complete your verification. It is valid for 3 minutes.</p>`;

  // If external file exists, use it
  if (fs.existsSync(templatePath)) {
    htmlTemplate = fs.readFileSync(templatePath, 'utf-8').replace('{{OTP}}', otp);
  }

  const mailOptions = {
    from: '"Arogya App" <arog@gmail.com>',
    to: email,
    subject: 'Your OTP Code',
    html: htmlTemplate
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Email Error:', err);
      return res.status(500).send('Failed to send email');
    }
    console.log('Email sent:', info.response);
    res.send('OTP sent to email');
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
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


// Login section //
// Login endpoint
app.post('/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password are required.' });
  }

  // Look up by email OR mobile OR user_ID
  const sql = `
    SELECT user_ID, name, email, mobile 
    FROM user_info 
    WHERE (email = ? OR mobile = ? OR user_ID = ?)
      AND password = ?
    LIMIT 1
  `;
  db.query(sql, [identifier, identifier, identifier, password], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Success: send back the user record
    const user = results[0];
    res.json({
      user_ID: user.user_ID,
      name:    user.name,
      email:   user.email,
      mobile:  user.mobile
    });
  });
});




// OTP section //
// ——— OTP Endpoints using GET and req.query ———

// 1) Check if we generated an OTP in the last 3 minutes
//    Example: GET /checkgenerateotp?user_ID=AS12345Z
app.get('/checkgenerateotp', (req, res) => {
  const userID = req.query.user_ID;
  if (!userID) return res.status(400).json({ error: 'user_ID is required' });

  const sql = 'SELECT time FROM otp WHERE user_id = ? ORDER BY id DESC LIMIT 1';
  db.query(sql, [userID], (err, rows) => {
    if (err) return res.status(500).json({ error: err.sqlMessage });

    if (rows.length) {
      const lastTime    = new Date(rows[0].time);
      const diffMinutes = (Date.now() - lastTime.getTime()) / 60000;
      return res.json({ recent: diffMinutes < 3 });
    }
    res.json({ recent: false });
  });
});

// 2) Generate & store a new OTP
//    Example: GET /generateotp?user_ID=AS12345Z&otp=1234
app.post('/generateotp', (req, res) => {
  const { user_ID, otp, time, email } = req.body;

  // 1) Insert into DB
  const sql = 'INSERT INTO otp (user_id, otp, time) VALUES (?, ?, ?)';
  db.query(sql, [user_ID, otp, time], (err, result) => {
    if (err) {
      console.error('DB Insert Error:', err);
      return res.status(500).send('Error saving OTP');
    }

    // 2) If we have an email, send the OTP using the HTML template
    if (email) {
      // a) Load your HTML template from disk
      const templatePath = path.join(__dirname, 'otp_template.html');
      let html = fs.readFileSync(templatePath, 'utf8');

      // b) Replace the placeholder with the actual OTP
      html = html.replace('{{OTP}}', otp);

      // c) Send the email
      transporter.sendMail({
        from: '"ArogyaSevi" <your_email@gmail.com>',
        to: email,
        subject: 'Your OTP Code',
        html: html
      }, (err, info) => {
        if (err) {
          console.error('Email error:', err);
          return res.status(500).send('OTP saved, but email not sent');
        }
        console.log('Email sent:', info.response);
        return res.send('OTP saved and email sent');
      });

    } else {
      // no email provided
      return res.send('OTP saved');
    }
  });
});


// 3) Validate OTP
//    Example: GET /validateotp?user_ID=AS12345Z&enteredOtp=1234
app.post('/updateotpstatus', (req, res) => {
  const { user_ID } = req.body;
  const sql = 'UPDATE user_info SET otp_ver = ? WHERE user_ID = ?';
  db.query(sql, ['Y', user_ID], (err, result) => {
    if (err) {
      console.error('Update Error:', err);
      return res.status(500).send('Error updating OTP status');
    }
    res.send('OTP verified');
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});


//forgot pass block
app.post('/forgotpassword', (req, res) => {
	  console.log('*** /forgotpassword body:', req.body);
	  
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send("Missing data");

  const checkUserSql = "SELECT * FROM user_info WHERE email = ?";
  con.query(checkUserSql, [email], (err, result) => {
    if (err) return res.status(500).send("Server error");

    if (result.length === 0) {
      return res.status(404).send("Email not registered");
    }

    const updateSql = "UPDATE user_info SET password = ? WHERE email = ?";
    con.query(updateSql, [password, email], (err2) => {
      if (err2) return res.status(500).send("Failed to update password");



      const htmlPath = path.join(__dirname, 'templates', 'forgotpass.html');
fs.readFile(htmlPath, 'utf8', (err, html) => {
  if (err) {
    console.error('Failed to read HTML template', err);
    return res.status(500).send('Template error');
  }

  const finalHtml = html.replace('{{password}}', password);

  const mailOptions = {
    from: 'ArogyaSevi@gmail.com',
    to: email,
    subject: 'Your New Password',
    html: finalHtml
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Email failed:', error);
      return res.status(500).send('Email failed');
    }
    console.log('Password email sent:', info.response);
    return res.status(200).send('Password sent');
  });
});


      });
    });
  });





// 404 handler
app.use((req, res) => {
  res.status(404).send('Route not found');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
