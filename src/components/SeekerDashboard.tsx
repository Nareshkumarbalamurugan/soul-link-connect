
import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import ProfileCard from './ProfileCard';
import ChatWindow from './ChatWindow';
import { MessageCircle, Search, Filter, Heart, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '../integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Chat = Database['public']['Tables']['chats']['Row'];
type SupportRequest = Database['public']['Tables']['support_requests']['Row'];

const SeekerDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [helpers, setHelpers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedChat, setSelectedChat] = useState<{ chatId: string; otherUser: { id: string; name: string; isOnline?: boolean } } | null>(null);
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [supportMessage, setSupportMessage] = useState('');
  const [selectedHelper, setSelectedHelper] = useState<Profile | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile?.id) {
      fetchHelpers();
      fetchActiveChats();
      fetchSupportRequests();
      
      // Set up real-time subscription for helpers
      const helpersChannel = supabase
        .channel('helpers-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'profiles', filter: `role=eq.helper` },
          () => fetchHelpers()
        )
        .subscribe();

      // Set up real-time subscription for chats
      const chatsChannel = supabase
        .channel('chats-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'chats' },
          (payload) => {
            console.log('Chat change:', payload);
            fetchActiveChats();
          }
        )
        .subscribe();

      // Set up real-time subscription for support requests
      const requestsChannel = supabase
        .channel('support-requests-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'support_requests', filter: `seeker_id=eq.${userProfile.id}` },
          () => fetchSupportRequests()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(helpersChannel);
        supabase.removeChannel(chatsChannel);
        supabase.removeChannel(requestsChannel);
      };
    }
  }, [userProfile?.id]);

  const fetchHelpers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'helper')
        .order('is_online', { ascending: false })
        .order('is_available', { ascending: false });

      if (error) throw error;
      setHelpers(data || []);
    } catch (error) {
      console.error('Error fetching helpers:', error);
      toast.error('Failed to load helpers');
    }
  };

  const fetchActiveChats = async () => {
    if (!userProfile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .contains('participants', [userProfile.id])
        .order('last_message_time', { ascending: false });

      if (error) throw error;
      setActiveChats(data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const fetchSupportRequests = async () => {
    if (!userProfile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('support_requests')
        .select('*')
        .eq('seeker_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSupportRequests(data || []);
    } catch (error) {
      console.error('Error fetching support requests:', error);
    }
  };

  const filteredHelpers = helpers.filter(helper => {
    const matchesSearch = helper.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         helper.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage = !selectedLanguage || helper.languages.includes(selectedLanguage);
    return matchesSearch && matchesLanguage;
  });

  const handleRequestSupport = async () => {
    if (!userProfile || !supportMessage.trim() || !selectedHelper) {
      toast.error('Please enter a message');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_requests')
        .insert({
          seeker_id: userProfile.id,
          helper_id: selectedHelper.id,
          seeker_name: userProfile.name,
          message: supportMessage.trim(),
          status: 'pending'
        });

      if (error) throw error;
      
      setSupportMessage('');
      setIsRequestDialogOpen(false);
      setSelectedHelper(null);
      toast.success(`Support request sent to ${selectedHelper.name}!`);
    } catch (error) {
      console.error('Error sending support request:', error);
      toast.error('Failed to send support request');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectChat = async (helper: Profile) => {
    if (!userProfile) return;
    
    setLoading(true);
    try {
      // Check if chat already exists
      const { data: existingChats, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .contains('participants', [userProfile.id])
        .contains('participants', [helper.id]);

      if (chatError) throw chatError;

      let chatId: string;
      
      if (existingChats && existingChats.length > 0) {
        chatId = existingChats[0].id;
      } else {
        // Create new chat
        const { data: newChat, error: newChatError } = await supabase
          .from('chats')
          .insert({
            participants: [userProfile.id, helper.id],
            participant_names: [userProfile.name, helper.name],
            last_message: `${userProfile.name} started a conversation`,
            last_message_time: new Date().toISOString()
          })
          .select()
          .single();

        if (newChatError) throw newChatError;
        chatId = newChat.id;
      }

      setSelectedChat({
        chatId,
        otherUser: {
          id: helper.id,
          name: helper.name,
          isOnline: helper.is_online
        }
      });

      toast.success(`Chat started with ${helper.name}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = async (helper: Profile) => {
    toast.success(`Starting call with ${helper.name}...`);
    // Open Jitsi Meet in a new window
    const roomId = `${userProfile?.id}-${helper.id}-${Date.now()}`;
    window.open(`https://meet.jit.si/SoulLink-${roomId}`, '_blank');
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

  const allLanguages = [...new Set(helpers.flatMap(helper => helper.languages))];
  const pendingRequests = supportRequests.filter(req => req.status === 'pending').length;
  const acceptedRequests = supportRequests.filter(req => req.status === 'accepted').length;

  return (
    <div className="space-y-6">
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
            <Users className="w-10 h-10 text-orange-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-gray-800">{pendingRequests}</h3>
            <p className="text-gray-600">Pending Requests</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Heart className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-gray-800">{acceptedRequests}</h3>
            <p className="text-gray-600">Connected Helpers</p>
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
                    onClick={() => openExistingChat(chat)}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{otherUserName}</h4>
                        <p className="text-sm text-gray-600 truncate">{chat.last_message}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(chat.last_message_time).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search helpers by name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Languages</option>
                {allLanguages.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Helpers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-purple-600" />
            <span>Available Helpers</span>
            <Badge variant="secondary">{filteredHelpers.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHelpers.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No helpers found</h3>
              <p className="text-gray-500">
                {searchTerm || selectedLanguage 
                  ? 'Try adjusting your search filters' 
                  : 'No helpers are currently available'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHelpers.map((helper) => (
                <div key={helper.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center relative">
                      <span className="text-purple-800 font-semibold text-lg">
                        {helper.name.charAt(0).toUpperCase()}
                      </span>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        helper.is_online ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{helper.name}</h3>
                      <div className="flex space-x-2">
                        <Badge variant={helper.is_available ? "default" : "secondary"} className="text-xs">
                          {helper.is_available ? 'Available' : 'Busy'}
                        </Badge>
                        <Badge variant={helper.is_online ? "default" : "secondary"} className="text-xs">
                          {helper.is_online ? 'Online' : 'Offline'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <strong>Languages:</strong> {helper.languages.join(', ')}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Location:</strong> {helper.location || 'Not specified'}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleDirectChat(helper)}
                      disabled={loading || !helper.is_available}
                      size="sm"
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Chat
                    </Button>
                    <Dialog open={isRequestDialogOpen && selectedHelper?.id === helper.id} onOpenChange={setIsRequestDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => setSelectedHelper(helper)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          Request Help
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Request Support from {helper.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Textarea
                            placeholder="Describe what kind of support you're looking for..."
                            value={supportMessage}
                            onChange={(e) => setSupportMessage(e.target.value)}
                            rows={4}
                          />
                          <div className="flex space-x-2">
                            <Button
                              onClick={handleRequestSupport}
                              disabled={loading || !supportMessage.trim()}
                              className="flex-1"
                            >
                              {loading ? 'Sending...' : 'Send Request'}
                            </Button>
                            <Button
                              onClick={() => {
                                setIsRequestDialogOpen(false);
                                setSelectedHelper(null);
                                setSupportMessage('');
                              }}
                              variant="outline"
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Support Requests Status */}
      {supportRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Support Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {supportRequests.slice(0, 5).map((request) => {
                const helper = helpers.find(h => h.id === request.helper_id);
                return (
                  <div key={request.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">Request to {helper?.name || 'Helper'}</h4>
                        <p className="text-sm text-gray-600 mt-1">{request.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge 
                        variant={
                          request.status === 'accepted' ? 'default' : 
                          request.status === 'pending' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SeekerDashboard;
