
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch existing messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(data);
      }
    };

    fetchMessages();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel(`messages-${chatId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userProfile) return;

    setLoading(true);
    try {
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          text: newMessage.trim(),
          sender_id: userProfile.id,
          sender_name: userProfile.name
        });

      if (messageError) throw messageError;

      // Update chat's last message
      const { error: chatError } = await supabase
        .from('chats')
        .update({
          last_message: newMessage.trim(),
          last_message_time: new Date().toISOString()
        })
        .eq('id', chatId);

      if (chatError) throw chatError;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    toast.success(`Starting voice call with ${otherUser.name}...`);
    // For voice call, we can also use Jitsi with audio only
    const roomId = `${userProfile?.id}-${otherUser.id}-${Date.now()}`;
    window.open(`https://meet.jit.si/SoulLink-Audio-${roomId}`, '_blank');
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
          <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
            {otherUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <CardTitle className="text-lg">{otherUser.name}</CardTitle>
            <Badge variant={otherUser.isOnline ? "default" : "secondary"} className="text-xs">
              {otherUser.isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCall} variant="outline" size="sm">
            <Phone className="w-4 h-4" />
          </Button>
          <Button onClick={handleVideoCall} variant="outline" size="sm">
            <Video className="w-4 h-4" />
          </Button>
          <Button onClick={onClose} variant="outline" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_id === userProfile?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender_id === userProfile?.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className="text-xs opacity-75 mt-1">
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 border-t">
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ChatWindow;
