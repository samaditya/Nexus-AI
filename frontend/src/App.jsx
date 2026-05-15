import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './index.css';

function App() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [activeDocument, setActiveDocument] = useState(null);

  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
  const chatEndRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadMessage('Processing document...');

    const formData = new FormData();
    formData.append('file', file);

    const API_BASE = import.meta.env.VITE_API_URL || '';
    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadMessage(data.message || 'File uploaded successfully!');
        setActiveDocument(file.name); // Set active document state
        setFile(null); // Clear selection
      } else {
        setUploadMessage('Failed to upload the file.');
      }
    } catch (error) {
      console.error(error);
      setUploadMessage('An error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim() || isTyping) return;

    // Add user message to chat immediately
    const userMessage = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMessage]);
    setQuery('');

    // Create a placeholder for the bot's streaming response
    setIsTyping(true);
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    const API_BASE = import.meta.env.VITE_API_URL || '';
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: userMessage.content,
          active_document: activeDocument
        }),
      });

      if (!response.body) throw new Error('ReadableStream not supported by the browser.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const updatedMessages = [...prev];
            const lastMessageIndex = updatedMessages.length - 1;
            // Append chunk to the last (assistant) message
            updatedMessages[lastMessageIndex] = {
              ...updatedMessages[lastMessageIndex],
              content: updatedMessages[lastMessageIndex].content + chunk,
            };
            return updatedMessages;
          });
        }
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => {
        const updatedMessages = [...prev];
        const lastMessageIndex = updatedMessages.length - 1;
        updatedMessages[lastMessageIndex].content = 'Error connecting to the server.';
        return updatedMessages;
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Auto-scroll logic when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Dark Mode side effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <div className="flex xl:flex-row flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 pointer-events-auto overflow-hidden transition-colors duration-300">
      {/* Sidebar (Fixed left panel) */}
      <div className="w-full xl:w-80 bg-white dark:bg-slate-900 xl:border-r border-b xl:border-b-0 border-slate-200 dark:border-slate-800 p-6 flex flex-col shadow-sm z-20 shrink-0">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Nexus AI
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Enterprise Knowledge Assistant</p>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Document Upload</h2>
          <div className="space-y-4">
            <div className="relative group">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="w-full h-32 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 bg-slate-50/50 dark:bg-slate-900/50"
              >
                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-200">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300 font-medium px-4 text-center truncate w-full">
                  {file ? file.name : "Select a PDF document"}
                </span>
                {!file && <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">PDF up to 50MB</span>}
              </label>
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className={`w-full py-2.5 px-4 rounded-xl font-medium transition-all duration-200 shadow-sm flex items-center justify-center gap-2 ${!file || isUploading
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow active:scale-[0.98]'
                }`}
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Process Document
                </>
              )}
            </button>
            {uploadMessage && (
              <div className={`text-sm flex items-start gap-2 p-3 rounded-lg border ${uploadMessage.includes('successful')
                  ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                  : uploadMessage.includes('Processing')
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400'
                    : 'bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-800 text-green-700 dark:text-green-400'
                }`}>
                <div className="mt-0.5">
                  {uploadMessage.includes('successful') && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <p className="font-medium leading-tight">{uploadMessage}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="mt-8 xl:mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)] relative">
                <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-20"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">System Online</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Connected</span>
              </div>
            </div>
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
              title="Toggle Theme"
            >
              {isDarkMode ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.243 16.243l.707.707M7.757 7.757l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area (Fluid right panel) */}
      <div className="flex-1 flex flex-col relative w-full h-full xl:max-h-screen overflow-hidden">

        <header className="h-14 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 sm:px-8 flex items-center justify-between shrink-0 z-10 sticky top-0 hidden xl:flex">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Analytics Session</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">Document Chat</span>
          </div>
          {activeDocument && (
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span>{activeDocument}</span>
            </div>
          )}
        </header>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto w-full p-4 sm:p-8 pt-6 sm:pt-10 scroll-smooth z-0 relative">
          <div className="max-w-4xl mx-auto space-y-8">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 mt-[10vh] animate-fade-in text-center px-4">
                <div className="w-16 h-16 mb-5 rounded-box bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">How can I assist you?</h3>
                <p className="text-[15px] mt-3 text-slate-500 dark:text-slate-400 max-w-md">
                  Process a document in the left panel, then ask me questions to extract intelligent insights and analysis.
                </p>
                <div className="mt-10 flex flex-wrap gap-3 justify-center max-w-2xl">
                  {['Summarize the executive summary', 'What are the key risk factors?', 'Extract the financial metrics in a table format', 'Who are the key stakeholders?'].map((hint, idx) => (
                    <button key={idx} onClick={() => setQuery(hint)} className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:scale-95">
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex w-full ${msg.role === 'user' ? 'justify-end pl-12' : 'justify-start pr-12'}`}
                >
                  {msg.role !== 'user' && (
                    <div className="flex-shrink-0 mr-4 mt-1 hidden sm:block">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center shadow-sm">
                        <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-6 py-4 lg:px-7 lg:py-5 shadow-sm overflow-hidden ${msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm shadow-indigo-600/20'
                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-bl-sm w-full'
                      }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed select-text">{msg.content}</p>
                    ) : (
                      <div className="prose prose-slate dark:prose-invert prose-sm sm:prose-base max-w-none 
                                      prose-p:leading-relaxed prose-p:mb-4 last:prose-p:mb-0
                                      prose-pre:bg-slate-800 dark:prose-pre:bg-slate-950 prose-pre:text-slate-100 prose-pre:rounded-xl
                                      prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:bg-indigo-50 dark:prose-code:bg-indigo-900/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
                                      prose-a:text-indigo-600 dark:prose-a:text-indigo-400 hover:prose-a:text-indigo-500
                                      prose-headings:font-semibold prose-headings:text-slate-800 dark:prose-headings:text-slate-100
                                      prose-li:my-1 prose-ul:my-4
                                      prose-table:border-collapse prose-th:bg-slate-50 dark:prose-th:bg-slate-800 prose-th:p-3 prose-th:border prose-th:border-slate-200 dark:prose-th:border-slate-700 prose-td:p-3 prose-td:border prose-td:border-slate-200 dark:prose-td:border-slate-700">
                        {msg.content ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <div className="flex items-center gap-1.5 h-6">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10 w-full shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] pb-6 sm:pb-8">
          <form
            onSubmit={handleSendMessage}
            className="flex gap-3 max-w-4xl mx-auto items-end relative"
          >
            <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all duration-200 overflow-hidden relative group hover:border-slate-400 dark:hover:border-slate-500">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Ask anything about your knowledge base..."
                className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-40 min-h-[56px] px-5 py-4 text-[15px] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed outline-none"
                rows="1"
              />
            </div>
            <button
              type="submit"
              disabled={!query.trim() || isTyping}
              className={`h-[56px] w-[56px] flex-shrink-0 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-sm ${!query.trim() || isTyping
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/20 active:scale-95 border border-indigo-600'
                }`}
            >
              <svg className="w-5 h-5 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
          <div className="text-center mt-3 max-w-4xl mx-auto">
            <span className="text-[11px] font-medium text-slate-400 tracking-wide">
              Nexus AI can make mistakes. Please verify important information.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
