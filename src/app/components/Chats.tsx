import React, { useEffect, useMemo, useState } from 'react';
import { BadgePlus, MessageCircle, Send, Users, UserRoundPlus, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/app/services/apiClient';
import { ChatMessageItem, ChatSummaryItem, MessageUserItem, UserRole } from '@/app/types/models';

interface ChatsProps {
  role: UserRole;
  currentUserId: string;
}

type ComposerMode = 'direct' | 'group';

export function Chats({ role, currentUserId }: ChatsProps) {
  const [users, setUsers] = useState<MessageUserItem[]>([]);
  const [chats, setChats] = useState<ChatSummaryItem[]>([]);
  const [selectedChatId, setSelectedChatId] = useState('');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [directUserId, setDirectUserId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [composerMode, setComposerMode] = useState<ComposerMode>('direct');

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) || null,
    [chats, selectedChatId],
  );

  const activeUsers = useMemo(() => users.filter((user) => user.id !== currentUserId), [users, currentUserId]);

  const loadUsers = async () => {
    try {
      const rows = await apiClient.listChatUsers();
      setUsers(rows);
      setDirectUserId((prev) => prev || rows[0]?.id || '');
    } catch (error: any) {
      toast.error(error.message || 'Failed to load users.');
    }
  };

  const loadChats = async () => {
    try {
      setLoadingChats(true);
      const rows = await apiClient.listChats();
      setChats(rows);
      setSelectedChatId((prev) => prev || rows[0]?.id || '');
    } catch (error: any) {
      toast.error(error.message || 'Failed to load chats.');
    } finally {
      setLoadingChats(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    try {
      setLoadingMessages(true);
      const rows = await apiClient.listChatMessages(chatId);
      setMessages(rows);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load chat messages.');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadChats();
  }, []);

  useEffect(() => {
    loadMessages(selectedChatId);
  }, [selectedChatId]);

  const openDirectChat = async () => {
    if (!directUserId) {
      toast.error('Select a user to start a direct chat.');
      return;
    }

    try {
      setLoadingChats(true);
      const chat = await apiClient.openDirectChat(directUserId);
      await loadChats();
      setSelectedChatId(chat.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to open direct chat.');
    } finally {
      setLoadingChats(false);
    }
  };

  const createGroupChat = async () => {
    const participants = groupMemberIds.filter((id) => id !== currentUserId);
    if (!groupName.trim()) {
      toast.error('Group name is required.');
      return;
    }

    if (participants.length === 0) {
      toast.error('Select at least one member for the group.');
      return;
    }

    try {
      setLoadingChats(true);
      const chat = await apiClient.createGroupChat({ name: groupName.trim(), participantIds: participants });
      setGroupName('');
      setGroupMemberIds([]);
      await loadChats();
      setSelectedChatId(chat.id);
      toast.success('Group chat created.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create group chat.');
    } finally {
      setLoadingChats(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedChatId) {
      toast.error('Select a chat first.');
      return;
    }

    if (!messageBody.trim()) {
      toast.error('Message cannot be empty.');
      return;
    }

    try {
      setSendingMessage(true);
      const sent = await apiClient.sendChatMessage(selectedChatId, { body: messageBody.trim() });
      setMessages((prev) => [...prev, sent]);
      setMessageBody('');
      await loadChats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  const toggleGroupMember = (userId: string) => {
    setGroupMemberIds((prev) => (prev.includes(userId) ? prev.filter((item) => item !== userId) : [...prev, userId]));
  };

  const getChatTitle = (chat: ChatSummaryItem) => {
    if (chat.chatType === 'group') {
      return chat.name || 'Group Chat';
    }

    const otherNames = chat.participants.filter((participant) => participant.id !== currentUserId).map((participant) => participant.fullName);
    return otherNames.length > 0 ? otherNames.join(', ') : chat.name || 'Direct Chat';
  };

  const getChatSubtitle = (chat: ChatSummaryItem) => {
    if (chat.chatType === 'group') {
      return `${chat.participants.length} members`;
    }

    const other = chat.participants.find((participant) => participant.id !== currentUserId);
    return other ? other.role : 'Direct message';
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto h-full">
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
        <aside className="lg:w-[23rem] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <MessageCircle className="h-6 w-6 text-violet-600" />
                Chats
              </h1>
              <p className="text-sm text-gray-500">Direct messages and group conversations for everyone.</p>
            </div>
            <button
              onClick={loadChats}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 ${loadingChats ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setComposerMode('direct')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${
                  composerMode === 'direct' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                Direct
              </button>
              <button
                onClick={() => setComposerMode('group')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${
                  composerMode === 'group' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Users className="h-4 w-4" />
                Group
              </button>
            </div>

            {composerMode === 'direct' ? (
              <div className="space-y-2">
                <select
                  value={directUserId}
                  onChange={(e) => setDirectUserId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {activeUsers.length === 0 && <option value="">No users available</option>}
                  {activeUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({user.role})
                    </option>
                  ))}
                </select>
                <button
                  onClick={openDirectChat}
                  className="w-full inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 py-2 text-sm font-medium"
                >
                  <UserRoundPlus className="h-4 w-4" />
                  Open direct chat
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group chat name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <div className="max-h-44 overflow-y-auto space-y-2 rounded-xl border border-gray-100 p-3 bg-gray-50/70">
                  {activeUsers.length === 0 && <p className="text-sm text-gray-500">No available users.</p>}
                  {activeUsers.map((user) => (
                    <label key={user.id} className="flex items-center gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={groupMemberIds.includes(user.id)}
                        onChange={() => toggleGroupMember(user.id)}
                        className="h-4 w-4 rounded border-gray-300 text-violet-600"
                      />
                      <span>
                        {user.fullName} <span className="text-gray-400">({user.role})</span>
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={createGroupChat}
                  className="w-full inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 py-2 text-sm font-medium"
                >
                  <BadgePlus className="h-4 w-4" />
                  Create group chat
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/60">
            {loadingChats && <p className="text-sm text-gray-500 p-3">Loading chats...</p>}
            {!loadingChats && chats.length === 0 && <p className="text-sm text-gray-400 p-3">No chats yet. Start one above.</p>}
            {chats.map((chat) => {
              const active = chat.id === selectedChatId;
              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`w-full text-left rounded-xl border px-3 py-3 transition ${
                    active ? 'border-violet-200 bg-violet-50' : 'border-gray-100 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800 line-clamp-1">{getChatTitle(chat)}</p>
                      <p className="text-xs text-gray-500 mt-1">{getChatSubtitle(chat)}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {chat.chatType}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-1">
                    {chat.lastMessageBody || 'No messages yet'}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{selectedChat ? getChatTitle(selectedChat) : 'Select a chat'}</h2>
              <p className="text-sm text-gray-500">
                {selectedChat ? `${selectedChat.participants.length} participants` : 'Choose a chat or create a new one.'}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/60 space-y-3">
            {loadingMessages && <p className="text-sm text-gray-500">Loading messages...</p>}
            {!loadingMessages && messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No messages yet.</div>
            )}
            {!loadingMessages &&
              messages.map((message) => {
                const mine = message.senderId === currentUserId;
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${mine ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                      <p className="text-xs font-semibold opacity-70 mb-1">{message.senderName}</p>
                      <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                      <p className={`text-[10px] mt-2 ${mine ? 'text-violet-100' : 'text-gray-400'}`}>
                        {new Date(message.sentAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="p-4 border-t border-gray-100 bg-white flex gap-2 items-end">
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={2}
              placeholder={selectedChat ? 'Type a message...' : 'Select a chat to start messaging'}
              disabled={!selectedChatId}
              className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none disabled:bg-gray-50"
            />
            <button
              onClick={sendMessage}
              disabled={sendingMessage || !selectedChatId}
              className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-xl font-medium disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
