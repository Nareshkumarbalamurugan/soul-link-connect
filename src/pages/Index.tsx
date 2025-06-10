
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from '../components/AuthForm';
import SeekerDashboard from '../components/SeekerDashboard';
import HelperDashboard from '../components/HelperDashboard';
import Navbar from '../components/Navbar';

const Index = () => {
  const { currentUser, userProfile } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  if (!currentUser || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                SoulLink
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Connect with caring volunteers for mental wellness support through secure chat and calls
            </p>
          </div>
          
          <AuthForm isLogin={isLogin} onToggle={() => setIsLogin(!isLogin)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {userProfile.name}!
          </h1>
          <p className="text-gray-600">
            {userProfile.role === 'seeker' 
              ? 'Find support from our caring community of helpers'
              : 'Make a difference by helping others in their wellness journey'
            }
          </p>
        </div>
        
        {userProfile.role === 'seeker' ? <SeekerDashboard /> : <HelperDashboard />}
      </div>
    </div>
  );
};

export default Index;
