
import 'dotenv/config';
import readline from 'node:readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise(resolve => rl.question(prompt, resolve));
}

const MAX_HISTORY = 20

const history = [
    {
        role: 'system',
        content: ''
    }
]

const PROVIDERS = [
    {
        key: process.env.MISTRAL_API_KEY,
        url: 'https://api.mistral.ai/v1/chat/completions',
        model: 'mistral-small-latest',
        type: 'Mistral'
    },
    {
        key: process.env.GROQ_API_KEY,
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
        type: 'Groq'
    }
]

let currentProvider = PROVIDERS[0];

function switchProvider(name) {
    name = name.toLowerCase();

    switch (true) {
        case name.includes('mistral'):
            currentProvider = PROVIDERS[0];
            break;
        case name.includes('groq'):
            currentProvider = PROVIDERS[1];
            break;
        default:
            //provider non supporté
            console.log(name);

            return false;
    }
    return true;
}

console.log('Chatbot CLI - Phase 1. (Ctrl+C pour quitter)');

//boucle question IA
while (true) {
    const input = await question('Vous : ');
    if (input.startsWith('/history')) { console.log(history); continue; }
    if (input.startsWith('/provider') && switchProvider(input)) {
        console.log(`Provider changé : (${currentProvider.type} ${currentProvider.model})`)
        continue;
    }
    if (input.startsWith('/resume')) {resume(); continue;}
    await chatStream(input);
    await compressHistory();
}

async function resume() {

    var prompt = [{
        role : 'user',
        content : 'résume moi toute notre discussion en max 5 bullet points, chacun commencant par un verbe'
    }];

    prompt = [...history, ...prompt];

    const response = await fetch(currentProvider.url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentProvider.key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: currentProvider.model,
                messages: prompt,
                temperature: 0.7
            })
        });
        
        const data = await response.json();            
        const assistantMessage = data.choices[0].message.content;

        console.log(assistantMessage);        
}

async function compressHistory() {
    
    if (history.length >= MAX_HISTORY) {

        var histo = history.slice(1).map(m => `${m.role}:\n${m.content}`).join('\n');
        var prompt = 'résume moi tout ce texte en 5 phrases maximum';

        history.push({
            role: 'user',
            content: histo + prompt
        })

        const response = await fetch(currentProvider.url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentProvider.key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: currentProvider.model,
                messages: history,
                temperature: 0.3
            })
        });

        const data = await response.json();
        
        const assistantMessage = data.choices[0].message.content;

        history.splice(1, history.length);

        history.push({role : 'assistant', content: assistantMessage});
        
        console.log('Contexte compressé');
    }
}
async function chatStream(userMessage) {

    history.push({
        role: 'user',
        content: userMessage
    });

    const response = await fetch(currentProvider.url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${currentProvider.key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: currentProvider.model,
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
