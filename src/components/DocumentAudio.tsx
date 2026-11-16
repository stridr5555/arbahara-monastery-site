import { Headphones } from "lucide-react";
import type { AnnouncementAudio } from "../content";

export function DocumentAudio({ audio }: { audio: AnnouncementAudio }) {
  return (
    <figure className="document-audio">
      <figcaption>
        <Headphones size={18} aria-hidden="true" />
        <span className="document-audio-label">Listen to the recording</span>
        <strong>{audio.title}</strong>
        <span className="document-audio-length">{audio.duration}</span>
      </figcaption>
      <audio
        controls
        preload="none"
        aria-label={`Play the recording: ${audio.title}`}
      >
        <source src={audio.src} type="audio/mp4" />
        <source src={audio.fallback} type="audio/mpeg" />
        <a href={audio.fallback}>Download the recording</a>
      </audio>
    </figure>
  );
}
