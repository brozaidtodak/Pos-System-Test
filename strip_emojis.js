const fs = require('fs');

function removeEmojis(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Remove standard emojis and pictographics
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
    let newContent = content.replace(emojiRegex, '');
    
    // Remove additional symbols often used as emojis (warning, arrows, etc.)
    const extraRegex = /[\u2600-\u26FF\u2700-\u27BF\u2300-\u23FF\u2B50\u2B55\u2934\u2935\u2B05\u2B06\u2B07\u2194\u2195\u25AA\u25AB\u25FE\u25FD\u25FC\u25FB\u2B1B\u2B1C]/gu;
    newContent = newContent.replace(extraRegex, '');
    
    fs.writeFileSync(filePath, newContent);
    console.log(`Cleaned ${filePath}`);
}

removeEmojis('index.html');
removeEmojis('app.js');
