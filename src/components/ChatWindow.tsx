
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Send, Phone, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import VideoCall from './VideoCall';
import type { Database } from '../integrations/supabase/types';

type Message = Database['public']['Tables']['messages']['Row'];

interface ChatWindowProps {
  chatId: string;
  otherUser: {
    id: string;
    name: string;
    isOnline?: boolean;
  };
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, otherUser, onClose }) => {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(otherUser.isOnline || false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Set up real-time subscription for new messages
    const messagesChannel = supabase
      .channel(`messages-${chatId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          console.log('New message received:', payload.new);
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    // Set up real-time subscription for user status
    const profilesChannel = supabase
      .channel(`profile-${otherUser.id}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${otherUser.id}` },
        (payload) => {
          const updatedProfile = payload.new as any;
          setOtherUserOnline(updatedProfile.is_online);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [chatId, otherUser.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userProfile) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setLoading(true);
    
    try {
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          text: messageText,
          sender_id: userProfile.id,
          sender_name: userProfile.name
        });

      if (messageError) throw messageError;

      // Update chat's last message
      const { error: chatError } = await supabase
        .from('chats')
        .update({
          last_message: messageText,
          last_message_time: new Date().toISOString()
        })
        .eq('id', chatId);

      if (chatError) throw chatError;

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      setNewMessage(messageText); // Restore message on error
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    const roomId = `${userProfile?.id}-${otherUser.id}-audio-${Date.now()}`;
    window.open(`https://meet.jit.si/SoulLink-Audio-${roomId}`, '_blank');
    toast.success(`Starting voice call with ${otherUser.name}...`);
  };

  const handleVideoCall = () => {
    setShowVideoCall(true);
    toast.success(`Starting video call with ${otherUser.name}...`);
  };

  const handleEndCall = () => {
    setShowVideoCall(false);
    toast.success('Call ended');
  };

  if (showVideoCall) {
    const roomId = `${userProfile?.id}-${otherUser.id}`;
    return (
      <div className="max-w-4xl mx-auto">
        <VideoCall
          roomId={roomId}
          participantName={otherUser.name}
          onEndCall={handleEndCall}
        />
      </div>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center relative">
            <span className="text-purple-800 font-semibold text-lg">
              {otherUser.name.charAt(0).toUpperCase()}
            </span>
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
              otherUserOnline ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>
          <div>
            <CardTitle className="text-lg">{otherUser.name}</CardTitle>
            <Badge variant={otherUserOnline ? "default" : "secondary"} className="text-xs">
              {otherUserOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCall} variant="outline" size="sm" title="Voice Call">
            <Phone className="w-4 h-4" />
          </Button>
          <Button onClick={handleVideoCall} variant="outline" size="sm" title="Video Call">
            <Video className="w-4 h-4" />
          </Button>
          <Button onClick={onClose} variant="outline" size="sm" title="Close Chat">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === userProfile?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm ${
                    message.sender_id === userProfile?.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-800 border'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender_id === userProfile?.id ? 'text-purple-200' : 'text-gray-500'
                  }`}>
                    {new Date(message.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 border-t bg-white">
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={loading}
              className="flex-1"
              maxLength={1000}
            />
            <Button 
              type="submit" 
              disabled={loading || !newMessage.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ChatWindow;
