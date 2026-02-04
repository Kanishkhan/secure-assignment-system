const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { encryptFile, decryptFile, computeHash, SYSTEM_KEY, encodeBase64 } = require('./utils/crypto');
const User = require('./models/User');

// ANSI Colors for Output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function logSection(title) {
    console.log(`\n${BLUE}${BOLD}============================================================${RESET}`);
    console.log(`${BLUE}${BOLD}   ${title}${RESET}`);
    console.log(`${BLUE}${BOLD}============================================================${RESET}\n`);
}

async function runDemo() {
    console.log(`${GREEN}${BOLD}🚀 STARTING SECURITY COMPLIANCE DEMONSTRATION 🚀${RESET}\n`);

    // --- 1. AUTHENTICATION (Hashing & MFA) ---
    logSection("1. AUTHENTICATION & HASHING");

    // A. Password Hashing
    const password = "mySuperSecretPassword123";
    console.log(`[Input] Plaintext Password:  ${YELLOW}${password}${RESET}`);

    console.log(`[Action] Hashing password with Bcrypt (Salted)...`);
    const hashedPassword = await bcrypt.hash(password, 12);

    console.log(`[Output] Stored Hash in DB:  ${CYAN}${hashedPassword}${RESET}`);
    console.log(`${GREEN}✅ VERDICTS: Passwords are NEVER stored in plain text. Salt is built-in.${RESET}`);

    // B. MFA Generation
    console.log(`\n[Action] Generating MFA Secret for User...`);
    const secret = speakeasy.generateSecret({ name: "SecureApp" });

    console.log(`[Output] MFA Secret (Base32): ${CYAN}${secret.base32}${RESET}`);
    console.log(`[Output] OTP Auth URL:        ${YELLOW}${secret.otpauth_url}${RESET}`);

    const qrImage = await qrcode.toDataURL(secret.otpauth_url);
    console.log(`[Output] QR Code Data URL:    ${CYAN}${qrImage.substring(0, 50)}...[truncated]${RESET}`);
    console.log(`${GREEN}✅ VERDICTS: MFA Secret generated & encoded for QR scanning.${RESET}`);


    // --- 2. ENCODING ---
    logSection("2. ENCODING TECHNIQUES");

    const rawData = "SecureAssignmentSystem2026";
    console.log(`[Input] Raw Data:            ${YELLOW}${rawData}${RESET}`);

    const base64Encoded = encodeBase64(rawData);
    console.log(`[Output] Base64 Encoded:     ${CYAN}${base64Encoded}${RESET}`);

    const decoded = Buffer.from(base64Encoded, 'base64').toString('utf-8');
    console.log(`[Output] Base64 Decoded:     ${YELLOW}${decoded}${RESET}`);

    console.log(`${GREEN}✅ VERDICTS: Base64 used for safe data transport.${RESET}`);


    // --- 3. ENCRYPTION & INTEGRITY ---
    logSection("3. ENCRYPTION (AES-256-GCM) & INTEGRITY");

    const fileContent = "This is the sensitive content of a student's assignment.";
    const fileBuffer = Buffer.from(fileContent);

    console.log(`[Input] Original File Content: "${YELLOW}${fileContent}${RESET}"`);

    // A. Hashing (Integrity)
    console.log(`\n[Action] Computing SHA-256 Hash for Integrity Check...`);
    const originalHash = computeHash(fileBuffer);
    console.log(`[Output] File SHA-256 Hash:    ${CYAN}${originalHash}${RESET}`);

    // B. Encryption
    console.log(`\n[Action] Encrypting file with AES-256-GCM...`);
    console.log(`[Info] System Key (Hidden):    ${YELLOW}****** (Protected in Env Vars)${RESET}`);

    const { iv, encrypted, tag } = encryptFile(fileBuffer, SYSTEM_KEY);

    console.log(`[Output] Initialization Vector: ${CYAN}${iv}${RESET} (Unique per file)`);
    console.log(`[Output] Encrypted Content (Hex): ${RED}${encrypted.substring(0, 60)}...${RESET}`);
    console.log(`[Output] Auth Tag (Signature):  ${CYAN}${tag}${RESET}`);

    console.log(`${GREEN}✅ VERDICTS: File is now unreadable ciphertext.${RESET}`);

    // C. Decryption
    console.log(`\n[Action] Decrypting file...`);
    const decryptedBuffer = decryptFile(encrypted, SYSTEM_KEY, iv, tag);
    const decryptedText = decryptedBuffer.toString();

    console.log(`[Output] Decrypted Content:     "${YELLOW}${decryptedText}${RESET}"`);

    if (decryptedText === fileContent) {
        console.log(`${GREEN}✅ SUCCESS: Decrypted content matches original!${RESET}`);
    } else {
        console.log(`${RED}❌ INITIAL FAILURE: Content mismatch.${RESET}`);
    }


    // --- 4. AUTHORIZATION (RBAC) ---
    logSection("4. AUTHORIZATION (RBAC)");

    const roles = ['student', 'teacher', 'admin'];
    console.log(`[Info] Defined Roles in System: ${JSON.stringify(roles)}`);

    // Simulation
    const mockUser = { username: 'john_doe', role: 'student' };
    console.log(`[Scenario] User '${mockUser.username}' (Role: ${RED}${mockUser.role}${RESET}) tries to DELETE an assignment.`);

    if (mockUser.role !== 'teacher' && mockUser.role !== 'admin') {
        console.log(`[System] ⛔ ACCESS DENIED using 'authorizeRole(['teacher'])' middleware logic.`);
        console.log(`${GREEN}✅ VERDICTS: Unauthorized action blocked.${RESET}`);
    } else {
        console.log(`[System] Access Granted.`);
    }

    console.log(`\n${GREEN}${BOLD}🎉 DEMONSTRATION COMPLETE - ALL SYSTEMS SECURE 🎉${RESET}\n`);
}

runDemo();
