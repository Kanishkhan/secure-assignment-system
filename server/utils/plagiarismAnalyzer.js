const normalizeSentence = (text) => {
    if (!text) return '';
    // lowercase, remove extra spaces, remove punctuation
    return text.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
};

const splitIntoSentences = (text) => {
    if (!text) return [];
    
    // Safety check: Cap input text at 200KB to avoid crash/out-of-memory on massive files
    const maxTextLength = 200000;
    const processedText = text.length > maxTextLength ? text.substring(0, maxTextLength) : text;

    // split by . ! ? followed by space or newline, keep the punctuation attached to the sentence
    const regex = /[^.!?\n]+[.!?\n]+/g;
    let match;
    const sentences = [];
    while ((match = regex.exec(processedText)) !== null) {
        const raw = match[0];
        const normalized = normalizeSentence(raw);
        if (normalized.length > 5) { // ignore tiny fragments
            sentences.push({ raw, normalized });
        }
        // Safety cap: Limit to 2000 sentences per document
        if (sentences.length >= 2000) break;
    }
    // Handle leftover text that didn't end with punctuation
    if (sentences.length < 2000) {
        const remainder = processedText.replace(regex, '');
        if (remainder) {
            const normalized = normalizeSentence(remainder);
            if (normalized.length > 5) {
                sentences.push({ raw: remainder, normalized });
            }
        }
    }
    return sentences;
};

const analyzePlagiarism = (textA, textB) => {
    const sentencesA = splitIntoSentences(textA);
    const sentencesB = splitIntoSentences(textB);

    if (sentencesA.length === 0 || sentencesB.length === 0) {
        return {
            overallSimilarity: 0,
            riskLevel: 'Low Risk',
            matchedSentencesCount: 0,
            uniqueContentPercentage: 100,
            sentencesA: sentencesA.map(s => ({ text: s.raw, isMatch: false, similarity: 0 })),
            sentencesB: sentencesB.map(s => ({ text: s.raw, isMatch: false, similarity: 0 })),
            matchedSentencesList: [],
            stats: {
                totalWordsA: textA ? textA.split(/\s+/).length : 0,
                totalWordsB: textB ? textB.split(/\s+/).length : 0,
                matchingWords: 0
            }
        };
    }

    // 1. Pre-generate bigram info for sentencesB
    const bBigramInfos = sentencesB.map((s, idx) => {
        const clean = s.normalized.replace(/\s+/g, "");
        const bigrams = new Map();
        for (let i = 0; i < clean.length - 1; i++) {
            const bg = clean.substring(i, i + 2);
            bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
        }
        return {
            index: idx,
            length: clean.length,
            bigrams: bigrams
        };
    });

    // 2. Build inverted index for sentencesB bigrams (bigram -> array of B sentence indices)
    const invertedIndex = new Map();
    bBigramInfos.forEach(info => {
        for (const bg of info.bigrams.keys()) {
            if (!invertedIndex.has(bg)) {
                invertedIndex.set(bg, []);
            }
            invertedIndex.get(bg).push(info.index);
        }
    });

    let matchedSentencesCount = 0;
    let matchingWords = 0;
    const matchedSentencesList = [];
    
    // Result arrays for both documents
    const resultA = sentencesA.map(s => ({ text: s.raw, isMatch: false, similarity: 0, matchedWithIndex: null }));
    const resultB = sentencesB.map(s => ({ text: s.raw, isMatch: false, similarity: 0, matchedWithIndex: null }));

    // 3. Compare each sentence in A
    for (let i = 0; i < sentencesA.length; i++) {
        const sA = sentencesA[i];
        if (!sA.normalized) continue;

        const cleanA = sA.normalized.replace(/\s+/g, "");
        if (cleanA.length < 2) continue;

        // Generate bigrams for sentence A
        const bigramsA = new Map();
        for (let iA = 0; iA < cleanA.length - 1; iA++) {
            const bg = cleanA.substring(iA, iA + 2);
            bigramsA.set(bg, (bigramsA.get(bg) || 0) + 1);
        }

        // Find candidate sentences in B that share at least one bigram with A
        const candidates = new Set();
        for (const bg of bigramsA.keys()) {
            const matches = invertedIndex.get(bg);
            if (matches) {
                for (const idx of matches) {
                    candidates.add(idx);
                }
            }
        }

        let bestMatchIndex = null;
        let bestScore = 0;

        // Compute Dice's coefficient only for candidates
        for (const idx of candidates) {
            const infoB = bBigramInfos[idx];
            
            // Calculate bigram intersection size
            let intersectionSize = 0;
            for (const [bg, countB] of infoB.bigrams.entries()) {
                const countA = bigramsA.get(bg) || 0;
                if (countA > 0) {
                    intersectionSize += Math.min(countA, countB);
                }
            }

            const score = (2.0 * intersectionSize) / (cleanA.length + infoB.length - 2) * 100;
            if (score > bestScore) {
                bestScore = score;
                bestMatchIndex = idx;
            }
        }

        if (bestScore > 70) { // Threshold for matching
            matchedSentencesCount++;
            resultA[i].isMatch = true;
            resultA[i].similarity = Math.round(bestScore);
            resultA[i].matchedWithIndex = bestMatchIndex;
            
            resultB[bestMatchIndex].isMatch = true;
            resultB[bestMatchIndex].similarity = Math.max(resultB[bestMatchIndex].similarity, Math.round(bestScore));

            matchingWords += sA.raw.trim().split(/\s+/).length;
            
            matchedSentencesList.push({
                indexA: i,
                indexB: bestMatchIndex,
                textA: sA.raw,
                textB: sentencesB[bestMatchIndex].raw,
                similarity: Math.round(bestScore)
            });
        }
    }

    const totalWordsA = textA ? (textA.split(/\s+/).length || 1) : 1;
    const totalWordsB = textB ? (textB.split(/\s+/).length || 1) : 1;
    const overallSimilarity = Math.min(100, Math.round((2.0 * matchingWords) / (totalWordsA + totalWordsB) * 100));

    let riskLevel = 'Low Risk';
    if (overallSimilarity > 20) riskLevel = 'Medium Risk';
    if (overallSimilarity > 50) riskLevel = 'High Risk';
    if (overallSimilarity > 70) riskLevel = 'Critical';

    return {
        overallSimilarity,
        riskLevel,
        matchedSentencesCount,
        uniqueContentPercentage: 100 - overallSimilarity,
        sentencesA: resultA,
        sentencesB: resultB,
        matchedSentencesList: matchedSentencesList.sort((a, b) => b.similarity - a.similarity),
        stats: {
            totalWordsA,
            totalWordsB,
            matchingWords
        }
    };
};

module.exports = { analyzePlagiarism };
