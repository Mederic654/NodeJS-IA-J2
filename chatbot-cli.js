
import 'dotenv/config';
import readline from 'node:readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise(resolve => rl.question(prompt, resolve));
}

const history = [
    {
        role: 'system',
        content: ''
    }
]

console.log('Chatbot CLI - Phase 1. (Ctrl+C pour quitter)');

while (true) {
    const input = await question('Vous : ');
    if (input === '/history') { console.log(history); continue;}

    const reply = await askMistral(input);
    console.log(`IA : ${reply}\n`);
}

async function askMistral(userMessage) {

    history.push({
        role: 'user',
        content: userMessage
    });

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'mistral-small-latest',
            messages: history
        })
    });

    const data = await response.json();

    const assistantMessage = data.choices[0].message.content;

    history.push({
        role: 'assistant',
        content: assistantMessage
    })

    return assistantMessage;
}
