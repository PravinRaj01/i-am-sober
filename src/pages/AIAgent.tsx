import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Send, 
  Sparkles, 
  Plus, 
  Trash2, 
  MessageSquare, 
  ChevronDown,
  Bot
} from "lucide-react";
import ChatMessage from "@/components/chatbot/ChatMessage";
import QuickActions from "@/components/chatbot/QuickActions";
import StorageImage from "@/components/StorageImage";
import OpikBadge from "@/components/OpikBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AIAgent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // Initialize conversation
  useEffect(() => {
    const initConversation = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: conversations } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (conversations && conversations.length > 0) {
        setCurrentConversationId(conversations[0].id);
      } else {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({ user_id: user.id, title: "New Conversation" })
          .select()
          .single();
        
        if (newConv) setCurrentConversationId(newConv.id);
      }
    };

    initConversation();
  }, [navigate]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingMessage]);

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
    enabled: !!currentConversationId,
  });

  const handleConversationTitleChange = (convId: string, newTitle: string) => {
    queryClient.setQueryData(['conversations'], (oldData: any[] | undefined) => {
      if (!oldData) return [];
      return oldData.map(conv => 
        conv.id === convId ? { ...conv, title: newTitle } : conv
      );
    });
  };

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

    const userInput = messageToSend;
    setInput("");
    setStreaming(true);
    setStreamingMessage("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const userMessage = {
        id: `temp-user-${Date.now()}`,
        role: "user",
        content: userInput,
        created_at: new Date().toISOString(),
        conversation_id: currentConversationId,
        user_id: user.id,
      };

      const currentMessages = queryClient.getQueryData<any[]>(["chat-messages", currentConversationId]) || [];
      queryClient.setQueryData(["chat-messages", currentConversationId], [...currentMessages, userMessage]);

      await saveMessageMutation.mutateAsync({ role: "user", content: userInput });

      const conversationHistory = currentMessages.map(m => ({ 
        role: m.role, 
        content: m.content 
      }));

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
            message: userInput,
            conversationHistory: conversationHistory,
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

      const data = await response.json();
      const aiResponse = data.response || data.choices?.[0]?.message?.content || "";
      const toolsUsed = data.tools_used || [];
      
      if (aiResponse) {
        await supabase.from("chat_messages").insert({
          user_id: user.id,
          conversation_id: currentConversationId,
          role: "assistant",
          content: aiResponse,
          metadata: { tools_used: toolsUsed, response_time_ms: data.response_time_ms }
        });
        
        queryClient.invalidateQueries({ queryKey: ["chat-messages", currentConversationId] });
        
        if (toolsUsed.length > 0) {
          queryClient.invalidateQueries({ queryKey: ["goals"] });
          queryClient.invalidateQueries({ queryKey: ["check-ins"] });
          queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["chat-messages", currentConversationId] });
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

  const TypingIndicator = () => (
    <div className="flex items-center gap-2 p-4">
      <Avatar className="h-8 w-8 border-2 border-primary/20 bg-card">
        <StorageImage
          bucket="logos"
          path="logo.png"
          alt="Bot"
          className="h-full w-full object-contain p-1"
          fallback={
            <AvatarFallback className="bg-gradient-primary">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </AvatarFallback>
          }
        />
      </Avatar>
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse delay-0"></span>
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse delay-200"></span>
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse delay-400"></span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-40">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20 bg-card">
              <StorageImage
                bucket="logos"
                path="logo.png"
                alt="Bot"
                className="h-full w-full object-contain p-1"
                fallback={
                  <AvatarFallback className="bg-gradient-primary">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </AvatarFallback>
                }
              />
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">AI Coach</h1>
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <p className="text-xs text-muted-foreground">Your intelligent recovery companion</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <OpikBadge />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearChat}
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Conversation Selector */}
      {conversations && conversations.length > 0 && (
        <div className="px-4 sm:px-6 py-3 border-b border-border/30 flex items-center justify-between gap-2 bg-card/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 max-w-[300px]">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {conversations.find(c => c.id === currentConversationId)?.title || "New Conversation"}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px] max-h-[400px] overflow-y-auto">
              <DropdownMenuLabel>Conversations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {conversations.map((conv) => (
                <div key={conv.id} className="flex items-center group pr-2">
                  <DropdownMenuItem
                    className="flex-1 cursor-pointer"
                    onSelect={(e) => {
                      if ((e.target as HTMLElement).closest('input')) {
                        e.preventDefault();
                        return;
                      }
                      setCurrentConversationId(conv.id);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={conv.title ?? "New Conversation"}
                      onChange={(e) => handleConversationTitleChange(conv.id, e.target.value)}
                      onBlur={async (e) => {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return;
                        
                        await supabase
                          .from("conversations")
                          .update({ title: e.target.value })
                          .eq("id", conv.id);
                        
                        queryClient.invalidateQueries({ queryKey: ["conversations"] });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent border-none outline-none flex-1 text-sm w-full"
                    />
                  </DropdownMenuItem>
                  {conversations.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConversationToDelete(conv.id);
                        setShowDeleteDialog(true);
                      }}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewConversation}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (conversationToDelete) {
                  handleDeleteConversation(conversationToDelete);
                  setShowDeleteDialog(false);
                  setConversationToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <Sparkles className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground">Loading your conversation...</p>
              </div>
            ) : messages?.length === 0 ? (
              <div className="text-center py-16 space-y-6">
                <div className="space-y-3">
                  <Avatar className="h-24 w-24 mx-auto border-4 border-primary/20 bg-card shadow-glow">
                    <StorageImage
                      bucket="logos"
                      path="logo.png"
                      alt="Bot"
                      className="h-full w-full object-contain p-3"
                      fallback={
                        <AvatarFallback className="bg-gradient-primary">
                          <Bot className="h-12 w-12 text-primary-foreground" />
                        </AvatarFallback>
                      }
                    />
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Welcome! 👋</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      I'm your AI Coach. I can help you set goals, log your mood, write journal entries, and provide personalized support on your recovery journey.
                    </p>
                  </div>
                </div>
                <QuickActions onAction={handleSend} />
              </div>
            ) : (
              <>
                {messages?.map((msg) => (
                  <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
                ))}
                {streaming && (
                  <ChatMessage
                    role="assistant"
                    content={streamingMessage || "Thinking..."}
                    isStreaming
                  />
                )}
                <div ref={scrollRef} />
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {streaming && !streamingMessage && <TypingIndicator />}

      {/* Input Area */}
      <div className="border-t border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <div className="relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your recovery..."
                disabled={streaming}
                className="pr-14 h-12 text-base bg-background/50 border-primary/20 focus:border-primary/40"
              />
              <Button
                type="submit"
                disabled={!input.trim() || streaming}
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-primary hover:shadow-glow transition-all h-9 w-9"
              >
                {streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Powered by Agentic AI • Can take actions on your behalf
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIAgent;
