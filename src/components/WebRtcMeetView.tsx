import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  KeyRound,
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

interface WebRtcMeetViewProps {
  studentName: string;
  schoolName: string;
  className: string;
  firebaseUser: User | null;
  selectedProblem: Problem;
  currentEditorCode: string;
  onApplySharedCodeToEditor: (code: string) => void;
}

interface MeetChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

interface SignalEnvelope {
  type: 'offer' | 'answer' | 'chat' | 'code' | 'hangup' | 'screen-status';
  roomId: string;
  senderId: string;
  senderName: string;
  sdp?: RTCSessionDescriptionInit;
  chat?: MeetChatMessage;
  sharedCode?: string;
  isSharing?: boolean;
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
  schoolName,
  className,
  firebaseUser,
  selectedProblem,
  currentEditorCode,
  onApplySharedCodeToEditor,
}) => {
  const [roomId, setRoomId] = useState<string>('');
  const [role, setRole] = useState<'idle' | 'host' | 'guest'>('idle');
  const [connectionState, setConnectionState] = useState<string>('Chưa kết nối');
  const [statusBanner, setStatusBanner] = useState<string>(
    'Nhập Mã Phòng Họp rồi nhấn "Tạo Phòng Họp Mới (Host)" hoặc "Vào Phòng Họp (Guest)" để kết nối Micro và chia sẻ màn hình.'
  );
  const [remotePeerName, setRemotePeerName] = useState<string>('Bạn học / Giáo viên');

  // Media controls (Mic & Screen Share only — no webcam)
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isPeerMicOn, setIsPeerMicOn] = useState<boolean>(true);
  const [isPeerScreenSharing, setIsPeerScreenSharing] = useState<boolean>(false);

  // Collaborative Chat & Live Code Pad inside the Meet
  const [chatMessages, setChatMessages] = useState<MeetChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'Hệ Thống Meet',
      text: 'Chào mừng đến phòng học nhóm WebRTC! Bạn có thể bật Micro, chia sẻ màn hình và cùng sửa code trực tiếp.',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [sharedCode, setSharedCode] = useState<string>(
    currentEditorCode ||
      `# Phòng họp nhóm: ${selectedProblem.codeNumber} - ${selectedProblem.title}\n# Cùng thảo luận thuật toán và viết code tại đây:\n`
  );

  // Manual SDP Token exchange for cross-network without Firebase Auth
  const [showManualSdp, setShowManualSdp] = useState<boolean>(false);
  const [localSdpToken, setLocalSdpToken] = useState<string>('');
  const [remoteSdpInput, setRemoteSdpInput] = useState<string>('');
  const [copiedRoom, setCopiedRoom] = useState<boolean>(false);
  const [copiedSdp, setCopiedSdp] = useState<boolean>(false);

  // Refs for WebRTC & Media
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerLocalScreenStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);
  const peerIdRef = useRef<string>(`peer_${Math.random().toString(36).slice(2, 9)}`);

  const cleanRoomId = roomId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '-')
    .slice(0, 48);

  const effectiveName = studentName.trim() || 'Học Sinh THPT';

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

  // Broadcast signal across BroadcastChannel + localStorage
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

  // Setup DataChannel handlers for instant P2P chat, shared code, and screen share status
  const bindDataChannel = (channel: RTCDataChannel) => {
    dataChannelRef.current = channel;
    channel.onopen = () => {
      setConnectionState('Đã kết nối P2P (Trực tuyến)');
      setStatusBanner(
        `Đã kết nối WebRTC trực tiếp trong phòng ${cleanRoomId}! Âm thanh, chia sẻ màn hình, chat và bảng code đang đồng bộ thời gian thực.`
      );
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
        } else if (data.type === 'peer-info' && data.senderName) {
          setRemotePeerName(data.senderName);
        } else if (data.type === 'screen-status' && typeof data.isSharing === 'boolean') {
          setIsPeerScreenSharing(data.isSharing);
        }
      } catch {
        // ignore malformed message
      }
    };
  };

  // Wait for ICE gathering to complete (or timeout after 1200ms) so SDP contains all candidates
  const gatherCompleteSdp = (pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit | null> => {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve(pc.localDescription ? pc.localDescription.toJSON() : null);
        return;
      }
      const timeout = window.setTimeout(() => {
        resolve(pc.localDescription ? pc.localDescription.toJSON() : null);
      }, 1200);

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
    remoteStreamRef.current = null;
  };

  const createConfiguredPeerConnection = async (): Promise<RTCPeerConnection> => {
    cleanupPeerConnection();
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }

    pc.ontrack = (event) => {
      if (event.track.kind === 'video') {
        setIsPeerScreenSharing(true);
        event.track.onended = () => setIsPeerScreenSharing(false);
      }
      if (event.streams && event.streams[0]) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      } else {
        remoteStream.addTrack(event.track);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      }
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') {
        setConnectionState('Đã kết nối P2P (Trực tuyến)');
      } else if (st === 'connecting') {
        setConnectionState('Đang thiết lập kết nối...');
      } else if (st === 'disconnected' || st === 'failed' || st === 'closed') {
        setConnectionState('Ngắt kết nối');
      }
    };

    pc.ondatachannel = (event) => {
      bindDataChannel(event.channel);
    };

    // Pre-negotiate bidirectional audio & video transceivers so either Host or Guest (Bạn học / Giáo viên)
    // can start/stop Screen Sharing at any time using replaceTrack without SDP renegotiation failures
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

  // Start as Host (Create Offer & Publish to Room)
  const handleCreateRoomAsHost = async () => {
    if (!cleanRoomId) {
      setStatusBanner('[!] Vui lòng nhập Mã Phòng Họp trước khi tạo phòng!');
      return;
    }
    try {
      setRole('host');
      setConnectionState('Đang khởi tạo phòng...');
      setStatusBanner(`Đang khởi tạo phòng họp ${cleanRoomId} và tạo gói tín hiệu WebRTC Offer...`);

      const pc = await createConfiguredPeerConnection();
      const dc = pc.createDataChannel('thpt-study-meet');
      bindDataChannel(dc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const completeOffer = (await gatherCompleteSdp(pc)) || offer;

      const token = encodeSdpToken(completeOffer);
      setLocalSdpToken(token);

      // Emit via local BroadcastChannel / storage for same-browser instant pairing
      emitLocalSignal({
        type: 'offer',
        roomId: cleanRoomId,
        senderId: peerIdRef.current,
        senderName: effectiveName,
        sdp: completeOffer,
        sharedCode,
        timestamp: Date.now(),
      });

      // Also persist to Firestore if authenticated
      if (firebaseUser) {
        try {
          const roomRef = doc(db, 'meet_rooms', cleanRoomId);
          await setDoc(roomRef, {
            roomId: cleanRoomId,
            hostName: effectiveName.slice(0, 100),
            offerSdp: JSON.stringify(completeOffer),
            answerSdp: '',
            sharedCode: sharedCode.slice(0, 15000),
            updatedAt: serverTimestamp(),
          });

          firestoreUnsubRef.current = onSnapshot(roomRef, async (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            if (
              data.answerSdp &&
              pcRef.current &&
              pcRef.current.signalingState === 'have-local-offer'
            ) {
              try {
                const ans = JSON.parse(data.answerSdp) as RTCSessionDescriptionInit;
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(ans));
                setConnectionState('Đã kết nối P2P (Trực tuyến)');
                setStatusBanner(
                  `Thành viên đã tham gia phòng ${cleanRoomId}! Cuộc gọi WebRTC đang hoạt động.`
                );
              } catch {
                // ignore duplicate setRemoteDescription
              }
            }
          });
        } catch {
          // Firestore optional when offline or unauthenticated
        }
      }

      setConnectionState('Đang chờ người tham gia...');
      setStatusBanner(
        `Phòng ${cleanRoomId} đã sẵn sàng! Hãy gửi Mã Phòng "${cleanRoomId}" cho bạn học (hoặc mở thêm 1 tab trình duyệt và nhấn "Vào Phòng Họp (Guest)").`
      );
    } catch (err) {
      setStatusBanner(
        `Lỗi tạo phòng WebRTC: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  // Join as Guest (Read Offer from Room & Respond with Answer)
  const handleJoinRoomAsGuest = async () => {
    if (!cleanRoomId) {
      setStatusBanner('[!] Vui lòng nhập Mã Phòng Họp trước khi vào phòng!');
      return;
    }
    try {
      setRole('guest');
      setConnectionState('Đang tìm phòng họp...');
      setStatusBanner(`Đang kết nối vào phòng họp ${cleanRoomId}...`);

      let foundOffer: RTCSessionDescriptionInit | null = null;
      let hostDisplay = 'Chủ phòng';

      // 1. Check localStorage signal from same browser first
      const cachedRaw = localStorage.getItem(`thpt_webrtc_signal_${cleanRoomId}`);
      if (cachedRaw) {
        try {
          const parsed = JSON.parse(cachedRaw) as SignalEnvelope;
          if (parsed.type === 'offer' && parsed.sdp) {
            foundOffer = parsed.sdp;
            hostDisplay = parsed.senderName || hostDisplay;
            if (parsed.sharedCode) setSharedCode(parsed.sharedCode);
          }
        } catch {
          // ignore
        }
      }

      // 2. Check Firestore /meet_rooms/{roomId} if not found locally and signed in
      if (!foundOffer && firebaseUser) {
        try {
          const roomRef = doc(db, 'meet_rooms', cleanRoomId);
          const snap = await getDoc(roomRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data.offerSdp) {
              foundOffer = JSON.parse(data.offerSdp) as RTCSessionDescriptionInit;
              hostDisplay = data.hostName || hostDisplay;
              if (data.sharedCode) setSharedCode(data.sharedCode);
            }
          }
        } catch {
          // ignore
        }
      }

      // 3. Check if user pasted a manual Offer SDP token
      if (!foundOffer && remoteSdpInput.trim()) {
        foundOffer = decodeSdpToken(remoteSdpInput);
      }

      if (!foundOffer) {
        setConnectionState('Chờ tín hiệu từ Chủ phòng');
        setShowManualSdp(true);
        setStatusBanner(
          `Chưa tìm thấy phòng "${cleanRoomId}" trên thiết bị này. Hãy bảo chủ phòng nhấn "Tạo Phòng Họp Mới (Host)" trước, hoặc dán Mã Mời P2P vào mục Kết Nối Thủ Công bên dưới.`
        );
        return;
      }

      setRemotePeerName(hostDisplay);
      const pc = await createConfiguredPeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription(foundOffer));
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

      const answerToken = encodeSdpToken(completeAnswer);
      setLocalSdpToken(answerToken);

      emitLocalSignal({
        type: 'answer',
        roomId: cleanRoomId,
        senderId: peerIdRef.current,
        senderName: effectiveName,
        sdp: completeAnswer,
        timestamp: Date.now(),
      });

      if (firebaseUser) {
        try {
          const roomRef = doc(db, 'meet_rooms', cleanRoomId);
          await setDoc(
            roomRef,
            {
              roomId: cleanRoomId,
              hostName: hostDisplay.slice(0, 100),
              offerSdp: JSON.stringify(foundOffer),
              answerSdp: JSON.stringify(completeAnswer),
              sharedCode: sharedCode.slice(0, 15000),
              updatedAt: serverTimestamp(),
            },
            { merge: false }
          );
        } catch {
          // ignore
        }
      }

      setConnectionState('Đã kết nối P2P (Trực tuyến)');
      setStatusBanner(
        `Đã tham gia phòng ${cleanRoomId} cùng ${hostDisplay}! Kết nối WebRTC hoàn tất.`
      );
    } catch (err) {
      setStatusBanner(
        `Không thể kết nối vào phòng: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  // Apply manual remote SDP (Offer or Answer) for cross-network static deployments
  const handleApplyManualRemoteToken = async () => {
    const decoded = decodeSdpToken(remoteSdpInput);
    if (!decoded) {
      setStatusBanner('[!] Mã tín hiệu P2P không hợp lệ. Vui lòng sao chép đầy đủ mã.');
      return;
    }

    try {
      if (decoded.type === 'offer') {
        setRole('guest');
        const pc = await createConfiguredPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(decoded));
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
        setLocalSdpToken(encodeSdpToken(completeAnswer));
        setConnectionState('Đã tạo Mã Phản Hồi (Answer)');
        setStatusBanner(
          'Đã nhận Mã Mời (Offer)! Hãy sao chép "Mã Phản Hồi Của Bạn" bên dưới gửi lại cho Chủ phòng để hoàn tất kết nối.'
        );
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

      if (
        msg.type === 'answer' &&
        msg.sdp &&
        pcRef.current &&
        pcRef.current.signalingState === 'have-local-offer'
      ) {
        try {
          setRemotePeerName(msg.senderName || 'Bạn học');
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
      } else if (msg.type === 'hangup') {
        setConnectionState('Người kia đã rời phòng');
        setIsPeerScreenSharing(false);
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
  }, [cleanRoomId]);

  // Initialize local audio stream on mount
  useEffect(() => {
    ensureLocalMediaStream().catch(() => {});
    return () => {
      cleanupPeerConnection();
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (peerLocalScreenStreamRef.current) {
        peerLocalScreenStreamRef.current.getTracks().forEach((t) => t.stop());
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
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = isPeerMicOn;
    }
    setIsPeerMicOn((prev) => !prev);
  };

  const notifyPeerScreenStatus = (isSharing: boolean) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(
        JSON.stringify({ type: 'screen-status', isSharing })
      );
    }
    if (cleanRoomId) {
      emitLocalSignal({
        type: 'screen-status',
        roomId: cleanRoomId,
        senderId: peerIdRef.current,
        senderName: effectiveName,
        isSharing,
        timestamp: Date.now(),
      });
    }
  };

  const attachTrackToPeerConnection = async (screenTrack: MediaStreamTrack | null, stream?: MediaStream) => {
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

  const handleToggleScreenShare = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setStatusBanner('Trình duyệt hiện tại không hỗ trợ API chia sẻ màn hình (getDisplayMedia).');
      return;
    }

    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      await attachTrackToPeerConnection(null);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      setIsScreenSharing(false);
      notifyPeerScreenStatus(false);
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
      }
      setIsScreenSharing(true);
      notifyPeerScreenStatus(true);
      screenTrack.onended = () => {
        setIsScreenSharing(false);
        notifyPeerScreenStatus(false);
        screenStreamRef.current = null;
        attachTrackToPeerConnection(null).catch(() => {});
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      };
    } catch {
      setStatusBanner('Đã hủy thao tác chia sẻ màn hình.');
    }
  };

  // Allows Bạn học / Giáo viên panel to start/stop screen sharing directly or display incoming P2P screen stream
  const handleTogglePeerScreenShare = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setStatusBanner('Trình duyệt hiện tại không hỗ trợ API chia sẻ màn hình (getDisplayMedia).');
      return;
    }

    if (isPeerScreenSharing) {
      if (peerLocalScreenStreamRef.current) {
        peerLocalScreenStreamRef.current.getTracks().forEach((t) => t.stop());
        peerLocalScreenStreamRef.current = null;
      }
      await attachTrackToPeerConnection(null);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      setIsPeerScreenSharing(false);
      notifyPeerScreenStatus(false);
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      peerLocalScreenStreamRef.current = displayStream;
      const screenTrack = displayStream.getVideoTracks()[0];
      if (screenTrack) {
        await attachTrackToPeerConnection(screenTrack, displayStream);
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = displayStream;
      }
      setIsPeerScreenSharing(true);
      notifyPeerScreenStatus(true);
      screenTrack.onended = () => {
        setIsPeerScreenSharing(false);
        notifyPeerScreenStatus(false);
        peerLocalScreenStreamRef.current = null;
        attachTrackToPeerConnection(null).catch(() => {});
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
      };
    } catch {
      setStatusBanner('Đã hủy thao tác chia sẻ màn hình của Bạn học / Giáo viên.');
    }
  };

  const handleHangUp = () => {
    emitLocalSignal({
      type: 'hangup',
      roomId: cleanRoomId,
      senderId: peerIdRef.current,
      senderName: effectiveName,
      timestamp: Date.now(),
    });
    cleanupPeerConnection();
    setRole('idle');
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
    setChatMessages((prev) => [...prev, msg]);
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
  };

  const handleSharedCodeChange = (nextCode: string) => {
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
  };

  return (
    <div
      data-testid="webrtc-meet-view"
      className="space-y-6 animate-fade-slide min-w-0 overflow-hidden"
    >
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

          <div className="px-4 py-2.5 bg-black text-white text-xs sm:text-sm font-mono-tabular font-bold shrink-0 self-start lg:self-center">
            Trạng thái: {connectionState}
          </div>
        </div>

        {/* Room Code & Join / Host Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-4">
            <label
              htmlFor="webrtc-room-id"
              className="block text-xs sm:text-sm font-bold text-black mb-1"
            >
              Mã Phòng Họp (Room Code):
            </label>
            <div className="flex items-stretch gap-2">
              <input
                id="webrtc-room-id"
                data-testid="webrtc-room-input"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Nhập mã phòng họp..."
                className="w-full px-3 py-2 text-sm sm:text-base font-mono-tabular font-bold bg-white border-2 border-black text-black focus:outline-none min-w-0"
              />
              <button
                type="button"
                disabled={!cleanRoomId}
                onClick={() => {
                  if (navigator.clipboard && cleanRoomId) {
                    navigator.clipboard.writeText(cleanRoomId);
                  }
                  setCopiedRoom(true);
                  setTimeout(() => setCopiedRoom(false), 2000);
                }}
                className="coder-btn px-3 py-2 text-xs sm:text-sm font-bold bg-white border-2 border-black text-black hover:bg-zinc-200 disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedRoom ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedRoom ? 'Đã chép' : 'Chép mã'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              data-testid="webrtc-create-room-btn"
              onClick={handleCreateRoomAsHost}
              className="coder-btn flex-1 sm:flex-initial px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-black hover:bg-zinc-800 border-2 border-black flex items-center justify-center gap-2 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4 shrink-0" />
              <span>Tạo Phòng Họp Mới (Host)</span>
            </button>

            <button
              type="button"
              data-testid="webrtc-join-room-btn"
              onClick={handleJoinRoomAsGuest}
              className="coder-btn flex-1 sm:flex-initial px-4 py-2.5 text-xs sm:text-sm font-bold text-black bg-white hover:bg-zinc-200 border-2 border-black flex items-center justify-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Vào Phòng Họp (Guest)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowManualSdp((prev) => !prev)}
              className="coder-btn px-3.5 py-2.5 text-xs sm:text-sm font-bold text-black bg-zinc-200 hover:bg-zinc-300 border-2 border-black flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>Mã P2P Khác Mạng</span>
            </button>

            {role !== 'idle' && (
              <button
                type="button"
                onClick={handleHangUp}
                className="coder-btn px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white bg-red-700 hover:bg-red-800 border-2 border-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4 shrink-0" />
                <span>Rời Phòng</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Banner */}
        <div className="p-3 bg-white border border-black text-xs sm:text-sm text-black flex items-center justify-between gap-2">
          <span>{statusBanner}</span>
        </div>

        {/* Optional Cross-Network Manual SDP Exchange Panel */}
        {showManualSdp && (
          <div className="p-4 bg-white border-2 border-black space-y-3">
            <div className="text-xs sm:text-sm font-bold text-black">
              Kết Nối P2P Trực Tiếp Giữa 2 Máy Khác Mạng (Không Cần Đăng Nhập):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700">
                  1. Mã Tín Hiệu WebRTC Của Bạn ({role === 'host' ? 'Offer' : 'Answer'}):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={localSdpToken}
                    placeholder="Nhấn 'Tạo Phòng Họp Mới' để sinh mã..."
                    className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-zinc-100 border border-black text-black"
                  />
                  <button
                    type="button"
                    disabled={!localSdpToken}
                    onClick={() => {
                      if (navigator.clipboard && localSdpToken) {
                        navigator.clipboard.writeText(localSdpToken);
                        setCopiedSdp(true);
                        setTimeout(() => setCopiedSdp(false), 2000);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-black text-white disabled:opacity-40 shrink-0 cursor-pointer"
                  >
                    {copiedSdp ? 'Đã chép!' : 'Sao chép'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700">
                  2. Dán Mã Tín Hiệu Từ Bạn Học Để Kết Nối:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={remoteSdpInput}
                    onChange={(e) => setRemoteSdpInput(e.target.value)}
                    placeholder="Dán mã Offer hoặc Answer của bạn học..."
                    className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-zinc-100 border border-black text-black"
                  />
                  <button
                    type="button"
                    onClick={handleApplyManualRemoteToken}
                    className="px-3 py-1.5 text-xs font-bold bg-black text-white shrink-0 cursor-pointer"
                  >
                    Kết nối P2P
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dual Video Stage (Local Stream + Remote Stream) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Local Participant Stage (Audio + Screen Share Only) */}
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
                  Nhấn nút <strong>Chia Sẻ Màn Hình</strong> bên dưới nếu bạn muốn trình chiếu màn hình bài làm cho các thành viên trong phòng.
                </p>
              </div>
            )}
          </div>

          {/* Media Control Bar (Mic & Screen Share Only) */}
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

        {/* Remote Participant Stage (Bạn học / Giáo viên — Audio + Screen Share) */}
        <div className="border-2 border-black bg-zinc-950 text-white overflow-hidden flex flex-col justify-between">
          <div className="px-4 py-2.5 bg-black border-b border-zinc-800 flex items-center justify-between gap-2 text-xs sm:text-sm">
            <span className="font-bold text-white truncate">
              Đối tác: {remotePeerName}
            </span>
            <span className="text-sky-400 font-mono-tabular text-xs">
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
              className={`w-full h-full object-contain ${isPeerScreenSharing ? 'block' : 'hidden'}`}
            />
            {!isPeerScreenSharing && (
              <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center p-6 text-center space-y-2">
                <Users className="w-10 h-10 text-zinc-400" />
                <div className="text-sm sm:text-base font-bold text-white">
                  {connectionState === 'Đã kết nối P2P (Trực tuyến)'
                    ? `${remotePeerName} đang kết nối âm thanh`
                    : role === 'idle'
                      ? 'Chưa bắt đầu phiên gọi WebRTC'
                      : 'Đang chờ luồng Âm thanh / Màn hình từ thành viên trong phòng...'}
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md">
                  Bạn học / Giáo viên có thể nhấn nút <strong>Chia Sẻ Màn Hình</strong> bên dưới (hoặc từ thiết bị đối tác) để trình chiếu bài giảng và code trực tiếp.
                </p>
              </div>
            )}
          </div>

          {/* Peer Media Control Bar (Mic & Screen Share for Bạn học / Giáo viên) */}
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

            <button
              type="button"
              data-testid="webrtc-peer-toggle-screen-btn"
              onClick={handleTogglePeerScreenShare}
              className={`px-3.5 py-2 text-xs sm:text-sm font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                isPeerScreenSharing
                  ? 'bg-emerald-500 text-black border-emerald-400'
                  : 'bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800'
              }`}
            >
              <MonitorUp className="w-4 h-4" />
              <span>{isPeerScreenSharing ? 'Dừng Chia Sẻ' : 'Chia Sẻ Màn Hình'}</span>
            </button>
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
