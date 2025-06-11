
import React from 'react';
import { useAuth } from '../contexts/SupabaseAuthContext';
import AuthFlow from '../components/AuthFlow';
import SeekerDashboard from '../components/SeekerDashboard';
import HelperDashboard from '../components/HelperDashboard';
import Navbar from '../components/Navbar';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Mail } from 'lucide-react';

const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading SoulLink...</p>
    </div>
  </div>
);

const LandingHeader = () => (
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
);

const EmailVerificationPrompt = ({ sendVerificationEmail }: { sendVerificationEmail: () => Promise<void> }) => (
  <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-yellow-800 mb-2">Email Verification Required</h2>
            <p className="text-yellow-700 mb-2">
              Please verify your email address to access your dashboard.
            </p>
            <p className="text-sm text-yellow-600 mb-4">
              Check your email inbox and <strong>spam folder</strong> for the verification link.
            </p>
            <div className="space-y-3">
              <Button
                onClick={async () => {
                  try {
                    await sendVerificationEmail();
                    alert('Verification email sent! Please check your inbox and spam folder.');
                  } catch (error) {
                    alert('Failed to send verification email. Please try again.');
                  }
                }}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Resend Verification Email
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                I've Verified - Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

const Index = () => {
  const { currentUser, userProfile, sendVerificationEmail, loading } = useAuth();

  console.log('Index render - loading:', loading, 'user:', currentUser?.email, 'profile:', userProfile?.name);

  // Show loading spinner while auth is initializing
  if (loading) {
    return <LoadingSpinner />;
  }

  // Show auth flow if no user is logged in
  if (!currentUser) {
    console.log('No current user - showing auth flow');
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          <LandingHeader />
          <AuthFlow />
        </div>
      </div>
    );
  }

  // Show email verification notice if email is not verified (only for email users)
  if (currentUser.email && !currentUser.email_confirmed_at) {
    console.log('User email not verified - showing verification prompt');
    return <EmailVerificationPrompt sendVerificationEmail={sendVerificationEmail} />;
  }

  // Show profile completion for users without profile
  if (!userProfile) {
    console.log('No user profile - showing profile completion');
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Complete Your Profile</h1>
            <p className="text-gray-600">Please complete your profile to continue using SoulLink</p>
          </div>
          <AuthFlow />
        </div>
      </div>
    );
  }

  // Show main dashboard for verified users with complete profiles
  console.log('Showing dashboard for user:', userProfile.name, 'role:', userProfile.role);
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
