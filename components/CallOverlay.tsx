
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { useWebSocket } from '../hooks/useWebSocket';
import Ionicons from '@expo/vector-icons/Ionicons';

export function CallOverlay() {
  const { callState, acceptCall, rejectCall, endCall } = useWebSocket();

  if (callState.status === 'idle') return null;

  const isVideo = callState.callType === 'video';
  const name = callState.caller?.displayName || `User ${callState.caller?.id}`;

  return (
    <Modal visible={true} transparent={true} animationType="slide">
      <View style={styles.container}>
        <View style={styles.content}>
            <View style={styles.avatarContainer}>
                <Image 
                    source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${name}` }} 
                    style={styles.avatar} 
                />
            </View>
            
            <Text style={styles.name}>{name}</Text>
            
            <Text style={styles.status}>
                {callState.status === 'incoming' && `Incoming ${isVideo ? 'Video' : 'Voice'} Call...`}
                {callState.status === 'outgoing' && `Calling...`}
                {callState.status === 'connected' && `Connected (${isVideo ? 'Video' : 'Audio'})`}
            </Text>

            {/* Controls */}
            <View style={styles.controls}>
                {callState.status === 'incoming' ? (
                    <>
                        <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={rejectCall}>
                            <Ionicons name="close" size={32} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={acceptCall}>
                            <Ionicons name="call" size={32} color="#fff" />
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity style={[styles.btn, styles.endBtn]} onPress={endCall}>
                        <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                    </TouchableOpacity>
                )}
            </View>
            
            {callState.status === 'connected' && (
                <Text style={styles.note}>
                    {isVideo ? "Video stream placeholder" : "Voice call active"}
                </Text>
            )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', width: '100%' },
  avatarContainer: { marginBottom: 20, borderRadius: 60, padding: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  name: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  status: { fontSize: 18, color: '#ccc', marginBottom: 60 },
  controls: { flexDirection: 'row', gap: 40, alignItems: 'center' },
  btn: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  acceptBtn: { backgroundColor: '#25a25a' },
  declineBtn: { backgroundColor: '#ef4444' },
  endBtn: { backgroundColor: '#ef4444', width: 80, height: 80, borderRadius: 40 },
  note: { marginTop: 40, color: '#666' }
});
