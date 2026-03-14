import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import GNB from '../components/Gnb'
import Footer from '../components/Footer'
import './DmPage.css'

function DmPage() {
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [isRoomsLoading, setIsRoomsLoading] = useState(false)
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messageEndRef = useRef(null)

  const fetchRooms = async () => {
    try {
      setIsRoomsLoading(true)

      const response = await axios.get('/api/dm/rooms?page=0&size=20', {
        withCredentials: true,
      })

      if (response.data.success) {
        const roomList = response.data.data.content || []
        setRooms(roomList)

        if (roomList.length > 0) {
          const stillExists = roomList.find(
            (room) => room.roomId === selectedRoom?.roomId
          )

          if (stillExists) {
            setSelectedRoom(stillExists)
          } else if (!selectedRoom) {
            setSelectedRoom(roomList[0])
          }
        } else {
          setSelectedRoom(null)
          setMessages([])
        }
      } else {
        alert(response.data.message)
      }
    } catch (error) {
      console.error('DM rooms fetch error:', error)
      alert('Failed to load DM rooms.')
    } finally {
      setIsRoomsLoading(false)
    }
  }

  const fetchMessages = async (roomId) => {
    if (!roomId) return

    try {
      setIsMessagesLoading(true)

      const response = await axios.get(
        `/api/dm/rooms/${roomId}/messages?size=30`,
        {
          withCredentials: true,
        }
      )

      if (response.data.success) {
        const messageList = response.data.data.content || []
        const orderedMessages = [...messageList].reverse()
        setMessages(orderedMessages)

        if (orderedMessages.length > 0) {
          const lastMessageId =
            orderedMessages[orderedMessages.length - 1].messageId

          await markAsRead(roomId, lastMessageId)
        }
      } else {
        alert(response.data.message)
      }
    } catch (error) {
      console.error('DM messages fetch error:', error)
      alert('Failed to load messages.')
    } finally {
      setIsMessagesLoading(false)
    }
  }

  const markAsRead = async (roomId, lastReadMessageId) => {
    try {
      await axios.post(
        `/api/dm/rooms/${roomId}/read`,
        { lastReadMessageId },
        { withCredentials: true }
      )
    } catch (error) {
      console.error('Mark as read error:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()

    if (!selectedRoom?.roomId) {
      alert('Please select a room.')
      return
    }

    if (!messageInput.trim()) {
      alert('Please enter a message.')
      return
    }

    if (messageInput.trim().length > 2000) {
      alert('Message must be 2000 characters or less.')
      return
    }

    try {
      setIsSending(true)

      const response = await axios.post(
        `/api/dm/rooms/${selectedRoom.roomId}/messages`,
        { content: messageInput.trim() },
        { withCredentials: true }
      )

      if (response.data.success) {
        setMessageInput('')
        await fetchMessages(selectedRoom.roomId)
        await fetchRooms()
      } else {
        alert(response.data.message)
      }
    } catch (error) {
      console.error('Send message error:', error)
      alert('Failed to send message.')
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  useEffect(() => {
    if (selectedRoom?.roomId) {
      fetchMessages(selectedRoom.roomId)
    }
  }, [selectedRoom?.roomId])

  useEffect(() => {
    if (!selectedRoom?.roomId) return

    const interval = setInterval(() => {
      fetchMessages(selectedRoom.roomId)
      fetchRooms()
    }, 3000)

    return () => clearInterval(interval)
  }, [selectedRoom?.roomId])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <>
      <div className="dm-page-gnb">
        <GNB />
      </div>

      <div className="dm-page-container">
        <div className="dm-page-card">
          <div className="dm-room-panel">
            <div className="dm-room-panel-header">
              <h2>Direct Messages</h2>
            </div>

            <div className="dm-room-list">
              {isRoomsLoading ? (
                <div className="dm-room-list-empty">Loading...</div>
              ) : rooms.length === 0 ? (
                <div className="dm-room-list-empty">No DM rooms yet.</div>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room.roomId}
                    className={`dm-room-item ${
                      selectedRoom?.roomId === room.roomId ? 'active' : ''
                    }`}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div className="dm-room-name">{room.peerUserName}</div>

                    <div className="dm-room-preview">
                      {room.lastMessagePreview || 'Start a conversation'}
                    </div>

                    {room.unreadCount > 0 && (
                      <div className="dm-room-unread-badge">
                        {room.unreadCount}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="dm-chat-panel">
            {!selectedRoom ? (
              <div className="dm-chat-empty">Select a conversation.</div>
            ) : (
              <div className="dm-chat-window">
                <div className="dm-chat-header">
                  <h3>{selectedRoom.peerUserName}</h3>
                </div>

                <div className="dm-chat-messages">
                  {isMessagesLoading ? (
                    <div className="dm-chat-empty">Loading...</div>
                  ) : messages.length === 0 ? (
                    <div className="dm-chat-empty">No messages yet.</div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.messageId}
                        className={`dm-message-row ${
                          message.mine ? 'mine' : 'other'
                        }`}
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

                <form
                  className="dm-message-input-form"
                  onSubmit={handleSendMessage}
                >
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Enter your message"
                    className="dm-message-input"
                    disabled={isSending}
                  />

                  <button
                    type="submit"
                    className="dm-send-button"
                    disabled={isSending}
                  >
                    {isSending ? 'Sending...' : 'Send'}
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