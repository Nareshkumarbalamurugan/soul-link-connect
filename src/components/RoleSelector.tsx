
import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Heart, HandHeart } from 'lucide-react';

interface RoleSelectorProps {
  onRoleSelect: (role: 'seeker' | 'helper') => void;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ onRoleSelect }) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Choose Your Role</h2>
        <p className="text-gray-600">How would you like to use SoulLink today?</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-purple-300">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">Support Seeker</h3>
              <p className="text-gray-600 mb-6">
                Connect with caring volunteers who can listen and provide emotional support
              </p>
            </div>
            <Button 
              onClick={() => onRoleSelect('seeker')}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              size="lg"
            >
              I Need Support
            </Button>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-300">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HandHeart className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">Helper</h3>
              <p className="text-gray-600 mb-6">
                Volunteer your time to support others in their mental wellness journey
              </p>
            </div>
            <Button 
              onClick={() => onRoleSelect('helper')}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
              size="lg"
            >
              I Want to Help
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleSelector;
