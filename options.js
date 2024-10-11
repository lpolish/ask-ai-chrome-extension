function OptionsPage() {
  const [apiKey, setApiKey] = React.useState('');
  const [theme, setTheme] = React.useState('system');

  React.useEffect(() => {
    chrome.storage.sync.get(['apiKey', 'theme'], (result) => {
      if (result.apiKey) setApiKey(result.apiKey);
      if (result.theme) setTheme(result.theme);
    });
  }, []);

  const saveOptions = () => {
    chrome.storage.sync.set({ apiKey, theme }, () => {
      alert('Options saved');
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Ask AI Extension Options</h1>
      <div className="mb-4">
        <label htmlFor="apiKey" className="block mb-2">OpenAI API Key:</label>
        <input
          type="text"
          id="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="theme" className="block mb-2">Theme:</label>
        <select
          id="theme"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <button
        onClick={saveOptions}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Save
      </button>
    </div>
  );
}

ReactDOM.render(<OptionsPage />, document.getElementById('root'));
