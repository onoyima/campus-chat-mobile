
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type CallState = {
    status: 'idle' | 'incoming' | 'outgoing' | 'connected';
    caller: any | null; // Identity
    callType: 'voice' | 'video';
    roomId?: string; // For signal coordination
};

type WebSocketContextType = {
  isConnected: boolean;
  sendMessage: (type: string, payload: any) => void;
  socket: WebSocket | null;
  callState: CallState;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  initiateCall: (targetId: number, type: 'voice' | 'video') => void;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  // Call State
  const [callState, setCallState] = useState<CallState>({ status: 'idle', caller: null, callType: 'voice' });

  useEffect(() => {
    if (!isAuthenticated) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        setSocket(null);
      }
      return;
    }

    const connectWS = async () => {
        let wsUrl = '';
        if (API_BASE_URL) {
            wsUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws';
        } else {
            return;
        }

        console.log("Connecting to Mobile WS:", wsUrl);
        
        const sessionId = await AsyncStorage.getItem('session_id');
        const options = sessionId ? {
            headers: {
                'Cookie': `connect.sid=${encodeURIComponent(sessionId)}`
            }
        } : undefined;

        // @ts-ignore
        const ws = new WebSocket(wsUrl, undefined, options);
        wsRef.current = ws;
        setSocket(ws);

        ws.onopen = () => {
          console.log('Mobile WS Connected');
          setIsConnected(true);
        };

        ws.onclose = () => {
          console.log('Mobile WS Disconnected');
          setIsConnected(false);
          setSocket(null);
        };

        ws.onerror = (error) => {
          console.error('Mobile WS Error', error);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Mobile WS Message:', data.type);

            switch (data.type) {
              case 'new_message':
                queryClient.invalidateQueries({ queryKey: ['messages', data.message.conversationId] });
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
                break;
                
              case 'read_receipt':
                 queryClient.invalidateQueries({ queryKey: ['messages', data.conversationId] });
                break;

              case 'call_incoming':
                  setCallState({
                      status: 'incoming',
                      caller: { id: data.callerIdentityId, displayName: `User ${data.callerIdentityId}` }, // Fetch real profile if needed
                      callType: data.callType,
                      roomId: data.roomId
                  });
                  break;

              case 'call_ended':
                  setCallState({ status: 'idle', caller: null, callType: 'voice' });
                  break;

              case 'call_accepted':
                  setCallState(prev => ({ ...prev, status: 'connected' }));
                  break;
            }

          } catch (err) {
            console.error('Failed to parse Mobile WS message', err);
          }
        };
    };

    connectWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, queryClient]);

  const sendMessage = (type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...payload }));
    }
  };

  const initiateCall = (targetId: number, type: 'voice' | 'video') => {
      sendMessage('call_request', { targetIdentityId: targetId, callType: type });
      setCallState({
          status: 'outgoing',
          caller: { id: targetId }, // Target
          callType: type
      });
  };

  const acceptCall = () => {
      if (callState.caller) {
        sendMessage('call_accepted', { targetIdentityId: callState.caller.id });
        setCallState(prev => ({ ...prev, status: 'connected' }));
      }
  };

  const rejectCall = () => {
      if (callState.caller) {
        sendMessage('call_ended', { targetIdentityId: callState.caller.id });
        setCallState({ status: 'idle', caller: null, callType: 'voice' });
      }
  };

  const endCall = () => {
      if (callState.caller) {
          sendMessage('call_ended', { targetIdentityId: callState.caller.id });
      }
      setCallState({ status: 'idle', caller: null, callType: 'voice' });
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, sendMessage, socket, callState, acceptCall, rejectCall, endCall, initiateCall }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
