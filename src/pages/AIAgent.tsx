import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Loader2, 
  Send, 
  Sparkles, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Bot,
  ArrowLeft,
  Mic,
  MicOff,
  Search,
  MoreVertical,
  Pencil
} from "lucide-react";
import ChatMessage from "@/components/chatbot/ChatMessage";
import QuickActions from "@/components/chatbot/QuickActions";
import StorageImage from "@/components/StorageImage";
import OpikBadge from "@/components/OpikBadge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { formatDistanceToNow } from "date-fns";

const AIAgent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [showConversationList, setShowConversationList] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Rename dialog
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [conversationToRename, setConversationToRename] = useState<string | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState("");

  // Voice recording
  const handleTranscription = (text: string) => {
    setInput(text);
  };
  
  const { isRecording, isProcessing, startRecording, stopRecording } = useVoiceRecording(handleTranscription);

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
        if (!isMobile) setShowConversationList(true);
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
  }, [navigate, isMobile]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingMessage]);

  // Maintain input focus after state changes
  useEffect(() => {
    if (!streaming && !isRecording && !isProcessing && inputRef.current) {
      // Small delay to ensure re-renders complete
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [streaming, isRecording, isProcessing]);

  // Handle input change with stable callback
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

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

  const filteredConversations = conversations?.filter(conv => 
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-with-ai`,
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
      if (isMobile) setShowConversationList(false);
    }
  };

  const handleSelectConversation = (convId: string) => {
    setCurrentConversationId(convId);
    if (isMobile) setShowConversationList(false);
  };

  const handleDeleteConversation = async (convId: string) => {
    await supabase.from("chat_messages").delete().eq("conversation_id", convId);
    await supabase.from("conversations").delete().eq("id", convId);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    
    if (convId === currentConversationId && conversations && conversations.length > 1) {
      const nextConv = conversations.find(c => c.id !== convId);
      setCurrentConversationId(nextConv?.id || null);
    }
  };

  const handleRenameConversation = async () => {
    if (!conversationToRename || !newConversationTitle.trim()) return;
    
    await supabase
      .from("conversations")
      .update({ title: newConversationTitle.trim() })
      .eq("id", conversationToRename);
    
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    setShowRenameDialog(false);
    setConversationToRename(null);
    setNewConversationTitle("");
    
    toast({
      title: "Conversation renamed",
      description: "The conversation title has been updated.",
    });
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

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const openRenameDialog = (convId: string, currentTitle: string) => {
    setConversationToRename(convId);
    setNewConversationTitle(currentTitle);
    setShowRenameDialog(true);
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

  // Handle search input change with stable callback
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Conversation List Component
  const ConversationList = () => (
    <div className="flex flex-col h-full bg-card/95 border-r border-border/50">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isMobile && <SidebarTrigger className="h-8 w-8" />}
            <h2 className="text-lg font-bold">Chats</h2>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNewConversation}
            className="h-8 w-8"
            title="New conversation"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search chats..."
            className="pl-9 h-9 bg-muted/50"
          />
        </div>
      </div>
      
      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredConversations?.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelectConversation(conv.id)}
              className={`
                group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                ${conv.id === currentConversationId 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted/50'
                }
              `}
            >
              <Avatar className={`h-10 w-10 border-2 ${conv.id === currentConversationId ? 'border-primary-foreground/30' : 'border-primary/20'} bg-card shrink-0`}>
                <AvatarFallback className={conv.id === currentConversationId ? 'bg-primary-foreground/20' : 'bg-primary/10'}>
                  <MessageSquare className={`h-4 w-4 ${conv.id === currentConversationId ? 'text-primary-foreground' : 'text-primary'}`} />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{conv.title || "New Conversation"}</p>
                <p className={`text-xs truncate ${conv.id === currentConversationId ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                </p>
              </div>
              
              {/* 3-dot Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`
                      h-7 w-7 shrink-0 transition-colors
                      ${conv.id === currentConversationId 
                        ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground' 
                        : 'bg-muted/50 hover:bg-muted text-foreground'
                      }
                    `}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    openRenameDialog(conv.id, conv.title || "New Conversation");
                  }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  {conversations && conversations.length > 1 && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConversationToDelete(conv.id);
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          
          {(!filteredConversations || filteredConversations.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No conversations yet</p>
              <Button
                variant="link"
                onClick={handleNewConversation}
                className="text-primary mt-2"
              >
                Start your first chat
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // Chat View Component
  const ChatView = () => (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-40 shrink-0">
        <div className="px-4 py-4 flex items-center justify-between gap-4 max-w-full overflow-hidden">
          <div className="flex items-center gap-3 min-w-0">
            {isMobile && <SidebarTrigger className="h-8 w-8 shrink-0" />}
            {!isMobile && <SidebarTrigger className="lg:hidden shrink-0" />}
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
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold truncate">
                  {conversations?.find(c => c.id === currentConversationId)?.title || "AI Coach"}
                </h1>
                <Sparkles className="h-4 w-4 text-primary animate-pulse shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">Your intelligent recovery companion</p>
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

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
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
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <div className="relative flex gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  placeholder={isRecording ? "Listening..." : isProcessing ? "Processing..." : "Ask me anything about your recovery..."}
                  disabled={streaming || isRecording || isProcessing}
                  className="pr-4 h-12 text-base bg-background/50 border-primary/20 focus:border-primary/40"
                />
              </div>
              
              {/* Voice Recording Button */}
              <Button
                type="button"
                onClick={handleVoiceToggle}
                disabled={streaming || isProcessing}
                size="icon"
                variant={isRecording ? "destructive" : "outline"}
                className={`h-12 w-12 shrink-0 ${isRecording ? 'animate-pulse' : ''}`}
                title={isRecording ? "Stop recording" : "Start voice recording"}
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
              
              {/* Send Button */}
              <Button
                type="submit"
                disabled={!input.trim() || streaming}
                size="icon"
                className="h-12 w-12 shrink-0 bg-gradient-primary hover:shadow-glow transition-all"
              >
                {streaming ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Powered by Agentic AI • Tap mic to send voice notes
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
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

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
            <DialogDescription>
              Enter a new name for this conversation.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newConversationTitle}
            onChange={(e) => setNewConversationTitle(e.target.value)}
            placeholder="Conversation name..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRenameConversation();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameConversation} disabled={!newConversationTitle.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Layout */}
      <div className="flex h-full">
        {/* Mobile: Show either list or chat */}
        {isMobile ? (
          showConversationList ? (
            <div className="w-full h-full">
              <ConversationList />
            </div>
          ) : (
            <div className="w-full h-full">
              <ChatView />
            </div>
          )
        ) : (
          /* Desktop: Resizable panels */
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40} className="hidden md:block">
              <ConversationList />
            </ResizablePanel>
            <ResizableHandle withHandle className="hidden md:flex" />
            <ResizablePanel defaultSize={75} minSize={50}>
              <ChatView />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </>
  );
};

export default AIAgent;
