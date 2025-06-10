
import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { MessageCircle, Phone, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface SupportRequest {
  id: string;
  seekerId: string;
  seekerName: string;
  message: string;
  timestamp: Date;
  status: 'pending' | 'accepted' | 'completed';
}

const HelperDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [isAvailable, setIsAvailable] = useState(userProfile?.isAvailable || false);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [activeChats, setActiveChats] = useState(0);
  const [totalHelped, setTotalHelped] = useState(12); // Mock data

  useEffect(() => {
    if (userProfile?.id) {
      // Listen for real-time support requests
      const requestsQuery = query(
        collection(db, 'supportRequests'),
        where('helperId', '==', userProfile.id)
      );
      
      const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        } as SupportRequest));
        
        setRequests(requestsData);
        setActiveChats(requestsData.filter(req => req.status === 'accepted').length);
      });

      return () => unsubscribe();
    }
  }, [userProfile?.id]);

  const toggleAvailability = async () => {
    if (!userProfile) return;
    
    try {
      const newStatus = !isAvailable;
      await updateDoc(doc(db, 'users', userProfile.id), {
        isAvailable: newStatus
      });
      
      setIsAvailable(newStatus);
      toast.success(newStatus ? 'You are now available to help' : 'You are now offline');
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'supportRequests', requestId), {
        status: 'accepted'
      });
      toast.success('Request accepted! Chat started.');
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'supportRequests', requestId), {
        status: 'declined'
      });
      toast.success('Request declined');
    } catch (error) {
      console.error('Error declining request:', error);
      toast.error('Failed to decline request');
    }
  };

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
            <h3 className="text-2xl font-bold text-gray-800">{activeChats}</h3>
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
                          <h4 className="font-semibold text-gray-800">{request.seekerName}</h4>
                          <Badge variant="outline" className="bg-orange-100 text-orange-700">
                            New Request
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-3">{request.message}</p>
                        <p className="text-xs text-gray-500">
                          {request.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          onClick={() => handleAcceptRequest(request.id)}
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-800">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 border-purple-200 hover:bg-purple-50"
            >
              <MessageCircle className="w-6 h-6 text-purple-600" />
              <span>View All Chats</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 border-blue-200 hover:bg-blue-50"
            >
              <Phone className="w-6 h-6 text-blue-600" />
              <span>Call History</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HelperDashboard;
