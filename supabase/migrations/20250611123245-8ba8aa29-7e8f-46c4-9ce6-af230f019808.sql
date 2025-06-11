
-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  languages TEXT[] NOT NULL DEFAULT '{}',
  location TEXT,
  role TEXT CHECK (role IN ('seeker', 'helper')) NOT NULL,
  is_available BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chats table
CREATE TABLE public.chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participants UUID[] NOT NULL,
  participant_names TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message TEXT DEFAULT '',
  last_message_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create support requests table
CREATE TABLE public.support_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seeker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  helper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seeker_name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'completed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for chats
CREATE POLICY "Users can view their chats" ON public.chats FOR SELECT USING (auth.uid() = ANY(participants));
CREATE POLICY "Users can create chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = ANY(participants));
CREATE POLICY "Users can update their chats" ON public.chats FOR UPDATE USING (auth.uid() = ANY(participants));

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their chats" ON public.messages 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chats 
    WHERE chats.id = messages.chat_id 
    AND auth.uid() = ANY(chats.participants)
  )
);
CREATE POLICY "Users can insert messages in their chats" ON public.messages 
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.chats 
    WHERE chats.id = messages.chat_id 
    AND auth.uid() = ANY(chats.participants)
  )
);

-- Create RLS policies for support requests
CREATE POLICY "Users can view their support requests" ON public.support_requests 
FOR SELECT USING (auth.uid() = seeker_id OR auth.uid() = helper_id);
CREATE POLICY "Seekers can create support requests" ON public.support_requests 
FOR INSERT WITH CHECK (auth.uid() = seeker_id);
CREATE POLICY "Helpers can update support requests" ON public.support_requests 
FOR UPDATE USING (auth.uid() = helper_id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, gender, languages, location, role, is_available)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'gender', 'other'),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'languages')), 
      ARRAY['English']
    ),
    NEW.raw_user_meta_data->>'location',
    COALESCE(NEW.raw_user_meta_data->>'role', 'seeker'),
    COALESCE((NEW.raw_user_meta_data->>'isAvailable')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_requests;
