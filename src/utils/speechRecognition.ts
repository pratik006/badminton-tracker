type SpeechRecognitionType = {
  new (): SpeechRecognition;
  prototype: SpeechRecognition;
};

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionType;
    webkitSpeechRecognition: SpeechRecognitionType;
  }
}

type SpeechRecognitionOptions = {
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  silenceTimeoutMs?: number;
};

export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private isActive = false;
  private finalTranscript = '';
  private options: Required<SpeechRecognitionOptions>;

  constructor(options: SpeechRecognitionOptions) {
    this.options = {
      lang: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      silenceTimeoutMs: 3000,
      onError: () => {},
      onStart: () => {},
      onEnd: () => {},
      ...options,
    };

    this.initialize();
  }

  private initialize() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech recognition is not supported in your browser. Try using Chrome or Edge.');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.options.lang;
    this.recognition.continuous = this.options.continuous;
    this.recognition.interimResults = this.options.interimResults;
    this.recognition.maxAlternatives = this.options.maxAlternatives;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Clear any existing timer
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
      }

      // Get the latest transcript
      const transcript = Array.from(event.results)
        .map((result: SpeechRecognitionResult) => result[0])
        .map((result: SpeechRecognitionAlternative) => result.transcript)
        .join('');

      this.finalTranscript = transcript;

      // Set a new timer for silence detection
      this.silenceTimer = setTimeout(() => {
        if (this.finalTranscript.trim()) {
          this.options.onResult(this.finalTranscript);
          this.finalTranscript = '';
        }
      }, this.options.silenceTimeoutMs);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.options.onError?.(`Speech recognition error: ${event.error}`);
      this.stop();
    };

    this.recognition.onnomatch = () => {
      this.options.onError?.('No speech was recognized.');
    };

    this.recognition.onsoundend = () => {
      if (this.finalTranscript.trim()) {
        this.options.onResult(this.finalTranscript);
        this.finalTranscript = '';
      }
      this.stop();
    };

    this.recognition.onend = () => {
      if (this.isActive) {
        this.recognition?.start(); // Restart if still active
      } else {
        this.options.onEnd?.();
      }
    };
  }

  public start() {
    if (!this.recognition) return;
    
    if (!this.isActive) {
      try {
        this.recognition.start();
        this.isActive = true;
        this.options.onStart();
      } catch (error) {
        this.options.onError?.(`Error starting speech recognition: ${error}`);
      }
    }
  }

  public stop() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    
    if (this.recognition && this.isActive) {
      try {
        this.recognition.stop();
      } catch (error) {
        // Ignore errors when stopping
      }
      this.isActive = false;
      this.options.onEnd();
    }
  }

  public isListening() {
    return this.isActive;
  }

  public updateOptions(options: Partial<SpeechRecognitionOptions>) {
    this.options = { ...this.options, ...options };
    
    if (this.recognition) {
      if (options.lang) this.recognition.lang = options.lang;
      if (options.continuous !== undefined) this.recognition.continuous = options.continuous;
      if (options.interimResults !== undefined) this.recognition.interimResults = options.interimResults;
      if (options.maxAlternatives !== undefined) this.recognition.maxAlternatives = options.maxAlternatives;
    }
  }
}

export const createSpeechRecognition = (options: SpeechRecognitionOptions) => {
  return new SpeechRecognitionService(options);
};

export const isSpeechRecognitionSupported = () => {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
};

export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop all tracks to release the microphone
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone access denied:', error);
    return false;
  }
};
