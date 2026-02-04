const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./secure.db');

const newPassword = 'admin123';

(async () => {
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        db.run("UPDATE users SET password = ? WHERE username = 'Admin'", [hashedPassword], function (err) {
            if (err) {
                console.error("Error updating password:", err);
            } else {
                console.log(`Password for 'Admin' updated successfully. Rows affected: ${this.changes}`);
            }
            db.close();
        });
    } catch (err) {
        console.error("Hashing error:", err);
    }
})();
