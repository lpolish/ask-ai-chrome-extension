console.log("Content script loaded");

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

function sendAIRequest(prompt, element, theme) {
  console.log("Sending AI request:", prompt);
  chrome.storage.sync.get(["apiKey"], (result) => {
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${result.apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log("AI response received:", data);
      const aiResponse = data.choices[0].message.content;
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