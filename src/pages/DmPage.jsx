import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate, useSearchParams } from 'react-router-dom'

import Footer from '../components/Footer'
import GNB from '../components/Gnb'
import { useAuth } from '../hooks/useAuth'
import './DmPage.css'

const TEXT = {
  loadRoomsFailed: '\ub300\ud654 \ubaa9\ub85d\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.',
  loginRequired: '\ub85c\uadf8\uc778\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.',
  loadMessagesFailed: '\uba54\uc2dc\uc9c0\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.',
  startRoomFailed: '\ub300\ud654\ub97c \uc2dc\uc791\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.',
  selectRoom: '\ub300\ud654\ubc29\uc744 \uba3c\uc800 \uc120\ud0dd\ud574 \uc8fc\uc138\uc694.',
  enterMessage: '\uba54\uc2dc\uc9c0\ub97c \uc785\ub825\ud574 \uc8fc\uc138\uc694.',
  messageTooLong: '\uba54\uc2dc\uc9c0\ub294 2000\uc790 \uc774\ud558\ub85c \uc785\ub825\ud574 \uc8fc\uc138\uc694.',
  sendFailed: '\uba54\uc2dc\uc9c0\ub97c \ubcf4\ub0b4\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.',
  back: '\ub4a4\ub85c\uac00\uae30',
  toFeed: '\ud53c\ub4dc\ub85c \uc774\ub3d9',
  preparingWithNameSuffix: '\ub2d8\uacfc \ub300\ud654\ub97c \uc900\ube44\ud558\uace0 \uc788\uc5b4\uc694.',
  preparing: '\ub300\ud654\ub97c \uc900\ube44\ud558\uace0 \uc788\uc5b4\uc694.',
  syncingRooms: '\ub300\ud654 \ubaa9\ub85d\uc744 \ub3d9\uae30\ud654\ud558\uace0 \uc788\uc5b4\uc694.',
  loadingRooms: '\ub300\ud654 \ubaa9\ub85d\uc744 \ubd88\ub7ec\uc624\ub294 \uc911\uc785\ub2c8\ub2e4.',
  noRooms: '\uc544\uc9c1 \uc2dc\uc791\ud55c DM\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.',
  unknownUser: '\uc0ac\uc6a9\uc790',
  startConversation: '\ub300\ud654\ub97c \uc2dc\uc791\ud574 \ubcf4\uc138\uc694.',
  emptyChat: '\ub300\ud654\ubc29\uc744 \uc120\ud0dd\ud558\uba74 \uba54\uc2dc\uc9c0\uac00 \uc5ec\uae30\uc5d0 \ud45c\uc2dc\ub429\ub2c8\ub2e4.',
  partnerFallback: '\ub300\ud654 \uc0c1\ub300',
  loadingMessages: '\uba54\uc2dc\uc9c0\ub97c \ubd88\ub7ec\uc624\ub294 \uc911\uc785\ub2c8\ub2e4.',
  noMessages: '\uc544\uc9c1 \uc8fc\uace0\ubc1b\uc740 \uba54\uc2dc\uc9c0\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.',
  messagePlaceholder: '\uba54\uc2dc\uc9c0\ub97c \uc785\ub825\ud558\uc138\uc694',
  sending: '\ubcf4\ub0b4\ub294 \uc911...',
  send: '\ubcf4\ub0b4\uae30',
}

function DmPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, accessToken, isAuthenticated, isLoading } = useAuth()

  const [rooms, setRooms] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [isRoomsLoading, setIsRoomsLoading] = useState(false)
  const [isRoomsSyncing, setIsRoomsSyncing] = useState(false)
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isStartingRoom, setIsStartingRoom] = useState(false)
  const [hasLoadedRooms, setHasLoadedRooms] = useState(false)
  const messageEndRef = useRef(null)

  const requestedUserId = searchParams.get('userId')
  const requestedUserName = searchParams.get('name')

  const authHeaders = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  )

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.roomId === selectedRoomId) || null,
    [rooms, selectedRoomId]
  )

  const findRoomByPeerUserId = useCallback((roomList, peerUserId) => {
    if (!peerUserId) {
      return null
    }

    return roomList.find((room) => (
      String(room.peerUserId || room.peer?.id || room.userId || '') === String(peerUserId)
    )) || null
  }, [])

  const syncRoomSelection = useCallback((roomList, options = {}) => {
    setSelectedRoomId((currentRoomId) => {
      const preferredRoom = roomList.find((room) => room.roomId === options.preferredRoomId)
      const preferredPeerRoom = findRoomByPeerUserId(roomList, options.preferredPeerUserId)

      if (preferredRoom?.roomId) {
        return preferredRoom.roomId
      }

      if (preferredPeerRoom?.roomId) {
        return preferredPeerRoom.roomId
      }

      if (options.preserveSelection !== false && currentRoomId) {
        const existingRoom = roomList.find((room) => room.roomId === currentRoomId)
        if (existingRoom) {
          return existingRoom.roomId
        }
      }

      return roomList[0]?.roomId || null
    })
  }, [findRoomByPeerUserId])

  const fetchRooms = useCallback(async (options = {}) => {
    const shouldShowLoading = !options.silent && !hasLoadedRooms

    try {
      if (shouldShowLoading) {
        setIsRoomsLoading(true)
      } else if (!options.silent) {
        setIsRoomsSyncing(true)
      }

      const response = await axios.get('/api/dm/rooms?page=0&size=20', {
        headers: authHeaders,
        withCredentials: true,
      })

      if (!response.data.success) {
        alert(response.data.message || TEXT.loadRoomsFailed)
        return []
      }

      const roomList = response.data?.data?.content || []
      setRooms(roomList)
      setHasLoadedRooms(true)

      if (roomList.length === 0) {
        setSelectedRoomId(null)
        setMessages([])
        return []
      }

      syncRoomSelection(roomList, options)
      return roomList
    } catch (error) {
      console.error('DM rooms fetch error:', error)
      alert(
        error.response?.data?.message ||
          (error.response?.status === 401 ? TEXT.loginRequired : TEXT.loadRoomsFailed)
      )
      return []
    } finally {
      setIsRoomsLoading(false)
      setIsRoomsSyncing(false)
    }
  }, [authHeaders, hasLoadedRooms, syncRoomSelection])

  const markAsRead = useCallback(async (roomId, lastReadMessageId) => {
    try {
      await axios.post(
        `/api/dm/rooms/${roomId}/read`,
        { lastReadMessageId },
        {
          headers: authHeaders,
          withCredentials: true,
        }
      )
    } catch (error) {
      console.error('Mark as read error:', error)
    }
  }, [authHeaders])

  const fetchMessages = useCallback(async (roomId, options = {}) => {
    if (!roomId) {
      return
    }

    try {
      if (!options.silent) {
        setIsMessagesLoading(true)
      }

      const response = await axios.get(`/api/dm/rooms/${roomId}/messages?size=30`, {
        headers: authHeaders,
        withCredentials: true,
      })

      if (!response.data.success) {
        alert(response.data.message || TEXT.loadMessagesFailed)
        return
      }

      const messageList = response.data?.data?.content || []
      const orderedMessages = [...messageList].reverse()
      setMessages(orderedMessages)

      if (orderedMessages.length > 0) {
        const lastMessageId = orderedMessages[orderedMessages.length - 1].messageId
        await markAsRead(roomId, lastMessageId)
      }
    } catch (error) {
      console.error('DM messages fetch error:', error)
      if (!options.silent) {
        alert(error.response?.data?.message || TEXT.loadMessagesFailed)
      }
    } finally {
      if (!options.silent) {
        setIsMessagesLoading(false)
      }
    }
  }, [authHeaders, markAsRead])

  const openOrCreateRoom = useCallback(async (targetUserId, roomList = rooms) => {
    if (!targetUserId || !isAuthenticated) {
      return
    }

    if (String(targetUserId) === String(user?.id)) {
      navigate('/dm', { replace: true })
      return
    }

    const existingRoom = findRoomByPeerUserId(roomList, targetUserId)
    if (existingRoom) {
      setSelectedRoomId(existingRoom.roomId)
      navigate('/dm', { replace: true })
      return
    }

    try {
      setIsStartingRoom(true)

      const response = await axios.post(
        '/api/dm/rooms',
        { targetUserId: Number(targetUserId) },
        {
          headers: authHeaders,
          withCredentials: true,
        }
      )

      if (!response.data.success) {
        alert(response.data.message || TEXT.startRoomFailed)
        return
      }

      const createdRoom = response.data?.data
      const refreshedRooms = await fetchRooms({
        preferredRoomId: createdRoom?.roomId,
        preferredPeerUserId: targetUserId,
        preserveSelection: false,
      })

      const nextRoom = refreshedRooms.find((room) => room.roomId === createdRoom?.roomId)
        || findRoomByPeerUserId(refreshedRooms, targetUserId)

      if (nextRoom?.roomId) {
        setSelectedRoomId(nextRoom.roomId)
      }

      navigate('/dm', { replace: true })
    } catch (error) {
      console.error('Start DM room error:', error)
      alert(error.response?.data?.message || TEXT.startRoomFailed)
    } finally {
      setIsStartingRoom(false)
    }
  }, [authHeaders, fetchRooms, findRoomByPeerUserId, isAuthenticated, navigate, rooms, user?.id])

  const handleSendMessage = async (event) => {
    event.preventDefault()

    if (!selectedRoom?.roomId) {
      alert(TEXT.selectRoom)
      return
    }

    if (!messageInput.trim()) {
      alert(TEXT.enterMessage)
      return
    }

    if (messageInput.trim().length > 2000) {
      alert(TEXT.messageTooLong)
      return
    }

    try {
      setIsSending(true)

      const response = await axios.post(
        `/api/dm/rooms/${selectedRoom.roomId}/messages`,
        { content: messageInput.trim() },
        {
          headers: authHeaders,
          withCredentials: true,
        }
      )

      if (!response.data.success) {
        alert(response.data.message || TEXT.sendFailed)
        return
      }

      setMessageInput('')
      await fetchMessages(selectedRoom.roomId)
      await fetchRooms({
        preferredRoomId: selectedRoom.roomId,
        preserveSelection: true,
        silent: true,
      })
    } catch (error) {
      console.error('Send message error:', error)
      alert(error.response?.data?.message || TEXT.sendFailed)
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    const initializeDmPage = async () => {
      const roomList = await fetchRooms({
        preferredPeerUserId: requestedUserId,
        preserveSelection: false,
      })

      if (requestedUserId) {
        await openOrCreateRoom(requestedUserId, roomList)
      }
    }

    initializeDmPage()
  }, [fetchRooms, isAuthenticated, isLoading, navigate, openOrCreateRoom, requestedUserId])

  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([])
      return
    }

    fetchMessages(selectedRoomId)
  }, [fetchMessages, selectedRoomId])

  useEffect(() => {
    if (!selectedRoomId) {
      return undefined
    }

    const interval = setInterval(() => {
      fetchMessages(selectedRoomId, { silent: true })
      fetchRooms({
        preferredRoomId: selectedRoomId,
        preserveSelection: true,
        silent: true,
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [fetchMessages, fetchRooms, selectedRoomId])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (isLoading) {
    return null
  }

  return (
    <>
      <div className="dm-page-gnb">
        <GNB />
      </div>

      <div className="dm-page-container">
        <div className="dm-page-topbar">
          <button type="button" className="dm-back-button" onClick={() => navigate(-1)}>
            {TEXT.back}
          </button>
          <button type="button" className="dm-back-button ghost" onClick={() => navigate('/posts')}>
            {TEXT.toFeed}
          </button>
        </div>

        <div className="dm-page-card">
          <div className="dm-room-panel">
            <div className="dm-room-panel-header">
              <h2>Direct Messages</h2>
              {isStartingRoom && (
                <p className="dm-room-panel-subtitle">
                  {requestedUserName ? `${requestedUserName}${TEXT.preparingWithNameSuffix}` : TEXT.preparing}
                </p>
              )}
              {!isStartingRoom && isRoomsSyncing && rooms.length > 0 && (
                <p className="dm-room-panel-subtitle">{TEXT.syncingRooms}</p>
              )}
            </div>

            <div className="dm-room-list">
              {isRoomsLoading && !hasLoadedRooms ? (
                <div className="dm-room-list-empty">{TEXT.loadingRooms}</div>
              ) : rooms.length === 0 ? (
                <div className="dm-room-list-empty">{TEXT.noRooms}</div>
              ) : (
                rooms.map((room) => (
                  <button
                    key={room.roomId}
                    type="button"
                    className={`dm-room-item ${selectedRoomId === room.roomId ? 'active' : ''}`}
                    onClick={() => setSelectedRoomId(room.roomId)}
                  >
                    <div className="dm-room-name">{room.peerUserName || TEXT.unknownUser}</div>
                    <div className="dm-room-preview">{room.lastMessagePreview || TEXT.startConversation}</div>
                    {room.unreadCount > 0 && (
                      <div className="dm-room-unread-badge">
                        {room.unreadCount}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="dm-chat-panel">
            {!selectedRoom ? (
              <div className="dm-chat-empty">{TEXT.emptyChat}</div>
            ) : (
              <div className="dm-chat-window">
                <div className="dm-chat-header">
                  <h3>{selectedRoom.peerUserName || TEXT.partnerFallback}</h3>
                </div>

                <div className="dm-chat-messages">
                  {isMessagesLoading ? (
                    <div className="dm-chat-empty">{TEXT.loadingMessages}</div>
                  ) : messages.length === 0 ? (
                    <div className="dm-chat-empty">{TEXT.noMessages}</div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.messageId}
                        className={`dm-message-row ${message.mine ? 'mine' : 'other'}`}
                      >
                        <div className="dm-message-bubble">
                          {!message.mine && (
                            <div className="dm-message-sender">
                              {message.senderName}
                            </div>
                          )}
                          <div>{message.content}</div>
                        </div>
                      </div>
                    ))
                  )}

                  <div ref={messageEndRef} />
                </div>

                <form className="dm-message-input-form" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(event) => setMessageInput(event.target.value)}
                    placeholder={TEXT.messagePlaceholder}
                    className="dm-message-input"
                    disabled={isSending}
                  />

                  <button type="submit" className="dm-send-button" disabled={isSending}>
                    {isSending ? TEXT.sending : TEXT.send}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default DmPage
