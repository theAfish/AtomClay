import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMolecularContext } from '../context/MolecularContext';
import { PANEL_CLASSES } from '../constants/theme';
import { useChatAgent } from '../hooks/useChatAgent';
import { CHAT_CONSTANTS } from '../constants/chatConstants';

// Chat panel for AI assistant interaction

const ChatPanel = ({ isOpen, onToggle }) => {
    const { t } = useTranslation();
    const { theme } = useMolecularContext();
    const { messages, sendMessage, isSending, statusMessage } = useChatAgent();
    const [inputMessage, setInputMessage] = useState('');
    const [isAtBottom, setIsAtBottom] = useState(true);
    const messagesRef = useRef(null);

    const isDark = theme === 'dark';
    const panels = PANEL_CLASSES[theme] || PANEL_CLASSES.dark;
    const panelClass = panels.panelClass;
    const textPrimary = panels.textPrimary;
    const textSecondary = panels.textSecondary;
    const bgInput = panels.bgInput;
    const borderClass = panels.borderClass;
    const buttonPrimary = panels.buttonPrimary;

    const handleSend = () => {
        if (!inputMessage.trim() || isSending) return;
        sendMessage(inputMessage);
        setInputMessage('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleScroll = () => {
        const container = messagesRef.current;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
        }
    };

    useEffect(() => {
        if (isAtBottom && messagesRef.current) {
            messagesRef.current.scrollTo({
                top: messagesRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, isAtBottom]);

    return (
        <>
            <div className={`fixed top-1/2 ${isOpen ? 'right-80' : 'right-0'} transform -translate-y-1/2 z-50`}>
                <button
                    onClick={onToggle}
                    className={`${panelClass} p-3 rounded-l-xl shadow-xl hover:shadow-2xl transition-all duration-200`}
                    title={isOpen ? t('Close Chat') : t('Open Chat')}
                >
                    <MessageCircle size={20} className={textPrimary} />
                </button>
            </div>
            {isOpen && (
                <div className={`fixed top-0 right-0 h-full w-80 ${panelClass} shadow-xl z-40 flex flex-col`}>
                    {/* Header */}
                    <div className={`p-4 border-b ${borderClass} flex items-center justify-between`}>
                        <h2 className={`text-lg font-semibold flex items-center gap-2 ${textPrimary}`}>
                            <MessageCircle size={20} />
                            {t('AI Assistant')}
                        </h2>
                        <button
                            onClick={onToggle}
                            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${textSecondary}`}
                            title={t('Close Chat')}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesRef} onScroll={handleScroll}>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.sender === CHAT_CONSTANTS.SENDERS.USER ? 'justify-end' : message.sender === CHAT_CONSTANTS.SENDERS.SYSTEM ? 'justify-center' : 'justify-start'}`}
                            >
                                <div
                                    className={`select-text max-w-[80%] p-3 rounded-lg ${
                                        message.sender === CHAT_CONSTANTS.SENDERS.USER
                                            ? `${buttonPrimary} text-white`
                                            : message.sender === CHAT_CONSTANTS.SENDERS.SYSTEM || message.type === CHAT_CONSTANTS.MESSAGE_TYPES.LOG
                                            ? `${bgInput} ${textSecondary} text-center italic`
                                            : `${bgInput} ${textPrimary}`
                                    }`}
                                >
                                    <p className="text-sm">{message.text}</p>
                                    <p className={`text-xs mt-1 ${
                                        message.sender === CHAT_CONSTANTS.SENDERS.USER ? 'text-blue-100' : textSecondary
                                    }`}>
                                        {message.timestamp.toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {isSending && (
                            <div className="flex justify-start">
                                <div className={`select-text max-w-[80%] p-3 rounded-lg ${bgInput} ${textSecondary} italic`}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        <span className="ml-2 text-sm">{statusMessage || t('Agent is working...')}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className={`p-4 border-t ${borderClass}`}>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('Type your message...')}
                                className={`flex-1 px-3 py-2 rounded-lg ${bgInput} ${borderClass} ${textPrimary} placeholder-${textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                                            <button
                                                onClick={handleSend}
                                                disabled={!inputMessage.trim() || isSending}
                                                className={`${buttonPrimary} p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                                                title={t('Send Message')}
                                            >
                                                <Send size={18} />
                                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatPanel;