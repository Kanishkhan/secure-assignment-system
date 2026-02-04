const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./secure.db');

db.serialize(() => {
    db.all("SELECT id, username, email, role FROM users WHERE username LIKE 'admin%' OR username LIKE 'Admin%'", (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Users found:", rows);
        }
        db.close();
    });
});
