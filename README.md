# 🛡️ Secure Assignment System

> A comprehensive Full-Stack Web Application demonstrating robust security implementation for academic assignment management, featuring Multi-Factor Authentication (MFA), Role-Based Access Control (RBAC), and AES-256 Encryption.

## 📖 Overview

The **Secure Assignment System** is designed to facilitate the secure submission, storage, and retrieval of academic assignments. Unlike standard submission portals, this project prioritizes data security and integrity, ensuring that sensitive assignment files are encrypted at rest and only accessible to authorized personnel.

This project specifically targets and safeguards against common web vulnerabilities while implementing a strict compliance checklist for:
*   **Authentication** (MFA/2FA)
*   **Authorization** (RBAC)
*   **Confidentiality** (Encryption)
*   **Integrity** (Hashing)

## 🚀 Key Security Features

### 🔐 1. Multi-Factor Authentication (MFA)
*   **Two-Factor Auth**: Integrates Time-based One-Time Passwords (TOTP) compatible with **Google Authenticator**.
*   **Implementation**: Uses `speakeasy` for secret generation and `qrcode` for easy setup.
*   **Secure Login**: Requires both a password (hashed with **Bcrypt**) and a dynamic 6-digit code.

### 👮 2. Role-Based Access Control (RBAC)
Strict access control policies ensure separation of duties:
*   **Student**: Can strictly *view* their dashboard and *upload* submissions.
*   **Teacher**: Can *create/delete* assignments and *view/download* student submissions.
*   **Admin**: Can *manage* user accounts.
*   **Middleware**: Custom `authorizeRole` middleware enforces these permissions on every protected route.

### 🛡️ 3. End-to-End Encryption
*   **Algorithm**: Files are encrypted using **AES-256-GCM** (Galois/Counter Mode).
*   **Process**:
    1.  File is uploaded → Server generates unique IV.
    2.  File is encrypted in-memory → Saved to disk with `.enc` extension.
    3.  Original file is discarded.
    4.  Decryption happens *only* upon valid download request.

### 🔍 4. Data Integrity
*   **Tamper Proofing**: **SHA-256** checksums of files are stored in the database.
*   **Verification**: On download, the decrypted file's hash is re-calculated and compared against the stored hash to ensure zero bit-rot or tampering.
*   **Auth Tags**: AES-GCM authentication tags prevent processing of modified encrypted data.

## 🛠️ Tech Stack

### Frontend
*   **React** (Vite) - Fast, modern UI.
*   **TailwindCSS** - Responsive and professional styling.
*   **Axios** - Secure HTTP requests with JWT handling.

### Backend
*   **Node.js & Express** - Scalable REST API.
*   **MongoDB & Mongoose** - NoSQL database for flexible metadata storage.
*   **Security Modules**: `crypto` (Node.js), `bcrypt`, `jsonwebtoken`, `helmet`.

## ⚙️ Installation & Setup

### Prerequisites
*   Node.js (v16+)
*   MongoDB (Local or Atlas)

### 1. Clone the Repository
```bash
git clone https://github.com/Kanishkhan/secure-assignment-system.git
cd secure-assignment-system
```

### 2. Backend Setup
```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/secure_assignment
JWT_SECRET=your_super_secret_jwt_key
SYSTEM_KEY=32_byte_hex_string_for_encryption # Must be 64 hex characters
```

Start the server:
```bash
npm start
```

### 3. Frontend Setup
Open a new terminal:
```bash
cd client
npm install
npm run dev
```

## 🧪 Usage / Testing Security

1.  **Register Users**: Create accounts for a Student and a Teacher.
    *   *Note: First user typically needs admin/manual database setup or use the provided scripts if available.*
2.  **Setup MFA**: Log in and go to "Profile" to scan the QR code with Google Authenticator.
3.  **Upload Assignment**: Log in as Student -> Upload a file.
    *   *Check `server/uploads`*: You will see the file is encrypted (unreadable content).
4.  **Download Assignment**: Log in as Teacher -> Click download.
    *   The system decrypts it on the fly and verifies the hash.

## 📂 Project Structure

```
secure-assignment-system/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Auth Context provider
│   │   └── pages/          # Application views (Login, Dashboard, etc.)
│   └── ...
├── server/                 # Express Backend
│   ├── middleware/         # Auth & RBAC Middleware
│   ├── models/             # Mongoose Schemas (User, Assignment, Submission)
│   ├── routes/             # API Endpoints
│   ├── utils/              # Crypto (Encryption/Decryption) utilities
│   └── uploads/            # Encrypted file storage
├── COMPLIANCE_REPORT.md    # Detailed security mapping documentation
└── THEORY_NOTES.md         # Theoretical security background
```

## 📜 License
This project is for educational and evaluation purposes.
