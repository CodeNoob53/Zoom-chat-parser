/**
 * Модуль для відображення чату Zoom у вигляді візуального інтерфейсу
 */
import { elements } from '../core/dom.js'
import { showNotification } from '../core/notification.js'

// Стан відображення чату
let chatViewState = {
  isVisualized: false,
  originalText: '',
  messages: [],
  showChatButton: null,
  textareaWrapper: null
}

/**
 * Ініціалізує систему відображення чату
 */
export function initChatView () {
  const { chatInput } = elements
  if (!chatInput) return

  let textareaWrapper = chatInput.parentNode.querySelector('.textarea-wrapper')
  if (!textareaWrapper) {
    textareaWrapper = document.createElement('div')
    textareaWrapper.className = 'textarea-wrapper'
    chatInput.parentNode.insertBefore(textareaWrapper, chatInput)
    textareaWrapper.appendChild(chatInput)
  }
  chatViewState.textareaWrapper = textareaWrapper

  chatInput.addEventListener('paste', e => {
    setTimeout(() => {
      if (!chatViewState.isVisualized && chatInput.value.trim()) {
        chatViewState.originalText = chatInput.value
        visualizeChat(chatInput)
      }
    }, 100)
  })

  chatInput.addEventListener('input', () => {
    if (chatViewState.isVisualized) {
      removeChatVisualization()
    }
  })
}

/**
 * Створює візуалізацію чату на основі тексту з textarea
 */
export function visualizeChat (textarea) {
  if (!textarea || !textarea.value.trim()) return

  if (chatViewState.isVisualized) {
    removeChatVisualization()
  }

  const originalText = textarea.value
  chatViewState.originalText = originalText

  try {
    const messages = parseChatForVisualization(originalText)
    chatViewState.messages = messages

    if (messages.length === 0) {
      textarea.style.display = 'block'
      showNotification('Немає повідомлень для відображення', 'info')
      return
    }

    const chatContainer = renderChatView(messages)

    const editButton = document.createElement('button')
    editButton.className = 'edit-chat-button'
    editButton.textContent = 'Редагувати'
    editButton.onclick = () => {
      removeChatVisualization()
    }

    textarea.style.display = 'none'
    chatViewState.textareaWrapper.appendChild(chatContainer)
    chatViewState.textareaWrapper.appendChild(editButton)

    if (chatViewState.showChatButton) {
      chatViewState.showChatButton.remove()
      chatViewState.showChatButton = null
    }

    chatViewState.isVisualized = true
    showNotification('Чат візуалізовано', 'success')
  } catch (error) {
    console.error('Помилка візуалізації чату:', error)
    showNotification('Помилка візуалізації чату', 'error')
    textarea.style.display = 'block'
  }
}

/**
 * Видаляє візуалізацію чату і повертає textarea
 */
export function removeChatVisualization () {
  const { chatInput } = elements
  if (!chatInput || !chatViewState.isVisualized) return

  const chatContainer =
    chatViewState.textareaWrapper.querySelector('.chat-view')
  if (chatContainer) {
    chatContainer.remove()
  }

  const editButton =
    chatViewState.textareaWrapper.querySelector('.edit-chat-button')
  if (editButton) {
    editButton.remove()
  }

  chatInput.style.display = 'block'

  if (chatViewState.messages.length > 0) {
    const showChatButton = document.createElement('button')
    showChatButton.className = 'show-chat-button'
    showChatButton.textContent = 'Показати чат'
    showChatButton.onclick = () => {
      visualizeChat(chatInput)
    }

    chatViewState.textareaWrapper.appendChild(showChatButton)
    chatViewState.showChatButton = showChatButton
  }

  chatViewState.isVisualized = false
}

/**
 * Парсить текст чату для візуалізації
 */
function parseChatForVisualization (text) {
  const messages = []
  const lines = text.split('\n')

  let currentMessage = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const messageMatch = line.match(
      /(\d{2}:\d{2}:\d{2}) From (.*?) to Everyone:(.*)$/
    )

    if (messageMatch) {
      if (currentMessage) {
        messages.push(currentMessage)
      }

      currentMessage = {
        time: messageMatch[1],
        sender: messageMatch[2].trim(),
        content: messageMatch[3].trim(),
        isReply: false,
        replyTo: null,
        mentions: [],
        reactions: []
      }
    } else if (currentMessage) {
      const lineContent = line.trim()

      if (lineContent === '') continue

      const replyMatch = lineContent.match(/^Replying to "([^"]+)":(.*)$/)
      if (replyMatch) {
        currentMessage.isReply = true
        currentMessage.replyTo = replyMatch[1].trim()
        currentMessage.content =
          replyMatch[2] && replyMatch[2].trim() ? replyMatch[2].trim() : ''
      } else if (
        lineContent.match(
          /^[^:]+:\s*[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]/u
        )
      ) {
        const reactionMatch = lineContent.match(
          /^([^:]+):\s*([\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]+)/u
        )
        if (reactionMatch) {
          currentMessage.reactions.push({
            user: reactionMatch[1].trim(),
            emoji: reactionMatch[2].trim()
          })
        } else {
          currentMessage.content = currentMessage.content
            ? currentMessage.content + ' ' + lineContent
            : lineContent
        }
      } else {
        currentMessage.content = currentMessage.content
          ? currentMessage.content + ' ' + lineContent
          : lineContent
      }

      const mentionMatches = lineContent.match(/@([a-zA-Z0-9_\s]+)/g)
      if (mentionMatches) {
        mentionMatches.forEach(mention => {
          const username = mention.substring(1).trim()
          if (!currentMessage.mentions.includes(username)) {
            currentMessage.mentions.push(username)
          }
        })
      }
    }
  }

  if (currentMessage) {
    messages.push(currentMessage)
  }

  return messages
}

/**
 * Генерує нейтральний колір на основі імені користувача
 */
function generateUserColor (username) {
  const neutralColors = [
    '#6B7280',
    '#9CA3AF',
    '#4B5563',
    '#A7F3D0',
    '#6EE7B7',
    '#A5B4FC',
    '#60A5FA',
    '#FBBF24',
    '#FCA5A5'
  ]

  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % neutralColors.length
  return neutralColors[index]
}

/**
 * Створює HTML-представлення чату
 * @param {Array} messages - Масив об’єктів повідомлень після парсингу
 */
export function renderChatView (messages) {
  // Контейнер усіх повідомлень
  const chatContainer = document.createElement('div')
  chatContainer.className = 'chat-view'

  // Для групування повідомлень від одного відправника
  let messageGroup = null
  let previousSender = null

  // Щоб знати, який "реакційний блок" зараз відкрито
  let currentlyOpened = null
  let currentlyOpenedTimer = null

  messages.forEach((message, index) => {
    // Перевірка, чи треба створити нову групу (новий відправник)
    if (index === 0 || message.sender !== previousSender) {
      messageGroup = document.createElement('div')
      messageGroup.className = 'message-group'

      // Хедер з іконкою та іменем відправника
      const senderHeader = document.createElement('div')
      senderHeader.className = 'sender-header'

      const userIcon = document.createElement('span')
      userIcon.className = 'user-icon material-icons'
      userIcon.textContent = 'person'
      userIcon.style.backgroundColor = generateUserColor(message.sender)
      senderHeader.appendChild(userIcon)

      const senderName = document.createElement('div')
      senderName.className = 'sender-name'
      senderName.textContent = message.sender
      senderHeader.appendChild(senderName)

      messageGroup.appendChild(senderHeader)
      chatContainer.appendChild(messageGroup)
    }

    // Зберігаємо ім’я відправника, щоб порівнювати з наступними повідомленнями
    previousSender = message.sender

    // Створюємо елемент "бульбашки" повідомлення
    const messageElement = document.createElement('div')
    messageElement.className = 'message-bubble'

    // Загортатимемо контент у wrapper
    const contentWrapper = document.createElement('div')
    contentWrapper.className = 'content-wrapper'

    // Якщо є "Replying to ..."
    if (message.isReply && message.replyTo) {
      const replyElement = document.createElement('div')
      replyElement.className = 'reply-quote'
      replyElement.textContent = message.replyTo
      contentWrapper.appendChild(replyElement)
    }

    // Формуємо контент з mentions (підсвіченням @user)
    let contentText = message.content
    if (message.mentions && message.mentions.length > 0) {
      message.mentions.forEach(mention => {
        const mentionRegex = new RegExp(`@${mention}\\b`, 'g')
        contentText = contentText.replace(
          mentionRegex,
          `<span class="mention">@${mention}</span>`
        )
      })
    }

    // Додаємо текст повідомлення
    const contentElement = document.createElement('div')
    contentElement.className = 'message-content'
    contentElement.innerHTML = contentText
    contentWrapper.appendChild(contentElement)

    // Якщо в повідомленні є реакції
    if (message.reactions && message.reactions.length > 0) {
      const reactionsElement = document.createElement('div')
      reactionsElement.className = 'message-reactions'

      // Проходимося по кожній реакції
      message.reactions.forEach(reaction => {
        // Контейнер, де будуть емоджі та прихована інфа
        const reactionContainer = document.createElement('span')
        reactionContainer.className = 'reaction-container'

        // 1. Видимий емоджі
        const emojiSpan = document.createElement('span')
        emojiSpan.className = 'reaction-emoji'
        emojiSpan.textContent = reaction.emoji

        // 2. Прихований блок із даними (автор + емоджі)
        const infoSpan = document.createElement('span')
        infoSpan.className = 'reaction-info hidden'
        infoSpan.textContent = `${reaction.user}: ${reaction.emoji}`

        // Логіка кліку по емоджі:
        emojiSpan.addEventListener('click', () => {
          // Якщо якийсь блок уже відкритий і це не той самий, ховаємо його
          if (currentlyOpened && currentlyOpened !== infoSpan) {
            currentlyOpened.classList.remove('shown')
            currentlyOpened.classList.add('hidden')
            if (currentlyOpenedTimer) {
              clearTimeout(currentlyOpenedTimer)
            }
          }

          // Перевіряємо, чи блок "shown"
          const isShown = infoSpan.classList.contains('shown')
          if (isShown) {
            // Якщо так, то просто закриваємо його
            infoSpan.classList.remove('shown')
            infoSpan.classList.add('hidden')
            currentlyOpened = null
          } else {
            // Якщо ні, то відкриваємо
            infoSpan.classList.remove('hidden')
            infoSpan.classList.add('shown')
            currentlyOpened = infoSpan

            // Ставимо таймер автозакриття (2.5 с)
            currentlyOpenedTimer = setTimeout(() => {
              infoSpan.classList.remove('shown')
              infoSpan.classList.add('hidden')
              currentlyOpened = null
            }, 2500)
          }
        })

        // Додаємо все в DOM
        reactionContainer.appendChild(emojiSpan)
        reactionContainer.appendChild(infoSpan)
        reactionsElement.appendChild(reactionContainer)
      })

      contentWrapper.appendChild(reactionsElement)
    }

    // Додаємо contentWrapper в бульбашку
    messageElement.appendChild(contentWrapper)

    // Елемент часу праворуч унизу
    const timeElement = document.createElement('span')
    timeElement.className = 'message-time'
    timeElement.textContent = message.time
    messageElement.appendChild(timeElement)

    // Додаємо бульбашку повідомлення до групи
    messageGroup.appendChild(messageElement)
  })

  return chatContainer
}

export { chatViewState }
