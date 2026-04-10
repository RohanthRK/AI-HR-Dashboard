import React, { useState, useRef, useEffect } from 'react';
import {
    Box, IconButton, Typography, TextField, Button,
    Paper, ClickAwayListener, Fab, Zoom
} from '@mui/material';
import {
    Chat as ChatIcon,
    Close as CloseIcon,
    Send as SendIcon,
    SmartToy as SmartToyIcon,
    Person as PersonIcon
} from '@mui/icons-material';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const HRChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hi! I'm your AI HR Assistant. Ask me anything about onboarding, payroll, leave, or HR policies.", sender: 'ai' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await axios.post('/api/ai/chatbot/', { message: userMessage });
            setMessages(prev => [...prev, { text: response.data.reply, sender: 'ai' }]);
        } catch (error) {
            console.error('Chatbot error:', error);
            setMessages(prev => [...prev, {
                text: 'Sorry, I am having trouble connecting to the HR mainframe right now. Please try again later.',
                sender: 'ai',
                error: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleChat = () => setIsOpen(!isOpen);

    return (
        <>
            <Zoom in={!isOpen}>
                <Fab
                    color="primary"
                    aria-label="chat"
                    onClick={toggleChat}
                    className="brutal-shadow"
                    sx={{
                        position: 'fixed',
                        bottom: 90,
                        right: 24,
                        width: 64,
                        height: 64,
                        border: '3px solid #000',
                        borderRadius: 0,
                        bgcolor: '#E0FF4F',
                        color: '#000',
                        zIndex: 9999,
                        '&:hover': {
                            bgcolor: '#d4f242',
                            transform: 'translate(-2px, -2px)',
                            boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)',
                        }
                    }}
                >
                    <ChatIcon sx={{ fontSize: 32 }} />
                </Fab>
            </Zoom>

            <Zoom in={isOpen}>
                <Paper
                    className="brutal-shadow"
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        width: 350,
                        height: 500,
                        display: 'flex',
                        flexDirection: 'column',
                        border: '3px solid #000',
                        borderRadius: 0,
                        bgcolor: '#fff',
                        visibility: isOpen ? 'visible' : 'hidden',
                        zIndex: 9999,
                        overflow: 'hidden'
                    }}
                >
                    {/* Header */}
                    <Box sx={{
                        p: 2,
                        bgcolor: '#FF6B6B',
                        borderBottom: '3px solid #000',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SmartToyIcon sx={{ color: '#000' }} />
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#000' }}>
                                HR AI SUPPORT
                            </Typography>
                        </Box>
                        <IconButton onClick={toggleChat} sx={{ color: '#000' }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Messages */}
                    <Box sx={{
                        flexGrow: 1,
                        p: 2,
                        overflowY: 'auto',
                        bgcolor: '#f5f5f5',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5
                    }}>
                        {messages.map((msg, index) => (
                            <Box
                                key={index}
                                sx={{
                                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '85%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                }}
                            >
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    mb: 0.5,
                                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                                }}>
                                    {msg.sender === 'ai' && <SmartToyIcon sx={{ fontSize: 16 }} />}
                                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                        {msg.sender === 'user' ? 'You' : 'HR AI'}
                                    </Typography>
                                    {msg.sender === 'user' && <PersonIcon sx={{ fontSize: 16 }} />}
                                </Box>
                                <Paper
                                    className="brutal-border"
                                    sx={{
                                        p: 1.5,
                                        border: '2px solid #000',
                                        borderRadius: 0,
                                        bgcolor: msg.error ? '#ffcccc' : (msg.sender === 'user' ? '#4ECDC4' : '#fff'),
                                        color: '#000',
                                        boxShadow: '3px 3px 0px 0px rgba(0,0,0,1)',
                                    }}
                                >
                                    <Box sx={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem',
                                        '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
                                        '& ul, & ol': { m: 0, pl: 2 }
                                    }}>
                                        {msg.sender === 'ai' ? (
                                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                                        ) : (
                                            <Typography variant="body2">{msg.text}</Typography>
                                        )}
                                    </Box>
                                </Paper>
                            </Box>
                        ))}
                        {isLoading && (
                            <Box sx={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SmartToyIcon />
                                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>AI is typing...</Typography>
                            </Box>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Input Area */}
                    <Box sx={{
                        p: 1.5,
                        borderTop: '3px solid #000',
                        bgcolor: '#fff',
                        display: 'flex',
                        gap: 1
                    }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Type your HR question..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            disabled={isLoading}
                            size="small"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 0,
                                    '& fieldset': { border: '2px solid #000' },
                                    '&:hover fieldset': { border: '2px solid #000' },
                                    '&.Mui-focused fieldset': { border: '2px solid #000' },
                                }
                            }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="brutal-shadow-hover"
                            sx={{
                                minWidth: 'auto',
                                px: 2,
                                bgcolor: '#4ECDC4',
                                color: '#000',
                                border: '2px solid #000',
                                borderRadius: 0,
                                '&:hover': { bgcolor: '#45b8b0' }
                            }}
                        >
                            <SendIcon />
                        </Button>
                    </Box>
                </Paper>
            </Zoom>
        </>
    );
};

export default HRChatbot;
