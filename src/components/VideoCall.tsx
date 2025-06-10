
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { X, Phone } from 'lucide-react';

interface VideoCallProps {
  roomId: string;
  participantName: string;
  onEndCall: () => void;
}

const VideoCall: React.FC<VideoCallProps> = ({ roomId, participantName, onEndCall }) => {
  const domain = 'meet.jit.si';
  const roomName = `SoulLink-${roomId}`;
  const iframeURL = `https://${domain}/${roomName}`;

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center space-x-2">
          <Phone className="w-5 h-5 text-green-600" />
          <span>Video Call with {participantName}</span>
        </CardTitle>
        <Button onClick={onEndCall} variant="destructive" size="sm">
          <X className="w-4 h-4 mr-1" />
          End Call
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <div className="w-full h-full rounded-lg overflow-hidden">
          <iframe
            src={iframeURL}
            allow="camera; microphone; fullscreen; display-capture"
            title="SoulLink Video Call"
            className="w-full h-full border-none"
            style={{ minHeight: '500px' }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoCall;
