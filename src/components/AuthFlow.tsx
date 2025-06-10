
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import RoleSelector from './RoleSelector';
import { toast } from 'sonner';
import { Mail, AlertCircle } from 'lucide-react';

type FlowStep = 'role-selection' | 'registration' | 'login' | 'email-verification';

const AuthFlow: React.FC = () => {
  const { login, signup, currentUser, sendVerificationEmail } = useAuth();
  const [step, setStep] = useState<FlowStep>('role-selection');
  const [selectedRole, setSelectedRole] = useState<'seeker' | 'helper' | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    gender: '',
    languages: [] as string[],
    location: ''
  });

  const handleRoleSelection = (role: 'seeker' | 'helper') => {
    setSelectedRole(role);
    setStep('registration');
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    
    setLoading(true);
    try {
      await signup(formData.email, formData.password, {
        name: formData.name,
        gender: formData.gender as 'male' | 'female' | 'other',
        languages: formData.languages,
        location: formData.location,
        role: selectedRole,
        isAvailable: selectedRole === 'helper'
      });
      
      setStep('email-verification');
      toast.success('Account created! Please check your email for verification.');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(formData.email, formData.password);
      toast.success('Welcome back!');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    }
    setLoading(false);
  };

  const handleLanguageChange = (language: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, language]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        languages: prev.languages.filter(lang => lang !== language)
      }));
    }
  };

  const resendVerificationEmail = async () => {
    try {
      await sendVerificationEmail();
      toast.success('Verification email sent!');
    } catch (error: any) {
      toast.error('Failed to send verification email');
    }
  };

  // Email verification step
  if (step === 'email-verification') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">Verify Your Email</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            We've sent a verification email to <strong>{formData.email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Please check your email and click the verification link to continue.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={resendVerificationEmail}
              variant="outline"
              className="w-full"
            >
              Resend Verification Email
            </Button>
            <Button 
              onClick={() => setStep('login')}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
            >
              I've Verified - Continue to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Role selection step
  if (step === 'role-selection') {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8">
          <RoleSelector onRoleSelect={handleRoleSelection} />
          <div className="text-center mt-6">
            <Button
              variant="link"
              onClick={() => setStep('login')}
              className="text-purple-600 hover:text-purple-700"
            >
              Already have an account? Sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Registration step
  if (step === 'registration') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-gray-800">
            Join as {selectedRole === 'seeker' ? 'Support Seeker' : 'Helper'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegistration} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Languages Spoken</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['English', 'Hindi', 'Spanish', 'French', 'Tamil', 'Telugu'].map((lang) => (
                  <div key={lang} className="flex items-center space-x-2">
                    <Checkbox
                      id={lang}
                      onCheckedChange={(checked) => handleLanguageChange(lang, checked as boolean)}
                    />
                    <Label htmlFor={lang} className="text-sm">{lang}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="location">Location (City)</Label>
              <Input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Mumbai, India"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
          
          <div className="mt-6 text-center space-y-2">
            <Button
              variant="link"
              onClick={() => setStep('login')}
              className="text-purple-600 hover:text-purple-700"
            >
              Already have an account? Sign in
            </Button>
            <Button
              variant="link"
              onClick={() => setStep('role-selection')}
              className="block mx-auto text-gray-600 hover:text-gray-700"
            >
              Change role selection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Login step
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold text-gray-800">
          Welcome Back
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <Button
            variant="link"
            onClick={() => setStep('role-selection')}
            className="text-purple-600 hover:text-purple-700"
          >
            Don't have an account? Sign up
          </Button>
        </div>
        
        {currentUser && !currentUser.emailVerified && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div className="text-sm">
              <p className="text-yellow-800">Please verify your email to continue.</p>
              <Button
                variant="link"
                onClick={resendVerificationEmail}
                className="text-yellow-600 hover:text-yellow-700 p-0 h-auto"
              >
                Resend verification email
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthFlow;
