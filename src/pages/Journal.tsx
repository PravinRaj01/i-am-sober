import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen, Loader2, Plus, Pencil, Trash2, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Journal = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: entries, refetch } = useQuery({
    queryKey: ["journal-entries"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredEntries = entries?.filter(
    (entry) =>
      entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editingId) {
        const { error } = await supabase
          .from("journal_entries")
          .update({
            title: title.trim() || null,
            content: content.trim(),
          })
          .eq("id", editingId);

        if (error) throw error;

        toast({
          title: "Entry updated!",
          description: "Your journal entry has been updated.",
        });
      } else {
        const { error } = await supabase.from("journal_entries").insert({
          user_id: user.id,
          title: title.trim() || null,
          content: content.trim(),
        });

        if (error) throw error;

        toast({
          title: "Entry saved!",
          description: "Your journal entry has been saved.",
        });
      }

      setTitle("");
      setContent("");
      setEditingId(null);
      setDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: any) => {
    setEditingId(entry.id);
    setTitle(entry.title || "");
    setContent(entry.content);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Entry deleted",
        description: "Your journal entry has been removed.",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 bg-gradient-calm min-h-screen">
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingId(null);
                setTitle("");
                setContent("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                New Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-popover/95 backdrop-blur-xl border-border/50">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Journal Entry" : "New Journal Entry"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title (optional)</Label>
                  <Input
                    id="title"
                    placeholder="Entry title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Your thoughts</Label>
                  <Textarea
                    id="content"
                    placeholder="Write freely about your day, feelings, challenges, or wins..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    required
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingId ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    editingId ? "Update Entry" : "Save Entry"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Journal</h1>
          <p className="text-muted-foreground">Document your recovery journey</p>
        </div>

        {entries && entries.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card/50 backdrop-blur-sm"
              />
            </div>
          </div>
        )}

        {!entries || entries.length === 0 ? (
          <Card className="text-center py-12 bg-card/50 backdrop-blur-lg">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No entries yet</h3>
            <p className="text-muted-foreground mb-4">Start writing to track your thoughts and progress</p>
            <Button onClick={() => setDialogOpen(true)} className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Write First Entry
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredEntries?.map((entry) => (
              <Card key={entry.id} className="hover:shadow-soft transition-shadow bg-card/50 backdrop-blur-lg">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">
                        {entry.title || "Untitled Entry"}
                      </CardTitle>
                      <CardDescription>
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-popover/95 backdrop-blur-xl border-border/50">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This entry will be permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(entry.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">{entry.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Journal;
