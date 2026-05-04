
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

//boucle question IA
while (true) {
    const input = await question('Vous : ');
    if (input === '/history') { console.log(history); continue; }
    await chatStream(input);
}

async function chatStream(userMessage) {

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
            messages: history,
            temperature: 0.7,
            stream: true
        })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    process.stdout.write('IA : ');
    //boucle pour affichage en stream
    while (true) {
 
        const { done, value } = await reader.read();
        if (done) break;

        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
        
        for (const line of lines) {

            const jsonStr = line.slice(6);

            if (jsonStr.trim() === '[DONE]') continue;

            try {
                      const delta = JSON.parse(jsonStr).choices[0]?.delta?.content;


                process.stdout.write(delta);
                fullContent += delta;
            }
            catch { }
        }
        
    }
    process.stdout.write('\n\n');

    history.push({
        role: 'assistant',
        content: fullContent
    })

    return fullContent;
}
