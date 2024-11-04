import { ColorSwatch, Group } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Draggable from 'react-draggable';
import { SWATCHES } from '../../../colors';

interface GeneratedResult {
  expression: string;
  answer: string;
}

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

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

// Math Expression Component
const MathExpression = ({ 
  expression, 
  position, 
  onPositionChange 
}: { 
  expression: string;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
}) => {
  // Format the expression for better readability
  const formatExpression = (expr: string) => {
    return expr
      .replace(/\\(.+?)\{(.+?)\}/g, '$2') // Remove LaTeX commands
      .replace(/=/g, ' = ')
      .replace(/\+/g, ' + ')
      .replace(/\-/g, ' - ')
      .replace(/\*/g, ' × ')
      .replace(/\//g, ' ÷ ');
  };

  return (
    <Draggable
      defaultPosition={position}
      onStop={(_, data) => onPositionChange({ x: data.x, y: data.y })}
    >
      <div className="absolute p-4 bg-gray-900 bg-opacity-80 rounded-lg shadow-lg backdrop-blur-sm cursor-grab active:cursor-grabbing hover:scale-105 transition-transform">
        <div className="text-xl font-serif tracking-wide text-white">
          {formatExpression(expression)}
        </div>
      </div>
    </Draggable>
  );
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('rgb(255, 255, 255)');
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState({});
  const [result, setResult] = useState<GeneratedResult>();
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [listening, setListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
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
      recognition.lang = 'en-US';
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
        drawTextOnCanvas(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setListening(false);
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setListening(false);
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.setAttribute('aria-label', `Canvas content: ${transcribedText}`);
    }
  }, [transcribedText]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - canvas.offsetTop;
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
      }
    }
  }, []);

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpression([]);
      setResult(undefined);
      setDictOfVars({});
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.answer);
    }
  }, [result]);

  const renderLatexToCanvas = (expression: string, answer: string) => {
    const formattedExpression = `${expression} = ${answer}`;
    setLatexExpression([...latexExpression, formattedExpression]);
    resetCanvas();
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.background = 'black';
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setIsDrawing(true);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = color;
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const runRoute = async () => {
    const canvas = canvasRef.current;

    if (canvas) {
      try {
        const response = await axios({
          method: 'post',
          url: `https://math-ai-server.vercel.app/`,
          data: {
            image: canvas.toDataURL('image/png'),
            dict_of_vars: dictOfVars,
          },
        });
        const results: Response[] = response.data;

        results.forEach((data: Response) => {
          if (data.assign === true) {
            setDictOfVars((prevVars) => ({
              ...prevVars,
              [data.expr]: data.result,
            }));
          }
        });

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let minX = canvas.width,
            minY = canvas.height,
            maxX = 0,
            maxY = 0;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if (imageData.data[i + 3] > 0) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        setLatexPosition({ x: centerX, y: centerY });

        results.forEach((data: Response) => {
          setTimeout(() => {
            setResult({
              expression: data.expr,
              answer: data.result,
            });
          }, 1000);
        });
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }
  };

  const drawTextOnCanvas = (text: string) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.font = '18px serif';
        ctx.fillStyle = color;

        const textWidth = ctx.measureText(text).width;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        const x = (canvasWidth - textWidth) / 2;
        const y = canvasHeight / 2;

        ctx.fillText(text, x, y);
      }
    }
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-2 mt-2">
        <Button
          onClick={() => setReset(true)}
          className="z-20 bg-black text-white hover:bg-gray-800"
          variant="default"
        >
          Reset
        </Button>
        
        <Group className="z-20">
          {SWATCHES.map((swatch) => (
            <ColorSwatch
              key={swatch}
              color={swatch}
              onClick={() => setColor(swatch)}
              className="cursor-pointer hover:scale-110 transition-transform"
            />
          ))}
        </Group>
        
        <Button
          onClick={runRoute}
          className="z-20 bg-black text-white hover:bg-gray-800"
          variant="default"
        >
          Run
        </Button>
        
        <Button 
          onClick={toggleListening} 
          className={`z-20 text-white transition-colors ${
            listening ? 'bg-green-500 hover:bg-green-600' : 'bg-black hover:bg-gray-800'
          }`} 
          variant="default"
        >
          {listening ? 'Stop Listening' : 'Start Listening'}
        </Button>
      </div>

      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute top-0 left-0 w-full h-full"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />

      {latexExpression && latexExpression.map((latex, index) => (
        <MathExpression
          key={index}
          expression={latex}
          position={latexPosition}
          onPositionChange={setLatexPosition}
        />
      ))}
    </>
  );
}