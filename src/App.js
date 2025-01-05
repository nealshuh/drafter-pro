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
import './editor.css';

const TextEditor = () => {
  const [isLLMPanelOpen, setIsLLMPanelOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedLLMs, setSelectedLLMs] = useState(['claude', 'chatgpt']);
  const [pages, setPages] = useState([{ id: 1 }]);
  const [isLoading, setIsLoading] = useState({});
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const pageRefsMap = useRef(new Map());
  const messagesEndRef = useRef(null);
  const [rephraseRanges, setRephraseRanges] = useState(new Map());
  const [hoveredMessage, setHoveredMessage] = useState(null);

  const llmOptions = [
    { id: 'claude', name: 'Claude', color: 'claude' },
    { id: 'chatgpt', name: 'ChatGPT', color: 'chatgpt' },
    { id: 'llama', name: 'Llama', color: 'llama' }
  ];

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

  const [selectedText, setSelectedText] = useState('');

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
      
      // Split content
      const firstPageContent = text.slice(0, overflowPoint);
      const remainingContent = text.slice(overflowPoint);

      // Update current page
      currentPage.innerText = firstPageContent;

      if (pageIndex === pages.length - 1) {
        // Add new page
        const newPageId = Date.now();
        setPages(prevPages => [
          ...prevPages,
          { id: newPageId }
        ]);
        
        // Wait for the new page to be rendered
        await new Promise(resolve => setTimeout(resolve, 0));
        
        const newPage = pageRefsMap.current.get(newPageId)?.current;
        if (newPage) {
          newPage.innerText = remainingContent;
        }
      } else {
        // Add to next page
        const nextPageId = pages[pageIndex + 1].id;
        const nextPage = pageRefsMap.current.get(nextPageId)?.current;
        if (nextPage) {
          nextPage.innerText = remainingContent + (nextPage.innerText || '');
          // Check if next page needs to overflow
          setTimeout(() => {
            if (nextPage.scrollHeight > nextPage.clientHeight) {
              handleInput(pageIndex + 1, event);
            }
          }, 0);
        }
      }
    }

    // Check if current page is underfilled and there's a next page
    if (currentPage.scrollHeight < currentPage.clientHeight && pageIndex < pages.length - 1) {
      const nextPageId = pages[pageIndex + 1].id;
      const nextPage = pageRefsMap.current.get(nextPageId)?.current;
      
      if (nextPage && nextPage.innerText) {
        const availableSpace = currentPage.clientHeight - currentPage.scrollHeight;
        const contentToMove = getContentThatFits(nextPage.innerText, currentPage, availableSpace);
        
        if (contentToMove) {
          currentPage.innerText += contentToMove;
          nextPage.innerText = nextPage.innerText.slice(contentToMove.length);

          // Remove empty pages
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
    
    // Find word boundary
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
    
    // Restore original content
    element.innerText = originalContent;
    
    // Find word boundary
    let point = start;
    while (point > 0 && !/\s/.test(text[point - 1])) {
      point--;
    }
    
    return text.slice(0, point || start);
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
    
    // Get the current selection before showing the context menu
    const selection = window.getSelection();
    const text = selection.toString();
    setSelectedText(text);
    
    // Store the selection range for later use
    const range = selection.getRangeAt(0);
    
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      hasSelection: text.length > 0,
      range: range
    });
  };

  const handleContextMenuAction = async (action) => {
    if (contextMenu.range && (action === 'copy' || action === 'cut' || action === 'rephrase')) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(contextMenu.range);
    }
  
    switch (action) {
      case 'copy':
        document.execCommand('copy');
        break;
      case 'cut':
        document.execCommand('cut');
        break;
      case 'paste':
        document.execCommand('paste');
        break;
      case 'rephrase':
        if (selectedText) {
          setIsLLMPanelOpen(true);  
          const prompt = `Rephrase this sentence to make it better given the context of the document:\n\n${selectedText}\nRespond with just the sentence in the exact format with all correct syntax, grammar and punctuation`;
          setCurrentMessage(prompt);
          
          // Generate a message ID now so we can use it for both the message and range
          const messageId = Date.now();
          
          // Store the range with the message ID
          const newRange = contextMenu.range.cloneRange(); // Clone the range
          
          console.log('Storing range for message:', messageId);
          console.log('Range details:', {
            startOffset: newRange.startOffset,
            endOffset: newRange.endOffset,
            selectedText: selectedText,
            rangeContent: newRange.toString()
          });
          
          setRephraseRanges(prev => {
            const updatedRanges = new Map(prev).set(messageId, {
              range: newRange,
              originalText: selectedText
            });
            console.log('Updated rephraseRanges:', Object.fromEntries(updatedRanges));
            return updatedRanges;
          });
          
          // Trigger send message with the same ID
          const event = { preventDefault: () => {}, type: 'click' };
          handleSendMessage(event, messageId);
        }
        break;
      default:
        break;
    }
    setContextMenu({ visible: false, x: 0, y: 0 });
    setSelectedText('');
  };

  const handleSendMessage = async (e, providedMessageId = null) => {
    if ((e.key === 'Enter' && !e.shiftKey) || e.type === 'click') {
      e.preventDefault();
      if (currentMessage.trim()) {
        const messageId = providedMessageId || Date.now();
        
        console.log('Sending message with ID:', messageId);
        console.log('Current rephraseRanges:', Object.fromEntries(rephraseRanges));
        
        // Get document content
        const documentContent = getDocumentContent();
        
        // Create the message object that will be displayed
        const newMessage = {
          id: messageId,
          text: currentMessage,
          responses: selectedLLMs.reduce((acc, llm) => ({
            ...acc,
            [llm]: 'Loading...'
          }), {}),
          timestamp: new Date().toISOString()
        };
  
        console.log('Created new message:', newMessage);
    
        setMessages(prev => [...prev, newMessage]);
        setCurrentMessage('');
        scrollToBottom();
    
        // Prepare the full message with context
        const messageWithContext = `Context: ${documentContent}\n\n${currentMessage}`;
    
        // Make API calls for each selected LLM
        selectedLLMs.forEach(async (llm) => {
          setIsLoading(prev => ({ ...prev, [messageId]: true }));
          
          try {
            let response;
            switch (llm) {
              case 'claude':
                response = await callClaudeAPI(messageWithContext);
                break;
              case 'chatgpt':
                response = await callOpenAIAPI(messageWithContext, 'gpt-4o-mini');
                break;
              case 'llama':
                response = await callTogetherAPI(messageWithContext, 'meta-llama/Llama-3-70b-chat-hf');
                break;
              default:
                response = 'Model not supported';
            }
    
            console.log(`Response from ${llm} for message ${messageId}:`, response);
            
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
            console.error(`Error from ${llm} for message ${messageId}:`, error);
            
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

  // Handle context menu updates
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0 });
      }
    };

    const handleSelectionChange = () => {
      if (contextMenu.visible) {
        const selection = window.getSelection();
        const hasSelection = selection.toString().length > 0;
        setContextMenu(prev => ({
          ...prev,
          hasSelection
        }));
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [contextMenu.visible]);

  return (
    <div className="editor-container">
      {/* Toolbar */}
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

      {/* Main Content */}
      <div className="content-area">
        {/* Document Area */}
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

        {/* Chat Panel */}
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
                    const llm = llmOptions.find(opt => opt.id === llmId);
                    return (
                      <div key={llmId} className={`llm-response ${llm.color}`}>
                        <p className="llm-name">
                          {llm.name}
                          {isLoading[message.id] && <span className="loading-indicator">...</span>}
                        </p>
                        <p>{response}</p>
                      </div>
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

        {/* Context Menu */}
        {contextMenu.visible && (
          <div 
            className="context-menu"
            style={{ 
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 1000,
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              padding: '4px 0',
              minWidth: '150px'
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
              <button
                className="context-menu-item"
                onClick={() => handleContextMenuAction('rephrase')}
              >
                <MessageSquare size={16} className="mr-2" /> Rephrase
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TextEditor;