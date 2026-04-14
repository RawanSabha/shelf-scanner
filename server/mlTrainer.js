const natural = require('natural');
const classifier = new natural.BayesClassifier();

// 1. 📚 TRAINING DATA (Teaching the AI)
// We feed it keywords and tell it what category they belong to.

// Technology & Engineering
classifier.addDocument('javascript python react database code web server network coding algorithm software cloud', 'Technology & Engineering');
classifier.addDocument('algorithms structure engineering computer programming ai app development machine learning', 'Technology & Engineering');

// Sociology & Feminism
classifier.addDocument('women race class feminism feminist equality society gender inequality rights', 'Sociology & Feminism');
classifier.addDocument('black feminist thought sister outsider intersectional justice discrimination culture', 'Sociology & Feminism');

// Classic Fiction & Literature
classifier.addDocument('green gables secret garden little women emily orphan island tale classic classic novel', 'Classic Fiction');
classifier.addDocument('tales story novel fiction journey adventure literature old english heritage book', 'Classic Fiction');

// Sci-Fi & Fantasy
classifier.addDocument('space stars alien galaxy future robot planet universe ship sci-fi time travel', 'Sci-Fi & Fantasy');
classifier.addDocument('magic dragons wizard sword kingdom fantasy spell elf witch magical realms', 'Sci-Fi & Fantasy');

// Biography & Autobiography
classifier.addDocument('life story memoir biography autobiography history personal diary letters self-portrait', 'Biography & Autobiography');
classifier.addDocument('memories life journey birth death career childhood lived narrative', 'Biography & Autobiography');

// Science & Mathematics
classifier.addDocument('physics chemistry biology mathematics calculus geometry science quantum relativity atoms', 'Science & Mathematics');
classifier.addDocument('equations life science lab experiment research scientific method numbers', 'Science & Mathematics');

// History & Politics
classifier.addDocument('history war politics empire revolution past wars governance policy government leader', 'History & Politics');
classifier.addDocument('historical roman greek civil ancient president king queen nation state', 'History & Politics');

// 2. 🧠 TRAIN THE MODEL
classifier.train();
console.log("🧠 ML NLP Model successfully trained with expanded dataset!");

// 3. 🚀 EXPORT THE PREDICTOR
// Adding a threshold (if probability is too low, we flag as General/Uncategorized)
const predictGenre = (bookTitle) => {
    // Get all class probabilities
    const classifications = classifier.getClassifications(bookTitle);
    
    // Example format: [ { label: 'Technology', value: 0.8 }, { label: 'Sci-Fi', value: 0.1 } ]
    if (classifications && classifications.length > 0) {
        const topMatch = classifications[0];
        
        // Let's establish a baseline threshold. Since naïve bayes without smoothed logs can produce very low absolute numbers depending on string length,
        // we might just check if the top probability differs significantly from the second, or just use a fixed threshold.
        // For simplicity, a fixed heuristic or just ensuring it's not a generic random guess.
        // `classifier.classify` just returns the label of the top string.
        
        // If the query has very no matching keywords, values for all classes become extremely small and identical.
        // We will sum the values. If the sum is extremely tiny, then it's uncategorized.
        const totalScore = classifications.reduce((sum, c) => sum + c.value, 0);
        
        // Typically if words are totally unknown, the values are equal across all labels.
        // Let's check the ratio of the top match relative to the total.
        if (totalScore === 0) return 'General / Uncategorized';

        const topRatio = topMatch.value / totalScore;
        
        // If the top ratio isn't dominant (e.g. at least 25-30% in a 7-class system), it's probably random noise.
        // With 7 classes, pure random is 14%. Let's say if top ratio is less than 20%, it's quite uncertain.
        if (topRatio < 0.25) {
            return 'General / Uncategorized';
        }

        return topMatch.label;
    }
    
    return 'General / Uncategorized';
};

module.exports = { predictGenre };