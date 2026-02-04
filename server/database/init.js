const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../secure.db');
const db = new sqlite3.Database(dbPath);

const initDB = () => {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password TEXT, -- Hashed
            role TEXT CHECK(role IN ('admin', 'teacher', 'student')),
            mfa_secret TEXT,
            mfa_enabled INTEGER DEFAULT 0
        )`);

        // Assignments Table (Created by teachers)
        db.run(`CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            description TEXT,
            creator_id INTEGER,
            deadline DATETIME, -- New field
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (creator_id) REFERENCES users(id)
        )`);

        // Submissions Table (Encrypted files)
        db.run(`CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            assignment_id INTEGER,
            student_id INTEGER,
            filename TEXT,
            encrypted_path TEXT,
            encryption_key_ref TEXT, -- Reference to key (simulated) or encrypted key
            file_hash TEXT, -- For integrity check
            digital_signature TEXT, -- Simulated digital signature
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assignment_id) REFERENCES assignments(id),
            FOREIGN KEY (student_id) REFERENCES users(id)
        )`);

        console.log('Database Initialized');
    });
};

module.exports = { db, initDB };
