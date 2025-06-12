
import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import ProfileCard from './ProfileCard';
import ChatWindow from './ChatWindow';
import { MessageCircle, Search, Filter, Heart } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '../integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Chat = Database['public']['Tables']['chats']['Row'];

const SeekerDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [helpers, setHelpers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedChat, setSelectedChat] = useState<{ chatId: string; otherUser: { id: string; name: string; isOnline?: boolean } } | null>(null);
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [supportMessage, setSupportMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile?.id) {
      fetchHelpers();
      fetchActiveChats();
      
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

      return () => {
        supabase.removeChannel(helpersChannel);
        supabase.removeChannel(chatsChannel);
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

  const filteredHelpers = helpers.filter(helper => {
    const matchesSearch = helper.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         helper.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage = !selectedLanguage || helper.languages.includes(selectedLanguage);
    return matchesSearch && matchesLanguage;
  });

  const handleStartChat = async (helper: Profile) => {
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

  const handleRequestSupport = async (helper: Profile) => {
    if (!userProfile || !supportMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_requests')
        .insert({
          seeker_id: userProfile.id,
          helper_id: helper.id,
          seeker_name: userProfile.name,
          message: supportMessage.trim(),
          status: 'pending'
        });

      if (error) throw error;
      
      setSupportMessage('');
      toast.success(`Support request sent to ${helper.name}!`);
    } catch (error) {
      console.error('Error sending support request:', error);
      toast.error('Failed to send support request');
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
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
                <ProfileCard
                  key={helper.id}
                  name={helper.name}
                  gender={helper.gender || 'other'}
                  languages={helper.languages}
                  location={helper.location || 'Unknown'}
                  isAvailable={helper.is_available || false}
                  isOnline={helper.is_online || false}
                  onChat={() => handleStartChat(helper)}
                  onCall={() => handleCall(helper)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Request Support */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Support Request</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Describe what kind of support you're looking for..."
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              rows={3}
            />
            <div className="flex space-x-2">
              {filteredHelpers.slice(0, 3).map((helper) => (
                <Button
                  key={helper.id}
                  onClick={() => handleRequestSupport(helper)}
                  disabled={loading || !supportMessage.trim() || !helper.is_available}
                  variant="outline"
                  className="flex-1"
                >
                  Request from {helper.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SeekerDashboard;
