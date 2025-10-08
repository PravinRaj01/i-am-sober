import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayCircle, PauseCircle, Heart } from "lucide-react";

interface Meditation {
  id: string;
  title: string;
  duration: number;
  description: string;
  audioUrl: string;
  category: string;
}

const meditations: Meditation[] = [
  {
    id: "1",
    title: "Mindful Urge Surfing",
    duration: 300,
    description: "Learn to observe and let go of cravings without acting on them.",
    audioUrl: "/meditations/urge-surfing.mp3",
    category: "Cravings",
  },
  {
    id: "2",
    title: "Body Scan Relaxation",
    duration: 600,
    description: "Release tension and find calm through progressive relaxation.",
    audioUrl: "/meditations/body-scan.mp3",
    category: "Relaxation",
  },
  {
    id: "3",
    title: "Self-Compassion Practice",
    duration: 480,
    description: "Cultivate kindness towards yourself in moments of difficulty.",
    audioUrl: "/meditations/self-compassion.mp3",
    category: "Emotional Support",
  },
];

export function GuidedMeditations() {
  const [currentMeditation, setCurrentMeditation] = useState<Meditation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handlePlay = (meditation: Meditation) => {
    if (currentMeditation?.id === meditation.id) {
      if (isPlaying) {
        audio?.pause();
      } else {
        audio?.play();
      }
      setIsPlaying(!isPlaying);
    } else {
      if (audio) {
        audio.pause();
      }
      const newAudio = new Audio(meditation.audioUrl);
      newAudio.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentMeditation(null);
      });
      newAudio.play();
      setAudio(newAudio);
      setCurrentMeditation(meditation);
      setIsPlaying(true);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  return (
    <Card className="bg-card/50 backdrop-blur-lg border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-accent" />
          Guided Meditations
        </CardTitle>
        <CardDescription>
          Practice mindfulness to manage cravings and emotions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {meditations.map((meditation) => (
              <Card
                key={meditation.id}
                className={`relative overflow-hidden transition-all duration-300 ${
                  currentMeditation?.id === meditation.id
                    ? "bg-accent/10 border-accent"
                    : "hover:bg-muted/50"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{meditation.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {meditation.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="bg-accent/10 text-accent px-2 py-1 rounded">
                          {meditation.category}
                        </span>
                        <span className="text-muted-foreground">
                          {formatDuration(meditation.duration)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePlay(meditation)}
                      className={
                        currentMeditation?.id === meditation.id
                          ? "text-accent hover:text-accent/80"
                          : ""
                      }
                    >
                      {currentMeditation?.id === meditation.id && isPlaying ? (
                        <PauseCircle className="h-8 w-8" />
                      ) : (
                        <PlayCircle className="h-8 w-8" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}