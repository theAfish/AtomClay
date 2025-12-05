import React, { useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMolecularContext } from '../context/MolecularContext';
import { PANEL_CLASSES } from '../constants/theme';

const ChatPanel = ({ isOpen, onToggle }) => {
    const { t } = useTranslation();
    const { theme } = useMolecularContext();
    const [messages, setMessages] = useState([
        { id: 1, text: 'Hello! I\'m your AI assistant. How can I help you with your molecular structures today?', sender: 'agent', timestamp: new Date() }
    ]);
    const [inputMessage, setInputMessage] = useState('');

    const isDark = theme === 'dark';
    const panels = PANEL_CLASSES[theme] || PANEL_CLASSES.dark;
    const panelClass = panels.panelClass;
    const textPrimary = panels.textPrimary;
    const textSecondary = panels.textSecondary;
    const bgInput = panels.bgInput;
    const borderClass = panels.borderClass;
    const buttonPrimary = panels.buttonPrimary;

    const handleSendMessage = () => {
        if (inputMessage.trim()) {
            const newMessage = {
                id: messages.length + 1,
                text: inputMessage,
                sender: 'user',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, newMessage]);
            setInputMessage('');

            // Simulate agent response (for now)
            setTimeout(() => {
                const agentResponse = {
                    id: messages.length + 2,
                    text: 'I understand you\'re working on molecular structures. This feature is coming soon!',
                    sender: 'agent',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, agentResponse]);
            }, 1000);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!isOpen) {
        return (
            <div className="fixed top-1/2 right-0 transform -translate-y-1/2 z-50">
                <button
                    onClick={onToggle}
                    className={`${panelClass} p-3 rounded-l-xl shadow-xl hover:shadow-2xl transition-all duration-200`}
                    title={t('Open Chat')}
                >
                    <MessageCircle size={20} className={textPrimary} />
                </button>
            </div>
        );
    }

    return (
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                                message.sender === 'user'
                                    ? `${buttonPrimary} text-white`
                                    : `${bgInput} ${textPrimary}`
                            }`}
                        >
                            <p className="text-sm">{message.text}</p>
                            <p className={`text-xs mt-1 ${
                                message.sender === 'user' ? 'text-blue-100' : textSecondary
                            }`}>
                                {message.timestamp.toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            <div className={`p-4 border-t ${borderClass}`}>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={t('Type your message...')}
                        className={`flex-1 px-3 py-2 rounded-lg ${bgInput} ${borderClass} ${textPrimary} placeholder-${textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim()}
                        className={`${buttonPrimary} p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={t('Send Message')}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;