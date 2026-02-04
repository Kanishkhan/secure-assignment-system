# 📄 Detailed Project Compliance Report

This document maps every requirement from your Laboratory Evaluation Marks Breakdown to the specific code segments in your project where they are implemented.

## 1. Authentication (3 Marks)

### A. Single-Factor Authentication (1.5 Marks)
*   **Requirement**: Implementation using password / PIN / username-based login.
*   **Status**: ✅ **Implemented**
*   **Explanation**: Users log in with a username and password. The password is verified against a stored hash.
*   **Code Location**:
    *   **File**: [server/routes/auth.js](file:///c:/Users/kanis/.gemini/antigravity/scratch/secure-assignment-system/server/routes/auth.js#L37-L57)
    *   **Segment**: `POST /login` route.
    *   **Details**: 
        *   Lines 37-57: Handles login.
        *   Line 44: `bcrypt.compare(password, user.password)` securely checks the password.

### B. Multi-Factor Authentication (1.5 Marks)
*   **Requirement**: Implementation using at least two factors (e.g., password + OTP).
*   **Status**: ✅ **Implemented**
*   **Explanation**: After password verification, if MFA is enabled, the user must provide a Time-based One-Time Password (TOTP) from Google Authenticator.
*   **Code Location**:
    *   **File**: [server/routes/auth.js](file:///c:/Users/kanis/.gemini/antigravity/scratch/secure-assignment-system/server/routes/auth.js#L59-L121)
    *   **Segment**: MFA Routes (`/mfa/setup`, `/mfa/enable`, `/mfa/verify`).
    *   **Details**:
        *   Line 61: `speakeasy.generateSecret()` creates a unique secret key for the user.
        *   Line 63: `qrcode.toDataURL()` allows the user to scan the secret.
        *   Line 47: Login route checks `user.mfa_enabled` and prompts for the second factor.

---

## 2. Authorization - Access Control (3 Marks)

### A. Access Control Model & Policy Definition (1.5 Marks)
*   **Requirement**: Implement Access Control Matrix / ACL with min 3 subjects and 3 objects. Define/Justify rights.
*   **Status**: ✅ **Implemented**
*   **Explanation**: Implemented **Role-Based Access Control (RBAC)**.
    *   **3 Subjects (Roles)**: `Student`, `Teacher`, `Admin` (Defined in [User.js](file:///c:/Users/kanis/.gemini/antigravity/scratch/secure-assignment-system/server/models/User.js#L7)).
    *   **3 Objects (Resources)**:
        1.  **Assignments**: Managed by Teachers (Create/Delete).
        2.  **Submissions**: Created by Students, Viewed by Teachers.
        3.  **User Accounts**: Managed by Admin (View/Delete).
*   **Code Location**:
    *   **File**: [server/middleware/auth.js](file:///c:/Users/kanis/.gemini/antigravity/scratch/secure-assignment-system/server/middleware/auth.js#L21-L28)
    *   **Segment**: `authorizeRole` Middleware.

### B. Implementation of Access Control (1.5 Marks)
*   **Requirement**: Enforce permissions programmatically.
*   **Status**: ✅ **Implemented**
*   **Explanation**: Routes are protected by middleware that denies access if the role doesn't match.
*   **Code Location**:
    *   **File**: [server/routes/assignments.js](file:///c:/Users/kanis/.gemini/antigravity/scratch/secure-assignment-system/server/routes/assignments.js)
    *   **Details**:
        *   Line 46: `authorizeRole(['teacher'])` protects Assignment Creation.
        *   Line 86: `authorizeRole(['student'])` protects Submission.
        *   Line 126 in `auth.js`: `authorizeRole(['admin'])` protects User list.

---

## 3. Encryption (3 Marks)

### A. Key Exchange Mechanism (1.5 Marks)
*   **Requirement**: Demonstrate secure key generation or key exchange method.
*   **Status**: ✅ **Implemented**
*   **Explanation**:
    1.  **MFA Key Generation**: Securely generated using `speakeasy` (Line 61 of `auth.js`) and exchanged via QR Code (visually).
    2.  **File Encryption Key**: Application uses a secure `SYSTEM_KEY` loaded from environment variables (Simulated Key Management).
    3.  **IV Generation**: Unique `crypto.randomBytes(16)` per file.
*   **Code Location**: [server/routes/auth.js](file:///c:/Users/kanis/.gemini/antigravity/scratch/secure-assignment-system/server/routes/auth.js#L61) and [server/utils/crypto.js](file:///c:/Users/kanis/.gemini/antigravity/scratch/secure-assignment-system/server/utils/crypto.js#L26).

### B. Encryption & Decryption (1.5 Marks)
*   **Requirement**: Implement secure encryption (e.g., AES).
*   **Status**: ✅ **Implemented**
*   **Explanation**: Files are encrypted using **AES-256-GCM** (Galois/Counter Mode) before storage and decrypted only upon download.
*   **Code Location**:
    *   **File**: [server/utils/crypto.js](file:///c:/Users/kanis/.gemini/antigravity/scratch/secure-assignment-system/server/utils/crypto.js#L25-L45)
    *   **Segment**: `encryptFile` and `decryptFile` functions.
    *   **Details**: Uses `crypto.createCipheriv('aes-256-gcm', ...)` (Line 27).

---

## 4. Hashing & Digital Signature (3 Marks)

### A. Hashing with Salt (1.5 Marks)
*   **Requirement**: Secure storage of passwords using hashing with salt.
*   **Status**: ✅ **Implemented**
*   **Explanation**: Passwords are hashed using **Bcrypt** during registration. Bcrypt automatically generates and includes a unique salt for each password.
*   **Code Location**:
    *   **File**: [server/routes/auth.js](file:///c:/Users/kanis/.gemini/antigravity/scratch/secure-assignment-system/server/routes/auth.js#L18)
    *   **Statement**: `await bcrypt.hash(password, 12);` (Work factor of 12).

### B. Digital Signature / Data Integrity (1.5 Marks)
*   **Requirement**: Demonstrate data integrity and authenticity.
*   **Status**: ✅ **Implemented**
*   **Explanation**:
    1.  **SHA-256 Checksum**: A hash of the file is verified on download to ensure no bytes changed.
    2.  **GCM Auth Tag**: The AES-GCM encryption produces an "Auth Tag" which acts as a signature. If the encrypted file is tampered with, decryption fails immediately.
*   **Code Location**:
    *   **File**: [server/routes/assignments.js](file:///c:/Users/kanis/.gemini/antigravity/scratch/secure-assignment-system/server/routes/assignments.js#L216-L219)
    *   **Segment**: `computeHash` used to verify `currentHash !== submission.file_hash`.

---

## 5. Encoding Techniques (3 Marks)

### A. Encoding & Decoding Implementation (1 Mark)
*   **Requirement**: Base64 / QR Code / Barcode.
*   **Status**: ✅ **Implemented**
*   **Explanation**:
    1.  **Base64**: Used for encoding encryption buffers (IVs, Auth Tags) and keys.
    2.  **QR Code**: Used to encode the 2FA URL for scanning.
*   **Code Location**:
    *   [server/routes/auth.js](file:///c:/Users/kanis/.gemini/antigravity/scratch/secure-assignment-system/server/routes/auth.js#L63) (`qrcode.toDataURL`).
    *   [server/utils/crypto.js](file:///c:/Users/kanis/.gemini/antigravity/scratch/secure-assignment-system/server/utils/crypto.js#L7) (`toString('base64')`).

### B. Theory Requirements (2 Marks)
*   **Requirements**: Security Levels & Risks, Possible Attacks.
*   **Status**: ✅ **Documentation Completed**
*   **Explanation**: A comprehensive theory document has been created covering the CIA Triad, SQL Injection, XSS, and project defenses.
*   **Location**: [THEORY_NOTES.md](file:///c:/Users/kanis/.gemini/antigravity/scratch/secure-assignment-system/THEORY_NOTES.md)
