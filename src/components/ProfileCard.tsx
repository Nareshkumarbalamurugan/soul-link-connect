
import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MessageCircle, Phone } from 'lucide-react';

interface ProfileCardProps {
  name: string;
  gender: string;
  languages: string[];
  location: string;
  isAvailable?: boolean;
  onChat?: () => void;
  onCall?: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  gender,
  languages,
  location,
  isAvailable = true,
  onChat,
  onCall
}) => {
  const getAvatarColor = () => {
    const colors = ['bg-purple-200', 'bg-blue-200', 'bg-green-200', 'bg-pink-200'];
    return colors[name.length % colors.length];
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-300 border-purple-100">
      <CardContent className="p-0">
        <div className="flex items-center space-x-4 mb-4">
          <div className={`w-16 h-16 rounded-full ${getAvatarColor()} flex items-center justify-center text-gray-700 font-semibold text-lg`}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
            <p className="text-gray-600 text-sm">{gender}, {location}</p>
          </div>
          {isAvailable && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Available
            </Badge>
          )}
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Languages:</p>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang, index) => (
              <Badge key={index} variant="secondary" className="bg-purple-50 text-purple-700">
                {lang}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={onChat}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            size="sm"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat
          </Button>
          <Button 
            onClick={onCall}
            variant="outline"
            size="sm"
            className="flex-1 border-purple-200 text-purple-600 hover:bg-purple-50"
          >
            <Phone className="w-4 h-4 mr-2" />
            Call
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
