function toggleChatbot() {
    const chatWindow = document.getElementById('chatbotWindow');
    chatWindow.classList.toggle('active');
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function sendQuickMessage(message) {
    document.getElementById('chatbotInput').value = message;
    sendMessage();
}

function sendMessage() {
    const input = document.getElementById('chatbotInput');
    const message = input.value.trim();
    
    if (message) {
        addMessage(message, 'user');
        input.value = '';
        
        setTimeout(() => {
            const response = getBotResponse(message);
            addMessage(response, 'bot');
        }, 500);
    }
}

function addMessage(text, sender) {
    const messagesDiv = document.getElementById('chatbotMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'chatbot-message-avatar';
    avatar.textContent = sender === 'bot' ? '🤖' : '👤';
    
    const content = document.createElement('div');
    content.className = 'chatbot-message-content';
    content.textContent = text;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    messagesDiv.appendChild(messageDiv);
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function getBotResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('gastronom') || lowerMessage.includes('comer')) {
        return '¡Tenemos excelentes opciones gastronómicas! Te recomiendo visitar el Comedor Ariana. 🍽';
    } else if (lowerMessage.includes('hosped') || lowerMessage.includes('dormir')) {
        return 'Contamos con varios hospedajes: Leguiza Hotel, Hospedaje JR, Casa Blanca y Fortune. 🏨';
    } else if (lowerMessage.includes('evento') || lowerMessage.includes('actividad')) {
        return '¡Este mes tenemos la Fiesta Patronal (16/8) y el Encuentro Cultural (24/8)! 🎉';
    } else if (lowerMessage.includes('historia') || lowerMessage.includes('iglesia')) {
        return 'San Roque tiene una rica historia. No te pierdas la Plaza San Martín y la Iglesia centenaria. ⛪';
    } else if (lowerMessage.includes('clima')) {
        return 'Hoy tenemos 24°C y está parcialmente soleado. ¡Ideal para recorrer la ciudad! 🌤';
    } else if (lowerMessage.includes('mapa') || lowerMessage.includes('ubicacion')) {
        return 'Podés ver todos los puntos en nuestro mapa interactivo. 🗺️';
    } else {
        return 'Gracias por tu consulta. Escribinos al WhatsApp: 3777 000000. 😊';
    }
}