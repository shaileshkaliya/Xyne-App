const MAX_MESSAGES = 50;

function login() {
  const popup = window.open('http://localhost:5173/auth', '_blank', 'width=500,height=600');
  const interval = setInterval(() => {
    if (popup.closed) {
      clearInterval(interval);
      alert('✅ Logged in successfully!');
      document.getElementById('login-container').style.display = 'none';
      document.getElementById('chat-container').style.display = 'flex';
      loadMessages();
    }
  }, 1000);
}

function loadMessages() {
  const messages = JSON.parse(localStorage.getItem('chat_messages') || '[]');
  messages.forEach(msg => addMessage(msg.role, msg.content));
}

function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = content;
  document.getElementById('chat-box').appendChild(div);
  document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('user-input');
  const query = input.value.trim();
  if (!query) return;

  addMessage('user', query);
  saveMessage('user', query);
  input.value = '';

  try {
    const res = await fetch('http://localhost:5173/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();
    addMessage('bot', data.response);
    saveMessage('bot', data.response);
  } catch (err) {
    addMessage('bot', '⚠️ Error fetching response');
  }
}

function saveMessage(role, content) {
  let messages = JSON.parse(localStorage.getItem('chat_messages') || '[]');
  messages.push({ role, content });
  if (messages.length > MAX_MESSAGES) {
    messages = messages.slice(messages.length - MAX_MESSAGES);
  }
  localStorage.setItem('chat_messages', JSON.stringify(messages));
}
