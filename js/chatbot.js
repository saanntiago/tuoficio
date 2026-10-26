(function() {
    // --- Layer 1: NLP Preprocessing ---
    class NLP {
        static tokenize(text) {
            return text.toLowerCase().replace(/[.,?!¡¿]/g, '').split(/\s+/).filter(w => w.length > 0);
        }

        static stem(word) {
            const suffixes = ['ción', 'ando', 'iendo', 'mente', 'idad', 'oso', 'osa', 'ero', 'era', 'ista', 'ar', 'er', 'ir', 'ado', 'ido', 'es', 's'];
            let stemmed = word;
            for (let suffix of suffixes) {
                if (word.endsWith(suffix) && word.length > suffix.length + 2) {
                    stemmed = word.slice(0, -suffix.length);
                    break;
                }
            }
            return stemmed;
        }

        static correctSpelling(text, synonyms) {
            let words = this.tokenize(text);
            return words.map(w => synonyms[w] || w).join(' ');
        }

        static removeStopwords(tokens, stopwords) {
            return tokens.filter(t => !stopwords.includes(t));
        }

        static extractEntities(text, patterns) {
            let entities = {};
            for (let key in patterns) {
                let matches = text.match(patterns[key]);
                if (matches) entities[key] = matches;
            }
            return entities;
        }

        static analyzeSentiment(tokens, sentimentWords) {
            let score = 0;
            tokens.forEach(t => {
                if (sentimentWords.positive.includes(t)) score += 1;
                if (sentimentWords.negative.includes(t)) score -= 1;
            });
            return score;
        }

        static bagOfWords(tokens, vocabulary) {
            let bag = new Array(Object.keys(vocabulary).length).fill(0);
            tokens.forEach(t => {
                let stemmed = this.stem(t);
                if (vocabulary[stemmed] !== undefined) {
                    bag[vocabulary[stemmed]] = 1;
                }
            });
            return bag;
        }
    }

    // --- Layer 2: Neural Network Classifier ---
    class NeuralNetwork {
        constructor(inputSize, hiddenSize1, hiddenSize2, outputSize) {
            this.inputSize = inputSize;
            this.hiddenSize1 = hiddenSize1;
            this.hiddenSize2 = hiddenSize2;
            this.outputSize = outputSize;

            this.W1 = this.initWeights(inputSize, hiddenSize1);
            this.b1 = new Array(hiddenSize1).fill(0);
            this.W2 = this.initWeights(hiddenSize1, hiddenSize2);
            this.b2 = new Array(hiddenSize2).fill(0);
            this.W3 = this.initWeights(hiddenSize2, outputSize);
            this.b3 = new Array(outputSize).fill(0);
        }

        initWeights(rows, cols) {
            let w = [];
            for (let i = 0; i < rows; i++) {
                w.push(new Array(cols).fill(0).map(() => Math.random() * 2 - 1));
            }
            return w;
        }

        relu(x) { return Math.max(0, x); }
        reluDerivative(x) { return x > 0 ? 1 : 0; }
        
        softmax(arr) {
            let max = Math.max(...arr);
            let exps = arr.map(x => Math.exp(x - max));
            let sum = exps.reduce((a, b) => a + b, 0);
            return exps.map(x => x / sum);
        }

        forward(input) {
            this.a0 = input;
            
            // Layer 1
            this.z1 = [];
            for (let j = 0; j < this.hiddenSize1; j++) {
                let sum = this.b1[j];
                for (let i = 0; i < this.inputSize; i++) {
                    sum += this.a0[i] * this.W1[i][j];
                }
                this.z1.push(sum);
            }
            this.a1 = this.z1.map(this.relu);

            // Layer 2
            this.z2 = [];
            for (let j = 0; j < this.hiddenSize2; j++) {
                let sum = this.b2[j];
                for (let i = 0; i < this.hiddenSize1; i++) {
                    sum += this.a1[i] * this.W2[i][j];
                }
                this.z2.push(sum);
            }
            this.a2 = this.z2.map(this.relu);

            // Output Layer
            this.z3 = [];
            for (let j = 0; j < this.outputSize; j++) {
                let sum = this.b3[j];
                for (let i = 0; i < this.hiddenSize2; i++) {
                    sum += this.a2[i] * this.W3[i][j];
                }
                this.z3.push(sum);
            }
            this.a3 = this.softmax(this.z3);
            
            return this.a3;
        }

        train(trainingData, epochs, learningRate) {
            for (let e = 0; e < epochs; e++) {
                for (let data of trainingData) {
                    this.forward(data.input);
                    
                    // Backprop
                    let dZ3 = [];
                    for(let i=0; i<this.outputSize; i++){
                        dZ3.push(this.a3[i] - data.output[i]);
                    }

                    let dW3 = this.initWeights(this.hiddenSize2, this.outputSize);
                    for(let i=0; i<this.hiddenSize2; i++){
                        for(let j=0; j<this.outputSize; j++){
                            dW3[i][j] = this.a2[i] * dZ3[j];
                        }
                    }

                    let dZ2 = new Array(this.hiddenSize2).fill(0);
                    for(let i=0; i<this.hiddenSize2; i++){
                        let error = 0;
                        for(let j=0; j<this.outputSize; j++){
                            error += dZ3[j] * this.W3[i][j];
                        }
                        dZ2[i] = error * this.reluDerivative(this.z2[i]);
                    }

                    let dW2 = this.initWeights(this.hiddenSize1, this.hiddenSize2);
                    for(let i=0; i<this.hiddenSize1; i++){
                        for(let j=0; j<this.hiddenSize2; j++){
                            dW2[i][j] = this.a1[i] * dZ2[j];
                        }
                    }

                    let dZ1 = new Array(this.hiddenSize1).fill(0);
                    for(let i=0; i<this.hiddenSize1; i++){
                        let error = 0;
                        for(let j=0; j<this.hiddenSize2; j++){
                            error += dZ2[j] * this.W2[i][j];
                        }
                        dZ1[i] = error * this.reluDerivative(this.z1[i]);
                    }

                    let dW1 = this.initWeights(this.inputSize, this.hiddenSize1);
                    for(let i=0; i<this.inputSize; i++){
                        for(let j=0; j<this.hiddenSize1; j++){
                            dW1[i][j] = this.a0[i] * dZ1[j];
                        }
                    }

                    // Update Weights
                    for(let i=0; i<this.inputSize; i++){
                        for(let j=0; j<this.hiddenSize1; j++){
                            this.W1[i][j] -= learningRate * dW1[i][j];
                        }
                    }
                    for(let j=0; j<this.hiddenSize1; j++) this.b1[j] -= learningRate * dZ1[j];

                    for(let i=0; i<this.hiddenSize1; i++){
                        for(let j=0; j<this.hiddenSize2; j++){
                            this.W2[i][j] -= learningRate * dW2[i][j];
                        }
                    }
                    for(let j=0; j<this.hiddenSize2; j++) this.b2[j] -= learningRate * dZ2[j];

                    for(let i=0; i<this.hiddenSize2; i++){
                        for(let j=0; j<this.outputSize; j++){
                            this.W3[i][j] -= learningRate * dW3[i][j];
                        }
                    }
                    for(let j=0; j<this.outputSize; j++) this.b3[j] -= learningRate * dZ3[j];
                }
            }
        }
    }

    // --- Core ChatBot Engine ---
    window.ChatBot = {
        data: null,
        nn: null,
        classes: [],
        conversationHistory: [],
        context: {},
        currentFlow: null,
        flowAnswers: {},
        isReady: false,

        init: function() {
            if (!window.ChatBotData) {
                console.error("ChatBotData not loaded");
                return;
            }
            this.data = window.ChatBotData;
            this.prepareData();
            this.buildModel();
            this.renderWidget();
            this.isReady = true;
            console.log("ChatBot Engine initialized.");
        },

        prepareData: function() {
            let vocabSet = new Set();
            this.data.intents.forEach(intent => {
                this.classes.push(intent.tag);
                intent.patterns.forEach(pattern => {
                    let text = NLP.correctSpelling(pattern, this.data.synonyms);
                    let tokens = NLP.tokenize(text);
                    let filtered = NLP.removeStopwords(tokens, this.data.stopwords);
                    filtered.forEach(w => vocabSet.add(NLP.stem(w)));
                });
            });
            
            let idx = 0;
            vocabSet.forEach(word => {
                this.data.vocabulary[word] = idx++;
            });
        },

        buildModel: function() {
            let trainingData = [];
            let numClasses = this.classes.length;
            let vocabSize = Object.keys(this.data.vocabulary).length;

            this.data.intents.forEach(intent => {
                let classIdx = this.classes.indexOf(intent.tag);
                let output = new Array(numClasses).fill(0);
                output[classIdx] = 1;

                intent.patterns.forEach(pattern => {
                    let text = NLP.correctSpelling(pattern, this.data.synonyms);
                    let tokens = NLP.tokenize(text);
                    let filtered = NLP.removeStopwords(tokens, this.data.stopwords);
                    let input = NLP.bagOfWords(filtered, this.data.vocabulary);
                    trainingData.push({input, output});
                });
            });

            this.nn = new NeuralNetwork(vocabSize, 128, 64, numClasses);
            this.nn.train(trainingData, 200, 0.05); // quick training
        },

        classify: function(text) {
            let clean = NLP.correctSpelling(text, this.data.synonyms);
            let tokens = NLP.tokenize(clean);
            let filtered = NLP.removeStopwords(tokens, this.data.stopwords);
            let bow = NLP.bagOfWords(filtered, this.data.vocabulary);
            
            let preds = this.nn.forward(bow);
            let maxProb = Math.max(...preds);
            let maxIdx = preds.indexOf(maxProb);

            if (maxProb > 0.3) {
                return this.classes[maxIdx];
            }
            return 'desconocido';
        },

        processMessage: function(userMessage) {
            this.addUserMessage(userMessage);
            this.showTypingIndicator();

            setTimeout(() => {
                if (this.currentFlow) {
                    this.manageConversationFlow(userMessage);
                } else {
                    let intentTag = this.classify(userMessage);
                    let entities = NLP.extractEntities(userMessage, this.data.entityPatterns);
                    let response = this.generateResponse(intentTag, entities, userMessage);
                    
                    // Check for flow triggers
                    if (intentTag === 'perfil_trabajador' && userMessage.toLowerCase().includes('cv')) {
                        this.startFlow('workerProfileCreation');
                    } else if (intentTag === 'publicar_cotizacion' && userMessage.toLowerCase().includes('iniciar')) {
                        this.startFlow('jobPosting');
                    } else {
                        this.addBotMessage(response.text, response.suggestions);
                    }
                }
                this.hideTypingIndicator();
            }, 800 + Math.random() * 1000); // Simulate human typing delay
        },

        generateResponse: function(intentTag, entities, rawText) {
            let intent = this.data.intents.find(i => i.tag === intentTag);
            let text = "Lo siento, no te entendí bien. ¿Podrías reformularlo?";
            let suggestions = [];

            if (intent) {
                let responses = intent.responses;
                text = responses[Math.floor(Math.random() * responses.length)];
                
                // Handle parentesco specifically
                if (entities.family) {
                    text = `Entiendo que es para tu ${entities.family[0]}. ` + text;
                }

                // Personalize
                let userName = this.context.userName || "usuario";
                text = text.replace('{nombre}', userName);
                
                suggestions = this.getSuggestions(intentTag);
            }

            return { text, suggestions };
        },

        getSuggestions: function(intentTag) {
            if (intentTag === 'saludo') return ['Buscar un plomero', 'Cómo funciona', 'Registrarme'];
            if (intentTag === 'ayuda') return ['Contactar soporte', 'Ver oficios', 'Mis cotizaciones'];
            return [];
        },

        startFlow: function(flowName) {
            this.currentFlow = {
                name: flowName,
                stepIdx: 0,
                steps: this.data.conversationFlows[flowName]
            };
            this.flowAnswers = {};
            let step = this.currentFlow.steps[0];
            this.addBotMessage(step.prompt);
        },

        manageConversationFlow: function(userMessage) {
            let step = this.currentFlow.steps[this.currentFlow.stepIdx];
            this.flowAnswers[step.step] = userMessage;

            if (step.next) {
                this.currentFlow.stepIdx++;
                let nextStep = this.currentFlow.steps[this.currentFlow.stepIdx];
                this.addBotMessage(nextStep.prompt);
            } else {
                // Finish flow
                if (this.currentFlow.name === 'workerProfileCreation') {
                    this.addBotMessage("¡CV Creado exitosamente! Revisa tu panel para verlo completo.");
                } else if (this.currentFlow.name === 'jobPosting') {
                    this.addBotMessage("Solicitud publicada. Los trabajadores te enviarán cotizaciones pronto.");
                }
                this.currentFlow = null;
            }
        },

        // --- UI Methods ---
        renderWidget: function() {
            if (document.getElementById('chatbot-widget')) return;

            let styles = `
                <style>
                    :root {
                        --chatbot-primary: #4E7A5C;
                        --chatbot-bg: #FFFFFF;
                        --chatbot-text: #21201C;
                        --chatbot-gray: #E3EBE4;
                    }
                    #chatbot-widget {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        z-index: 9999;
                        font-family: 'Manrope', sans-serif;
                    }
                    .chatbot-toggle {
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        background: var(--chatbot-primary);
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 24px;
                        cursor: pointer;
                        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
                        transition: transform 0.3s;
                    }
                    .chatbot-toggle:hover { transform: scale(1.1); }
                    .chatbot-window {
                        display: none;
                        width: 350px;
                        height: 500px;
                        background: var(--chatbot-bg);
                        border-radius: 16px;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                        flex-direction: column;
                        overflow: hidden;
                        position: absolute;
                        bottom: 80px;
                        right: 0;
                        border: 1px solid rgba(33,32,28,.08);
                    }
                    .chatbot-header {
                        background: var(--chatbot-primary);
                        color: white;
                        padding: 15px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-weight: bold;
                    }
                    .chatbot-header span { cursor: pointer; }
                    .chatbot-messages {
                        flex: 1;
                        padding: 15px;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    .msg-bubble {
                        max-width: 80%;
                        padding: 10px 15px;
                        border-radius: 16px;
                        font-size: 14px;
                        line-height: 1.4;
                    }
                    .msg-bot {
                        background: var(--chatbot-gray);
                        color: var(--chatbot-text);
                        align-self: flex-start;
                        border-bottom-left-radius: 4px;
                    }
                    .msg-user {
                        background: var(--chatbot-primary);
                        color: white;
                        align-self: flex-end;
                        border-bottom-right-radius: 4px;
                    }
                    .chatbot-input {
                        display: flex;
                        padding: 15px;
                        border-top: 1px solid #E9EDF7;
                        background: var(--chatbot-bg);
                    }
                    .chatbot-input input {
                        flex: 1;
                        padding: 10px;
                        border: 1px solid rgba(33,32,28,.08);
                        border-radius: 20px;
                        outline: none;
                        font-family: inherit;
                    }
                    .chatbot-input button {
                        background: var(--chatbot-primary);
                        color: white;
                        border: none;
                        padding: 0 15px;
                        margin-left: 10px;
                        border-radius: 20px;
                        cursor: pointer;
                    }
                    .typing-indicator {
                        display: none;
                        align-self: flex-start;
                        padding: 10px;
                        color: #9A958C;
                        font-size: 12px;
                    }
                    .chatbot-suggestions {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 5px;
                        margin-top: 5px;
                    }
                    .suggestion-btn {
                        background: white;
                        border: 1px solid var(--chatbot-primary);
                        color: var(--chatbot-primary);
                        border-radius: 12px;
                        padding: 5px 10px;
                        font-size: 12px;
                        cursor: pointer;
                    }
                    .suggestion-btn:hover {
                        background: var(--chatbot-primary);
                        color: white;
                    }
                </style>
            `;

            let html = `
                <div id="chatbot-widget">
                    <div class="chatbot-window" id="cb-window">
                        <div class="chatbot-header">
                            <div>🤖 TuOficioBot</div>
                            <span onclick="window.ChatBot.closeChat()">✖</span>
                        </div>
                        <div class="chatbot-messages" id="cb-messages">
                            <!-- messages go here -->
                        </div>
                        <div class="typing-indicator" id="cb-typing">Escribiendo...</div>
                        <div class="chatbot-input">
                            <input type="text" id="cb-input" placeholder="Escribe un mensaje..." onkeypress="if(event.key==='Enter') window.ChatBot.handleSend()">
                            <button onclick="window.ChatBot.handleSend()">➤</button>
                        </div>
                    </div>
                    <div class="chatbot-toggle" onclick="window.ChatBot.openChat()">💬</div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', styles + html);
        },

        openChat: function() {
            document.getElementById('cb-window').style.display = 'flex';
            if (this.conversationHistory.length === 0) {
                let greeting = this.getTimeGreeting();
                this.addBotMessage(`¡${greeting}! Soy TuOficioBot, el asistente de TuOficioCol. ¿En qué te ayudo hoy?`, ['Buscar plomero', 'Cómo funciona']);
            }
        },

        closeChat: function() {
            document.getElementById('cb-window').style.display = 'none';
        },

        handleSend: function() {
            let input = document.getElementById('cb-input');
            let text = input.value.trim();
            if (text) {
                this.processMessage(text);
                input.value = '';
            }
        },

        addUserMessage: function(text) {
            let msgs = document.getElementById('cb-messages');
            msgs.innerHTML += `<div class="msg-bubble msg-user">${text}</div>`;
            msgs.scrollTop = msgs.scrollHeight;
            this.conversationHistory.push({role: 'user', text});
        },

        addBotMessage: function(text, suggestions = []) {
            let msgs = document.getElementById('cb-messages');
            let suggHtml = suggestions.length > 0 ? 
                `<div class="chatbot-suggestions">` + 
                suggestions.map(s => `<button class="suggestion-btn" onclick="window.ChatBot.handleSuggestion('${s}')">${s}</button>`).join('') + 
                `</div>` : '';
                
            msgs.innerHTML += `
                <div style="display:flex; flex-direction:column; align-items:flex-start; margin-bottom:10px;">
                    <div class="msg-bubble msg-bot">${text}</div>
                    ${suggHtml}
                </div>`;
            msgs.scrollTop = msgs.scrollHeight;
            this.conversationHistory.push({role: 'bot', text});
        },

        handleSuggestion: function(text) {
            this.processMessage(text);
        },

        showTypingIndicator: function() {
            document.getElementById('cb-typing').style.display = 'block';
            let msgs = document.getElementById('cb-messages');
            msgs.scrollTop = msgs.scrollHeight;
        },

        hideTypingIndicator: function() {
            document.getElementById('cb-typing').style.display = 'none';
        },

        getTimeGreeting: function() {
            let hour = new Date().getHours();
            if (hour < 12) return 'Buenos días';
            if (hour < 19) return 'Buenas tardes';
            return 'Buenas noches';
        }
    };

    // Auto-init on load if data exists
    window.addEventListener('DOMContentLoaded', () => {
        if(window.ChatBotData) window.ChatBot.init();
    });

})();
