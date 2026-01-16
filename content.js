console.log("Content script loaded");

// Store conversation history for the current tab
let conversationHistory = [];

// Maximum conversation messages to keep (10 exchanges = 20 messages)
const MAX_CONVERSATION_MESSAGES = 20;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request);
  if (request.action === "openAIPrompt") {
    const selectedText = window.getSelection().toString();
    const activeElement = document.activeElement;

    if (isEditableElement(activeElement)) {
      const prompt = window.prompt("What would you like to ask AI?", selectedText);
      if (prompt) {
        chrome.runtime.sendMessage({ action: "checkConfig" }, (response) => {
          console.log("Config check response:", response);
          if (response && response.configured) {
            sendAIRequest(prompt, activeElement, response.theme);
          }
        });
      }
    } else {
      console.log("No editable element found");
      alert("Please select an editable element before using 'Ask AI to...'");
    }
    sendResponse({ success: true });
  } else if (request.action === "clearConversation") {
    conversationHistory = [];
    sendResponse({ success: true });
  } else if (request.action === "showNotification") {
    showTemporaryNotification(request.message);
    sendResponse({ success: true });
  }
  return true;
});

function isEditableElement(element) {
  if (element.isContentEditable) {
    return true;
  }
  
  const tagName = element.tagName.toLowerCase();
  const inputType = element.type ? element.type.toLowerCase() : null;
  
  if (tagName === 'textarea') {
    return true;
  }
  
  if (tagName === 'input' && ['text', 'search', 'url', 'tel', 'email', 'number', 'password'].includes(inputType)) {
    return true;
  }
  
  // Check for custom editable elements (like Twitter's compose box)
  if (element.getAttribute('role') === 'textbox' || element.getAttribute('contenteditable') === 'true') {
    return true;
  }
  
  return false;
}

// Cache for static page context (URL, title, domain, meta description)
let cachedPageContext = null;

function getPageContext() {
  const selectedText = window.getSelection().toString();
  
  // Build or reuse cached static context
  if (!cachedPageContext) {
    cachedPageContext = {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname
    };
    
    // Get page meta description if available (cached once)
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      cachedPageContext.pageDescription = metaDescription.getAttribute('content');
    }
  }
  
  // Create context object with cached static data and dynamic data
  const pageContext = {
    ...cachedPageContext,
    selectedText: selectedText
  };
  
  // Get surrounding text context if available (dynamic, checked each time)
  const activeElement = document.activeElement;
  if (activeElement && isEditableElement(activeElement)) {
    const currentContent = activeElement.value || activeElement.textContent || '';
    if (currentContent.length > 0 && currentContent.length < 1000) {
      pageContext.currentFieldContent = currentContent;
    }
  }
  
  return pageContext;
}

function buildContextualMessages(userPrompt) {
  const pageContext = getPageContext();
  const messages = [];
  
  // Add system message with page context
  const contextParts = [
    `You are assisting a user on the webpage: "${pageContext.title}"`,
    `URL: ${pageContext.url}`,
    `Domain: ${pageContext.domain}`
  ];
  
  if (pageContext.pageDescription) {
    contextParts.push(`Page description: ${pageContext.pageDescription}`);
  }
  
  if (pageContext.selectedText && pageContext.selectedText.trim().length > 0) {
    contextParts.push(`Selected text: "${pageContext.selectedText}"`);
  }
  
  if (pageContext.currentFieldContent && pageContext.currentFieldContent.trim().length > 0) {
    contextParts.push(`Current field content: "${pageContext.currentFieldContent}"`);
  }
  
  contextParts.push('Please provide helpful, context-aware responses based on this information.');
  
  messages.push({
    role: "system",
    content: contextParts.join('\n')
  });
  
  // Add conversation history
  conversationHistory.forEach(msg => {
    messages.push(msg);
  });
  
  // Add current user prompt
  messages.push({
    role: "user",
    content: userPrompt
  });
  
  return messages;
}

function sendAIRequest(prompt, element, theme) {
  console.log("Sending AI request:", prompt);
  chrome.storage.sync.get(["apiKey"], (result) => {
    const messages = buildContextualMessages(prompt);
    
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${result.apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log("AI response received:", data);

      // Handle OpenAI API error responses
      if (data && data.error) {
        console.error("OpenAI API error:", data.error);
        alert(data.error.message || "An error occurred while processing your request.");
        return;
      }

      // Validate expected response structure
      if (
        !data ||
        !Array.isArray(data.choices) ||
        data.choices.length === 0 ||
        !data.choices[0] ||
        !data.choices[0].message ||
        typeof data.choices[0].message.content !== "string"
      ) {
        console.error("Unexpected OpenAI API response format:", data);
        alert("Received an unexpected response from the AI service.");
        return;
      }

      const aiResponse = data.choices[0].message.content;
      
      // Validate aiResponse has actual content
      if (!aiResponse || aiResponse.trim().length === 0) {
        console.error("AI response is empty:", data);
        alert("Received an empty response from the AI service.");
        return;
      }
      
      // Add to conversation history only after successful validation
      conversationHistory.push({
        role: "user",
        content: prompt
      });
      conversationHistory.push({
        role: "assistant",
        content: aiResponse
      });
      
      // Keep only last 10 exchanges (20 messages) to avoid token limits
      if (conversationHistory.length > MAX_CONVERSATION_MESSAGES) {
        conversationHistory = conversationHistory.slice(-MAX_CONVERSATION_MESSAGES);
      }
      
      insertTextIntoElement(element, aiResponse);
    })
    .catch(error => {
      console.error("Error:", error);
      alert("An error occurred while processing your request.");
    });
  });
}

function insertTextIntoElement(element, text) {
  if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
    // For contenteditable elements
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  } else if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
    // For textarea and input elements
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value;
    element.value = value.substring(0, start) + text + value.substring(end);
    element.selectionStart = element.selectionEnd = start + text.length;
  } else {
    // For custom elements with 'role' attribute
    element.textContent += text;
  }
}

function showTemporaryNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #4299e1;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    max-width: 300px;
    opacity: 0;
    transition: opacity 0.3s ease-out;
  `;
  
  const appendNotification = () => {
    if (!document.body) {
      return;
    }

    document.body.appendChild(notification);

    // Trigger fade in
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);

    // Fade out and remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };

  if (document.body) {
    appendNotification();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', appendNotification, { once: true });
  }
  // If body is unavailable and document is not loading, skip showing notification
}