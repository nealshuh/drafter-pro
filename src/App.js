import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  List, 
  Indent, 
  AlignCenter,
  AlignLeft,
  AlignRight,
  MessageSquare,
  X,
  Send,
  Check,
  Copy,
  Scissors,
  Clipboard
} from 'lucide-react';
import { callClaudeAPI, callOpenAIAPI, callTogetherAPI } from './api';
import ReactMarkdown from 'react-markdown';
import './editor.css';

const TextEditor = () => {
  const [isLLMPanelOpen, setIsLLMPanelOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedLLMs, setSelectedLLMs] = useState(['claude', 'chatgpt']);
  const [pages, setPages] = useState([{ id: 1 }]);
  const [isLoading, setIsLoading] = useState({});
  const [contextMenu, setContextMenu] = useState({ 
    visible: false, 
    x: 0, 
    y: 0,
    showInstructions: false,
    instructions: ''
  });
  const [selectedText, setSelectedText] = useState('');
  const [activeRephrase, setActiveRephrase] = useState({
    spanId: null,
    originalText: null,
    range: null
  });
  const [pendingRephrase, setPendingRephrase] = useState(null);
  const [storedSelection, setStoredSelection] = useState({
    text: '',
    range: null
  });

  const pageRefsMap = useRef(new Map());
  const messagesEndRef = useRef(null);

  const llmOptions = [
    { id: 'claude', name: 'Claude', color: 'claude' },
    { id: 'chatgpt', name: 'ChatGPT', color: 'chatgpt' },
    { id: 'llama', name: 'Llama', color: 'llama' }
  ];

  useEffect(() => {
    if (pendingRephrase) {
      const sendMessage = async () => {
        const mockEvent = { 
          preventDefault: () => {}, 
          type: 'click',
          key: 'Enter',
          shiftKey: false
        };
        await handleSendMessage(mockEvent);
        setPendingRephrase(null);
      };
      sendMessage();
    }
  }, [pendingRephrase]);

  // Create refs for new pages
  const getOrCreateRef = (pageId) => {
    if (!pageRefsMap.current.has(pageId)) {
      pageRefsMap.current.set(pageId, React.createRef());
    }
    return pageRefsMap.current.get(pageId);
  };

  // Cleanup unused refs
  useEffect(() => {
    const currentPageIds = new Set(pages.map(page => page.id));
    for (const [pageId] of pageRefsMap.current) {
      if (!currentPageIds.has(pageId)) {
        pageRefsMap.current.delete(pageId);
      }
    }
  }, [pages]);

  // Cleanup rephrase span on unmount
  useEffect(() => {
    return () => {
      const span = document.querySelector('.rephrase-highlight');
      if (span) {
        const text = span.textContent;
        span.replaceWith(text);
      }
    };
  }, []);

  const getDocumentContent = () => {
    let fullContent = '';
    pages.forEach(page => {
      const pageRef = pageRefsMap.current.get(page.id)?.current;
      if (pageRef) {
        fullContent += pageRef.innerText + ' ';
      }
    });
    return fullContent.trim();
  };

  const handleInput = async (pageIndex, event) => {
    const currentPageId = pages[pageIndex].id;
    const currentPage = pageRefsMap.current.get(currentPageId)?.current;
    
    if (!currentPage) return;

    if (currentPage.scrollHeight > currentPage.clientHeight) {
      const text = currentPage.innerText;
      const overflowPoint = findOverflowPoint(text, currentPage);
      
      const firstPageContent = text.slice(0, overflowPoint);
      const remainingContent = text.slice(overflowPoint);

      currentPage.innerText = firstPageContent;

      if (pageIndex === pages.length - 1) {
        const newPageId = Date.now();
        setPages(prevPages => [...prevPages, { id: newPageId }]);
        
        await new Promise(resolve => setTimeout(resolve, 0));
        
        const newPage = pageRefsMap.current.get(newPageId)?.current;
        if (newPage) {
          newPage.innerText = remainingContent;
        }
      } else {
        const nextPageId = pages[pageIndex + 1].id;
        const nextPage = pageRefsMap.current.get(nextPageId)?.current;
        if (nextPage) {
          nextPage.innerText = remainingContent + (nextPage.innerText || '');
          setTimeout(() => {
            if (nextPage.scrollHeight > nextPage.clientHeight) {
              handleInput(pageIndex + 1, event);
            }
          }, 0);
        }
      }
    }

    if (currentPage.scrollHeight < currentPage.clientHeight && pageIndex < pages.length - 1) {
      const nextPageId = pages[pageIndex + 1].id;
      const nextPage = pageRefsMap.current.get(nextPageId)?.current;
      
      if (nextPage && nextPage.innerText) {
        const availableSpace = currentPage.clientHeight - currentPage.scrollHeight;
        const contentToMove = getContentThatFits(nextPage.innerText, currentPage, availableSpace);
        
        if (contentToMove) {
          currentPage.innerText += contentToMove;
          nextPage.innerText = nextPage.innerText.slice(contentToMove.length);

          if (!nextPage.innerText.trim()) {
            setPages(prevPages => prevPages.filter((_, i) => i !== pageIndex + 1));
          }
        }
      }
    }
  };

  const findOverflowPoint = (text, element) => {
    const maxHeight = element.clientHeight;
    let start = 0;
    let end = text.length;
    const originalContent = element.innerText;
    
    while (start < end) {
      const mid = Math.floor((start + end + 1) / 2);
      element.innerText = text.slice(0, mid);
      
      if (element.scrollHeight <= maxHeight) {
        start = mid;
      } else {
        end = mid - 1;
      }
    }
    
    element.innerText = originalContent;
    
    let point = start;
    while (point > 0 && !/\s/.test(text[point - 1])) {
      point--;
    }
    
    return point || start;
  };

  const getContentThatFits = (text, element, availableHeight) => {
    const originalContent = element.innerText;
    let start = 0;
    let end = text.length;
    
    while (start < end) {
      const mid = Math.floor((start + end + 1) / 2);
      element.innerText = originalContent + text.slice(0, mid);
      
      if (element.scrollHeight <= element.clientHeight) {
        start = mid;
      } else {
        end = mid - 1;
      }
    }
    
    element.innerText = originalContent;
    
    let point = start;
    while (point > 0 && !/\s/.test(text[point - 1])) {
      point--;
    }
    
    return text.slice(0, point || start);
  };

  const wrapSelectionWithSpan = (selection) => {
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const spanId = Date.now().toString();
    const span = document.createElement('span');
    span.className = 'rephrase-highlight';
    span.dataset.rephraseId = spanId;
    
    range.surroundContents(span);
    
    return {
      spanId,
      originalText: span.textContent,
      range: range.cloneRange()
    };
  };

  const executeCommand = (command) => {
    document.execCommand(command, false, null);
  };

  const toggleLLM = (llmId) => {
    setSelectedLLMs(prev => 
      prev.includes(llmId) 
        ? prev.filter(id => id !== llmId)
        : [...prev, llmId]
    );
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    
    const selection = window.getSelection();
    const text = selection.toString();
    setSelectedText(text);
    
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      hasSelection: text.length > 0,
      showInstructions: false,
      instructions: ''
    });
  };

  const handleContextMenuAction = async (action) => {
    console.log('handleContextMenuAction called with action:', action);
    
    let selection = window.getSelection();
    let selectedText = selection.toString();
    
    // If this is a rephrase-with-instructions and we have stored selection, use it
    if (action === 'rephrase-with-instructions' && storedSelection.text) {
      selectedText = storedSelection.text;
      if (storedSelection.range) {
        selection.removeAllRanges();
        selection.addRange(storedSelection.range);
      }
    }
    
    // Store instructions and log them
    const instructions = contextMenu.instructions;
    console.log('Current instructions:', instructions);
    
    // Check if the selected text is system markup
    const isSystemMarkup = selectedText.includes('<userStyle>') || 
                          selectedText.includes('</userStyle>') ||
                          selectedText.trim() === '';
    
    switch (action) {
      // ... other cases ...
      
      case 'rephrase':
      case 'rephrase-with-instructions': {
        console.log('Starting rephrase process:', action);
        console.log('Selected text:', selectedText);
        
        // Always open panel first
        setIsLLMPanelOpen(true);
        
        if (selectedText && !isSystemMarkup) {
          try {
            // Clear any existing rephrase
            if (activeRephrase.spanId) {
              const existingSpan = document.querySelector('.rephrase-highlight');
              if (existingSpan) {
                existingSpan.replaceWith(existingSpan.textContent);
              }
              setActiveRephrase({ spanId: null, originalText: null, range: null });
            }
            
            // Create new rephrase span
            const rephraseInfo = wrapSelectionWithSpan(selection);
            console.log('Rephrase info created:', rephraseInfo);
            
            if (rephraseInfo) {
              // Set active rephrase first
              setActiveRephrase(rephraseInfo);
              
              // Create prompt
              let prompt;
              if (action === 'rephrase-with-instructions') {
                console.log('Creating prompt with instructions:', instructions);
                prompt = `Rephrase this text: ${rephraseInfo.originalText}. Here are some additional instructions: ${instructions}. Return the exact rephrased sentence only with correct punctuation and grammar.`;
                console.log('Created with-instructions prompt:', prompt);
              } else {
                prompt = `Rephrase this text: ${rephraseInfo.originalText}. Return the exact rephrased sentence only with correct punctuation and grammar.`;
                console.log('Created regular prompt:', prompt);
              }
              
              console.log('Setting current message:', prompt);
              setCurrentMessage(prompt);
              
              console.log('Setting pending rephrase for auto-send');
              setPendingRephrase(prompt);
            }
          } catch (error) {
            console.error('Error in rephrase:', error);
          }
        } else {
          console.log('Invalid selection or system markup detected:', selectedText);
        }
        break;
      }
    }
    
    // Clear context menu and selection at the end
    setContextMenu({ visible: false, x: 0, y: 0, showInstructions: false, instructions: '' });
    setSelectedText('');
    // Also clear stored selection
    setStoredSelection({ text: '', range: null });
  };

  const handleSendMessage = async (e) => {
    if ((e.key === 'Enter' && !e.shiftKey) || e.type === 'click') {
      e.preventDefault();
      if (currentMessage.trim()) {
        const messageId = Date.now();
        
        const documentContent = getDocumentContent();
        
        const newMessage = {
          id: messageId,
          text: currentMessage,
          responses: selectedLLMs.reduce((acc, llm) => ({
            ...acc,
            [llm]: 'Loading...'
          }), {}),
          timestamp: new Date().toISOString()
        };
    
        setMessages(prev => [...prev, newMessage]);
        setCurrentMessage('');
        scrollToBottom();
    
        const messageWithContext = `Context: ${documentContent}\n\n${currentMessage}`;
    
        selectedLLMs.forEach(async (llm) => {
          setIsLoading(prev => ({ ...prev, [messageId]: true }));
          
          try {
            let response;
            switch (llm) {
              case 'claude':
                response = await callClaudeAPI(messageWithContext);
                break;
              case 'chatgpt':
                response = await callOpenAIAPI(messageWithContext, 'gpt-4');
                break;
              case 'llama':
                response = await callTogetherAPI(messageWithContext, 'meta-llama/Llama-2-70b-chat-hf');
                break;
              default:
                response = 'Model not supported';
            }
    
            setMessages(prev => prev.map(msg => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  responses: {
                    ...msg.responses,
                    [llm]: response
                  }
                };
              }
              return msg;
            }));
          } catch (error) {
            console.error(`Error from ${llm}:`, error);
            setMessages(prev => prev.map(msg => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  responses: {
                    ...msg.responses,
                    [llm]: `Error: ${error.message}`
                  }
                };
              }
              return msg;
            }));
          } finally {
            setIsLoading(prev => ({ ...prev, [messageId]: false }));
          }
        });
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const MessageComponent = ({ message, llmId, response }) => {
    const isRephrase = message.text.startsWith('Rephrase this text:');
    const testResponse = `
      # Test Heading
      - Bullet point 1
      - Bullet point 2

      \`\`\`javascript
      console.log("Hello world");
      \`\`\`
        `;
    
    const handleMouseEnter = () => {
      if (isRephrase) {
        const span = document.querySelector('.rephrase-highlight');
        if (span && span.dataset.rephraseId === activeRephrase.spanId) {
          if (!span.dataset.currentText) {
            span.dataset.currentText = span.textContent;
          }
          span.textContent = response;
          span.classList.add(llmId);
        }
      }
    };
    
    const handleMouseLeave = () => {
      if (isRephrase) {
        const span = document.querySelector('.rephrase-highlight');
        if (span && span.dataset.rephraseId === activeRephrase.spanId) {
          span.textContent = span.dataset.currentText;
          span.classList.remove(llmId);
          delete span.dataset.currentText;
        }
      }
    };
  
    const handleClick = () => {
      if (isRephrase) {
        const span = document.querySelector('.rephrase-highlight');
        if (span && span.dataset.rephraseId === activeRephrase.spanId) {
          span.textContent = response;
          span.classList.remove('claude', 'chatgpt', 'llama');
          span.classList.add(llmId);
          span.dataset.currentText = response;
          
          setActiveRephrase(prev => ({
            ...prev,
            originalText: response
          }));
        }
      }
    };
  
    return (
      <div 
        className={`llm-response ${llmId} ${isRephrase ? 'clickable' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <p className="llm-name">{llmOptions.find(l => l.id === llmId).name}</p>
        {isRephrase ? (
          <p>{response}</p>
        ) : (
          <div className="markdown-content">
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="editor-container">
      <div className="toolbar">
        <div className="toolbar-buttons">
          <button className="toolbar-button" onClick={() => executeCommand('bold')}>
            <Bold size={16} />
          </button>
          <button className="toolbar-button" onClick={() => executeCommand('italic')}>
            <Italic size={16} />
          </button>
          <button className="toolbar-button" onClick={() => executeCommand('insertUnorderedList')}>
            <List size={16} />
          </button>
          <button className="toolbar-button" onClick={() => executeCommand('indent')}>
            <Indent size={16} />
          </button>
          <button className="toolbar-button" onClick={() => executeCommand('justifyCenter')}>
            <AlignCenter size={16} />
          </button>
          <button className="toolbar-button" onClick={() => executeCommand('justifyLeft')}>
            <AlignLeft size={16} />
          </button>
          <button className="toolbar-button" onClick={() => executeCommand('justifyRight')}>
            <AlignRight size={16} />
          </button>
        </div>
        <button 
          className="toolbar-button"
          onClick={() => setIsLLMPanelOpen(!isLLMPanelOpen)}
        >
          {isLLMPanelOpen ? <X size={16} /> : <MessageSquare size={16} />}
          {isLLMPanelOpen ? 'Close Chat' : 'Open Chat'}
        </button>
      </div>

      <div className="content-area">
        <div className={`document-area ${isLLMPanelOpen ? 'split' : 'full'}`}>
          {pages.map((page, index) => (
            <div 
              key={page.id} 
              className="document-page"
              onContextMenu={handleContextMenu}
            >
              <div className="page-margins">
                <div
                  ref={getOrCreateRef(page.id)}
                  className="page-content"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleInput(index, e)}
                />
                <div className="page-number">{index + 1}</div>
              </div>
            </div>
          ))}
        </div>

        {isLLMPanelOpen && (
          <div className="chat-panel">
            <div className="llm-selector">
              <h3>Select Language Models</h3>
              <div className="llm-buttons">
                {llmOptions.map(llm => (
                  <button
                    key={llm.id}
                    className={`llm-button ${selectedLLMs.includes(llm.id) ? 'active' : ''}`}
                    onClick={() => toggleLLM(llm.id)}
                  >
                    {selectedLLMs.includes(llm.id) && <Check size={12} />}
                    {llm.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="messages-area">
              {messages.map((message) => (
                <div key={message.id} className="message">
                  <div className="user-message">
                    <p>{message.text}</p>
                    <p className="message-timestamp">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  {Object.entries(message.responses).map(([llmId, response]) => {
                    if (!selectedLLMs.includes(llmId)) return null;
                    return (
                      <MessageComponent
                        key={llmId}
                        message={message}
                        llmId={llmId}
                        response={response}
                      />
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="message-input">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleSendMessage}
                placeholder="Type your message and press Enter to send..."
                rows={3}
              />
              <button 
                className="send-button"
                onClick={handleSendMessage}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}

        {contextMenu.visible && (
          <div 
            className="context-menu"
            style={{ 
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {selectedText && (
              <>
                <button
                  className="context-menu-item"
                  onClick={() => handleContextMenuAction('copy')}
                >
                  <Copy size={16} className="mr-2" /> Copy
                </button>
                <button
                  className="context-menu-item"
                  onClick={() => handleContextMenuAction('cut')}
                >
                  <Scissors size={16} className="mr-2" /> Cut
                </button>
              </>
            )}
            <button
              className="context-menu-item"
              onClick={() => handleContextMenuAction('paste')}
            >
              <Clipboard size={16} className="mr-2" /> Paste
            </button>
            {selectedText && (
              <>
                <button
                  className="context-menu-item"
                  onClick={() => handleContextMenuAction('rephrase')}
                >
                  <MessageSquare size={16} className="mr-2" /> Rephrase
                </button>
                <button
                  className="context-menu-item context-menu-subitem"
                  onClick={() => {
                    console.log('Opening instructions input');
                    const selection = window.getSelection();
                    const range = selection.getRangeAt(0);
                    
                    // Store the selection
                    setStoredSelection({
                      text: selection.toString(),
                      range: range.cloneRange()
                    });
                    
                    setContextMenu(prev => ({
                      ...prev,
                      showInstructions: true,
                      visible: true,
                      instructions: prev.instructions || ''
                    }));
                  }}
                >
                  <MessageSquare size={16} className="mr-2" /> Rephrase with instructions
                </button>

              </>
            )}
            {contextMenu.showInstructions && (
              <div className="context-menu-instructions">
                <textarea
                  value={contextMenu.instructions}
                  onChange={(e) => {
                    console.log('Instructions updated:', e.target.value);
                    setContextMenu(prev => ({
                      ...prev,
                      instructions: e.target.value
                    }));
                  }}
                  placeholder="Enter additional instructions..."
                  rows={3}
                  className="context-menu-textarea"
                  autoFocus
                />
                <div className="context-menu-buttons">
                  <button 
                    className="context-menu-button cancel"
                    onClick={() => {
                      console.log('Cancel clicked');
                      setContextMenu({ visible: false, x: 0, y: 0, showInstructions: false, instructions: '' });
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="context-menu-button send"
                    onClick={() => {
                      console.log('Send clicked with instructions:', contextMenu.instructions);
                      handleContextMenuAction('rephrase-with-instructions');
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TextEditor;