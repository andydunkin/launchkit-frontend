import React, { useState, useEffect, useCallback } from 'react';
import { parseMessage, isDeploymentSuccess, extractAppUrl, getContextualPlaceholder, type CodeParsingOptions } from '../utils/messageParser';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// Fun, dynamic working states
const getRandomWorkingState = () => {
  const states = [
    "pondering",
    "brewing", 
    "crafting",
    "weaving",
    "architecting",
    "orchestrating",
    "materializing",
    "manifesting"
  ];
  return states[Math.floor(Math.random() * states.length)];
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  originalContent?: string; // Store original content with code
  timestamp: string;
  hasCode?: boolean;
  filesGenerated?: string[];
  deploymentStatus?: 'deploying' | 'deployed' | 'failed';
}

interface SimpleChatInterfaceProps {
  projectId: string;
  appConcept: string;
  onMessage?: (message: string, response: {
    ok: boolean;
    assistant_message?: { content: string };
    ready_to_progress?: boolean;
    app_generated?: boolean;
    app_updated?: boolean;
    update_type?: string;
    error?: string;
    app_url?: string;
  }) => void;
}

export const SimpleChatInterface: React.FC<SimpleChatInterfaceProps> = ({
  projectId,
  appConcept,
  onMessage
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingApp, setHasExistingApp] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [userType] = useState<'beginner' | 'developer' | 'admin'>('beginner'); // Can be made configurable

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      // Scroll the chat messages container, not the window
      const chatContainer = document.getElementById('chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }, [messages]);

  const handleSendMessage = useCallback(async (message: string, isInitial: boolean = false) => {
    if (!message.trim() && !isInitial) return;

    // Always add user message to show what they said
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input only for non-initial messages
    if (!isInitial) {
      setUserInput('');
    }

    setIsLoading(true);

    try {
      // Call the chat API 
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: isInitial ? `I want to build a web app for ${appConcept.toLowerCase()}, how would you build it for me?` : message 
        })
      });

      const result = await response.json();

      // Handle chat response format
      if (result.response) {
        // Parse the response to hide code and improve UX
        const parseOptions: Partial<CodeParsingOptions> = {
          hideCodeBlocks: !showTechnicalDetails,
          hideFileMarkers: !showTechnicalDetails,
          showTechnicalDetails,
          userType
        };

        const parsedMessage = parseMessage(result.response, parseOptions);
        const appUrl = extractAppUrl(result.response);

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant', 
          content: parsedMessage.content,
          originalContent: result.response, // Store original for toggle
          timestamp: new Date().toISOString(),
          hasCode: parsedMessage.hasCode,
          filesGenerated: parsedMessage.filesGenerated,
          deploymentStatus: parsedMessage.deploymentStatus
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Update app status based on deployment success
        const deploymentSuccess = isDeploymentSuccess(result.response);
        if (deploymentSuccess) {
          setHasExistingApp(true);
        }

        // Call the onMessage callback with parsed information
        if (onMessage) {
          onMessage(isInitial ? appConcept : message, {
            ok: true,
            app_generated: parsedMessage.hasCode || deploymentSuccess,
            app_url: appUrl || `https://app-${projectId.slice(0, 8)}.launchkit.stratxi.com`
          });
        }
      } else if (result.error) {
        // Handle Claude Code errors
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${result.error}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      } else if (!result.response) {
        // Handle error response
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${result.detail || 'Something went wrong'}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Add error message to chat
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I couldn\'t connect to the server. Please check your connection and try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, appConcept, onMessage]);

  // Function to render message content with clickable links
  const renderMessageContent = (content: string) => {
    // URL regex pattern
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Split content by URLs and create clickable links
    const parts = content.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#3b82f6',
              textDecoration: 'underline',
              fontWeight: 600
            }}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // Dynamic placeholder text based on conversation state
  const getPlaceholderText = () => {
    const lastMessage = messages[messages.length - 1];
    const lastMessageHadCode = lastMessage?.hasCode || false;
    
    return getContextualPlaceholder(messages.length, hasExistingApp, lastMessageHadCode);
  };

  // Skip premature app status checks - will determine app existence from chat responses
  // The hasExistingApp state will be set based on app_generated/app_updated responses

  const handleManualBuild = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_build: true })
      });
      
      const result = await response.json();
      
      if (result.success && result.app_url) {
        // Add success message to chat
        const successMessage: Message = {
          id: `build-success-${Date.now()}`,
          role: 'assistant',
          content: `🎉 **Your app is now live!**\n\n🚀 **Live App**: ${result.app_url}\n\nI found the React component from our conversation and deployed it successfully!`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, successMessage]);
        setHasExistingApp(true);
        
        if (onMessage) {
          onMessage('Manual Build', {
            ok: true,
            app_generated: true,
            app_url: result.app_url
          });
        }
      } else {
        // Add error message to chat
        const errorMessage: Message = {
          id: `build-error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Build Failed**: ${result.error || 'Unable to build app from current conversation.'}\n\nTry asking me to create a complete React component with \`export default function\` and I'll be able to deploy it.`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Manual build error:', error);
      const errorMessage: Message = {
        id: `build-error-${Date.now()}`,
        role: 'assistant',
        content: '❌ **Build Failed**: Unable to connect to build service. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Send initial concept to AI
  useEffect(() => {
    if (appConcept && messages.length === 0) {
      handleSendMessage(appConcept, true);
    }
  }, [appConcept, messages.length, handleSendMessage]);

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ 
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
      {/* Chat Messages - Scrollable Area */}
      <div 
        id="chat-messages"
        style={{
          flex: 1,
          padding: '16px',
          background: 'transparent',
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0 // Important for flex child to be scrollable
        }}>
        {messages.map((message) => (
          <div key={message.id} style={{
            marginBottom: '16px',
            display: 'flex',
            flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: '16px',
              fontSize: '14px',
              lineHeight: '1.5',
              background: message.role === 'user' 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(255, 255, 255, 0.9)',
              color: message.role === 'user' ? 'white' : '#334155',
              boxShadow: message.role === 'user' 
                ? '0 8px 16px rgba(102, 126, 234, 0.3)'
                : '0 4px 12px rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(10px)',
              border: message.role === 'user' 
                ? 'none' 
                : '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {renderMessageContent(message.content)}
              </div>
              
              {/* Technical details toggle for messages with code */}
              {message.hasCode && message.originalContent && (
                <div style={{ marginTop: '12px', fontSize: '12px' }}>
                  <button
                    onClick={() => {
                      // Toggle between parsed and original content
                      const updatedMessages = messages.map(msg => {
                        if (msg.id === message.id) {
                          return {
                            ...msg,
                            content: msg.content === msg.originalContent 
                              ? parseMessage(msg.originalContent!, { 
                                  hideCodeBlocks: !showTechnicalDetails,
                                  hideFileMarkers: !showTechnicalDetails,
                                  showTechnicalDetails,
                                  userType 
                                }).content
                              : msg.originalContent!
                          };
                        }
                        return msg;
                      });
                      setMessages(updatedMessages);
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {message.content === message.originalContent ? '📖 Hide technical details' : '💻 Show code'}
                  </button>
                  
                  {/* File summary */}
                  {message.filesGenerated && message.filesGenerated.length > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                      📁 {message.filesGenerated.length} files generated
                    </div>
                  )}
                  
                  {/* Deployment status indicator */}
                  {message.deploymentStatus && (
                    <div style={{ 
                      marginTop: '6px', 
                      fontSize: '11px', 
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: message.deploymentStatus === 'deployed' ? '#dcfce7' : 
                                 message.deploymentStatus === 'deploying' ? '#fef3c7' : '#fee2e2',
                      color: message.deploymentStatus === 'deployed' ? '#16a34a' :
                             message.deploymentStatus === 'deploying' ? '#d97706' : '#dc2626',
                      display: 'inline-block'
                    }}>
                      {message.deploymentStatus === 'deployed' ? '✅ Deployed' :
                       message.deploymentStatus === 'deploying' ? '⏳ Deploying' : '❌ Failed'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#64748b',
            fontStyle: 'italic',
            marginBottom: '16px',
            padding: '12px 16px',
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #e5e7eb',
              borderTop: '2px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <div>LK is {getRandomWorkingState()}...</div>
          </div>
        )}
      </div>

      {/* Settings - Fixed at bottom, above input */}
      {messages.some(m => m.hasCode) && (
        <div style={{
          padding: '8px 20px',
          background: 'rgba(248, 250, 252, 0.8)',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0 // Prevent shrinking
        }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Display preferences
          </span>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: '12px',
            color: '#64748b',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={showTechnicalDetails}
              onChange={(e) => {
                setShowTechnicalDetails(e.target.checked);
                // Re-parse all messages with new settings
                setMessages(prevMessages => 
                  prevMessages.map(msg => {
                    if (msg.role === 'assistant' && msg.originalContent && msg.hasCode) {
                      const parseOptions: Partial<CodeParsingOptions> = {
                        hideCodeBlocks: !e.target.checked,
                        hideFileMarkers: !e.target.checked,
                        showTechnicalDetails: e.target.checked,
                        userType
                      };
                      const parsedMessage = parseMessage(msg.originalContent, parseOptions);
                      return { ...msg, content: parsedMessage.content };
                    }
                    return msg;
                  })
                );
              }}
              style={{ marginRight: '4px' }}
            />
            Show technical details
          </label>
        </div>
      )}

      {/* Input Area - Fixed at bottom */}
      <div style={{
        padding: '16px 20px',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '0 0 16px 16px',
        flexShrink: 0 // Prevent shrinking
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end'
        }}>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(userInput)}
            placeholder={getPlaceholderText()}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              fontSize: '14px',
              opacity: isLoading ? 0.7 : 1,
              outline: 'none',
              backdropFilter: 'blur(5px)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease',
              color: '#334155'
            }}
        />
          <button
            onClick={() => handleSendMessage(userInput)}
            disabled={!userInput.trim() || isLoading}
            style={{
              background: userInput.trim() && !isLoading 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(156, 163, 175, 0.8)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: userInput.trim() && !isLoading ? 'pointer' : 'not-allowed',
              boxShadow: userInput.trim() && !isLoading 
                ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                : '0 2px 8px rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease',
              minWidth: '80px'
            }}
        >
          Send
        </button>
        </div>
      </div>
      </div>
    </>
  );
};

export default SimpleChatInterface;