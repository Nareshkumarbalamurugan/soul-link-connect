
import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import ProfileCard from './ProfileCard';
import ChatWindow from './ChatWindow';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../contexts/AuthContext';
import { Phone, MessageCircle, Filter, MapPin, Star } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentLocation, sortHelpersByDistance, Location } from '../utils/geolocation';

interface Helper {
  id: string;
  name: string;
  gender: string;
  languages: string[];
  location: string | Location;
  isAvailable: boolean;
  isOnline?: boolean;
  distance?: number | null;
}

const SeekerDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [filteredHelpers, setFilteredHelpers] = useState<Helper[]>([]);
  const [loading, setLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [activeChat, setActiveChat] = useState<{chatId: string, otherUser: any} | null>(null);

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    // Set up real-time listener for helpers
    const helpersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'helper')
    );
    
    const unsubscribe = onSnapshot(helpersQuery, (snapshot) => {
      let helpersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Helper));

      // Sort helpers by distance (nearby first) if location is available
      if (userLocation) {
        helpersData = sortHelpersByDistance(helpersData, userLocation);
      }
      
      setHelpers(helpersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userLocation]);

  useEffect(() => {
    filterHelpers();
  }, [helpers, genderFilter, languageFilter]);

  const requestLocation = async () => {
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      setLocationEnabled(true);
      toast.success('Location enabled! Showing nearby helpers first');
    } catch (error) {
      console.error('Error getting location:', error);
      toast.error('Location access denied. Showing all helpers');
      setLocationEnabled(false);
    }
  };

  const filterHelpers = () => {
    let filtered = helpers;
    
    if (genderFilter !== 'all') {
      filtered = filtered.filter(helper => helper.gender === genderFilter);
    }
    
    if (languageFilter !== 'all') {
      filtered = filtered.filter(helper => 
        helper.languages.includes(languageFilter)
      );
    }
    
    setFilteredHelpers(filtered);
  };

  const handleChat = async (helperId: string, helperName: string) => {
    if (!userProfile) return;

    try {
      // Create a new chat
      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: [userProfile.id, helperId],
        participantNames: [userProfile.name, helperName],
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageTime: serverTimestamp()
      });

      const helper = helpers.find(h => h.id === helperId);
      setActiveChat({
        chatId: chatRef.id,
        otherUser: { id: helperId, name: helperName, isOnline: helper?.isOnline }
      });

      toast.success(`Starting chat with ${helperName}...`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const handleCall = (helperId: string, helperName: string) => {
    toast.success(`Initiating call with ${helperName}...`);
    // Create a direct call room
    const roomId = `${userProfile?.id}-${helperId}-${Date.now()}`;
    window.open(`https://meet.jit.si/SoulLink-Call-${roomId}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Finding available helpers...</p>
        </div>
      </div>
    );
  }

  if (activeChat) {
    return (
      <div className="max-w-4xl mx-auto">
        <ChatWindow
          chatId={activeChat.chatId}
          otherUser={activeChat.otherUser}
          onClose={() => setActiveChat(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Emergency Section */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Need Immediate Help?</h3>
              <p className="text-red-600 text-sm">Connect instantly with an available helper</p>
            </div>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                const emergencyRoom = `emergency-${userProfile?.id}-${Date.now()}`;
                window.open(`https://meet.jit.si/SoulLink-Emergency-${emergencyRoom}`, '_blank');
                toast.success('Opening emergency call room...');
              }}
            >
              <Phone className="w-4 h-4 mr-2" />
              Emergency Call
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Location Status */}
      {!locationEnabled && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800">Enable location to prioritize nearby helpers</span>
              </div>
              <Button onClick={requestLocation} variant="outline" size="sm">
                Enable Location
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Helpers Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
              <span>Available Helpers ({filteredHelpers.length})</span>
              {locationEnabled && (
                <div className="flex items-center space-x-1 text-sm font-normal text-green-600">
                  <Star className="w-4 h-4" />
                  <span>Nearby prioritized</span>
                </div>
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">Filters</span>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex space-x-4 mt-4">
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Hindi">Hindi</SelectItem>
                <SelectItem value="Spanish">Spanish</SelectItem>
                <SelectItem value="French">French</SelectItem>
                <SelectItem value="Tamil">Tamil</SelectItem>
                <SelectItem value="Telugu">Telugu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredHelpers.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No helpers available</h3>
              <p className="text-gray-500">Try adjusting your filters or check back later</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredHelpers.map((helper) => (
                <div key={helper.id} className="relative">
                  {helper.distance !== null && helper.distance !== undefined && helper.distance <= 10 && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                        <Star className="w-3 h-3" />
                        <span>Nearby</span>
                      </div>
                    </div>
                  )}
                  <ProfileCard
                    name={helper.name}
                    gender={helper.gender}
                    languages={helper.languages}
                    location={typeof helper.location === 'string' ? helper.location : 
                      helper.distance !== null ? `${helper.distance} km away` : 'Location unknown'}
                    isAvailable={helper.isAvailable && helper.isOnline}
                    onChat={() => handleChat(helper.id, helper.name)}
                    onCall={() => handleCall(helper.id, helper.name)}
                    isOnline={helper.isOnline}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SeekerDashboard;
