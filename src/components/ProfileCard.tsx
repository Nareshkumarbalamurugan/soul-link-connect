
import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MessageCircle, Phone, Globe, MapPin } from 'lucide-react';

interface ProfileCardProps {
  name: string;
  gender: string;
  languages: string[];
  location: string;
  isAvailable: boolean;
  isOnline?: boolean;
  onChat: () => void;
  onCall: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  gender,
  languages,
  location,
  isAvailable,
  isOnline,
  onChat,
  onCall
}) => {
  const getAvatarColor = (gender: string) => {
    switch (gender.toLowerCase()) {
      case 'male': return 'bg-blue-200';
      case 'female': return 'bg-pink-200';
      default: return 'bg-purple-200';
    }
  };

  const isReallyAvailable = isAvailable && isOnline;

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${
      isReallyAvailable ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className={`w-12 h-12 ${getAvatarColor(gender)} rounded-full flex items-center justify-center relative`}>
            <span className="text-gray-700 font-semibold text-lg">
              {name.charAt(0).toUpperCase()}
            </span>
            {/* Online indicator */}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800">{name}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant={isReallyAvailable ? "default" : "secondary"} className="text-xs">
                {isReallyAvailable ? 'Available' : isOnline ? 'Busy' : 'Offline'}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {gender}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Globe className="w-4 h-4" />
            <span>{languages.join(', ')}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{location}</span>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={onChat}
            disabled={!isReallyAvailable}
            className="flex-1"
            variant={isReallyAvailable ? "default" : "secondary"}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Chat
          </Button>
          <Button
            onClick={onCall}
            disabled={!isReallyAvailable}
            variant="outline"
            className="flex-1"
          >
            <Phone className="w-4 h-4 mr-1" />
            Call
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
