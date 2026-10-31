import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Maximize2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneCall,
  PhoneOff,
  Radio,
  Send,
  Users,
} from 'lucide-react';
import {
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
  parseMeetPeerPayload,
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
  type: 'offer' | 'answer' | 'chat' | 'code' | 'hangup' | 'screen-status';
  roomId: string;
  senderId: string;
  senderName: string;
  sdp?: RTCSessionDescriptionInit;
  chat?: MeetChatMessage;
  sharedCode?: string;
  isSharing?: boolean;
  screenFrame?: string;
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
    'Nhấn "Tạo Phòng Họp Mới" để hệ thống tự sinh mã phòng, hoặc nhập mã phòng của bạn học / giáo viên rồi nhấn "Tham Gia".'
  );
  const [remotePeerName, setRemotePeerName] = useState<string>('Bạn học / Giáo viên');

  // Media controls (Mic & Screen Share only — no webcam)
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isPeerMicOn, setIsPeerMicOn] = useState<boolean>(true);
  const [isPeerScreenSharing, setIsPeerScreenSharing] = useState<boolean>(false);
  const [remoteScreenFrame, setRemoteScreenFrame] = useState<string>('');
  const [hasRemoteNativeVideo, setHasRemoteNativeVideo] = useState<boolean>(false);

  // Collaborative Chat & Live Code Pad inside the Meet
  const [chatMessages, setChatMessages] = useState<MeetChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'Hệ Thống Meet',
      text: 'Chào mừng đến phòng học nhóm! Nhập cùng Mã Phòng Họp trên 2 máy để tự động thấy nhau, bật Micro, chia sẻ màn hình và sửa code chung.',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [sharedCode, setSharedCode] = useState<string>(
    currentEditorCode ||
      `# Phòng họp nhóm: ${selectedProblem.codeNumber} - ${selectedProblem.title}\n# Cùng thảo luận thuật toán và viết code tại đây:\n`
  );

  // Manual SDP Token exchange for cross-network fallback
  const [showManualSdp, setShowManualSdp] = useState<boolean>(false);
  const [localSdpToken, setLocalSdpToken] = useState<string>('');
  const [remoteSdpInput, setRemoteSdpInput] = useState<string>('');
  const [copiedRoom, setCopiedRoom] = useState<boolean>(false);
  const [copiedSdp, setCopiedSdp] = useState<boolean>(false);

  // Refs for WebRTC & Media
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteStageContainerRef = useRef<HTMLDivElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);
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
  const isScreenSharingRef = useRef<boolean>(false);
  const localScreenFrameRef = useRef<string>('');
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
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  useEffect(() => {
    sharedCodeRef.current = sharedCode;
  }, [sharedCode]);

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

  // Push latest state of this peer (Host or Guest) to Firestore /meet_rooms/{roomId}
  const syncRoomToFirestore = async (targetRoomId: string) => {
    if (!targetRoomId || roleRef.current === 'idle' || !latestLocalSdpRef.current) {
      return;
    }
    try {
      const myPayloadStr = serializeMeetPeerPayload({
        type: roleRef.current === 'host' ? 'offer' : 'answer',
        sdp: latestLocalSdpRef.current.sdp || '',
        peerId: peerIdRef.current,
        peerName: effectiveNameRef.current,
        isSharing: isScreenSharingRef.current,
        screenFrame: isScreenSharingRef.current ? localScreenFrameRef.current : undefined,
        chatList: chatMessagesRef.current,
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
    } catch {
      // ignore offline or transient errors
    }
  };

  // Setup DataChannel handlers for instant P2P chat, shared code, peer name, and live screen frames
  const bindDataChannel = (channel: RTCDataChannel) => {
    dataChannelRef.current = channel;
    channel.onopen = () => {
      setConnectionState('Đã kết nối P2P (Trực tuyến)');
      try {
        channel.send(
          JSON.stringify({
            type: 'peer-info',
            senderId: peerIdRef.current,
            senderName: effectiveNameRef.current,
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
        } else if (data.type === 'peer-info') {
          if (data.senderName) {
            setRemotePeerName(data.senderName);
          }
          if (typeof data.isSharing === 'boolean') {
            setIsPeerScreenSharing(data.isSharing);
            if (!data.isSharing) {
              setRemoteScreenFrame('');
            } else if (typeof data.screenFrame === 'string' && data.screenFrame) {
              setRemoteScreenFrame(data.screenFrame);
            }
          }
        } else if (data.type === 'screen-status') {
          if (data.senderName) {
            setRemotePeerName(data.senderName);
          }
          if (typeof data.isSharing === 'boolean') {
            setIsPeerScreenSharing(data.isSharing);
            if (!data.isSharing) {
              setRemoteScreenFrame('');
              setHasRemoteNativeVideo(false);
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

  // Wait for ICE gathering to complete (or timeout after 1000ms) so SDP contains all candidates
  const gatherCompleteSdp = (pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit | null> => {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve(pc.localDescription ? pc.localDescription.toJSON() : null);
        return;
      }
      const timeout = window.setTimeout(() => {
        resolve(pc.localDescription ? pc.localDescription.toJSON() : null);
      }, 1000);

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
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch {
        // ignore
      }
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        // ignore
      }
      pcRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setHasRemoteNativeVideo(false);
    appliedRemoteSdpRef.current = '';
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
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = videoStream;
            remoteVideoRef.current.play().catch(() => {});
          }
        };
        attachVideoTrack();
        event.track.onunmute = () => {
          attachVideoTrack();
          setIsPeerScreenSharing(true);
          setHasRemoteNativeVideo(true);
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
      bindDataChannel(event.channel);
    };

    // Pre-negotiate bidirectional audio & video transceivers so either Host or Guest (Bạn học / Giáo viên)
    // can start/stop Screen Sharing at any time
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

    return pc;
  };

  // Attach real-time Firestore listener to /meet_rooms/{targetRoomId} (works for all users without requiring Firebase Auth)
  const attachRoomSnapshotListener = (targetRoomId: string) => {
    if (firestoreUnsubRef.current) {
      firestoreUnsubRef.current();
      firestoreUnsubRef.current = null;
    }

    const roomRef = doc(db, 'meet_rooms', targetRoomId);
    firestoreUnsubRef.current = onSnapshot(
      roomRef,
      async (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        if (typeof data.sharedCode === 'string' && data.sharedCode && data.sharedCode !== sharedCodeRef.current) {
          setSharedCode(data.sharedCode);
        }

        const offerPayload = parseMeetPeerPayload(data.offerSdp, data.hostName || 'Chủ phòng');
        const answerPayload = parseMeetPeerPayload(data.answerSdp, 'Thành viên');

        if (offerPayload) {
          latestOfferSdpStrRef.current = data.offerSdp;
          latestHostNameRef.current = offerPayload.peerName || data.hostName || 'Chủ phòng';
        }
        if (answerPayload) {
          latestAnswerSdpStrRef.current = data.answerSdp;
        }

        // Case A: We are Host and a Guest wrote answerSdp (or updated their screen share / chat)
        if (roleRef.current === 'host' && answerPayload && answerPayload.peerId !== peerIdRef.current) {
          setRemotePeerName(answerPayload.peerName || 'Bạn học / Giáo viên');
          setIsPeerScreenSharing(Boolean(answerPayload.isSharing));
          if (answerPayload.isSharing && answerPayload.screenFrame) {
            setRemoteScreenFrame(answerPayload.screenFrame);
          } else if (!answerPayload.isSharing) {
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
            `Đã kết nối với ${answerPayload.peerName} trong phòng ${targetRoomId}! Cả hai có thể bật Micro, chia sẻ màn hình và sửa code trực tiếp.`
          );
        }

        // Case B: Collision recovery — two machines both initialized as Host in the same room;
        // if the snapshot contains another active Host's offer and no answer yet, switch to Guest and answer it!
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
        if (roleRef.current === 'guest' && offerPayload && offerPayload.peerId !== peerIdRef.current) {
          setRemotePeerName(offerPayload.peerName || data.hostName || 'Chủ phòng');
          setIsPeerScreenSharing(Boolean(offerPayload.isSharing));
          if (offerPayload.isSharing && offerPayload.screenFrame) {
            setRemoteScreenFrame(offerPayload.screenFrame);
          } else if (!offerPayload.isSharing) {
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

  // Helper: Join an existing Host's offer as Guest
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
      isSharing: isScreenSharingRef.current,
      screenFrame: isScreenSharingRef.current ? localScreenFrameRef.current : undefined,
      timestamp: Date.now(),
    });

    latestOfferSdpStrRef.current = serializeMeetPeerPayload(offerPayload);
    await syncRoomToFirestore(targetRoomId);
    attachRoomSnapshotListener(targetRoomId);

    setConnectionState('Đã kết nối P2P (Trực tuyến)');
    setStatusBanner(
      `Đã kết nối phòng ${targetRoomId} cùng ${hostDisplay}! Cả hai có thể bật Micro, tự chia sẻ màn hình và sửa code chung.`
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
      isSharing: isScreenSharingRef.current,
      screenFrame: isScreenSharingRef.current ? localScreenFrameRef.current : undefined,
      timestamp: Date.now(),
    });

    await syncRoomToFirestore(targetRoomId);
    attachRoomSnapshotListener(targetRoomId);

    setConnectionState('Đang chờ người tham gia...');
    setStatusBanner(
      `Đã vào phòng "${targetRoomId}"! Khi bạn học / giáo viên trên máy khác nhập cùng mã "${targetRoomId}", hệ thống sẽ tự động kết nối ngay.`
    );
  };

  // Smart Connect: Checks if an active Host is already in the room (via localStorage or Firestore).
  // If yes -> joins as Guest and connects immediately!
  // If no -> initializes the room as Host and waits for the other machine!
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
      setStatusBanner(`Đang kiểm tra và đồng bộ phòng họp ${targetRoomId}...`);

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
              isSharing: Boolean(parsed.isSharing),
              screenFrame: parsed.screenFrame,
              ts: parsed.timestamp,
            };
            foundSharedCode = parsed.sharedCode;
          }
        } catch {
          // ignore
        }
      }

      // 2. Always check Firestore /meet_rooms/{targetRoomId} (works across all devices/networks without requiring Firebase Auth)
      if (!foundOfferPayload) {
        try {
          const roomRef = doc(db, 'meet_rooms', targetRoomId);
          const snap = await getDoc(roomRef);
          if (snap.exists()) {
            const data = snap.data();
            const parsedOffer = parseMeetPeerPayload(data.offerSdp, data.hostName || 'Chủ phòng');
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

      // If another participant is already waiting in this room, pair with them as Guest!
      if (foundOfferPayload && preferredMode !== 'host') {
        await joinExistingOfferAsGuest(targetRoomId, foundOfferPayload, foundSharedCode);
        return;
      }

      // Even if user clicked "Tạo Phòng Họp Mới (Host)", if another active Host created the room < 3 minutes ago without a guest,
      // pair with them so both users immediately see each other instead of overwriting!
      if (
        foundOfferPayload &&
        preferredMode === 'host' &&
        Date.now() - (foundOfferPayload.ts || 0) < 180_000
      ) {
        await joinExistingOfferAsGuest(targetRoomId, foundOfferPayload, foundSharedCode);
        return;
      }

      // Otherwise, initialize the room as Host and wait for the partner
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
    setRoomId(autoRoomCode);
    await startRoomAsHostInternal(autoRoomCode);
  };

  const handleJoinRoomAsGuest = async () => {
    await connectToRoomSmart(cleanRoomId, 'guest');
  };

  // Apply manual remote SDP (Offer or Answer) for offline/strict-firewall P2P
  const handleApplyManualRemoteToken = async () => {
    const decoded = decodeSdpToken(remoteSdpInput);
    if (!decoded) {
      setStatusBanner('[!] Mã tín hiệu P2P không hợp lệ. Vui lòng sao chép đầy đủ mã.');
      return;
    }

    try {
      if (decoded.type === 'offer' && decoded.sdp) {
        await joinExistingOfferAsGuest(cleanRoomId || 'P2P-DIRECT', {
          type: 'offer',
          sdp: decoded.sdp,
          peerId: 'manual_host',
          peerName: 'Bạn học / Giáo viên',
          isSharing: false,
          ts: Date.now(),
        });
      } else if (decoded.type === 'answer' && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(decoded));
        setConnectionState('Đã kết nối P2P (Trực tuyến)');
        setStatusBanner('Đã xác nhận Mã Phản Hồi (Answer)! Cuộc gọi WebRTC đã kết nối thành công.');
      }
    } catch (err) {
      setStatusBanner(
        `Lỗi áp dụng mã P2P: ${err instanceof Error ? err.message : String(err)}`
      );
    }
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

      if (
        msg.type === 'offer' &&
        msg.sdp &&
        (roleRef.current === 'idle' ||
          (roleRef.current === 'host' &&
            pcRef.current &&
            pcRef.current.signalingState === 'have-local-offer'))
      ) {
        // Auto-answer incoming offer from another tab in the same room
        await joinExistingOfferAsGuest(
          cleanRoomId,
          {
            type: 'offer',
            sdp: msg.sdp.sdp || '',
            peerId: msg.senderId,
            peerName: msg.senderName || 'Bạn học',
            isSharing: Boolean(msg.isSharing),
            screenFrame: msg.screenFrame,
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
            `${msg.senderName || 'Bạn học'} đã kết nối vào phòng ${cleanRoomId}!`
          );
        } catch {
          // ignore
        }
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
        } else if (msg.screenFrame) {
          setRemoteScreenFrame(msg.screenFrame);
        }
      } else if (msg.type === 'hangup') {
        setConnectionState('Người kia đã rời phòng');
        setIsPeerScreenSharing(false);
        setRemoteScreenFrame('');
        setHasRemoteNativeVideo(false);
        setStatusBanner(`${msg.senderName} đã kết thúc cuộc gọi.`);
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
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = !isMicOn;
      });
    }
    setIsMicOn((prev) => !prev);
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

  // Capture a compact JPEG frame from the local shared screen and broadcast it to the partner
  // via DataChannel, BroadcastChannel, and Firestore so the partner ALWAYS sees the shared screen
  const captureAndBroadcastScreenFrame = () => {
    const videoEl = localVideoRef.current;
    let frameDataUrl = '';
    if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 270;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          frameDataUrl = canvas.toDataURL('image/jpeg', 0.36);
        }
      } catch {
        // ignore canvas taint errors
      }
    }
    if (frameDataUrl) {
      localScreenFrameRef.current = frameDataUrl;
    }
    notifyPeerScreenStatus(true, localScreenFrameRef.current);
  };

  const notifyPeerScreenStatus = (isSharing: boolean, screenFrame?: string) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try {
        dataChannelRef.current.send(
          JSON.stringify({
            type: 'screen-status',
            senderName: effectiveNameRef.current,
            isSharing,
            screenFrame: isSharing ? screenFrame : undefined,
          })
        );
      } catch {
        // ignore
      }
    }
    if (cleanRoomId) {
      emitLocalSignal({
        type: 'screen-status',
        roomId: cleanRoomId,
        senderId: peerIdRef.current,
        senderName: effectiveNameRef.current,
        isSharing,
        screenFrame: isSharing ? screenFrame : undefined,
        timestamp: Date.now(),
      });
      syncRoomToFirestore(cleanRoomId).catch(() => {});
    }
  };

  const attachTrackToPeerConnection = async (
    screenTrack: MediaStreamTrack | null,
    stream?: MediaStream
  ) => {
    if (!pcRef.current) return;
    const videoTransceiver = pcRef.current
      .getTransceivers()
      .find((t) => t.receiver.track && t.receiver.track.kind === 'video');
    if (videoTransceiver) {
      videoTransceiver.direction = 'sendrecv';
      await videoTransceiver.sender.replaceTrack(screenTrack);
      return;
    }
    const sender = pcRef.current
      .getSenders()
      .find((s) => s.track && s.track.kind === 'video');
    if (sender) {
      await sender.replaceTrack(screenTrack);
    } else if (screenTrack && stream) {
      pcRef.current.addTrack(screenTrack, stream);
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
    isScreenSharingRef.current = false;
    setIsScreenSharing(false);
    attachTrackToPeerConnection(null).catch(() => {});
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    notifyPeerScreenStatus(false);
  };

  // Either Participant (Host or Guest — Bạn học or Giáo viên) clicks "Chia Sẻ Màn Hình" on their own machine
  // and their screen is streamed directly to the other participant's "Đối tác" box!
  const handleToggleScreenShare = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setStatusBanner('Trình duyệt hiện tại không hỗ trợ API chia sẻ màn hình (getDisplayMedia).');
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
        await attachTrackToPeerConnection(screenTrack, displayStream);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream;
        localVideoRef.current.play().catch(() => {});
      }
      isScreenSharingRef.current = true;
      setIsScreenSharing(true);
      notifyPeerScreenStatus(true);

      // Broadcast compressed screen frames periodically so the partner sees the screen
      // even across strict NATs or before WebRTC video unmute completes
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
    if (remoteStageContainerRef.current && remoteStageContainerRef.current.requestFullscreen) {
      remoteStageContainerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const handleHangUp = () => {
    stopLocalScreenShareCleanup();
    emitLocalSignal({
      type: 'hangup',
      roomId: cleanRoomId,
      senderId: peerIdRef.current,
      senderName: effectiveName,
      timestamp: Date.now(),
    });
    cleanupPeerConnection();
    connectedRoomRef.current = '';
    roleRef.current = 'idle';
    setRole('idle');
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

    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({ type: 'chat', chat: msg }));
    }
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
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(
        JSON.stringify({ type: 'code', sharedCode: nextCode })
      );
    }
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
              <span>PHÒNG HỌP NHÓM & CHỮA BÀI TRỰC TUYẾN WEBRTC (PEER-TO-PEER)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-black">
              Họp Nhóm Âm Thanh, Chia Sẻ Màn Hình & Đồng Bộ Code Trực Tiếp
            </h1>
          </div>

          <div
            data-testid="webrtc-connection-state"
            className="px-4 py-2.5 bg-black text-white text-xs sm:text-sm font-mono-tabular font-bold shrink-0 self-start lg:self-center"
          >
            Trạng thái: {connectionState}
          </div>
        </div>

        {/* 2-Part Room Controls: (1) Tạo Phòng Họp Mới (Mã tự tạo) & (2) Tham Gia Phòng Họp */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* Part 1: Tạo Phòng Họp Mới (Auto-generated Room Code) */}
          <div className="p-3.5 bg-white border-2 border-black flex flex-col justify-between gap-2.5">
            <div className="text-xs sm:text-sm font-bold text-black">
              1. Tạo Phòng Họp Mới (Tự động tạo mã phòng):
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
              2. Tham Gia Phòng Họp (Nhập mã phòng):
            </label>
            <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-2">
              <input
                id="webrtc-room-id"
                data-testid="webrtc-room-input"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Nhập mã phòng (VD: MEET-4829)..."
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

        {/* Status Banner */}
        <div
          data-testid="webrtc-status-banner"
          className="p-3 bg-white border border-black text-xs sm:text-sm text-black flex items-center justify-between gap-2"
        >
          <span>{statusBanner}</span>
        </div>
      </div>

      {/* Dual Video Stage (Local Stream + Remote Partner Stream) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Local Participant Stage (Bạn: Audio + Screen Share) */}
        <div className="border-2 border-black bg-zinc-950 text-white overflow-hidden flex flex-col justify-between">
          <div className="px-4 py-2.5 bg-black border-b border-zinc-800 flex items-center justify-between gap-2 text-xs sm:text-sm">
            <span className="font-bold text-white truncate">
              Bạn: {effectiveName} {role !== 'idle' ? `(${role.toUpperCase()})` : ''}
            </span>
            <span className="text-emerald-400 font-mono-tabular text-xs">
              {isScreenSharing
                ? 'Đang chia sẻ màn hình'
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
                  Nhấn nút <strong>Chia Sẻ Màn Hình</strong> bên dưới để phát trực tiếp màn hình của bạn sang khung của Bạn học / Giáo viên.
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

        {/* Remote Participant Stage (Đối tác: Bạn học / Giáo viên) */}
        <div
          ref={remoteStageContainerRef}
          className="border-2 border-black bg-zinc-950 text-white overflow-hidden flex flex-col justify-between"
        >
          <div className="px-4 py-2.5 bg-black border-b border-zinc-800 flex items-center justify-between gap-2 text-xs sm:text-sm">
            <span
              data-testid="webrtc-remote-peer-name"
              className="font-bold text-white truncate"
            >
              Đối tác: {remotePeerName}
            </span>
            <span
              data-testid="webrtc-remote-status-badge"
              className="text-sky-400 font-mono-tabular text-xs"
            >
              {isPeerScreenSharing
                ? 'Đang chia sẻ màn hình'
                : `Phòng: ${cleanRoomId || '(Chưa nhập)'}`}
            </span>
          </div>

          <div className="relative aspect-video bg-zinc-900 flex items-center justify-center overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-contain ${
                isPeerScreenSharing && hasRemoteNativeVideo ? 'block' : 'hidden'
              }`}
            />
            {isPeerScreenSharing && !hasRemoteNativeVideo && remoteScreenFrame && (
              <img
                src={remoteScreenFrame}
                data-testid="webrtc-remote-screen-img"
                alt={`Màn hình chia sẻ của ${remotePeerName}`}
                className="w-full h-full object-contain"
              />
            )}
            {isPeerScreenSharing && !hasRemoteNativeVideo && !remoteScreenFrame && (
              <div
                data-testid="webrtc-remote-sharing-active"
                className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center space-y-2"
              >
                <MonitorUp className="w-10 h-10 text-emerald-400 animate-pulse" />
                <div className="text-sm sm:text-base font-bold text-white">
                  {remotePeerName} đang chia sẻ màn hình...
                </div>
                <p className="text-xs text-zinc-400">
                  Đang đồng bộ luồng hình ảnh màn hình trực tiếp từ {remotePeerName}.
                </p>
              </div>
            )}
            {!isPeerScreenSharing && (
              <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center p-6 text-center space-y-2">
                <Users className="w-10 h-10 text-zinc-400" />
                <div className="text-sm sm:text-base font-bold text-white">
                  {connectionState === 'Đã kết nối P2P (Trực tuyến)'
                    ? `${remotePeerName} đã kết nối trong phòng ${cleanRoomId}`
                    : role === 'idle'
                      ? 'Chưa bắt đầu phiên gọi WebRTC'
                      : `Đang chờ Bạn học / Giáo viên vào phòng ${cleanRoomId}...`}
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md">
                  Khi <strong>{remotePeerName}</strong> nhấn nút <strong>Chia Sẻ Màn Hình</strong> trên thiết bị của họ, màn hình bài giảng / code của họ sẽ tự động hiển thị trực tiếp tại khung này.
                </p>
              </div>
            )}
          </div>

          {/* Partner Audio & Fullscreen Control Bar */}
          <div className="p-3 bg-black border-t border-zinc-800 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              data-testid="webrtc-peer-toggle-mic-btn"
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

            {isPeerScreenSharing && (
              <button
                type="button"
                data-testid="webrtc-peer-fullscreen-btn"
                onClick={handleFullscreenRemoteStage}
                className="px-3.5 py-2 text-xs sm:text-sm font-bold border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Toàn Màn Hình</span>
              </button>
            )}
          </div>
        </div>
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
            placeholder="Nhập hoặc dán code Python / SQL / HTML để cùng sửa trực tiếp với bạn học trong cuộc gọi..."
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
              P2P DataChannel
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
              placeholder="Nhập tin nhắn trao đổi bài..."
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
