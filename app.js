// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const dotenv = require("dotenv");
const ExcelJS = require('exceljs');
const fs = require('fs');
require('dotenv').config();
const router = express.Router();

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
const port = process.env.PORT || 3000;

// MySQL Database Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect(err => {
  if (err) console.error("Database connection error:", err);
  else console.log("Database connected successfully!");
});

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Invalid file type"), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Set view engine and static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => res.render('login'));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(query, [username, password], (err, results) => {
    if (err) return res.status(500).send("Error during login");
    results.length > 0 ? res.redirect('/dashboard') : res.status(401).send("Invalid login credentials");
  });
});

app.get('/dashboard', (req, res) => res.render('dashboard'));

app.get('/upload-resume', (req, res) => res.render('upload-resume'));

app.post('/upload-resume', upload.single("resume"), (req, res) => {
  const { name, gender, email, phone, experience, skills, status, location } = req.body;

  if (!name || !gender || !email || !phone || !experience || !skills || !status ||!location || !req.file) {
    return res.status(400).send("All fields are required.");
  }
  cloudinary.uploader.upload(req.file.path, {
    resource_type: "auto",
  
    folder: "resumes",
    use_filename: true,
    unique_filename: false
  }, (error, result) => {
    if (error) return res.status(500).send("Error uploading file to Cloudinary");

    const resumeUrl = result.secure_url;
    const query = `INSERT INTO candidates (name, gender, email, phone, experience, skills, status, location, resume_file_url) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;  // if you have to add some thing add here and  also increase ?

    db.query(query, [name, gender, email, phone, experience, skills, status, location, resumeUrl], (err) => {
      if (err) return res.status(500).send("Error saving resume to database");

      // Delete local file
      fs.unlink(req.file.path, unlinkErr => {
        if (unlinkErr) console.error("Error deleting temp file:", unlinkErr);
      });

      res.send("Resume uploaded successfully!");
    });
  });
});

app.get('/download-resume/:id', (req, res) => {
  const candidateId = req.params.id;
  const query = 'SELECT resume_file_url FROM candidates WHERE id = ?';

  db.query(query, [candidateId], (err, results) => {
      if (err) {
          console.error('Database error:', err);
          return res.status(500).send('Error fetching resume data');
      }

      if (results.length === 0) {
          return res.status(404).send('Resume not found');
      }

      let resumeUrl = results[0].resume_file_url;
      if (!resumeUrl) {
          return res.status(404).send('Resume URL not found');
      }

      // Force direct file download by modifying the Cloudinary URL
      if (resumeUrl.includes("cloudinary.com")) {
          resumeUrl = resumeUrl.replace('/upload/', '/upload/fl_attachment/');
      }

      res.redirect(resumeUrl);
  });
});

app.get('/search', (req, res) => res.render('search', { results: [], message: '' }));

app.post('/search', (req, res) => {
  const searchQuery = req.body.query?.trim() || '';
  if (!searchQuery) return res.render('search', { results: [], message: 'Please enter a search term.' });

  const terms = searchQuery.split(/\s+(AND|OR)\s+/i).map(term => term.trim());
  let conditions = [];
  let values = [];
  let operator = 'OR';

  terms.forEach(term => {
    if (term.toUpperCase() === 'AND' || term.toUpperCase() === 'OR') {
      operator = term.toUpperCase();
    } else {
      conditions.push(`(name LIKE ? OR skills LIKE ? OR email LIKE ? OR phone LIKE ?)`);
      values.push(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`);
    }
  });

  if (!conditions.length) return res.render('search', { results: [], message: 'No valid search terms found.' });

  const query = `SELECT * FROM candidates WHERE ${conditions.join(` ${operator} `)}`;
  db.query(query, values, (err, results) => {
    if (err) return res.status(500).send("Error searching candidates");
    res.render('search', { results, message: results.length === 0 ? 'No results found.' : '' });
  });
});

// Recruiters page
app.get('/recruiters', (req, res) => res.render('recruiters'));
//candidates page

app.get('/candidates', (req, res) => res.render('candidates'));
// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
