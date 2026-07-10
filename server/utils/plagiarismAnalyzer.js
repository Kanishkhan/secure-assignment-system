const stringSimilarity = require('string-similarity');

const normalizeSentence = (text) => {
    if (!text) return '';
    // lowercase, remove extra spaces, remove punctuation
    return text.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
};

const splitIntoSentences = (text) => {
    if (!text) return [];
    // split by . ! ? followed by space or newline, keep the punctuation attached to the sentence
    const regex = /[^.!?\n]+[.!?\n]+/g;
    let match;
    const sentences = [];
    while ((match = regex.exec(text)) !== null) {
        const raw = match[0];
        const normalized = normalizeSentence(raw);
        if (normalized.length > 5) { // ignore tiny fragments
            sentences.push({ raw, normalized });
        }
    }
    // Handle leftover text that didn't end with punctuation
    const remainder = text.replace(regex, '');
    if (remainder) {
        const normalized = normalizeSentence(remainder);
        if (normalized.length > 5) {
            sentences.push({ raw: remainder, normalized });
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
                totalWordsA: textA.split(/\s+/).length,
                totalWordsB: textB.split(/\s+/).length,
                matchingWords: 0
            }
        };
    }

    const sentencesB_normalized = sentencesB.map(s => s.normalized);
    
    let matchedSentencesCount = 0;
    let matchingWords = 0;
    const matchedSentencesList = [];
    
    // Result arrays for both documents
    const resultA = sentencesA.map(s => ({ text: s.raw, isMatch: false, similarity: 0, matchedWithIndex: null }));
    const resultB = sentencesB.map(s => ({ text: s.raw, isMatch: false, similarity: 0, matchedWithIndex: null }));

    // Compare each sentence in A with B
    for (let i = 0; i < sentencesA.length; i++) {
        const sA = sentencesA[i];
        if (!sA.normalized) continue;

        const bestMatch = stringSimilarity.findBestMatch(sA.normalized, sentencesB_normalized);
        const matchScore = bestMatch.bestMatch.rating * 100;

        if (matchScore > 70) { // Threshold for matching
            matchedSentencesCount++;
            resultA[i].isMatch = true;
            resultA[i].similarity = Math.round(matchScore);
            resultA[i].matchedWithIndex = bestMatch.bestMatchIndex;
            
            resultB[bestMatch.bestMatchIndex].isMatch = true;
            resultB[bestMatch.bestMatchIndex].similarity = Math.max(resultB[bestMatch.bestMatchIndex].similarity, Math.round(matchScore));

            matchingWords += sA.raw.trim().split(/\s+/).length;
            
            matchedSentencesList.push({
                indexA: i,
                indexB: bestMatch.bestMatchIndex,
                textA: sA.raw,
                textB: sentencesB[bestMatch.bestMatchIndex].raw,
                similarity: Math.round(matchScore)
            });
        }
    }

    const totalWordsA = textA.split(/\s+/).length || 1;
    const totalWordsB = textB.split(/\s+/).length || 1;
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
