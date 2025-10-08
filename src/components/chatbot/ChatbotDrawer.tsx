import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import ChatbotMiniView from "./ChatbotMiniView";
import ChatbotFullView from "./ChatbotFullView";

export type ChatbotState = 'closed' | 'mini' | 'sidebar' | 'full';

interface ChatbotDrawerProps {
  state: ChatbotState;
  onStateChange: (state: ChatbotState) => void;
}

const ChatbotDrawer = ({ state, onStateChange }: ChatbotDrawerProps) => {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { state: sidebarState } = useSidebar();
  const sidebarWidth = sidebarState === "collapsed" ? "left-16" : "left-60";

  // Fetch or create default conversation
  useEffect(() => {
    const initConversation = async () => {
      if (state === 'closed') return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: conversations } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (conversations && conversations.length > 0) {
        setCurrentConversationId(conversations[0].id);
      } else {
        // Create first conversation
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({ user_id: user.id, title: "New Conversation" })
          .select()
          .single();
        
        if (newConv) setCurrentConversationId(newConv.id);
      }
    };

    initConversation();
  }, [state]);

  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: state !== 'closed',
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat-messages", currentConversationId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentConversationId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .eq("conversation_id", currentConversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: state !== 'closed' && !!currentConversationId,
  });

  const saveMessageMutation = useMutation({
    mutationFn: async ({ role, content }: { role: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentConversationId) throw new Error("Not authenticated");

      const { error } = await supabase.from("chat_messages").insert({
        user_id: user.id,
        conversation_id: currentConversationId,
        role,
        content,
      });

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", currentConversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", currentConversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const handleSend = async (message?: string) => {
    const messageToSend = message || input.trim();
    if (!messageToSend || streaming || !currentConversationId) return;

    setInput("");
    setStreaming(true);
    setStreamingMessage("");

    let accumulatedResponse = "";

    try {
      // Immediately add user message to UI
      const userMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: messageToSend,
        created_at: new Date().toISOString(),
        conversation_id: currentConversationId,
        user_id: (await supabase.auth.getUser()).data.user?.id || "",
      };

      queryClient.setQueryData(["chat-messages", currentConversationId], (old: any) => [...(old || []), userMessage]);

      await saveMessageMutation.mutateAsync({ role: "user", content: messageToSend });

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `https://jivpbjhroujuoatdqtpx.supabase.co/functions/v1/chat-with-ai`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: messageToSend,
            conversationHistory: messages?.map(m => ({ role: m.role, content: m.content })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error("Rate limits exceeded. Please try again later.");
        }
        if (response.status === 402) {
          throw new Error("AI usage limit reached. Please add credits to continue.");
        }
        throw new Error(errorData.error || "Failed to get AI response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                accumulatedResponse += content;
                setStreamingMessage((prev) => prev + content);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      if (accumulatedResponse) {
        await saveMessageMutation.mutateAsync({
          role: "assistant",
          content: accumulatedResponse,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setStreaming(false);
      setStreamingMessage("");
    }
  };

  const handleNewConversation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newConv } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "New Conversation" })
      .select()
      .single();

    if (newConv) {
      setCurrentConversationId(newConv.id);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    await supabase.from("conversations").delete().eq("id", convId);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    
    if (convId === currentConversationId && conversations && conversations.length > 1) {
      const nextConv = conversations.find(c => c.id !== convId);
      setCurrentConversationId(nextConv?.id || null);
    }
  };

  const handleClearChat = async () => {
    if (!currentConversationId) return;
    
    await supabase
      .from("chat_messages")
      .delete()
      .eq("conversation_id", currentConversationId);
    
    queryClient.invalidateQueries({ queryKey: ["chat-messages", currentConversationId] });
    
    toast({
      title: "Chat cleared",
      description: "All messages have been removed from this conversation.",
    });
  };

  const handleExpandToSidebar = () => onStateChange('sidebar');
  const handleExpandToFull = () => onStateChange('full');
  const handleMinimize = () => onStateChange('mini');
  const handleClose = () => onStateChange('closed');

  if (state === 'closed') return null;

  return (
    <div 
      className={cn(
        "fixed transition-all duration-300",
        state === 'full' && `inset-y-0 right-0 ${sidebarWidth} z-[100]`,
        state === 'sidebar' && "top-4 right-4 bottom-4 z-50",
        state === 'mini' && "bottom-4 right-4 z-50"
      )}
    >
      <Card 
        className={cn(
          "shadow-2xl transition-all duration-300 border-primary/20",
          state === 'full' && "w-full h-full",
          state === 'sidebar' && "w-[500px] h-full",
          state === 'mini' && "w-[400px] h-[500px]"
        )}
      >
        {state === 'mini' ? (
          <ChatbotMiniView
            messages={messages || []}
            streamingMessage={streamingMessage}
            streaming={streaming}
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            onExpandToSidebar={handleExpandToSidebar}
            onQuickAction={handleSend}
            onClose={handleClose}
          />
        ) : (
          <ChatbotFullView
            messages={messages || []}
            streamingMessage={streamingMessage}
            streaming={streaming}
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            onMinimize={handleMinimize}
            onExpandToFull={state === 'sidebar' ? handleExpandToFull : undefined}
            onClose={handleClose}
            onQuickAction={handleSend}
            isLoading={isLoading}
            isSidebarMode={state === 'sidebar'}
            conversations={conversations || []}
            currentConversationId={currentConversationId}
            onConversationChange={setCurrentConversationId}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            onClearChat={handleClearChat}
          />
        )}
      </Card>
    </div>
  );
};

export default ChatbotDrawer;