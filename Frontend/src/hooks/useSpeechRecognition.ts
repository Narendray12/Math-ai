import { useEffect, useRef, useState } from "react";

interface SpeechRecognitionEventResult {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

export const useSpeechRecognition = () => {
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");

  const toggleListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (listening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setListening(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setListening(true);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.onresult = (event: SpeechRecognitionEventResult) => {
        const transcript = event.results[event.resultIndex][0].transcript;
        setTranscribedText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setListening(false);
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        setListening(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return { listening, transcribedText, toggleListening };
};