// Polyfills for browser APIs required by modern pdfjs-dist in Node environment
if (typeof global.DOMMatrix === 'undefined') {
    global.DOMMatrix = class DOMMatrix {};
}
if (typeof global.ImageData === 'undefined') {
    global.ImageData = class ImageData {};
}
if (typeof global.Path2D === 'undefined') {
    global.Path2D = class Path2D {};
}

const crypto = require('crypto');
const mongoose = require('mongoose');
const Submission = require('../models/Submission');

// Lazy load pdf-parse and mammoth to avoid loading issues during boot
let pdfParse;
let mammoth;
try {
    pdfParse = require('pdf-parse');
    mammoth = require('mammoth');
} catch (e) {
    console.warn('Similarity libraries not fully loaded yet:', e.message);
}

// English Stopwords list
const STOPWORDS = new Set([
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 
    'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 
    'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 
    'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 
    'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 
    'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 
    'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 
    'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 
    'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now',
    'shouldn', 'could', 'would', 'couldn', 'wouldn', 'must', 'mustn', 'etc'
]);

/**
 * Normalizes text: lowercase, remove punctuation, remove stopwords, collapse spacing.
 */
const normalizeText = (text) => {
    if (!text || typeof text !== 'string') return '';
    
    // Convert to lowercase and replace punctuation/symbols with spaces
    let clean = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    
    // Split into words, filter empty and stopwords
    const words = clean.split(/\s+/).filter(word => {
        return word.length > 1 && !STOPWORDS.has(word);
    });
    
    return words.join(' ');
};

/**
 * Calculates SHA-256 hash of a buffer.
 */
const calculateFileHash = (buffer) => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Extracts plain text from a PDF Buffer.
 */
const extractPDF = async (buffer) => {
    if (!pdfParse) pdfParse = require('pdf-parse');
    if (pdfParse.PDFParse) {
        const parser = new pdfParse.PDFParse(new Uint8Array(buffer));
        const data = await parser.getText();
        return data.text || '';
    } else {
        const data = await pdfParse(buffer);
        return data.text || '';
    }
};

/**
 * Extracts plain text from a DOCX Buffer.
 */
const extractDOCX = async (buffer) => {
    if (!mammoth) mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
};

/**
 * Computes TF-IDF vector mapping for documents.
 * @param {Array<string>} documents - Array of normalized text documents.
 * @returns {Array<Map<string, number>>} Array of TF-IDF feature maps matching the document list.
 */
const calculateTFIDF = (documents) => {
    const docCount = documents.length;
    const termDocCounts = {}; // How many documents contain term t
    
    // Tokenize all docs and count term frequencies per document
    const docTfs = documents.map(doc => {
        const words = doc.split(' ').filter(w => w.length > 0);
        const tf = {};
        const uniqueTerms = new Set();
        
        words.forEach(w => {
            tf[w] = (tf[w] || 0) + 1;
            uniqueTerms.add(w);
        });
        
        // Accumulate document frequency count for IDF calculation
        uniqueTerms.forEach(term => {
            termDocCounts[term] = (termDocCounts[term] || 0) + 1;
        });
        
        // Normalize TF by dividing by document length
        const totalWords = words.length || 1;
        const normalizedTf = {};
        for (const term in tf) {
            normalizedTf[term] = tf[term] / totalWords;
        }
        
        return normalizedTf;
    });
    
    // Calculate IDF and final TF-IDF weights
    return docTfs.map(tf => {
        const vector = new Map();
        for (const term in tf) {
            const df = termDocCounts[term] || 0;
            // IDF smooth formula
            const idf = Math.log(1 + docCount / (1 + df));
            vector.set(term, tf[term] * idf);
        }
        return vector;
    });
};

/**
 * Computes Cosine Similarity between two TF-IDF vectors (Maps).
 */
const calculateCosineSimilarity = (vecA, vecB) => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    // Dot product and Norm A
    for (const [term, val] of vecA.entries()) {
        normA += val * val;
        if (vecB.has(term)) {
            dotProduct += val * vecB.get(term);
        }
    }
    
    // Norm B
    for (const val of vecB.values()) {
        normB += val * val;
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Main similarity engine runner for an uploaded submission buffer.
 * Processes files asynchronously to prevent upload blocking.
 */
const runSimilarityAnalysis = async (submissionId, fileBuffer) => {
    try {
        console.log(`[SimilarityService] Starting analysis for Submission: ${submissionId}`);
        const submission = await Submission.findById(submissionId);
        if (!submission) {
            console.error(`[SimilarityService] Submission ${submissionId} not found in DB`);
            return;
        }
        
        // 1. Hash duplicate check (Step 1)
        const computedHash = calculateFileHash(fileBuffer);
        
        // Save file hash signature inside Submission
        submission.fileHash = computedHash;
        
        const existingSubmissions = await Submission.find({
            assignment_id: submission.assignment_id,
            _id: { $ne: submissionId } // exclude self
        });
        
        // Check hash matching first
        const exactHashMatch = existingSubmissions.find(sub => sub.file_hash === computedHash || sub.fileHash === computedHash);
        if (exactHashMatch) {
            console.log(`[SimilarityService] Exact hash duplicate found with Submission: ${exactHashMatch._id}`);
            submission.duplicate = true;
            submission.similarityScore = 100;
            submission.matchedSubmissionId = exactHashMatch._id;
            submission.comparisonDate = new Date();
            submission.submissionStatus = 'Flagged';
            await submission.save();
            return;
        }
        
        // 2. Text extraction (Step 2)
        const ext = submission.filename.split('.').pop().toLowerCase();
        let rawText = '';
        
        try {
            if (ext === 'pdf') {
                rawText = await extractPDF(fileBuffer);
            } else if (ext === 'docx') {
                rawText = await extractDOCX(fileBuffer);
            } else if (ext === 'txt') {
                rawText = fileBuffer.toString('utf-8');
            }
        } catch (extractErr) {
            console.error(`[SimilarityService] Text extraction failed for ${submission.filename}:`, extractErr.message);
        }
        
        // Store normalized text only for comparison
        const normalized = normalizeText(rawText);
        submission.normalizedText = normalized;
        
        if (!normalized || normalized.trim().length === 0) {
            console.log(`[SimilarityService] No readable text found or extracted. Marking safe.`);
            submission.duplicate = false;
            submission.similarityScore = 0;
            submission.comparisonDate = new Date();
            await submission.save();
            return;
        }
        
        // 3. Similarity comparisons (Step 3)
        // Only compare against files of the same assignment that have normalized text cached
        const comparisonCandidates = existingSubmissions.filter(sub => sub.normalizedText && sub.normalizedText.length > 0);
        
        if (comparisonCandidates.length === 0) {
            console.log(`[SimilarityService] No existing submissions with cached text. Marking safe.`);
            submission.duplicate = false;
            submission.similarityScore = 0;
            submission.comparisonDate = new Date();
            await submission.save();
            return;
        }
        
        // Gather all documents (all candidates + the new one)
        const documents = [...comparisonCandidates.map(c => c.normalizedText), normalized];
        const tfidfVectors = calculateTFIDF(documents);
        
        // New submission vector is the last element
        const newVector = tfidfVectors[tfidfVectors.length - 1];
        
        let highestSim = 0;
        let matchedId = null;
        
        // Compare new vector with other document vectors
        for (let i = 0; i < comparisonCandidates.length; i++) {
            const candidateVector = tfidfVectors[i];
            const sim = calculateCosineSimilarity(newVector, candidateVector);
            if (sim > highestSim) {
                highestSim = sim;
                matchedId = comparisonCandidates[i]._id;
            }
        }
        
        const scorePercentage = Math.round(highestSim * 100);
        console.log(`[SimilarityService] Similarity analysis complete. Max similarity: ${scorePercentage}% with ${matchedId}`);
        
        submission.similarityScore = scorePercentage;
        submission.duplicate = scorePercentage === 100;
        submission.matchedSubmissionId = matchedId;
        submission.comparisonDate = new Date();
        
        if (scorePercentage >= 70) {
            submission.submissionStatus = 'Flagged';
        }
        
        await submission.save();
    } catch (err) {
        console.error('[SimilarityService] Global analysis runner error:', err);
    }
};

module.exports = {
    normalizeText,
    calculateFileHash,
    extractPDF,
    extractDOCX,
    calculateTFIDF,
    calculateCosineSimilarity,
    runSimilarityAnalysis
};
