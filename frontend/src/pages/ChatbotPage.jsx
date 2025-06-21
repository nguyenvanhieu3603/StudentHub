import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Trash2, Link } from 'lucide-react';
import { toast } from 'react-toastify';
// import axios from 'axios';
import { askChatbot, exportStudents, exportGrades, exportClasses } from '../services/api';

export default function ChatbotPage() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    return saved ? JSON.parse(saved).slice(-50) : [];
  });
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);
  const navigate = useNavigate();

  // Lưu lịch sử chat vào localStorage
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  }, [messages]);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Gửi câu hỏi
  const handleSendQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error('Vui lòng nhập câu hỏi!');
      return;
    }
    if (question.length > 200) {
      toast.error('Câu hỏi không được vượt quá 200 ký tự!');
      return;
    }

    const userMessage = {
      id: Date.now(),
      text: question,
      sender: 'user',
      suggestions: [],
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await askChatbot({ question });
      const botResponse = {
        id: Date.now() + 1,
        text: response.data.text,
        sender: 'bot',
        suggestions: response.data.suggestions || [],
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi gửi câu hỏi!');
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý gợi ý
  const handleSuggestionClick = async (suggestion) => {
    try {
      if (suggestion.action === 'none') {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.suggestions && msg.suggestions.length > 0
              ? { ...msg, suggestions: [] }
              : msg
          )
        );
      } else if (suggestion.action === 'view_student') {
        navigate(suggestion.link);
      } else if (suggestion.action.startsWith('export_')) {
        toast.info('Đang xuất dữ liệu, vui lòng đợi...');
        let response;
        if (suggestion.action === 'export_students') {
          response = await exportStudents({});
        } else if (suggestion.action === 'export_grades') {
          response = await exportGrades({});
        } else if (suggestion.action === 'export_classes') {
          response = await exportClasses({});
        }
        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${suggestion.action}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
        toast.success('Xuất Excel thành công');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi xử lý gợi ý!');
    }
  };

  // Xóa lịch sử chat
  const handleClearHistory = () => {
    if (window.confirm('Bạn có chắc muốn xóa lịch sử chat?')) {
      setMessages([]);
      localStorage.removeItem('chatHistory');
      toast.success('Đã xóa lịch sử chat');
    }
  };

  // Tối ưu render tin nhắn
  const renderedMessages = useMemo(() => messages, [messages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-50 p-8 ml-64 font-['Inter']">
      <h1 className="text-4xl font-bold text-indigo-600 mb-8">Trợ Lý Chatbot</h1>
      <div className="bg-white rounded-xl shadow-md p-6 max-w-3xl mx-auto">
        {/* Nút xóa lịch sử */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleClearHistory}
            className="bg-red-300 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-400 transition-all duration-200"
          >
            <Trash2 size={20} />
            Xóa lịch sử
          </button>
        </div>
        {/* Khu vực chat */}
        <div
          ref={chatContainerRef}
          className="max-h-[500px] overflow-y-auto mb-4 pr-2"
        >
          {renderedMessages.length === 0 ? (
            <p className="text-gray-500 text-center">
              Chưa có tin nhắn. Hãy nhập câu hỏi để bắt đầu!
            </p>
          ) : (
            renderedMessages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-2 flex ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`rounded-lg p-3 max-w-[70%] animate-fade-in ${
                    msg.sender === 'user'
                      ? 'bg-indigo-100 text-indigo-800 ml-auto'
                      : 'bg-gray-100 text-gray-800 mr-auto'
                  }`}
                >
                  <p className="text-sm font-medium">{msg.text}</p>
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {msg.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`text-white px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                            suggestion.type === 'export'
                              ? 'bg-green-400 hover:bg-green-500'
                              : 'bg-indigo-400 hover:bg-indigo-500'
                          }`}
                        >
                          {suggestion.type === 'detail' && <Link size={16} />}
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start mb-2">
              <div className="bg-gray-100 rounded-lg p-3 max-w-[70%]">
                <p className="text-sm text-gray-500">Đang xử lý...</p>
              </div>
            </div>
          )}
        </div>

        {/* Input và nút gửi */}
        <form onSubmit={handleSendQuestion} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Nhập câu hỏi (VD: Nguyễn Văn A học lớp nào?)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 text-sm"
            disabled={isLoading}
            maxLength={200}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-indigo-400 text-white px-4 py-2 rounded-lg hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-400 transition-all duration-200 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}