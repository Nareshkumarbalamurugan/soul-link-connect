
import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import ProfileCard from './ProfileCard';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../contexts/AuthContext';
import { Phone, MessageCircle, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface Helper {
  id: string;
  name: string;
  gender: string;
  languages: string[];
  location: string;
  isAvailable: boolean;
}

const SeekerDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [filteredHelpers, setFilteredHelpers] = useState<Helper[]>([]);
  const [loading, setLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');

  useEffect(() => {
    fetchHelpers();
  }, []);

  useEffect(() => {
    filterHelpers();
  }, [helpers, genderFilter, languageFilter]);

  const fetchHelpers = async () => {
    try {
      const helpersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'helper'),
        where('isAvailable', '==', true)
      );
      
      const snapshot = await getDocs(helpersQuery);
      const helpersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Helper));
      
      setHelpers(helpersData);
    } catch (error) {
      console.error('Error fetching helpers:', error);
      toast.error('Failed to load available helpers');
    } finally {
      setLoading(false);
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

  const handleChat = (helperId: string, helperName: string) => {
    toast.success(`Starting chat with ${helperName}...`);
    // Here you would implement the chat functionality
  };

  const handleCall = (helperId: string, helperName: string) => {
    toast.success(`Initiating call with ${helperName}...`);
    // Here you would implement the call functionality
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
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              <Phone className="w-4 h-4 mr-2" />
              Emergency Call
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Helpers Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold text-gray-800">Available Helpers</CardTitle>
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
                <ProfileCard
                  key={helper.id}
                  name={helper.name}
                  gender={helper.gender}
                  languages={helper.languages}
                  location={helper.location}
                  isAvailable={helper.isAvailable}
                  onChat={() => handleChat(helper.id, helper.name)}
                  onCall={() => handleCall(helper.id, helper.name)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SeekerDashboard;
