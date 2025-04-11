/**
 * Модуль для відображення чату Zoom у вигляді візуального інтерфейсу
 */
import { elements } from '../core/dom.js';
import { showNotification } from '../core/notification.js';

// Стан відображення чату
let chatViewState = {
  isVisualized: false,
  originalText: '',
  messages: [],
  showChatButton: null,
  textareaWrapper: null
};

/**
 * Ініціалізує систему відображення чату
 */
export function initChatView() {
  const { chatInput } = elements;
  if (!chatInput) return;

  let textareaWrapper = chatInput.parentNode.querySelector('.textarea-wrapper');
  if (!textareaWrapper) {
    textareaWrapper = document.createElement('div');
    textareaWrapper.className = 'textarea-wrapper';
    chatInput.parentNode.insertBefore(textareaWrapper, chatInput);
    textareaWrapper.appendChild(chatInput);
  }
  chatViewState.textareaWrapper = textareaWrapper;

  chatInput.addEventListener('paste', (e) => {
    setTimeout(() => {
      if (!chatViewState.isVisualized && chatInput.value.trim()) {
        chatViewState.originalText = chatInput.value;
        visualizeChat(chatInput);
      }
    }, 100);
  });

  chatInput.addEventListener('input', () => {
    if (chatViewState.isVisualized) {
      removeChatVisualization();
    }
  });
}

/**
 * Створює візуалізацію чату на основі тексту з textarea
 */
export function visualizeChat(textarea) {
  if (!textarea || !textarea.value.trim()) return;

  if (chatViewState.isVisualized) {
    removeChatVisualization();
  }

  const originalText = textarea.value;
  chatViewState.originalText = originalText;

  try {
    const messages = parseChatForVisualization(originalText);
    chatViewState.messages = messages;

    // Перевіряємо, чи є повідомлення для відображення
    if (messages.length === 0) {
      // Якщо повідомлень немає, залишаємо textarea видимою і не додаємо кнопку "Показати чат"
      textarea.style.display = 'block';
      showNotification('Немає повідомлень для відображення', 'info');
      return;
    }

    const chatContainer = renderChatView(messages);
    
    const editButton = document.createElement('button');
    editButton.className = 'edit-chat-button';
    editButton.textContent = 'Редагувати';
    editButton.onclick = () => {
      removeChatVisualization();
    };

    textarea.style.display = 'none';
    chatViewState.textareaWrapper.appendChild(chatContainer);
    chatViewState.textareaWrapper.appendChild(editButton);

    if (chatViewState.showChatButton) {
      chatViewState.showChatButton.remove();
      chatViewState.showChatButton = null;
    }

    chatViewState.isVisualized = true;
    showNotification('Чат візуалізовано', 'success');
  } catch (error) {
    console.error('Помилка візуалізації чату:', error);
    showNotification('Помилка візуалізації чату', 'error');
    textarea.style.display = 'block'; // У разі помилки повертаємо textarea
  }
}

/**
 * Видаляє візуалізацію чату і повертає textarea
 */
export function removeChatVisualization() {
  const { chatInput } = elements;
  if (!chatInput || !chatViewState.isVisualized) return;

  const chatContainer = chatViewState.textareaWrapper.querySelector('.chat-view');
  if (chatContainer) {
    chatContainer.remove();
  }

  const editButton = chatViewState.textareaWrapper.querySelector('.edit-chat-button');
  if (editButton) {
    editButton.remove();
  }

  chatInput.style.display = 'block';

  // Додаємо кнопку "Показати чат" лише якщо є повідомлення для відображення
  if (chatViewState.messages.length > 0) {
    const showChatButton = document.createElement('button');
    showChatButton.className = 'show-chat-button';
    showChatButton.textContent = 'Показати чат';
    showChatButton.onclick = () => {
      visualizeChat(chatInput);
    };

    chatViewState.textareaWrapper.appendChild(showChatButton);
    chatViewState.showChatButton = showChatButton;
  }

  chatViewState.isVisualized = false;
}

/**
 * Парсить текст чату для візуалізації
 */
function parseChatForVisualization(text) {
  const messages = [];
  const lines = text.split('\n');
  
  let currentMessage = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    const messageMatch = line.match(/(\d{2}:\d{2}:\d{2}) From (.*?) to Everyone:(.*)$/);
    
    if (messageMatch) {
      if (currentMessage) {
        messages.push(currentMessage);
      }
      
      currentMessage = {
        time: messageMatch[1],
        sender: messageMatch[2].trim(),
        content: messageMatch[3].trim(),
        isReply: false,
        replyTo: null,
        mentions: [],
        reactions: []
      };
    } else if (currentMessage) {
      const lineContent = line.trim();
      
      if (lineContent === '') continue;
      
      const replyMatch = lineContent.match(/^Replying to "([^"]+)":(.*)$/);
      if (replyMatch) {
        currentMessage.isReply = true;
        currentMessage.replyTo = replyMatch[1].trim();
        currentMessage.content = replyMatch[2] && replyMatch[2].trim() ? replyMatch[2].trim() : '';
      } else if (lineContent.match(/^[^:]+:\s*[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]/u)) {
        const reactionMatch = lineContent.match(/^([^:]+):\s*([\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]+)/u);
        if (reactionMatch) {
          currentMessage.reactions.push({
            user: reactionMatch[1].trim(),
            emoji: reactionMatch[2].trim()
          });
        } else {
          currentMessage.content = currentMessage.content ? currentMessage.content + ' ' + lineContent : lineContent;
        }
      } else {
        currentMessage.content = currentMessage.content ? currentMessage.content + ' ' + lineContent : lineContent;
      }
      
      const mentionMatches = lineContent.match(/@([a-zA-Z0-9_\s]+)/g);
      if (mentionMatches) {
        mentionMatches.forEach(mention => {
          const username = mention.substring(1).trim();
          if (!currentMessage.mentions.includes(username)) {
            currentMessage.mentions.push(username);
          }
        });
      }
    }
  }
  
  if (currentMessage) {
    messages.push(currentMessage);
  }
  
  return messages;
}

/**
 * Генерує нейтральний колір на основі імені користувача
 */
function generateUserColor(username) {
  const neutralColors = [
    '#6B7280',
    '#9CA3AF',
    '#4B5563',
    '#A7F3D0',
    '#6EE7B7',
    '#A5B4FC',
    '#60A5FA',
    '#FBBF24',
    '#FCA5A5',
  ];

  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % neutralColors.length;
  return neutralColors[index];
}

/**
 * Створює HTML-представлення чату
 */
function renderChatView(messages) {
  const chatContainer = document.createElement('div');
  chatContainer.className = 'chat-view';

  let currentSender = null;
  let messageGroup = null;

  messages.forEach(message => {
    if (message.sender !== currentSender) {
      currentSender = message.sender;

      messageGroup = document.createElement('div');
      messageGroup.className = 'message-group';

      const senderHeader = document.createElement('div');
      senderHeader.className = 'sender-header';

      const userIcon = document.createElement('span');
      userIcon.className = 'user-icon material-icons';
      userIcon.textContent = 'person';
      userIcon.style.backgroundColor = generateUserColor(message.sender);
      senderHeader.appendChild(userIcon);

      const senderName = document.createElement('div');
      senderName.className = 'sender-name';
      senderName.textContent = message.sender;
      senderHeader.appendChild(senderName);

      messageGroup.appendChild(senderHeader);
      chatContainer.appendChild(messageGroup);
    }

    const messageElement = document.createElement('div');
    messageElement.className = 'message-bubble';

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content-wrapper';
    
    if (message.isReply) {
      const replyElement = document.createElement('div');
      replyElement.className = 'reply-quote';
      replyElement.textContent = message.replyTo;
      contentWrapper.appendChild(replyElement);
    }
    
    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';
    
    let contentText = message.content;
    message.mentions.forEach(mention => {
      const mentionRegex = new RegExp(`@${mention}\\b`, 'g');
      contentText = contentText.replace(
        mentionRegex,
        `<span class="mention">@${mention}</span>`
      );
    });
    
    contentElement.innerHTML = contentText;
    contentWrapper.appendChild(contentElement);
    
    if (message.reactions.length > 0) {
      const reactionsElement = document.createElement('div');
      reactionsElement.className = 'message-reactions';
      
      message.reactions.forEach(reaction => {
        const reactionElement = document.createElement('span');
        reactionElement.className = 'reaction';
        reactionElement.innerHTML = `<span class="reaction-user">${reaction.user}</span>: ${reaction.emoji}`;
        reactionsElement.appendChild(reactionElement);
      });
      
      contentWrapper.appendChild(reactionsElement);
    }
    
    messageElement.appendChild(contentWrapper);
    
    const timeElement = document.createElement('span');
    timeElement.className = 'message-time';
    timeElement.textContent = message.time;
    messageElement.appendChild(timeElement);
    
    messageGroup.appendChild(messageElement);
  });
  
  return chatContainer;
}

export { chatViewState };