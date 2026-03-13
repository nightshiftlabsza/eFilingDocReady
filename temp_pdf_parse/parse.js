const fs = require('fs');
const pdf = require('pdf-parse');
const buffer = fs.readFileSync('C:/Users/maliy/Downloads/Antigravity_Prompt_Integrate_DocReady_Pricing_Page.pdf');
pdf(buffer).then(data => {
    console.log(data.text);
}).catch(err => {
    console.error("Error parsing:", err);
});
