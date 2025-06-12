
import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { MessageCircle, Phone, Users, Clock, Video } from 'lucide-react';
import { toast } from 'sonner';
import ChatWindow from './ChatWindow';
import type { Database } from '../integrations/supabase/types';

type SupportRequest = Database['public']['Tables']['support_requests']['Row'];
type Chat = Database['public']['Tables']['chats']['Row'];

const HelperDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [isAvailable, setIsAvailable] = useState(userProfile?.is_available || false);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<{ chatId: string; otherUser: { id: string; name: string; isOnline?: boolean } } | null>(null);
  const [totalHelped, setTotalHelped] = useState(0);

  useEffect(() => {
    if (userProfile?.id) {
      console.log('Setting up helper dashboard for:', userProfile.name);
      fetchRequests();
      fetchActiveChats();
      
      // Set up real-time subscription for support requests
      const requestsChannel = supabase
        .channel('helper-requests-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'support_requests', filter: `helper_id=eq.${userProfile.id}` },
          (payload) => {
            console.log('Support request change:', payload);
            fetchRequests();
          }
        )
        .subscribe();

      // Set up real-time subscription for chats
      const chatsChannel = supabase
        .channel('helper-chats-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'chats' },
          (payload) => {
            console.log('Chat change for helper:', payload);
            fetchActiveChats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(requestsChannel);
        supabase.removeChannel(chatsChannel);
      };
    }
  }, [userProfile?.id]);

  const fetchRequests = async () => {
    if (!userProfile?.id) return;
    
    try {
      console.log('Fetching support requests for helper:', userProfile.id);
      const { data, error } = await supabase
        .from('support_requests')
        .select('*')
        .eq('helper_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error);
      } else {
        console.log('Support requests fetched:', data?.length || 0);
        setRequests(data || []);
        setTotalHelped(data?.filter(req => req.status === 'accepted').length || 0);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchActiveChats = async () => {
    if (!userProfile?.id) return;
    
    try {
      console.log('Fetching active chats for helper:', userProfile.id);
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .contains('participants', [userProfile.id])
        .order('last_message_time', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
      } else {
        console.log('Active chats fetched:', data?.length || 0);
        setActiveChats(data || []);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const toggleAvailability = async () => {
    if (!userProfile) return;
    
    try {
      const newStatus = !isAvailable;
      const { error } = await supabase
        .from('profiles')
        .update({ is_available: newStatus })
        .eq('id', userProfile.id);

      if (error) throw error;
      
      setIsAvailable(newStatus);
      toast.success(newStatus ? 'You are now available to help' : 'You are now offline');
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    }
  };

  const handleAcceptRequest = async (request: SupportRequest) => {
    try {
      console.log('Accepting request:', request.id);
      
      // Update request status
      const { error: requestError } = await supabase
        .from('support_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (requestError) throw requestError;

      // Create or find existing chat
      const { data: existingChats, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .contains('participants', [userProfile!.id])
        .contains('participants', [request.seeker_id]);

      if (chatError) throw chatError;

      let chatId: string;
      
      if (existingChats && existingChats.length > 0) {
        chatId = existingChats[0].id;
      } else {
        // Create new chat
        const { data: newChat, error: newChatError } = await supabase
          .from('chats')
          .insert({
            participants: [userProfile!.id, request.seeker_id],
            participant_names: [userProfile!.name, request.seeker_name],
            last_message: `${userProfile!.name} accepted your support request`,
            last_message_time: new Date().toISOString()
          })
          .select()
          .single();

        if (newChatError) throw newChatError;
        chatId = newChat.id;
      }

      toast.success('Request accepted! Chat started.');
      
      // Open the chat
      setSelectedChat({
        chatId,
        otherUser: {
          id: request.seeker_id,
          name: request.seeker_name
        }
      });
      
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('support_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) throw error;
      toast.success('Request declined');
    } catch (error) {
      console.error('Error declining request:', error);
      toast.error('Failed to decline request');
    }
  };

  const openExistingChat = (chat: Chat) => {
    const otherUserId = chat.participants.find(id => id !== userProfile?.id);
    const otherUserName = chat.participant_names.find((name, index) => 
      chat.participants[index] !== userProfile?.id
    );
    
    if (otherUserId && otherUserName) {
      setSelectedChat({
        chatId: chat.id,
        otherUser: {
          id: otherUserId,
          name: otherUserName
        }
      });
    }
  };

  const handleCall = (chat: Chat) => {
    const otherUserId = chat.participants.find(id => id !== userProfile?.id);
    const otherUserName = chat.participant_names.find((name, index) => 
      chat.participants[index] !== userProfile?.id
    );
    
    if (otherUserId && otherUserName) {
      const roomId = `${userProfile?.id}-${otherUserId}-audio-${Date.now()}`;
      window.open(`https://meet.jit.si/SoulLink-Audio-${roomId}`, '_blank');
      toast.success(`Starting voice call with ${otherUserName}...`);
    }
  };

  const handleVideoCall = (chat: Chat) => {
    const otherUserId = chat.participants.find(id => id !== userProfile?.id);
    const otherUserName = chat.participant_names.find((name, index) => 
      chat.participants[index] !== userProfile?.id
    );
    
    if (otherUserId && otherUserName) {
      const roomId = `${userProfile?.id}-${otherUserId}-video-${Date.now()}`;
      window.open(`https://meet.jit.si/SoulLink-Video-${roomId}`, '_blank');
      toast.success(`Starting video call with ${otherUserName}...`);
    }
  };

  if (selectedChat) {
    return (
      <div className="max-w-4xl mx-auto">
        <ChatWindow
          chatId={selectedChat.chatId}
          otherUser={selectedChat.otherUser}
          onClose={() => setSelectedChat(null)}
        />
      </div>
    );
  }

  const pendingRequests = requests.filter(req => req.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={`border-2 ${isAvailable ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Your Status</h3>
              <p className={`text-sm ${isAvailable ? 'text-green-600' : 'text-gray-600'}`}>
                {isAvailable ? 'Available to help others' : 'Currently offline'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium">Available</span>
              <Switch
                checked={isAvailable}
                onCheckedChange={toggleAvailability}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <MessageCircle className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-gray-800">{activeChats.length}</h3>
            <p className="text-gray-600">Active Chats</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-gray-800">{totalHelped}</h3>
            <p className="text-gray-600">People Helped</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="w-10 h-10 text-purple-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-gray-800">{pendingRequests.length}</h3>
            <p className="text-gray-600">Pending Requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Chats */}
      {activeChats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span>Active Conversations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeChats.map((chat) => {
                const otherUserName = chat.participant_names.find((name, index) => 
                  chat.participants[index] !== userProfile?.id
                );
                return (
                  <div
                    key={chat.id}
                    className="p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h4 className="font-medium">{otherUserName}</h4>
                        <p className="text-sm text-gray-600 truncate">{chat.last_message}</p>
                        <span className="text-xs text-gray-500">
                          {new Date(chat.last_message_time).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => openExistingChat(chat)}
                          size="sm"
                          variant="outline"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Chat
                        </Button>
                        <Button
                          onClick={() => handleCall(chat)}
                          size="sm"
                          variant="outline"
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </Button>
                        <Button
                          onClick={() => handleVideoCall(chat)}
                          size="sm"
                          variant="outline"
                        >
                          <Video className="w-4 h-4 mr-1" />
                          Video
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-800">Pending Support Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No pending requests</h3>
              <p className="text-gray-500">
                {isAvailable ? 'You\'ll see support requests here when they come in' : 'Set yourself as available to receive requests'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-gray-800">{request.seeker_name}</h4>
                          <Badge variant="outline" className="bg-orange-100 text-orange-700">
                            New Request
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-3">{request.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(request.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          onClick={() => handleAcceptRequest(request)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Accept
                        </Button>
                        <Button
                          onClick={() => handleDeclineRequest(request.id)}
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HelperDashboard;
