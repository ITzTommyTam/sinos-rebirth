import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  PhoneCall,
  PhoneOff,
  Pin,
  PinOff,
  Radio,
  Send,
  Users,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { Problem } from '../types/academic';
import {
  generateMeetRoomCode,
  MeetChatSyncItem,
  MeetMeshSignal,
  MeetParticipantInfo,
  mergeRoomParticipants,
  parseMeetPeerPayload,
  selectSpotlightParticipant,
  serializeMeetPeerPayload,
} from '../utils/codeEngine';

interface WebRtcMeetViewProps {
  studentName: string;
  schoolName: string;
  className: string;
  firebaseUser: User | null;
  selectedProblem: Problem;
  currentEditorCode: string;
  onApplySharedCodeToEditor: (code: string) => void;
}

type MeetChatMessage = MeetChatSyncItem;

interface SignalEnvelope {
  type:
    | 'offer'
    | 'answer'
    | 'chat'
    | 'code'
    | 'hangup'
    | 'screen-status'
    | 'presence'
    | 'mesh-signal';
  roomId: string;
  senderId: string;
  senderName: string;
  targetPeerId?: string;
  sdp?: RTCSessionDescriptionInit;
  chat?: MeetChatMessage;
  sharedCode?: string;
  isMicOn?: boolean;
  isSharing?: boolean;
  screenFrame?: string;
  participants?: MeetParticipantInfo[];
  timestamp: number;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

function encodeSdpToken(desc: RTCSessionDescriptionInit): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(desc))));
  } catch {
    return '';
  }
}

function decodeSdpToken(token: string): RTCSessionDescriptionInit | null {
  try {
    const raw = decodeURIComponent(escape(atob(token.trim())));
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.type === 'offer' || parsed.type === 'answer') && parsed.sdp) {
      return parsed as RTCSessionDescriptionInit;
    }
    return null;
  } catch {
    return null;
  }
}

export const WebRtcMeetView: React.FC<WebRtcMeetViewProps> = ({
  studentName,
  selectedProblem,
  currentEditorCode,
  onApplySharedCodeToEditor,
}) => {
  const [roomId, setRoomId] = useState<string>('');
  const [role, setRole] = useState<'idle' | 'host' | 'guest'>('idle');
  const [connectionState, setConnectionState] = useState<string>('Chưa kết nối');
  const [statusBanner, setStatusBanner] = useState<string>(
    'Nhấn "Tạo Phòng Họp Mới" để hệ thống tự sinh mã phòng cho nhiều người cùng tham gia, hoặc nhập mã phòng rồi nhấn "Tham Gia".'
  );
  const [remotePeerName, setRemotePeerName] = useState<string>('Bạn học / Giáo viên');

  // Media controls (Mic & Screen Share only — no webcam)
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [localScreenFrame, setLocalScreenFrame] = useState<string>('');
  const [isPeerMicOn, setIsPeerMicOn] = useState<boolean>(true);
  const [isPeerScreenSharing, setIsPeerScreenSharing] = useState<boolean>(false);
  const [remoteScreenFrame, setRemoteScreenFrame] = useState<string>('');
  const [hasRemoteNativeVideo, setHasRemoteNativeVideo] = useState<boolean>(false);

  // Multi-participant state & Spotlight/Enlarged screen-share controls
  const [remotePeers, setRemotePeers] = useState<MeetParticipantInfo[]>([]);
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);
  const [dismissedSpotlightPeerId, setDismissedSpotlightPeerId] = useState<string | null>(null);

  // Collaborative Chat & Live Code Pad inside the Meet
  const [chatMessages, setChatMessages] = useState<MeetChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'Hệ Thống Meet',
      text: 'Chào mừng đến phòng họp nhóm đa người! Nhiều học sinh và giáo viên có thể cùng nhập Mã Phòng Họp để tham gia. Khi bất kỳ ai chia sẻ màn hình, màn hình đó sẽ tự động được phóng to lớn trên giao diện.',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [sharedCode, setSharedCode] = useState<string>(
    currentEditorCode ||
      `# Phòng họp nhóm: ${selectedProblem.codeNumber} - ${selectedProblem.title}\n# Cùng thảo luận thuật toán và viết code tại đây:\n`
  );

  // Manual SDP Token exchange fallback
  const [remoteSdpInput] = useState<string>('');
  const [, setLocalSdpToken] = useState<string>('');
  const [copiedRoom, setCopiedRoom] = useState<boolean>(false);

  // Refs for WebRTC & Media
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const spotlightLocalVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const spotlightRemoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteStageContainerRef = useRef<HTMLDivElement | null>(null);
  const spotlightStageContainerRef = useRef<HTMLDivElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const meshPeersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const meshChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const pendingMeshSignalsRef = useRef<MeetMeshSignal[]>([]);
  const processedMeshSignalsRef = useRef<Set<string>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteNativeStreamRef = useRef<MediaStream | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);
  const participantsUnsubRef = useRef<(() => void) | null>(null);
  const screenFrameTimerRef = useRef<number | null>(null);
  const peerIdRef = useRef<string>(`peer_${Math.random().toString(36).slice(2, 9)}`);

  // Refs for latest Firestore room document fields so updates always satisfy firestore.rules
  const roleRef = useRef<'idle' | 'host' | 'guest'>('idle');
  const connectedRoomRef = useRef<string>('');
  const isConnectingRef = useRef<boolean>(false);
  const latestHostNameRef = useRef<string>('');
  const latestOfferSdpStrRef = useRef<string>('');
  const latestAnswerSdpStrRef = useRef<string>('');
  const latestLocalSdpRef = useRef<RTCSessionDescriptionInit | null>(null);
  const appliedRemoteSdpRef = useRef<string>('');
  const isMicOnRef = useRef<boolean>(true);
  const isScreenSharingRef = useRef<boolean>(false);
  const localScreenFrameRef = useRef<string>('');
  const remotePeersRef = useRef<MeetParticipantInfo[]>([]);
  const chatMessagesRef = useRef<MeetChatMessage[]>(chatMessages);
  const sharedCodeRef = useRef<string>(sharedCode);

  const cleanRoomId = roomId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '-')
    .slice(0, 48);

  const effectiveName = studentName.trim() || 'Học Sinh THPT';
  const effectiveNameRef = useRef<string>(effectiveName);

  useEffect(() => {
    effectiveNameRef.current = effectiveName;
  }, [effectiveName]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    isMicOnRef.current = isMicOn;
  }, [isMicOn]);

  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  useEffect(() => {
    remotePeersRef.current = remotePeers;
  }, [remotePeers]);

  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  useEffect(() => {
    sharedCodeRef.current = sharedCode;
  }, [sharedCode]);

  // Keep local & remote video elements in sync when Spotlight Stage mounts/updates
  useEffect(() => {
    if (screenStreamRef.current) {
      if (localVideoRef.current && localVideoRef.current.srcObject !== screenStreamRef.current) {
        localVideoRef.current.srcObject = screenStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }
      if (
        spotlightLocalVideoRef.current &&
        spotlightLocalVideoRef.current.srcObject !== screenStreamRef.current
      ) {
        spotlightLocalVideoRef.current.srcObject = screenStreamRef.current;
        spotlightLocalVideoRef.current.play().catch(() => {});
      }
    }
    if (remoteNativeStreamRef.current) {
      if (
        remoteVideoRef.current &&
        remoteVideoRef.current.srcObject !== remoteNativeStreamRef.current
      ) {
        remoteVideoRef.current.srcObject = remoteNativeStreamRef.current;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (
        spotlightRemoteVideoRef.current &&
        spotlightRemoteVideoRef.current.srcObject !== remoteNativeStreamRef.current
      ) {
        spotlightRemoteVideoRef.current.srcObject = remoteNativeStreamRef.current;
        spotlightRemoteVideoRef.current.play().catch(() => {});
      }
    }
  });

  const upsertRemoteParticipants = (incomingList: MeetParticipantInfo[]) => {
    if (!Array.isArray(incomingList) || incomingList.length === 0) return;
    const filtered = incomingList.filter((p) => p && p.peerId && p.peerId !== peerIdRef.current);
    if (filtered.length === 0) return;

    setRemotePeers((prev) => {
      const merged = mergeRoomParticipants(prev, filtered);
      remotePeersRef.current = merged;

      if (merged.length > 0) {
        setConnectionState('Đã kết nối P2P (Trực tuyến)');
      }

      // Also sync primary remote peer state for 1-on-1 & legacy test selectors
      const activeSharer = merged.find((p) => p.isSharing) || merged[0];
      if (activeSharer) {
        setRemotePeerName(activeSharer.peerName || 'Bạn học / Giáo viên');
        setIsPeerScreenSharing(Boolean(activeSharer.isSharing));
        if (activeSharer.isSharing && activeSharer.screenFrame) {
          setRemoteScreenFrame(activeSharer.screenFrame);
        } else if (!merged.some((p) => p.isSharing)) {
          setRemoteScreenFrame('');
        }
      }
      return merged;
    });
  };

  const removeRemoteParticipant = (leavingPeerId: string) => {
    setRemotePeers((prev) => {
      const next = prev.filter((p) => p.peerId !== leavingPeerId);
      remotePeersRef.current = next;
      const activeSharer = next.find((p) => p.isSharing);
      setIsPeerScreenSharing(Boolean(activeSharer));
      setRemoteScreenFrame(activeSharer?.screenFrame || '');
      if (next.length > 0) {
        setRemotePeerName(next[0].peerName);
      }
      return next;
    });
    setPinnedPeerId((prev) => (prev === leavingPeerId ? null : prev));
  };

  const mergeIncomingChatList = (incomingList?: MeetChatMessage[]) => {
    if (!Array.isArray(incomingList) || incomingList.length === 0) return;
    setChatMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const additions = incomingList.filter((m) => m && m.id && !existingIds.has(m.id));
      if (additions.length === 0) return prev;
      return [...prev, ...additions];
    });
  };

  // Acquire microphone audio stream only (no webcam)
  const ensureLocalMediaStream = async (): Promise<MediaStream> => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        localStreamRef.current = audioOnly;
        setIsMicOn(true);
        return audioOnly;
      } catch {
        // Fallback to empty stream if microphone hardware is unavailable
      }
    }

    const emptyStream = new MediaStream();
    localStreamRef.current = emptyStream;
    return emptyStream;
  };

  // Broadcast signal across BroadcastChannel + localStorage for same-browser tabs
  const emitLocalSignal = (payload: SignalEnvelope) => {
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage(payload);
      }
      localStorage.setItem(
        `thpt_webrtc_signal_${payload.roomId}`,
        JSON.stringify(payload)
      );
    } catch {
      // ignore storage quota errors
    }
  };

  const getLocalParticipantInfo = (): MeetParticipantInfo => ({
    peerId: peerIdRef.current,
    peerName: effectiveNameRef.current,
    role: roleRef.current === 'host' ? 'host' : 'guest',
    isMicOn: isMicOnRef.current,
    isSharing: isScreenSharingRef.current,
    screenFrame: isScreenSharingRef.current ? localScreenFrameRef.current : undefined,
    isLocal: true,
    lastSeen: Date.now(),
  });

  // Sync this participant's individual document in /meet_rooms/{roomId}/participants/{peerId}
  const syncMyParticipantDocToFirestore = async (targetRoomId: string) => {
    if (!targetRoomId || roleRef.current === 'idle') return;
    try {
      const partRef = doc(db, 'meet_rooms', targetRoomId, 'participants', peerIdRef.current);
      const signalsStr = JSON.stringify(pendingMeshSignalsRef.current.slice(-8)).slice(0, 28000);
      const frameStr =
        isScreenSharingRef.current && localScreenFrameRef.current.length <= 28000
          ? localScreenFrameRef.current
          : '';
      await setDoc(partRef, {
        participantId: peerIdRef.current,
        roomId: targetRoomId,
        displayName: (effectiveNameRef.current || 'Học Sinh THPT').slice(0, 100),
        role: roleRef.current === 'host' ? 'host' : 'guest',
        isMicOn: Boolean(isMicOnRef.current),
        isSharing: Boolean(isScreenSharingRef.current),
        screenFrame: frameStr,
        signalsJson: signalsStr,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // ignore offline or transient errors
    }
  };

  // Push latest state of this peer + multi-participant roster to Firestore /meet_rooms/{roomId}
  const syncRoomToFirestore = async (targetRoomId: string) => {
    if (!targetRoomId || roleRef.current === 'idle' || !latestLocalSdpRef.current) {
      return;
    }
    try {
      const allParticipantsForSync: MeetParticipantInfo[] = [
        getLocalParticipantInfo(),
        ...remotePeersRef.current,
      ];

      const myPayloadStr = serializeMeetPeerPayload({
        type: roleRef.current === 'host' ? 'offer' : 'answer',
        sdp: latestLocalSdpRef.current.sdp || '',
        peerId: peerIdRef.current,
        peerName: effectiveNameRef.current,
        isMicOn: isMicOnRef.current,
        isSharing: isScreenSharingRef.current,
        screenFrame: isScreenSharingRef.current ? localScreenFrameRef.current : undefined,
        chatList: chatMessagesRef.current,
        participants: allParticipantsForSync,
        meshSignals: pendingMeshSignalsRef.current.slice(-6),
        ts: Date.now(),
      });

      if (roleRef.current === 'host') {
        latestOfferSdpStrRef.current = myPayloadStr;
        latestHostNameRef.current = effectiveNameRef.current;
      } else {
        latestAnswerSdpStrRef.current = myPayloadStr;
      }

      const roomRef = doc(db, 'meet_rooms', targetRoomId);
      await setDoc(roomRef, {
        roomId: targetRoomId,
        hostName: (latestHostNameRef.current || effectiveNameRef.current).slice(0, 100),
        offerSdp: latestOfferSdpStrRef.current.slice(0, 29500),
        answerSdp: latestAnswerSdpStrRef.current.slice(0, 29500),
        sharedCode: (sharedCodeRef.current || '').slice(0, 19000),
        updatedAt: serverTimestamp(),
      });

      await syncMyParticipantDocToFirestore(targetRoomId);
    } catch {
      // ignore offline or transient errors
    }
  };

  // Send JSON message to all open DataChannels (primary + mesh peers)
  const broadcastOverDataChannels = (msgObj: Record<string, unknown>) => {
    const raw = JSON.stringify(msgObj);
    const channels = new Set<RTCDataChannel>();
    if (dataChannelRef.current) {
      channels.add(dataChannelRef.current);
    }
    meshChannelsRef.current.forEach((ch) => channels.add(ch));
    channels.forEach((ch) => {
      if (ch.readyState === 'open') {
        try {
          ch.send(raw);
        } catch {
          // ignore
        }
      }
    });
  };

  // Setup DataChannel handlers for instant P2P chat, shared code, peer name, and live screen frames
  const bindDataChannel = (channel: RTCDataChannel, remotePeerIdHint?: string) => {
    dataChannelRef.current = channel;
    if (remotePeerIdHint) {
      meshChannelsRef.current.set(remotePeerIdHint, channel);
    }
    channel.onopen = () => {
      setConnectionState('Đã kết nối P2P (Trực tuyến)');
      try {
        channel.send(
          JSON.stringify({
            type: 'peer-info',
            senderId: peerIdRef.current,
            senderName: effectiveNameRef.current,
            role: roleRef.current === 'host' ? 'host' : 'guest',
            isMicOn: isMicOnRef.current,
            isSharing: isScreenSharingRef.current,
            screenFrame: isScreenSharingRef.current ? localScreenFrameRef.current : undefined,
          })
        );
      } catch {
        // ignore
      }
    };
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat' && data.chat) {
          setChatMessages((prev) =>
            prev.some((m) => m.id === data.chat.id) ? prev : [...prev, data.chat]
          );
        } else if (data.type === 'code' && typeof data.sharedCode === 'string') {
          setSharedCode(data.sharedCode);
        } else if (data.type === 'peer-info' || data.type === 'screen-status') {
          const senderId = data.senderId || remotePeerIdHint || 'remote_peer';
          const senderName = data.senderName || 'Bạn học / Giáo viên';
          upsertRemoteParticipants([
            {
              peerId: senderId,
              peerName: senderName,
              role: data.role === 'host' ? 'host' : 'guest',
              isMicOn: typeof data.isMicOn === 'boolean' ? data.isMicOn : true,
              isSharing: Boolean(data.isSharing),
              screenFrame:
                data.isSharing && typeof data.screenFrame === 'string'
                  ? data.screenFrame
                  : undefined,
              lastSeen: Date.now(),
            },
          ]);
          if (data.senderName) {
            setRemotePeerName(data.senderName);
          }
          if (typeof data.isSharing === 'boolean') {
            setIsPeerScreenSharing(data.isSharing);
            if (!data.isSharing) {
              setRemoteScreenFrame('');
              if (data.type === 'screen-status') {
                setHasRemoteNativeVideo(false);
              }
            } else if (typeof data.screenFrame === 'string' && data.screenFrame) {
              setRemoteScreenFrame(data.screenFrame);
            }
          }
        }
      } catch {
        // ignore malformed message
      }
    };
  };

  // Wait for ICE gathering to complete (or timeout after 900ms) so SDP contains all candidates
  const gatherCompleteSdp = (pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit | null> => {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve(pc.localDescription ? pc.localDescription.toJSON() : null);
        return;
      }
      const timeout = window.setTimeout(() => {
        resolve(pc.localDescription ? pc.localDescription.toJSON() : null);
      }, 900);

      const checkState = () => {
        if (pc.iceGatheringState === 'complete') {
          window.clearTimeout(timeout);
          pc.removeEventListener('icegatheringstatechange', checkState);
          resolve(pc.localDescription ? pc.localDescription.toJSON() : null);
        }
      };
      pc.addEventListener('icegatheringstatechange', checkState);
    });
  };

  const cleanupPeerConnection = () => {
    if (firestoreUnsubRef.current) {
      firestoreUnsubRef.current();
      firestoreUnsubRef.current = null;
    }
    if (participantsUnsubRef.current) {
      participantsUnsubRef.current();
      participantsUnsubRef.current = null;
    }
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch {
        // ignore
      }
      dataChannelRef.current = null;
    }
    meshChannelsRef.current.forEach((ch) => {
      try {
        ch.close();
      } catch {
        // ignore
      }
    });
    meshChannelsRef.current.clear();

    meshPeersRef.current.forEach((mpc) => {
      try {
        mpc.close();
      } catch {
        // ignore
      }
    });
    meshPeersRef.current.clear();
    pendingMeshSignalsRef.current = [];
    processedMeshSignalsRef.current.clear();

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        // ignore
      }
      pcRef.current = null;
    }
    remoteNativeStreamRef.current = null;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (spotlightRemoteVideoRef.current) {
      spotlightRemoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setHasRemoteNativeVideo(false);
    appliedRemoteSdpRef.current = '';
  };

  const bindPeerMediaEvents = (pc: RTCPeerConnection, remotePeerIdHint?: string) => {
    pc.ontrack = (event) => {
      if (event.track.kind === 'audio') {
        const audioStream = new MediaStream([event.track]);
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = audioStream;
          remoteAudioRef.current.play().catch(() => {});
        }
      } else if (event.track.kind === 'video') {
        const attachVideoTrack = () => {
          const videoStream = new MediaStream([event.track]);
          remoteNativeStreamRef.current = videoStream;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = videoStream;
            remoteVideoRef.current.play().catch(() => {});
          }
          if (spotlightRemoteVideoRef.current) {
            spotlightRemoteVideoRef.current.srcObject = videoStream;
            spotlightRemoteVideoRef.current.play().catch(() => {});
          }
        };
        attachVideoTrack();
        event.track.onunmute = () => {
          attachVideoTrack();
          setIsPeerScreenSharing(true);
          setHasRemoteNativeVideo(true);
          if (remotePeerIdHint) {
            setRemotePeers((prev) =>
              prev.map((p) => (p.peerId === remotePeerIdHint ? { ...p, isSharing: true } : p))
            );
          }
        };
        event.track.onmute = () => {
          setHasRemoteNativeVideo(false);
        };
        event.track.onended = () => {
          setHasRemoteNativeVideo(false);
          setIsPeerScreenSharing(false);
        };
      }
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') {
        setConnectionState('Đã kết nối P2P (Trực tuyến)');
      } else if (st === 'connecting') {
        setConnectionState('Đang thiết lập kết nối...');
      }
    };

    pc.ondatachannel = (event) => {
      bindDataChannel(event.channel, remotePeerIdHint);
    };
  };

  const attachLocalTracksToPc = async (pc: RTCPeerConnection) => {
    const localStream = await ensureLocalMediaStream();
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });
    const existingVideoTransceiver = pc
      .getTransceivers()
      .find((t) => t.receiver.track && t.receiver.track.kind === 'video');
    if (!existingVideoTransceiver) {
      pc.addTransceiver('video', { direction: 'sendrecv' });
    }
    if (screenStreamRef.current) {
      const screenTrack = screenStreamRef.current.getVideoTracks()[0];
      const videoTransceiver = pc
        .getTransceivers()
        .find((t) => t.receiver.track && t.receiver.track.kind === 'video');
      if (videoTransceiver && screenTrack) {
        await videoTransceiver.sender.replaceTrack(screenTrack);
      }
    }
  };

  const createConfiguredPeerConnection = async (): Promise<RTCPeerConnection> => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        // ignore
      }
      pcRef.current = null;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;
    bindPeerMediaEvents(pc);
    await attachLocalTracksToPc(pc);
    return pc;
  };

  // Multi-peer Mesh connection helper for 3+ participants in the same room
  const ensureMeshConnectionWithPeer = async (
    targetRoomId: string,
    remotePeer: MeetParticipantInfo
  ) => {
    if (
      !remotePeer.peerId ||
      remotePeer.peerId === peerIdRef.current ||
      meshPeersRef.current.has(remotePeer.peerId)
    ) {
      return;
    }
    // Deterministic initiator: lexicographically smaller peerId initiates mesh offer
    if (peerIdRef.current > remotePeer.peerId) {
      return;
    }
    try {
      const mpc = new RTCPeerConnection(RTC_CONFIG);
      meshPeersRef.current.set(remotePeer.peerId, mpc);
      bindPeerMediaEvents(mpc, remotePeer.peerId);
      await attachLocalTracksToPc(mpc);
      const dc = mpc.createDataChannel(`mesh-${remotePeer.peerId}`);
      bindDataChannel(dc, remotePeer.peerId);

      const offer = await mpc.createOffer();
      await mpc.setLocalDescription(offer);
      const completeOffer = (await gatherCompleteSdp(mpc)) || offer;
      if (completeOffer.sdp) {
        const sig: MeetMeshSignal = {
          fromPeerId: peerIdRef.current,
          fromPeerName: effectiveNameRef.current,
          toPeerId: remotePeer.peerId,
          type: 'offer',
          sdp: completeOffer.sdp,
          ts: Date.now(),
        };
        pendingMeshSignalsRef.current = [...pendingMeshSignalsRef.current.slice(-7), sig];
        emitLocalSignal({
          type: 'mesh-signal',
          roomId: targetRoomId,
          senderId: peerIdRef.current,
          senderName: effectiveNameRef.current,
          targetPeerId: remotePeer.peerId,
          sdp: completeOffer,
          timestamp: Date.now(),
        });
        await syncMyParticipantDocToFirestore(targetRoomId);
      }
    } catch {
      // ignore mesh setup error
    }
  };

  const handleIncomingMeshSignal = async (targetRoomId: string, sig: MeetMeshSignal) => {
    if (!sig || sig.toPeerId !== peerIdRef.current || sig.fromPeerId === peerIdRef.current) {
      return;
    }
    const sigKey = `${sig.fromPeerId}_${sig.type}_${sig.sdp.slice(0, 64)}`;
    if (processedMeshSignalsRef.current.has(sigKey)) {
      return;
    }
    processedMeshSignalsRef.current.add(sigKey);

    try {
      if (sig.type === 'offer') {
        let mpc = meshPeersRef.current.get(sig.fromPeerId);
        if (!mpc) {
          mpc = new RTCPeerConnection(RTC_CONFIG);
          meshPeersRef.current.set(sig.fromPeerId, mpc);
          bindPeerMediaEvents(mpc, sig.fromPeerId);
          await attachLocalTracksToPc(mpc);
        }
        await mpc.setRemoteDescription(
          new RTCSessionDescription({ type: 'offer', sdp: sig.sdp })
        );
        const answer = await mpc.createAnswer();
        await mpc.setLocalDescription(answer);
        const completeAnswer = (await gatherCompleteSdp(mpc)) || answer;
        if (completeAnswer.sdp) {
          const answerSig: MeetMeshSignal = {
            fromPeerId: peerIdRef.current,
            fromPeerName: effectiveNameRef.current,
            toPeerId: sig.fromPeerId,
            type: 'answer',
            sdp: completeAnswer.sdp,
            ts: Date.now(),
          };
          pendingMeshSignalsRef.current = [
            ...pendingMeshSignalsRef.current.slice(-7),
            answerSig,
          ];
          emitLocalSignal({
            type: 'mesh-signal',
            roomId: targetRoomId,
            senderId: peerIdRef.current,
            senderName: effectiveNameRef.current,
            targetPeerId: sig.fromPeerId,
            sdp: completeAnswer,
            timestamp: Date.now(),
          });
          await syncMyParticipantDocToFirestore(targetRoomId);
        }
      } else if (sig.type === 'answer') {
        const mpc = meshPeersRef.current.get(sig.fromPeerId);
        if (mpc && mpc.signalingState === 'have-local-offer') {
          await mpc.setRemoteDescription(
            new RTCSessionDescription({ type: 'answer', sdp: sig.sdp })
          );
          setConnectionState('Đã kết nối P2P (Trực tuyến)');
        }
      }
    } catch {
      // ignore duplicate or stale mesh signal
    }
  };

  // Attach real-time Firestore listeners to /meet_rooms/{targetRoomId} AND /meet_rooms/{targetRoomId}/participants
  const attachRoomSnapshotListener = (targetRoomId: string) => {
    if (firestoreUnsubRef.current) {
      firestoreUnsubRef.current();
      firestoreUnsubRef.current = null;
    }
    if (participantsUnsubRef.current) {
      participantsUnsubRef.current();
      participantsUnsubRef.current = null;
    }

    // 1. Subcollection listener: /meet_rooms/{targetRoomId}/participants (scales to N participants!)
    const partsColRef = collection(db, 'meet_rooms', targetRoomId, 'participants');
    participantsUnsubRef.current = onSnapshot(
      partsColRef,
      (querySnap) => {
        const discovered: MeetParticipantInfo[] = [];
        querySnap.forEach((docSnap) => {
          const d = docSnap.data();
          if (!d || !d.participantId || d.participantId === peerIdRef.current) return;
          discovered.push({
            peerId: d.participantId,
            peerName: d.displayName || 'Thành viên',
            role: d.role === 'host' ? 'host' : 'guest',
            isMicOn: typeof d.isMicOn === 'boolean' ? d.isMicOn : true,
            isSharing: Boolean(d.isSharing),
            screenFrame:
              d.isSharing && typeof d.screenFrame === 'string' && d.screenFrame
                ? d.screenFrame
                : undefined,
            lastSeen: Date.now(),
          });

          if (typeof d.signalsJson === 'string' && d.signalsJson.trim()) {
            try {
              const sigs = JSON.parse(d.signalsJson) as MeetMeshSignal[];
              if (Array.isArray(sigs)) {
                sigs.forEach((s) => {
                  handleIncomingMeshSignal(targetRoomId, s).catch(() => {});
                });
              }
            } catch {
              // ignore
            }
          }
        });

        if (discovered.length > 0) {
          upsertRemoteParticipants(discovered);
          setConnectionState('Đã kết nối P2P (Trực tuyến)');
          discovered.forEach((rp) => {
            ensureMeshConnectionWithPeer(targetRoomId, rp).catch(() => {});
          });
        }
      },
      () => {
        // ignore subcollection errors
      }
    );

    // 2. Root room document listener: /meet_rooms/{targetRoomId}
    const roomRef = doc(db, 'meet_rooms', targetRoomId);
    firestoreUnsubRef.current = onSnapshot(
      roomRef,
      async (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        if (
          typeof data.sharedCode === 'string' &&
          data.sharedCode &&
          data.sharedCode !== sharedCodeRef.current
        ) {
          setSharedCode(data.sharedCode);
        }

        const offerPayload = parseMeetPeerPayload(data.offerSdp, data.hostName || 'Chủ phòng');
        const answerPayload = parseMeetPeerPayload(data.answerSdp, 'Thành viên');

        if (offerPayload) {
          latestOfferSdpStrRef.current = data.offerSdp;
          latestHostNameRef.current = offerPayload.peerName || data.hostName || 'Chủ phòng';
          if (offerPayload.participants) {
            upsertRemoteParticipants(offerPayload.participants);
          }
          if (offerPayload.peerId && offerPayload.peerId !== peerIdRef.current) {
            upsertRemoteParticipants([
              {
                peerId: offerPayload.peerId,
                peerName: offerPayload.peerName || data.hostName || 'Chủ phòng',
                role: 'host',
                isMicOn: offerPayload.isMicOn ?? true,
                isSharing: Boolean(offerPayload.isSharing),
                screenFrame: offerPayload.screenFrame,
                lastSeen: offerPayload.ts || Date.now(),
              },
            ]);
          }
          if (offerPayload.meshSignals) {
            offerPayload.meshSignals.forEach((s) => {
              handleIncomingMeshSignal(targetRoomId, s).catch(() => {});
            });
          }
        }
        if (answerPayload) {
          latestAnswerSdpStrRef.current = data.answerSdp;
          if (answerPayload.participants) {
            upsertRemoteParticipants(answerPayload.participants);
          }
          if (answerPayload.peerId && answerPayload.peerId !== peerIdRef.current) {
            upsertRemoteParticipants([
              {
                peerId: answerPayload.peerId,
                peerName: answerPayload.peerName || 'Thành viên',
                role: 'guest',
                isMicOn: answerPayload.isMicOn ?? true,
                isSharing: Boolean(answerPayload.isSharing),
                screenFrame: answerPayload.screenFrame,
                lastSeen: answerPayload.ts || Date.now(),
              },
            ]);
          }
          if (answerPayload.meshSignals) {
            answerPayload.meshSignals.forEach((s) => {
              handleIncomingMeshSignal(targetRoomId, s).catch(() => {});
            });
          }
        }

        // Case A: We are Host and a Guest wrote answerSdp (or updated their screen share / chat)
        if (
          roleRef.current === 'host' &&
          answerPayload &&
          answerPayload.peerId !== peerIdRef.current
        ) {
          setRemotePeerName(answerPayload.peerName || 'Bạn học / Giáo viên');
          setIsPeerScreenSharing(Boolean(answerPayload.isSharing));
          if (answerPayload.isSharing && answerPayload.screenFrame) {
            setRemoteScreenFrame(answerPayload.screenFrame);
          } else if (!answerPayload.isSharing && !remotePeersRef.current.some((p) => p.isSharing)) {
            setRemoteScreenFrame('');
          }
          mergeIncomingChatList(answerPayload.chatList);

          if (
            pcRef.current &&
            answerPayload.sdp &&
            appliedRemoteSdpRef.current !== answerPayload.sdp &&
            pcRef.current.signalingState === 'have-local-offer'
          ) {
            appliedRemoteSdpRef.current = answerPayload.sdp;
            try {
              await pcRef.current.setRemoteDescription(
                new RTCSessionDescription({ type: 'answer', sdp: answerPayload.sdp })
              );
            } catch {
              // ignore duplicate setRemoteDescription
            }
          }
          setConnectionState('Đã kết nối P2P (Trực tuyến)');
          setStatusBanner(
            `Đã kết nối phòng họp đa người ${targetRoomId} (${remotePeersRef.current.length + 1} thành viên)! Khi bất kỳ ai chia sẻ màn hình, màn hình đó sẽ tự động phóng to.`
          );
        }

        // Case B: Collision recovery — two machines both initialized as Host in the same room
        if (
          roleRef.current === 'host' &&
          offerPayload &&
          offerPayload.peerId &&
          offerPayload.peerId !== peerIdRef.current &&
          !answerPayload
        ) {
          await joinExistingOfferAsGuest(targetRoomId, offerPayload, data.sharedCode);
          return;
        }

        // Case C: We are Guest and Host updated their offer / screen share / chat
        if (
          roleRef.current === 'guest' &&
          offerPayload &&
          offerPayload.peerId !== peerIdRef.current
        ) {
          setRemotePeerName(offerPayload.peerName || data.hostName || 'Chủ phòng');
          if (offerPayload.isSharing) {
            setIsPeerScreenSharing(true);
            if (offerPayload.screenFrame) {
              setRemoteScreenFrame(offerPayload.screenFrame);
            }
          } else if (!remotePeersRef.current.some((p) => p.isSharing)) {
            setIsPeerScreenSharing(false);
            setRemoteScreenFrame('');
          }
          mergeIncomingChatList(offerPayload.chatList);
          setConnectionState('Đã kết nối P2P (Trực tuyến)');
        }
      },
      () => {
        // Ignore snapshot permission/network errors when offline
      }
    );
  };

  // Helper: Join an existing Host's offer as Guest (and register in multi-participant roster)
  const joinExistingOfferAsGuest = async (
    targetRoomId: string,
    offerPayload: NonNullable<ReturnType<typeof parseMeetPeerPayload>>,
    roomSharedCode?: string
  ) => {
    setRole('guest');
    roleRef.current = 'guest';
    connectedRoomRef.current = targetRoomId;

    const hostDisplay = offerPayload.peerName || 'Chủ phòng';
    latestHostNameRef.current = hostDisplay;
    setRemotePeerName(hostDisplay);
    setIsPeerScreenSharing(Boolean(offerPayload.isSharing));
    if (offerPayload.isSharing && offerPayload.screenFrame) {
      setRemoteScreenFrame(offerPayload.screenFrame);
    } else {
      setRemoteScreenFrame('');
    }
    if (roomSharedCode) {
      setSharedCode(roomSharedCode);
    }
    mergeIncomingChatList(offerPayload.chatList);

    const initialPeers: MeetParticipantInfo[] = [
      ...(offerPayload.participants || []),
      {
        peerId: offerPayload.peerId || 'host_peer',
        peerName: hostDisplay,
        role: 'host',
        isMicOn: offerPayload.isMicOn ?? true,
        isSharing: Boolean(offerPayload.isSharing),
        screenFrame: offerPayload.screenFrame,
        lastSeen: Date.now(),
      },
    ];
    upsertRemoteParticipants(initialPeers);

    const pc = await createConfiguredPeerConnection();
    const offerDesc: RTCSessionDescriptionInit = {
      type: 'offer',
      sdp: offerPayload.sdp,
    };
    appliedRemoteSdpRef.current = offerPayload.sdp;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDesc));
    pc.getTransceivers().forEach((t) => {
      try {
        t.direction = 'sendrecv';
      } catch {
        // ignore
      }
    });

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    const completeAnswer = (await gatherCompleteSdp(pc)) || answer;
    latestLocalSdpRef.current = completeAnswer;

    const answerToken = encodeSdpToken(completeAnswer);
    setLocalSdpToken(answerToken);

    emitLocalSignal({
      type: 'answer',
      roomId: targetRoomId,
      senderId: peerIdRef.current,
      senderName: effectiveNameRef.current,
      sdp: completeAnswer,
      isMicOn: isMicOnRef.current,
      isSharing: isScreenSharingRef.current,
      screenFrame: isScreenSharingRef.current ? localScreenFrameRef.current : undefined,
      participants: [getLocalParticipantInfo(), ...remotePeersRef.current],
      timestamp: Date.now(),
    });

    latestOfferSdpStrRef.current = serializeMeetPeerPayload(offerPayload);
    await syncRoomToFirestore(targetRoomId);
    attachRoomSnapshotListener(targetRoomId);

    setConnectionState('Đã kết nối P2P (Trực tuyến)');
    setStatusBanner(
      `Đã tham gia phòng "${targetRoomId}" cùng ${hostDisplay} (${remotePeersRef.current.length + 1} người trong phòng)! Người chia sẻ màn hình sẽ được phóng to tự động.`
    );
  };

  // Helper: Initialize room as Host and publish Offer to local storage + Firestore
  const startRoomAsHostInternal = async (targetRoomId: string) => {
    setRole('host');
    roleRef.current = 'host';
    connectedRoomRef.current = targetRoomId;

    const pc = await createConfiguredPeerConnection();
    const dc = pc.createDataChannel('thpt-study-meet');
    bindDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const completeOffer = (await gatherCompleteSdp(pc)) || offer;
    latestLocalSdpRef.current = completeOffer;

    const token = encodeSdpToken(completeOffer);
    setLocalSdpToken(token);

    latestHostNameRef.current = effectiveNameRef.current;
    latestAnswerSdpStrRef.current = '';

    emitLocalSignal({
      type: 'offer',
      roomId: targetRoomId,
      senderId: peerIdRef.current,
      senderName: effectiveNameRef.current,
      sdp: completeOffer,
      sharedCode: sharedCodeRef.current,
      isMicOn: isMicOnRef.current,
      isSharing: isScreenSharingRef.current,
      screenFrame: isScreenSharingRef.current ? localScreenFrameRef.current : undefined,
      participants: [getLocalParticipantInfo(), ...remotePeersRef.current],
      timestamp: Date.now(),
    });

    await syncRoomToFirestore(targetRoomId);
    attachRoomSnapshotListener(targetRoomId);

    setConnectionState('Đang chờ người tham gia...');
    setStatusBanner(
      `Đã tạo phòng "${targetRoomId}"! Nhiều bạn học / giáo viên trên các máy khác có thể cùng nhập mã "${targetRoomId}" để tham gia nhóm.`
    );
  };

  // Smart Connect: Checks if an active Host is already in the room (via localStorage or Firestore).
  const connectToRoomSmart = async (
    targetRoomId: string,
    preferredMode: 'auto' | 'host' | 'guest' = 'auto'
  ) => {
    if (!targetRoomId) {
      setStatusBanner('[!] Vui lòng nhập Mã Phòng Họp trước khi kết nối!');
      return;
    }
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    try {
      setConnectionState('Đang tìm thành viên cùng phòng...');
      setStatusBanner(`Đang kiểm tra và đồng bộ phòng họp đa người ${targetRoomId}...`);

      let foundOfferPayload: ReturnType<typeof parseMeetPeerPayload> = null;
      let foundSharedCode: string | undefined;

      // 1. Check same-browser localStorage signal first
      const cachedRaw = localStorage.getItem(`thpt_webrtc_signal_${targetRoomId}`);
      if (cachedRaw) {
        try {
          const parsed = JSON.parse(cachedRaw) as SignalEnvelope;
          const isRecent = Date.now() - (parsed.timestamp || 0) < 600_000;
          if (
            parsed.type === 'offer' &&
            parsed.sdp &&
            parsed.senderId !== peerIdRef.current &&
            isRecent
          ) {
            foundOfferPayload = {
              type: 'offer',
              sdp: parsed.sdp.sdp || '',
              peerId: parsed.senderId,
              peerName: parsed.senderName || 'Chủ phòng',
              isMicOn: parsed.isMicOn ?? true,
              isSharing: Boolean(parsed.isSharing),
              screenFrame: parsed.screenFrame,
              participants: parsed.participants,
              ts: parsed.timestamp,
            };
            foundSharedCode = parsed.sharedCode;
          }
        } catch {
          // ignore
        }
      }

      // 2. Always check Firestore /meet_rooms/{targetRoomId}
      if (!foundOfferPayload) {
        try {
          const roomRef = doc(db, 'meet_rooms', targetRoomId);
          const snap = await getDoc(roomRef);
          if (snap.exists()) {
            const data = snap.data();
            const parsedOffer = parseMeetPeerPayload(
              data.offerSdp,
              data.hostName || 'Chủ phòng'
            );
            const isRecent =
              !parsedOffer?.ts || Date.now() - parsedOffer.ts < 900_000;
            if (
              parsedOffer &&
              parsedOffer.peerId !== peerIdRef.current &&
              isRecent
            ) {
              foundOfferPayload = parsedOffer;
              foundSharedCode = data.sharedCode;
            }
          }
        } catch {
          // ignore offline
        }
      }

      // 3. Check manual pasted SDP token if provided
      if (!foundOfferPayload && remoteSdpInput.trim()) {
        const manualSdp = decodeSdpToken(remoteSdpInput);
        if (manualSdp && manualSdp.type === 'offer' && manualSdp.sdp) {
          foundOfferPayload = {
            type: 'offer',
            sdp: manualSdp.sdp,
            peerId: 'manual_peer',
            peerName: 'Đối tác P2P',
            isSharing: false,
            ts: Date.now(),
          };
        }
      }

      if (foundOfferPayload && preferredMode !== 'host') {
        await joinExistingOfferAsGuest(targetRoomId, foundOfferPayload, foundSharedCode);
        return;
      }

      if (
        foundOfferPayload &&
        preferredMode === 'host' &&
        Date.now() - (foundOfferPayload.ts || 0) < 180_000
      ) {
        await joinExistingOfferAsGuest(targetRoomId, foundOfferPayload, foundSharedCode);
        return;
      }

      await startRoomAsHostInternal(targetRoomId);
    } catch (err) {
      setStatusBanner(
        `Lỗi kết nối phòng họp: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      isConnectingRef.current = false;
    }
  };

  // Auto-discover and connect as soon as the user types a Room Code (>= 2 chars)
  useEffect(() => {
    if (!cleanRoomId || cleanRoomId.length < 2) {
      return;
    }
    if (connectedRoomRef.current === cleanRoomId && roleRef.current !== 'idle') {
      return;
    }
    const timer = window.setTimeout(() => {
      connectToRoomSmart(cleanRoomId, 'auto');
    }, 450);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanRoomId]);

  const handleCreateRoomAsHost = async () => {
    const autoRoomCode = generateMeetRoomCode();
    connectedRoomRef.current = autoRoomCode;
    roleRef.current = 'host';
    setRemotePeers([]);
    remotePeersRef.current = [];
    setPinnedPeerId(null);
    setDismissedSpotlightPeerId(null);
    setRoomId(autoRoomCode);
    await startRoomAsHostInternal(autoRoomCode);
  };

  const handleJoinRoomAsGuest = async () => {
    await connectToRoomSmart(cleanRoomId, 'guest');
  };

  // Listen to BroadcastChannel & storage events for instant multi-tab / same-browser signaling
  useEffect(() => {
    const handleSignal = async (msg: SignalEnvelope) => {
      if (!msg || msg.roomId !== cleanRoomId || msg.senderId === peerIdRef.current) {
        return;
      }

      if (msg.senderName) {
        setRemotePeerName(msg.senderName);
      }

      if (msg.type !== 'hangup') {
        upsertRemoteParticipants([
          ...(msg.participants || []),
          {
            peerId: msg.senderId,
            peerName: msg.senderName || 'Bạn học',
            role: msg.type === 'offer' ? 'host' : 'guest',
            isMicOn: typeof msg.isMicOn === 'boolean' ? msg.isMicOn : true,
            isSharing: Boolean(msg.isSharing),
            screenFrame: msg.isSharing ? msg.screenFrame : undefined,
            lastSeen: msg.timestamp || Date.now(),
          },
        ]);
      }

      if (
        msg.type === 'offer' &&
        msg.sdp &&
        (roleRef.current === 'idle' ||
          (roleRef.current === 'host' &&
            pcRef.current &&
            pcRef.current.signalingState === 'have-local-offer'))
      ) {
        await joinExistingOfferAsGuest(
          cleanRoomId,
          {
            type: 'offer',
            sdp: msg.sdp.sdp || '',
            peerId: msg.senderId,
            peerName: msg.senderName || 'Bạn học',
            isMicOn: msg.isMicOn ?? true,
            isSharing: Boolean(msg.isSharing),
            screenFrame: msg.screenFrame,
            participants: msg.participants,
            ts: msg.timestamp,
          },
          msg.sharedCode
        );
      } else if (
        msg.type === 'answer' &&
        msg.sdp &&
        pcRef.current &&
        pcRef.current.signalingState === 'have-local-offer'
      ) {
        try {
          setRemotePeerName(msg.senderName || 'Bạn học');
          if (typeof msg.isSharing === 'boolean') {
            setIsPeerScreenSharing(msg.isSharing);
          }
          if (msg.screenFrame) {
            setRemoteScreenFrame(msg.screenFrame);
          }
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          setConnectionState('Đã kết nối P2P (Trực tuyến)');
          setStatusBanner(
            `${msg.senderName || 'Bạn học'} đã kết nối vào phòng ${cleanRoomId} (${remotePeersRef.current.length + 1} thành viên)!`
          );
        } catch {
          // ignore
        }
      } else if (msg.type === 'mesh-signal' && msg.sdp && msg.targetPeerId === peerIdRef.current) {
        await handleIncomingMeshSignal(cleanRoomId, {
          fromPeerId: msg.senderId,
          fromPeerName: msg.senderName,
          toPeerId: msg.targetPeerId,
          type: msg.sdp.type === 'answer' ? 'answer' : 'offer',
          sdp: msg.sdp.sdp || '',
          ts: msg.timestamp,
        });
      } else if (msg.type === 'chat' && msg.chat) {
        setChatMessages((prev) =>
          prev.some((m) => m.id === msg.chat!.id) ? prev : [...prev, msg.chat!]
        );
      } else if (msg.type === 'code' && typeof msg.sharedCode === 'string') {
        setSharedCode(msg.sharedCode);
      } else if (msg.type === 'screen-status' && typeof msg.isSharing === 'boolean') {
        setIsPeerScreenSharing(msg.isSharing);
        if (!msg.isSharing) {
          setRemoteScreenFrame('');
          setHasRemoteNativeVideo(false);
          setDismissedSpotlightPeerId((prev) => (prev === msg.senderId ? null : prev));
        } else if (msg.screenFrame) {
          setRemoteScreenFrame(msg.screenFrame);
        }
      } else if (msg.type === 'hangup') {
        removeRemoteParticipant(msg.senderId);
        if (remotePeersRef.current.length === 0) {
          setConnectionState('Người kia đã rời phòng');
          setIsPeerScreenSharing(false);
          setRemoteScreenFrame('');
          setHasRemoteNativeVideo(false);
        }
        setStatusBanner(`${msg.senderName} đã rời khỏi phòng họp.`);
      }
    };

    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('thpt_webrtc_meet_channel');
      broadcastChannelRef.current = bc;
      bc.onmessage = (ev) => handleSignal(ev.data as SignalEnvelope);
    }

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === `thpt_webrtc_signal_${cleanRoomId}` && ev.newValue) {
        try {
          const parsed = JSON.parse(ev.newValue) as SignalEnvelope;
          handleSignal(parsed);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanRoomId]);

  // Initialize local audio stream on mount and clean up on unmount
  useEffect(() => {
    ensureLocalMediaStream().catch(() => {});
    return () => {
      if (screenFrameTimerRef.current) {
        window.clearInterval(screenFrameTimerRef.current);
      }
      cleanupPeerConnection();
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleMic = () => {
    const nextMic = !isMicOn;
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = nextMic;
      });
    }
    isMicOnRef.current = nextMic;
    setIsMicOn(nextMic);
    broadcastOverDataChannels({
      type: 'peer-info',
      senderId: peerIdRef.current,
      senderName: effectiveNameRef.current,
      role: roleRef.current === 'host' ? 'host' : 'guest',
      isMicOn: nextMic,
      isSharing: isScreenSharingRef.current,
      screenFrame: isScreenSharingRef.current ? localScreenFrameRef.current : undefined,
    });
    if (cleanRoomId) {
      syncRoomToFirestore(cleanRoomId).catch(() => {});
    }
  };

  const handleTogglePeerMic = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isPeerMicOn;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = true;
    }
    setIsPeerMicOn((prev) => !prev);
  };

  // Capture a compact JPEG frame from the local shared screen and broadcast it to all participants
  const captureAndBroadcastScreenFrame = () => {
    const videoEl = spotlightLocalVideoRef.current || localVideoRef.current;
    let frameDataUrl = '';
    if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          frameDataUrl = canvas.toDataURL('image/jpeg', 0.42);
        }
      } catch {
        // ignore canvas taint errors
      }
    }
    if (frameDataUrl) {
      localScreenFrameRef.current = frameDataUrl;
      setLocalScreenFrame(frameDataUrl);
    }
    notifyPeerScreenStatus(true, localScreenFrameRef.current);
  };

  const notifyPeerScreenStatus = (isSharing: boolean, screenFrame?: string) => {
    broadcastOverDataChannels({
      type: 'screen-status',
      senderId: peerIdRef.current,
      senderName: effectiveNameRef.current,
      role: roleRef.current === 'host' ? 'host' : 'guest',
      isMicOn: isMicOnRef.current,
      isSharing,
      screenFrame: isSharing ? screenFrame : undefined,
    });
    if (cleanRoomId) {
      emitLocalSignal({
        type: 'screen-status',
        roomId: cleanRoomId,
        senderId: peerIdRef.current,
        senderName: effectiveNameRef.current,
        isMicOn: isMicOnRef.current,
        isSharing,
        screenFrame: isSharing ? screenFrame : undefined,
        participants: [getLocalParticipantInfo(), ...remotePeersRef.current],
        timestamp: Date.now(),
      });
      syncRoomToFirestore(cleanRoomId).catch(() => {});
    }
  };

  const attachTrackToAllPeerConnections = async (
    screenTrack: MediaStreamTrack | null,
    stream?: MediaStream
  ) => {
    const allPcs: RTCPeerConnection[] = [];
    if (pcRef.current) allPcs.push(pcRef.current);
    meshPeersRef.current.forEach((mpc) => allPcs.push(mpc));

    for (const pc of allPcs) {
      try {
        const videoTransceiver = pc
          .getTransceivers()
          .find((t) => t.receiver.track && t.receiver.track.kind === 'video');
        if (videoTransceiver) {
          videoTransceiver.direction = 'sendrecv';
          await videoTransceiver.sender.replaceTrack(screenTrack);
          continue;
        }
        const sender = pc
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack);
        } else if (screenTrack && stream) {
          pc.addTrack(screenTrack, stream);
        }
      } catch {
        // ignore closed pc
      }
    }
  };

  const stopLocalScreenShareCleanup = () => {
    if (screenFrameTimerRef.current) {
      window.clearInterval(screenFrameTimerRef.current);
      screenFrameTimerRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    localScreenFrameRef.current = '';
    setLocalScreenFrame('');
    isScreenSharingRef.current = false;
    setIsScreenSharing(false);
    setDismissedSpotlightPeerId((prev) => (prev === peerIdRef.current ? null : prev));
    setPinnedPeerId((prev) => (prev === peerIdRef.current ? null : prev));
    attachTrackToAllPeerConnections(null).catch(() => {});
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (spotlightLocalVideoRef.current) {
      spotlightLocalVideoRef.current.srcObject = null;
    }
    notifyPeerScreenStatus(false);
  };

  const handleToggleScreenShare = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setStatusBanner(
        'Trình duyệt hiện tại không hỗ trợ API chia sẻ màn hình (getDisplayMedia).'
      );
      return;
    }

    if (isScreenSharing) {
      stopLocalScreenShareCleanup();
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      screenStreamRef.current = displayStream;
      const screenTrack = displayStream.getVideoTracks()[0];
      if (screenTrack) {
        await attachTrackToAllPeerConnections(screenTrack, displayStream);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream;
        localVideoRef.current.play().catch(() => {});
      }
      if (spotlightLocalVideoRef.current) {
        spotlightLocalVideoRef.current.srcObject = displayStream;
        spotlightLocalVideoRef.current.play().catch(() => {});
      }
      isScreenSharingRef.current = true;
      setIsScreenSharing(true);
      setDismissedSpotlightPeerId(null);
      notifyPeerScreenStatus(true);

      window.setTimeout(() => captureAndBroadcastScreenFrame(), 300);
      if (screenFrameTimerRef.current) {
        window.clearInterval(screenFrameTimerRef.current);
      }
      screenFrameTimerRef.current = window.setInterval(() => {
        if (isScreenSharingRef.current) {
          captureAndBroadcastScreenFrame();
        }
      }, 1000);

      if (screenTrack) {
        screenTrack.onended = () => {
          stopLocalScreenShareCleanup();
        };
      }
    } catch {
      setStatusBanner('Đã hủy thao tác chia sẻ màn hình.');
    }
  };

  const handleFullscreenRemoteStage = () => {
    const targetEl = spotlightStageContainerRef.current || remoteStageContainerRef.current;
    if (targetEl && targetEl.requestFullscreen) {
      targetEl.requestFullscreen().catch(() => {});
    }
  };

  const handleExitSpotlightStage = (currentSpotlightId?: string) => {
    if (typeof document !== 'undefined' && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    setPinnedPeerId(null);
    if (currentSpotlightId) {
      setDismissedSpotlightPeerId(currentSpotlightId);
    }
  };

  const handleHangUp = async () => {
    const leavingRoom = cleanRoomId;
    stopLocalScreenShareCleanup();
    if (leavingRoom) {
      emitLocalSignal({
        type: 'hangup',
        roomId: leavingRoom,
        senderId: peerIdRef.current,
        senderName: effectiveName,
        timestamp: Date.now(),
      });
      try {
        await deleteDoc(doc(db, 'meet_rooms', leavingRoom, 'participants', peerIdRef.current));
      } catch {
        // ignore
      }
    }
    cleanupPeerConnection();
    connectedRoomRef.current = '';
    roleRef.current = 'idle';
    setRole('idle');
    setRemotePeers([]);
    remotePeersRef.current = [];
    setPinnedPeerId(null);
    setDismissedSpotlightPeerId(null);
    setRemotePeerName('Bạn học / Giáo viên');
    setIsPeerScreenSharing(false);
    setRemoteScreenFrame('');
    setConnectionState('Đã kết thúc cuộc gọi');
    setStatusBanner('Đã ngắt kết nối phòng họp WebRTC.');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const txt = chatInput.trim();
    if (!txt) return;
    const msg: MeetChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sender: effectiveName,
      text: txt,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    const nextList = [...chatMessagesRef.current, msg];
    chatMessagesRef.current = nextList;
    setChatMessages(nextList);
    setChatInput('');

    broadcastOverDataChannels({ type: 'chat', chat: msg });
    emitLocalSignal({
      type: 'chat',
      roomId: cleanRoomId,
      senderId: peerIdRef.current,
      senderName: effectiveName,
      chat: msg,
      timestamp: Date.now(),
    });
    if (cleanRoomId) {
      syncRoomToFirestore(cleanRoomId).catch(() => {});
    }
  };

  const handleSharedCodeChange = (nextCode: string) => {
    sharedCodeRef.current = nextCode;
    setSharedCode(nextCode);
    broadcastOverDataChannels({ type: 'code', sharedCode: nextCode });
    emitLocalSignal({
      type: 'code',
      roomId: cleanRoomId,
      senderId: peerIdRef.current,
      senderName: effectiveName,
      sharedCode: nextCode,
      timestamp: Date.now(),
    });
    if (cleanRoomId) {
      syncRoomToFirestore(cleanRoomId).catch(() => {});
    }
  };

  // Build unified multi-participant list (Local + all connected Remote participants, or default Partner placeholder)
  const localParticipant: MeetParticipantInfo = {
    peerId: peerIdRef.current,
    peerName: effectiveName,
    role: role === 'host' ? 'host' : 'guest',
    isMicOn,
    isSharing: isScreenSharing,
    screenFrame: localScreenFrame || undefined,
    isLocal: true,
    lastSeen: Date.now(),
  };

  const effectiveRemoteList: MeetParticipantInfo[] =
    remotePeers.length > 0
      ? remotePeers
      : [
          {
            peerId: 'primary_partner_slot',
            peerName: remotePeerName,
            role: role === 'host' ? 'guest' : 'host',
            isMicOn: isPeerMicOn,
            isSharing: isPeerScreenSharing,
            screenFrame: remoteScreenFrame || undefined,
            isLocal: false,
            lastSeen: Date.now(),
          },
        ];

  const allParticipants: MeetParticipantInfo[] = [localParticipant, ...effectiveRemoteList];
  const connectedCount = 1 + remotePeers.length;
  const spotlightParticipant = selectSpotlightParticipant(
    allParticipants,
    pinnedPeerId,
    dismissedSpotlightPeerId
  );

  return (
    <div
      data-testid="webrtc-meet-view"
      className="space-y-6 animate-fade-slide min-w-0 overflow-hidden"
    >
      {/* Hidden audio element for remote peer microphone stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Top Room Control Header */}
      <div className="p-4 sm:p-6 bg-zinc-100 border-2 border-black space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-300 pb-4">
          <div className="space-y-1 min-w-0">
            <div className="text-xs sm:text-sm font-bold text-zinc-600 flex flex-wrap items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>PHÒNG HỌP NHÓM ĐA NGƯỜI & CHIA SẺ MÀN HÌNH PHÓNG TO (MULTI-PEER WEBRTC)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-black">
              Họp Nhóm Nhiều Người Tham Gia, Tự Động Phóng To Màn Hình Chia Sẻ & Code Chung
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <div
              data-testid="webrtc-participant-count"
              className="px-3.5 py-2.5 bg-emerald-700 text-white text-xs sm:text-sm font-mono-tabular font-bold flex items-center gap-1.5"
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Thành viên: {connectedCount} người</span>
            </div>
            <div
              data-testid="webrtc-connection-state"
              className="px-4 py-2.5 bg-black text-white text-xs sm:text-sm font-mono-tabular font-bold shrink-0"
            >
              Trạng thái: {connectionState}
            </div>
          </div>
        </div>

        {/* 2-Part Room Controls: (1) Tạo Phòng Họp Mới (Mã tự tạo) & (2) Tham Gia Phòng Họp */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* Part 1: Tạo Phòng Họp Mới (Auto-generated Room Code) */}
          <div className="p-3.5 bg-white border-2 border-black flex flex-col justify-between gap-2.5">
            <div className="text-xs sm:text-sm font-bold text-black">
              1. Tạo Phòng Họp Mới (Tự động tạo mã phòng cho cả nhóm):
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="webrtc-create-room-btn"
                onClick={handleCreateRoomAsHost}
                className="coder-btn px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-black hover:bg-zinc-800 border-2 border-black flex items-center justify-center gap-2 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4 shrink-0" />
                <span>Tạo Phòng Họp Mới</span>
              </button>

              {cleanRoomId && (
                <div className="flex items-center gap-1.5 bg-zinc-100 border-2 border-black px-3 py-2">
                  <span
                    data-testid="webrtc-generated-code"
                    className="text-xs sm:text-sm font-mono-tabular font-bold text-black"
                  >
                    Mã: {cleanRoomId}
                  </span>
                  <button
                    type="button"
                    data-testid="webrtc-copy-room-btn"
                    onClick={() => {
                      if (navigator.clipboard && cleanRoomId) {
                        navigator.clipboard.writeText(cleanRoomId);
                      }
                      setCopiedRoom(true);
                      setTimeout(() => setCopiedRoom(false), 2000);
                    }}
                    className="ml-1 px-2 py-0.5 text-xs font-bold bg-black text-white hover:bg-zinc-800 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedRoom ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedRoom ? 'Đã chép' : 'Chép mã'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Part 2: Tham Gia Phòng Họp */}
          <div className="p-3.5 bg-white border-2 border-black flex flex-col justify-between gap-2.5">
            <label
              htmlFor="webrtc-room-id"
              className="block text-xs sm:text-sm font-bold text-black"
            >
              2. Tham Gia Phòng Họp (Nhiều máy cùng nhập 1 mã phòng):
            </label>
            <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-2">
              <input
                id="webrtc-room-id"
                data-testid="webrtc-room-input"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Nhập mã phòng (VD: MEET-4829AB)..."
                className="flex-1 px-3 py-2 text-sm sm:text-base font-mono-tabular font-bold bg-zinc-50 border-2 border-black text-black focus:outline-none min-w-0"
              />
              <button
                type="button"
                data-testid="webrtc-join-room-btn"
                onClick={handleJoinRoomAsGuest}
                className="coder-btn px-4 py-2.5 text-xs sm:text-sm font-bold text-black bg-zinc-200 hover:bg-zinc-300 border-2 border-black flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Tham Gia</span>
              </button>

              {role !== 'idle' && (
                <button
                  type="button"
                  onClick={handleHangUp}
                  className="coder-btn px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white bg-red-700 hover:bg-red-800 border-2 border-black flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4 shrink-0" />
                  <span>Rời Phòng</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Multi-Participant Roster Bar */}
        <div
          data-testid="webrtc-participant-roster"
          className="p-3 bg-white border-2 border-black flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-black flex items-center gap-1.5">
              <Users className="w-4 h-4 text-black shrink-0" />
              <span>Danh sách người tham gia ({connectedCount}):</span>
            </span>

            {allParticipants.map((p) => {
              const isPinned = spotlightParticipant?.peerId === p.peerId;
              return (
                <div
                  key={p.peerId}
                  className={`px-2.5 py-1.5 border text-xs font-bold flex items-center gap-1.5 ${
                    p.isSharing
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                      : isPinned
                        ? 'bg-black text-white border-black'
                        : 'bg-zinc-100 text-black border-zinc-400'
                  }`}
                >
                  {p.isMicOn ? (
                    <Mic className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <MicOff className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  )}
                  <span>
                    {p.isLocal ? `Bạn (${p.peerName})` : p.peerName}
                  </span>
                  {p.isSharing && (
                    <span className="px-1.5 py-0.5 bg-emerald-500 text-black text-[10px] font-mono-tabular uppercase font-bold">
                      Đang chia sẻ màn hình
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (isPinned) {
                        handleExitSpotlightStage(p.peerId);
                      } else {
                        setDismissedSpotlightPeerId(null);
                        setPinnedPeerId(p.peerId);
                      }
                    }}
                    title={isPinned ? 'Thoát phóng to màn hình' : 'Phóng to màn hình người này'}
                    className="ml-1 px-1.5 py-0.5 bg-zinc-800 text-white hover:bg-zinc-700 text-[10px] font-mono-tabular flex items-center gap-1 cursor-pointer"
                  >
                    {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                    <span>{isPinned ? 'Thoát phóng to' : 'Phóng to'}</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-zinc-600 font-medium">
            * Khi bất kỳ thành viên nào nhấn <strong>Chia Sẻ Màn Hình</strong>, màn hình đó sẽ tự động được phóng to lớn ở trung tâm.
          </div>
        </div>

        {/* Status Banner */}
        <div
          data-testid="webrtc-status-banner"
          className="p-3 bg-white border border-black text-xs sm:text-sm text-black flex items-center justify-between gap-2"
        >
          <span>{statusBanner}</span>
        </div>
      </div>

      {/* ENLARGED SCREEN-SHARING SPOTLIGHT STAGE (Automatically shown & enlarged when ANY participant shares screen or is pinned) */}
      {spotlightParticipant && (
        <div
          ref={spotlightStageContainerRef}
          data-testid="webrtc-spotlight-stage"
          className="w-full border-4 border-black bg-zinc-950 text-white shadow-lg overflow-hidden flex flex-col justify-between"
        >
          {/* Spotlight Top Bar */}
          <div className="px-4 py-3 bg-black border-b-2 border-emerald-500 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
              <span className="px-2.5 py-1 bg-emerald-500 text-black text-xs font-mono-tabular font-bold uppercase flex items-center gap-1.5 shrink-0">
                <MonitorUp className="w-4 h-4" />
                <span>MÀN HÌNH ĐANG PHÓNG TO</span>
              </span>
              <span
                data-testid="webrtc-spotlight-presenter-name"
                className="text-sm sm:text-base font-bold text-white truncate"
              >
                {spotlightParticipant.isLocal
                  ? `Bạn: ${spotlightParticipant.peerName} (Đang trình chiếu màn hình của bạn)`
                  : `Người trình chiếu: ${spotlightParticipant.peerName}`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="webrtc-spotlight-fullscreen-btn"
                onClick={handleFullscreenRemoteStage}
                className="px-3 py-1.5 text-xs sm:text-sm font-bold bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-600 flex items-center gap-1.5 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Toàn Màn Hình</span>
              </button>

              <button
                type="button"
                data-testid="webrtc-exit-spotlight-btn"
                onClick={() => handleExitSpotlightStage(spotlightParticipant.peerId)}
                className="px-3 py-1.5 text-xs sm:text-sm font-bold bg-red-700 text-white hover:bg-red-800 border border-red-500 flex items-center gap-1.5 cursor-pointer"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Thoát Phóng To Màn Hình</span>
              </button>
            </div>
          </div>

          {/* Enlarged Video / Screen-Share Canvas */}
          <div className="relative w-full bg-zinc-900 flex items-center justify-center overflow-hidden min-h-[420px] sm:min-h-[520px] lg:min-h-[620px]">
            {spotlightParticipant.isLocal ? (
              <>
                <video
                  ref={spotlightLocalVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full max-h-[82vh] object-contain ${
                    isScreenSharing ? 'block' : 'hidden'
                  }`}
                />
                {!isScreenSharing && localScreenFrame && (
                  <img
                    src={localScreenFrame}
                    alt={`Màn hình của ${spotlightParticipant.peerName}`}
                    className="w-full h-full max-h-[82vh] object-contain"
                  />
                )}
                {!isScreenSharing && !localScreenFrame && (
                  <div className="p-8 text-center space-y-3">
                    <MonitorUp className="w-12 h-12 text-emerald-400 mx-auto" />
                    <div className="text-base sm:text-lg font-bold text-white">
                      Khung phóng to của {spotlightParticipant.peerName}
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-400 max-w-md">
                      Nhấn nút <strong>Chia Sẻ Màn Hình</strong> để phát trực tiếp màn hình bài giảng / code của bạn lên khung phóng to này cho tất cả mọi người trong phòng.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <video
                  ref={spotlightRemoteVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full max-h-[82vh] object-contain ${
                    spotlightParticipant.isSharing && hasRemoteNativeVideo ? 'block' : 'hidden'
                  }`}
                />
                {spotlightParticipant.isSharing &&
                  !hasRemoteNativeVideo &&
                  (spotlightParticipant.screenFrame || remoteScreenFrame) && (
                    <img
                      src={spotlightParticipant.screenFrame || remoteScreenFrame}
                      data-testid="webrtc-spotlight-screen-img"
                      alt={`Màn hình chia sẻ phóng to của ${spotlightParticipant.peerName}`}
                      className="w-full h-full max-h-[82vh] object-contain"
                    />
                  )}
                {spotlightParticipant.isSharing &&
                  !hasRemoteNativeVideo &&
                  !spotlightParticipant.screenFrame &&
                  !remoteScreenFrame && (
                    <div className="p-8 text-center space-y-3">
                      <MonitorUp className="w-12 h-12 text-emerald-400 animate-pulse mx-auto" />
                      <div className="text-base sm:text-lg font-bold text-white">
                        Đang phóng to màn hình của {spotlightParticipant.peerName}...
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-400">
                        Đang đồng bộ luồng hình ảnh màn hình độ phân giải cao từ {spotlightParticipant.peerName}.
                      </p>
                    </div>
                  )}
                {!spotlightParticipant.isSharing && (
                  <div className="p-8 text-center space-y-3">
                    <Users className="w-12 h-12 text-sky-400 mx-auto" />
                    <div className="text-base sm:text-lg font-bold text-white">
                      Đang ghim phóng to: {spotlightParticipant.peerName}
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-400 max-w-md">
                      Khi {spotlightParticipant.peerName} bật <strong>Chia Sẻ Màn Hình</strong>, toàn bộ màn hình của họ sẽ hiển thị lớn tại đây.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* MULTI-PARTICIPANT CONFERENCE GRID (Shows Local User + All Joined Participants in the Room) */}
      <div
        data-testid="webrtc-participants-grid"
        className={`grid grid-cols-1 gap-5 ${
          effectiveRemoteList.length >= 2
            ? 'md:grid-cols-2 xl:grid-cols-3'
            : 'lg:grid-cols-2'
        }`}
      >
        {/* Local Participant Stage (Bạn: Audio + Screen Share) */}
        <div className="border-2 border-black bg-zinc-950 text-white overflow-hidden flex flex-col justify-between">
          <div className="px-4 py-2.5 bg-black border-b border-zinc-800 flex items-center justify-between gap-2 text-xs sm:text-sm">
            <span className="font-bold text-white truncate">
              Bạn: {effectiveName} {role !== 'idle' ? `(${role.toUpperCase()})` : ''}
            </span>
            <span className="text-emerald-400 font-mono-tabular text-xs">
              {isScreenSharing
                ? 'Đang chia sẻ màn hình (Đã phóng to)'
                : isMicOn
                  ? 'Micro đang bật'
                  : 'Micro đang tắt'}
            </span>
          </div>

          <div className="relative aspect-video bg-zinc-900 flex items-center justify-center overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-contain ${isScreenSharing ? 'block' : 'hidden'}`}
            />
            {!isScreenSharing && (
              <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center gap-2.5 text-zinc-300">
                {isMicOn ? (
                  <Mic className="w-10 h-10 text-emerald-400" />
                ) : (
                  <MicOff className="w-10 h-10 text-red-400" />
                )}
                <div className="text-sm sm:text-base font-bold text-white">
                  {isMicOn ? 'Micro Đang Bật (Chế Độ Âm Thanh)' : 'Micro Đang Tắt'}
                </div>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Nhấn nút <strong>Chia Sẻ Màn Hình</strong> bên dưới để phát trực tiếp và tự động phóng to màn hình của bạn cho cả phòng cùng xem.
                </p>
              </div>
            )}
          </div>

          {/* Local Media Control Bar (Mic & Screen Share) */}
          <div className="p-3 bg-black border-t border-zinc-800 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              data-testid="webrtc-toggle-mic-btn"
              onClick={handleToggleMic}
              className={`px-3.5 py-2 text-xs sm:text-sm font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                isMicOn
                  ? 'bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800'
                  : 'bg-red-700 text-white border-red-600'
              }`}
            >
              {isMicOn ? (
                <Mic className="w-4 h-4" />
              ) : (
                <MicOff className="w-4 h-4" />
              )}
              <span>{isMicOn ? 'Tắt Micro' : 'Bật Micro'}</span>
            </button>

            <button
              type="button"
              data-testid="webrtc-toggle-screen-btn"
              onClick={handleToggleScreenShare}
              className={`px-3.5 py-2 text-xs sm:text-sm font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                isScreenSharing
                  ? 'bg-emerald-500 text-black border-emerald-400'
                  : 'bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800'
              }`}
            >
              <MonitorUp className="w-4 h-4" />
              <span>{isScreenSharing ? 'Dừng Chia Sẻ' : 'Chia Sẻ Màn Hình'}</span>
            </button>
          </div>
        </div>

        {/* Remote Participant Cards (1 card per connected participant in multi-peer room) */}
        {effectiveRemoteList.map((peer, idx) => {
          const isPrimarySlot = idx === 0;
          const peerSharing = isPrimarySlot
            ? Boolean(peer.isSharing || isPeerScreenSharing)
            : Boolean(peer.isSharing);
          const peerFrame = peer.screenFrame || (isPrimarySlot ? remoteScreenFrame : '');
          const isPinned = spotlightParticipant?.peerId === peer.peerId;

          return (
            <div
              key={peer.peerId}
              ref={isPrimarySlot ? remoteStageContainerRef : undefined}
              data-testid={
                isPrimarySlot
                  ? 'webrtc-remote-primary-card'
                  : `webrtc-remote-card-${peer.peerId}`
              }
              className={`border-2 bg-zinc-950 text-white overflow-hidden flex flex-col justify-between ${
                peerSharing ? 'border-emerald-500' : 'border-black'
              }`}
            >
              <div className="px-4 py-2.5 bg-black border-b border-zinc-800 flex items-center justify-between gap-2 text-xs sm:text-sm">
                <span
                  data-testid={isPrimarySlot ? 'webrtc-remote-peer-name' : undefined}
                  className="font-bold text-white truncate"
                >
                  {remotePeers.length > 1
                    ? `Thành viên #${idx + 2}: ${peer.peerName}`
                    : `Đối tác: ${peer.peerName}`}
                </span>
                <span
                  data-testid={isPrimarySlot ? 'webrtc-remote-status-badge' : undefined}
                  className={`font-mono-tabular text-xs ${
                    peerSharing ? 'text-emerald-400 font-bold' : 'text-sky-400'
                  }`}
                >
                  {peerSharing
                    ? 'Đang chia sẻ màn hình'
                    : `Phòng: ${cleanRoomId || '(Chưa nhập)'}`}
                </span>
              </div>

              <div className="relative aspect-video bg-zinc-900 flex items-center justify-center overflow-hidden">
                {isPrimarySlot && (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-contain ${
                      peerSharing && hasRemoteNativeVideo ? 'block' : 'hidden'
                    }`}
                  />
                )}
                {peerSharing && (!isPrimarySlot || !hasRemoteNativeVideo) && peerFrame && (
                  <img
                    src={peerFrame}
                    data-testid={isPrimarySlot ? 'webrtc-remote-screen-img' : undefined}
                    alt={`Màn hình chia sẻ của ${peer.peerName}`}
                    className="w-full h-full object-contain"
                  />
                )}
                {peerSharing && (!isPrimarySlot || !hasRemoteNativeVideo) && !peerFrame && (
                  <div
                    data-testid={isPrimarySlot ? 'webrtc-remote-sharing-active' : undefined}
                    className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center space-y-2"
                  >
                    <MonitorUp className="w-10 h-10 text-emerald-400 animate-pulse" />
                    <div className="text-sm sm:text-base font-bold text-white">
                      {peer.peerName} đang chia sẻ màn hình (Đã phóng to ở trên)...
                    </div>
                    <p className="text-xs text-zinc-400">
                      Đang đồng bộ luồng hình ảnh màn hình trực tiếp từ {peer.peerName}.
                    </p>
                  </div>
                )}
                {!peerSharing && (
                  <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <Users className="w-10 h-10 text-zinc-400" />
                    <div className="text-sm sm:text-base font-bold text-white">
                      {remotePeers.length > 0 ||
                      connectionState === 'Đã kết nối P2P (Trực tuyến)'
                        ? `${peer.peerName} đang trong phòng ${cleanRoomId}`
                        : role === 'idle'
                          ? 'Chưa bắt đầu phiên họp nhóm'
                          : `Đang chờ các thành viên vào phòng ${cleanRoomId}...`}
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-400 max-w-md">
                      Khi <strong>{peer.peerName}</strong> nhấn nút{' '}
                      <strong>Chia Sẻ Màn Hình</strong>, màn hình của họ sẽ tự động được{' '}
                      <strong>phóng to bự lên</strong> ở khung trình chiếu trung tâm.
                    </p>
                  </div>
                )}
              </div>

              {/* Partner Audio & Pin/Enlarge Control Bar */}
              <div className="p-3 bg-black border-t border-zinc-800 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  data-testid={
                    isPrimarySlot
                      ? 'webrtc-peer-toggle-mic-btn'
                      : `webrtc-peer-toggle-mic-${peer.peerId}`
                  }
                  onClick={handleTogglePeerMic}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isPeerMicOn
                      ? 'bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800'
                      : 'bg-red-700 text-white border-red-600'
                  }`}
                >
                  {isPeerMicOn ? (
                    <Mic className="w-4 h-4" />
                  ) : (
                    <MicOff className="w-4 h-4" />
                  )}
                  <span>{isPeerMicOn ? 'Tắt Âm Đối Tác' : 'Bật Âm Đối Tác'}</span>
                </button>

                <button
                  type="button"
                  data-testid={
                    isPrimarySlot
                      ? 'webrtc-pin-participant-btn'
                      : `webrtc-pin-participant-${peer.peerId}`
                  }
                  onClick={() => {
                    if (isPinned) {
                      handleExitSpotlightStage(peer.peerId);
                    } else {
                      setDismissedSpotlightPeerId(null);
                      setPinnedPeerId(peer.peerId);
                    }
                  }}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isPinned
                      ? 'bg-red-700 text-white border-red-500 hover:bg-red-800'
                      : 'bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  {isPinned ? (
                    <>
                      <Minimize2 className="w-4 h-4" />
                      <span>Thoát Phóng To Màn Hình</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4" />
                      <span>Phóng To Màn Hình</span>
                    </>
                  )}
                </button>

                {peerSharing && (
                  <button
                    type="button"
                    data-testid={
                      isPrimarySlot
                        ? 'webrtc-peer-fullscreen-btn'
                        : `webrtc-peer-fullscreen-${peer.peerId}`
                    }
                    onClick={handleFullscreenRemoteStage}
                    className="px-3.5 py-2 text-xs sm:text-sm font-bold border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Toàn Màn Hình</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Collaborative Workspace: Shared Code Pad + Live Meet Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Shared Live Code Pad (7 cols) */}
        <div className="lg:col-span-7 bg-white border-2 border-black p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-300 pb-3">
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-black">
              <Code2 className="w-5 h-5 text-black shrink-0" />
              <span>Bảng Code Thảo Luận Chung Trong Cuộc Họp</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const snippet =
                    currentEditorCode.trim() ||
                    `# Bài tập: ${selectedProblem.codeNumber} - ${selectedProblem.title}\n# Yêu cầu: ${selectedProblem.taskSpecification}\n`;
                  handleSharedCodeChange(snippet);
                }}
                className="px-3 py-1.5 text-xs sm:text-sm font-bold bg-zinc-100 hover:bg-zinc-200 border border-black text-black cursor-pointer"
              >
                Lấy code từ bài đang chọn
              </button>
              <button
                type="button"
                onClick={() => onApplySharedCodeToEditor(sharedCode)}
                className="px-3 py-1.5 text-xs sm:text-sm font-bold bg-black text-white hover:bg-zinc-800 cursor-pointer"
              >
                Đưa sang Trình Chấm Điểm →
              </button>
            </div>
          </div>

          <textarea
            value={sharedCode}
            onChange={(e) => handleSharedCodeChange(e.target.value)}
            rows={9}
            placeholder="Nhập hoặc dán code Python / SQL / HTML để cùng sửa trực tiếp với các thành viên trong cuộc gọi..."
            className="w-full p-3.5 bg-zinc-950 text-emerald-300 font-mono-tabular text-sm sm:text-base border border-black focus:outline-none leading-relaxed"
          />
        </div>

        {/* Live In-Call Chat (5 cols) */}
        <div className="lg:col-span-5 bg-white border-2 border-black p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div className="border-b border-zinc-300 pb-2.5 flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-black">
              Trò Chuyện Trong Phòng Họp ({chatMessages.length})
            </h3>
            <span className="text-xs text-zinc-600 font-mono-tabular">
              Đồng bộ Đa Người
            </span>
          </div>

          <div className="space-y-2.5 max-h-[220px] min-h-[180px] overflow-y-auto pr-1">
            {chatMessages.map((m) => (
              <div
                key={m.id}
                className="p-2.5 bg-zinc-100 border border-zinc-400 text-xs sm:text-sm space-y-0.5"
              >
                <div className="flex items-center justify-between font-bold text-black">
                  <span>{m.sender}</span>
                  <span className="text-xs text-zinc-500 font-mono-tabular">
                    {m.time}
                  </span>
                </div>
                <p className="text-zinc-900 break-words">{m.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChat} className="flex items-stretch gap-2 pt-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Nhập tin nhắn trao đổi bài với cả nhóm..."
              className="flex-1 px-3 py-2 text-xs sm:text-sm bg-zinc-100 border border-black text-black focus:outline-none min-w-0"
            />
            <button
              type="submit"
              className="coder-btn px-4 py-2 text-xs sm:text-sm font-bold text-white bg-black hover:bg-zinc-800 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Gửi</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
