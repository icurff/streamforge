import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Send } from "lucide-react";
import accessToken from "@/utils/LocalStorage";
import { format } from "date-fns";

// Component riêng cho chat avatar để hiển thị đúng avatar từ message
function ChatAvatar({
  username,
  avatar,
  size = "sm",
}: {
  username: string;
  avatar?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const getUserInitials = (uname: string) => {
    return uname
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <Avatar className={sizeClasses[size]}>
      {avatar && <AvatarImage src={avatar} alt={username} />}
      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-semibold">
        {getUserInitials(username)}
      </AvatarFallback>
    </Avatar>
  );
}

interface ChatMessage {
  username: string;
  message: string;
  avatar?: string;
  timestamp: string;
  streamUsername: string;
}

interface LiveChatProps {
  streamUsername: string;
}

export function LiveChat({ streamUsername }: LiveChatProps) {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!streamUsername) return;

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";

    // Xử lý WebSocket URL: nếu apiUrl là relative path (bắt đầu bằng /),
    // sử dụng window.location để tạo WebSocket URL
    let wsUrl: string;
    if (apiUrl.startsWith("http://") || apiUrl.startsWith("https://")) {
      // Absolute URL: chuyển http/https thành ws/wss
      try {
        const url = new URL(apiUrl);
        const protocol = url.protocol === "https:" ? "wss:" : "ws:";
        // Remove trailing slashes from pathname, then ensure proper path construction
        const pathname = url.pathname.replace(/\/+$/, "");
        // If pathname is empty or just "/", start fresh with "/ws/chat"
        // Otherwise, ensure single slash between pathname and "/ws/chat"
        if (!pathname || pathname === "/") {
          wsUrl = `${protocol}//${url.host}/ws/chat`;
        } else {
          wsUrl = `${protocol}//${url.host}${pathname}/ws/chat`;
        }
      } catch (e) {
        // Fallback to string replacement if URL parsing fails
        const cleanUrl = apiUrl.replace(/\/+$/, "");
        wsUrl = cleanUrl.replace(/^https?/, "ws") + "/ws/chat";
      }
    } else {
      // Relative path: sử dụng window.location
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host + ":8080";
      const cleanApiUrl = apiUrl.replace(/^\/+|\/+$/g, ""); // Remove leading and trailing slashes
      wsUrl = `${protocol}//${host}/${
        cleanApiUrl ? cleanApiUrl + "/" : ""
      }ws/chat`;
    }

    const token = accessToken.getAccessToken();

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Gửi join message để đăng ký stream (không cần token để xem)
        ws.send(
          JSON.stringify({
            type: "join",
            token: token || null,
            streamUsername: streamUsername,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Kiểm tra nếu là error
          if (data.error) {
            console.error("WebSocket error:", data.error);
            return;
          }

          // Kiểm tra nếu là viewer count update
          if (
            data.type === "viewerCount" &&
            data.streamUsername === streamUsername
          ) {
            setViewerCount(data.count || 0);
            return;
          }

          // Kiểm tra nếu là chat message
          if (
            data.username &&
            data.message &&
            data.streamUsername === streamUsername
          ) {
            setMessages((prev) => [...prev, data]);
            // Auto scroll to bottom
            setTimeout(() => {
              if (scrollAreaRef.current) {
                const scrollContainer = scrollAreaRef.current.querySelector(
                  "[data-radix-scroll-area-viewport]"
                );
                if (scrollContainer) {
                  scrollContainer.scrollTop = scrollContainer.scrollHeight;
                }
              }
            }, 100);
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Reconnect after 3 seconds
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            // Reconnect logic handled by useEffect
          }
        }, 3000);
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [streamUsername]);

  const sendMessage = () => {
    if (
      !inputMessage.trim() ||
      !isConnected ||
      !wsRef.current ||
      !isAuthenticated
    ) {
      return;
    }
    const token = accessToken.getAccessToken();
    if (!token) {
      alert("Please login to send messages");
      return;
    }

    try {
      wsRef.current.send(
        JSON.stringify({
          type: "message",
          message: inputMessage.trim(),
          token: token,
          streamUsername: streamUsername,
        })
      );
      setInputMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Viewer count được cập nhật từ server qua WebSocket

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Live Chat</CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{viewerCount}</span>
            {isConnected ? (
              <span className="ml-2 h-2 w-2 bg-green-500 rounded-full"></span>
            ) : (
              <span className="ml-2 h-2 w-2 bg-gray-400 rounded-full"></span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4 py-2" ref={scrollAreaRef}>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                {isConnected
                  ? "No messages yet. Be the first to chat!"
                  : "Connecting to chat..."}
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="flex gap-2">
                  <ChatAvatar
                    username={msg.username}
                    avatar={msg.avatar}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm">
                        @{msg.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {msg.timestamp
                          ? format(new Date(msg.timestamp), "HH:mm")
                          : ""}
                      </span>
                    </div>
                    <p className="text-sm break-words">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-3">
          {isAuthenticated ? (
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!isConnected}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!isConnected || !inputMessage.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Please login to send messages
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
