
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Send, Phone, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import VideoCall from './VideoCall';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
}

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
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      } as Message));
      
      setMessages(messagesData);
    });

    return () => unsubscribe();
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
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: newMessage.trim(),
        senderId: userProfile.id,
        senderName: userProfile.name,
        timestamp: serverTimestamp()
      });

      // Update chat's last message
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: newMessage.trim(),
        lastMessageTime: serverTimestamp()
      });

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
              className={`flex ${message.senderId === userProfile?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.senderId === userProfile?.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className="text-xs opacity-75 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
