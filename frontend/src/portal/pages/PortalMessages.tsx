import React, { useEffect, useState } from 'react';
import { MessageCircle, Send, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import portalApi, { PortalMessage } from '../services/portalApi';
import toast from 'react-hot-toast';

export default function PortalMessages() {
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState({
    subject: '',
    content: '',
  });
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const data = await portalApi.getMessages();
      setMessages(data);
    } catch (error) {
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNewMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.content.trim()) {
      toast.error('Digite o conteúdo da mensagem');
      return;
    }

    setSending(true);
    try {
      await portalApi.sendMessage(
        newMessage.subject.trim() || null,
        newMessage.content.trim()
      );
      toast.success('Mensagem enviada com sucesso!');
      setNewMessage({ subject: '', content: '' });
      setShowNewMessage(false);
      loadMessages();
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleReply = async (parentId: string) => {
    const content = replyContent[parentId];
    if (!content?.trim()) {
      toast.error('Digite o conteúdo da resposta');
      return;
    }

    setSending(true);
    try {
      await portalApi.sendMessage(null, content.trim(), parentId);
      toast.success('Resposta enviada!');
      setReplyContent({ ...replyContent, [parentId]: '' });
      loadMessages();
    } catch (error) {
      toast.error('Erro ao enviar resposta');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageCircle className="text-primary-600" size={28} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mensagens</h1>
          </div>
          <button
            onClick={() => setShowNewMessage(!showNewMessage)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Send size={18} />
            Nova Mensagem
          </button>
        </div>

        {/* Formulário Nova Mensagem */}
        {showNewMessage && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Nova Mensagem</h2>
            <form onSubmit={handleSendNewMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Assunto (opcional)
                </label>
                <input
                  type="text"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                  placeholder="Ex: Dúvida sobre meu processo"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Mensagem *
                </label>
                <textarea
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                  placeholder="Digite sua mensagem..."
                  rows={4}
                  required
                  className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewMessage(false)}
                  className="px-4 py-2 text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                  {sending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Mensagens */}
        {messages.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-12 text-center">
            <MessageCircle className="mx-auto text-gray-400 dark:text-slate-500 mb-4" size={48} />
            <p className="text-gray-500 dark:text-slate-400">Você ainda não tem mensagens</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
              Clique em "Nova Mensagem" para enviar sua primeira mensagem ao escritório
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden"
              >
                {/* Cabeçalho da mensagem */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setExpandedMessage(expandedMessage === message.id ? null : message.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            message.sender === 'CLIENT'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          }`}
                        >
                          {message.sender === 'CLIENT' ? 'Você' : 'Escritório'}
                        </span>
                        {message.subject && (
                          <span className="font-medium text-gray-900 dark:text-white">{message.subject}</span>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-slate-300 text-sm line-clamp-2">{message.content}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-slate-400">
                        <Clock size={12} />
                        <span>{formatDate(message.createdAt)}</span>
                        {message.replies && message.replies.length > 0 && (
                          <span className="ml-2 text-primary-600 dark:text-primary-400">
                            {message.replies.length} resposta(s)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      {expandedMessage === message.id ? (
                        <ChevronUp className="text-gray-400 dark:text-slate-500" size={20} />
                      ) : (
                        <ChevronDown className="text-gray-400 dark:text-slate-500" size={20} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Conteúdo expandido */}
                {expandedMessage === message.id && (
                  <div className="border-t border-gray-200 dark:border-slate-700">
                    {/* Conteúdo completo da mensagem */}
                    <div className="p-4 bg-gray-50 dark:bg-slate-700">
                      <p className="text-gray-800 dark:text-slate-200 whitespace-pre-wrap">{message.content}</p>
                    </div>

                    {/* Respostas */}
                    {message.replies && message.replies.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-slate-700">
                        {message.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className={`p-4 border-l-4 ${
                              reply.sender === 'CLIENT'
                                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-green-400 bg-green-50 dark:bg-green-900/20'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  reply.sender === 'CLIENT'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                    : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                }`}
                              >
                                {reply.sender === 'CLIENT' ? 'Você' : reply.creator?.name || 'Escritório'}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-slate-400">
                                {formatDate(reply.createdAt)}
                              </span>
                            </div>
                            <p className="text-gray-800 dark:text-slate-200 text-sm whitespace-pre-wrap">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formulário de Resposta */}
                    <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <div className="flex gap-3">
                        <textarea
                          value={replyContent[message.id] || ''}
                          onChange={(e) =>
                            setReplyContent({ ...replyContent, [message.id]: e.target.value })
                          }
                          placeholder="Digite sua resposta..."
                          rows={2}
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        />
                        <button
                          onClick={() => handleReply(message.id)}
                          disabled={sending || !replyContent[message.id]?.trim()}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 self-end"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
