function OptionsPage() {
  const container = document.createElement('div');
  container.className = 'container mx-auto p-4';

  const title = document.createElement('h1');
  title.className = 'text-2xl font-bold mb-4';
  title.textContent = 'Ask AI Extension Options';
  container.appendChild(title);

  const apiKeyDiv = document.createElement('div');
  apiKeyDiv.className = 'mb-4';

  const apiKeyLabel = document.createElement('label');
  apiKeyLabel.htmlFor = 'apiKey';
  apiKeyLabel.className = 'block mb-2';
  apiKeyLabel.textContent = 'OpenAI API Key:';
  apiKeyDiv.appendChild(apiKeyLabel);

  const apiKeyInput = document.createElement('input');
  apiKeyInput.type = 'text';
  apiKeyInput.id = 'apiKey';
  apiKeyInput.className = 'w-full p-2 border rounded';
  apiKeyDiv.appendChild(apiKeyInput);

  container.appendChild(apiKeyDiv);

  const themeDiv = document.createElement('div');
  themeDiv.className = 'mb-4';

  const themeLabel = document.createElement('label');
  themeLabel.htmlFor = 'theme';
  themeLabel.className = 'block mb-2';
  themeLabel.textContent = 'Theme:';
  themeDiv.appendChild(themeLabel);

  const themeSelect = document.createElement('select');
  themeSelect.id = 'theme';
  themeSelect.className = 'w-full p-2 border rounded';

  const themes = ['system', 'light', 'dark'];
  themes.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme;
    option.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
    themeSelect.appendChild(option);
  });

  themeDiv.appendChild(themeSelect);
  container.appendChild(themeDiv);

  const saveButton = document.createElement('button');
  saveButton.className = 'bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600';
  saveButton.textContent = 'Save';
  saveButton.addEventListener('click', saveOptions);
  container.appendChild(saveButton);

  function saveOptions() {
    const apiKey = apiKeyInput.value;
    const theme = themeSelect.value;
    chrome.storage.sync.set({ apiKey, theme }, () => {
      alert('Options saved');
      applyTheme(theme);
    });
  }

  function applyTheme(theme) {
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.body.className = theme;
    if (theme === 'dark') {
      document.body.classList.add('bg-gray-900', 'text-white');
    } else {
      document.body.classList.add('bg-white', 'text-black');
    }
  }

  // Load saved options
  chrome.storage.sync.get(['apiKey', 'theme'], (result) => {
    if (result.apiKey) apiKeyInput.value = result.apiKey;
    if (result.theme) {
      themeSelect.value = result.theme;
      applyTheme(result.theme);
    } else {
      applyTheme('system');
    }
  });

  return container;
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('root');
  root.appendChild(OptionsPage());
});
