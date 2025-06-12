import React, { useState } from 'react';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import RoleSelector from './RoleSelector';
import { toast } from 'sonner';
import { Mail, AlertCircle, Eye, EyeOff, Phone, ArrowLeft } from 'lucide-react';

type FlowStep = 'role-selection' | 'registration' | 'login' | 'phone-verification' | 'reset-password';
type AuthMethod = 'email' | 'phone';

const AuthFlow: React.FC = () => {
  const { login, signup, loginWithGoogle, loginWithPhone, verifyPhone, signupWithPhone, sendVerificationEmail, resetPassword } = useAuth();
  const [step, setStep] = useState<FlowStep>('role-selection');
  const [selectedRole, setSelectedRole] = useState<'seeker' | 'helper' | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    name: '',
    gender: '',
    languages: [] as string[],
    location: ''
  });

  const handleRoleSelection = (role: 'seeker' | 'helper') => {
    setSelectedRole(role);
    setStep('registration');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Redirecting to Google...');
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error(error.message || 'Failed to login with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    
    if (formData.languages.length === 0) {
      toast.error('Please select at least one language');
      return;
    }
    
    setLoading(true);
    try {
      if (authMethod === 'email') {
        await signup(formData.email, formData.password, {
          name: formData.name,
          phone: null,
          gender: formData.gender as 'male' | 'female' | 'other',
          languages: formData.languages,
          location: formData.location,
          role: selectedRole,
          is_available: selectedRole === 'helper',
          is_online: false,
          last_seen: new Date().toISOString()
        });
        toast.success('Account created! Please check your email for verification (including spam folder).');
      } else {
        await signupWithPhone(formData.phone, {
          name: formData.name,
          gender: formData.gender as 'male' | 'female' | 'other',
          languages: formData.languages,
          location: formData.location,
          role: selectedRole,
          is_available: selectedRole === 'helper',
          is_online: false,
          last_seen: new Date().toISOString()
        });
        setOtpSent(true);
        setStep('phone-verification');
        toast.success('Verification code sent to your phone!');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (authMethod === 'email') {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        await loginWithPhone(formData.phone);
        setOtpSent(true);
        setStep('phone-verification');
        toast.success('Verification code sent to your phone!');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please check your credentials.');
    }
    setLoading(false);
  };

  const handlePhoneVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await verifyPhone(verificationCode);
      toast.success('Phone verified successfully!');
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'Verification failed. Please try again.');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await resetPassword(formData.email);
      toast.success('Password reset email sent! Check your inbox.');
      setStep('login');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to send reset email. Please try again.');
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

  // Reset password step
  if (step === 'reset-password') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-gray-800">
            Reset Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                placeholder="Enter your email address"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Email'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => setStep('login')}
              className="text-gray-600 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Phone verification step
  if (step === 'phone-verification') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-gray-800">
            Verify Phone Number
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePhoneVerification} className="space-y-4">
            <div>
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => setStep('login')}
              className="text-gray-600 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
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
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            variant="outline"
            className="w-full mb-4 h-12 border-gray-300 hover:bg-gray-50"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or register with</span>
            </div>
          </div>

          <div className="flex space-x-2 mb-4">
            <Button
              type="button"
              variant={authMethod === 'email' ? 'default' : 'outline'}
              onClick={() => setAuthMethod('email')}
              className="flex-1"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button
              type="button"
              variant={authMethod === 'phone' ? 'default' : 'outline'}
              onClick={() => setAuthMethod('phone')}
              className="flex-1"
            >
              <Phone className="w-4 h-4 mr-2" />
              Phone
            </Button>
          </div>

          <form onSubmit={handleRegistration} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                placeholder="Enter your full name"
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
            
            {authMethod === 'email' ? (
              <>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    placeholder="Enter your email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      placeholder="Enter your password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                  placeholder="+1234567890"
                />
              </div>
            )}
            
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
        <Button
          onClick={handleGoogleLogin}
          disabled={loading}
          variant="outline"
          className="w-full mb-4 h-12 border-gray-300 hover:bg-gray-50"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </Button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or sign in with</span>
          </div>
        </div>

        <div className="flex space-x-2 mb-4">
          <Button
            type="button"
            variant={authMethod === 'email' ? 'default' : 'outline'}
            onClick={() => setAuthMethod('email')}
            className="flex-1"
          >
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button
            type="button"
            variant={authMethod === 'phone' ? 'default' : 'outline'}
            onClick={() => setAuthMethod('phone')}
            className="flex-1"
          >
            <Phone className="w-4 h-4 mr-2" />
            Phone
          </Button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {authMethod === 'email' ? (
            <>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    placeholder="Enter your password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                required
                placeholder="+1234567890"
              />
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
        
        <div className="mt-6 text-center space-y-2">
          {authMethod === 'email' && (
            <Button
              variant="link"
              onClick={() => setStep('reset-password')}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              Forgot password?
            </Button>
          )}
          <Button
            variant="link"
            onClick={() => setStep('role-selection')}
            className="text-purple-600 hover:text-purple-700"
          >
            Don't have an account? Sign up
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthFlow;
