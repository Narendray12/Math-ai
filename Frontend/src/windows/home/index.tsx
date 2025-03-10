import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotesBox } from "../home../../../components/NotesBox";
import { MathExpression } from "../home../../../components/MathExpression";
import { useSpeechRecognition } from "../home../../../hooks/useSpeechRecognition";
import { SWATCHES } from "../../../colors";

interface GeneratedResult {
  expression: string;
  answer: string;
}

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

interface Position {
  x: number;
  y: number;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { listening, transcribedText, toggleListening } = useSpeechRecognition();
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [color, setColor] = useState<string>("rgb(255, 255, 255)");
  const [reset, setReset] = useState<boolean>(false);
  const [dictOfVars, setDictOfVars] = useState<Record<string, string>>({});
  const [result, setResult] = useState<GeneratedResult | undefined>();
  const [latexPosition, setLatexPosition] = useState<Position>({ x: 10, y: 200 });
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [showNotesBox, setShowNotesBox] = useState<boolean>(false);
  const [notesContent, setNotesContent] = useState<string>("");
  const [notesPosition, setNotesPosition] = useState<Position>({ x: 10, y: 10 });
  const [calculationInput, setCalculationInput] = useState<string>("");
  const [showCalculationInput, setShowCalculationInput] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [transcribedCanvasText, setTranscribedCanvasText] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  useEffect(() => {
    if (transcribedText && !listening) {
      setTranscribedCanvasText(transcribedText);
      drawTextOnCanvas(transcribedText);
    }
  }, [transcribedText, listening]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - canvas.offsetTop;
        ctx.lineCap = "round";
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
      setUploadedImage(null);
      setImageLoaded(false);

      // Reset canvas background to black
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.background = "black";
      }
    }
  }, [reset]);

  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.answer);
    }
  }, [result]);

  const formatMathExpression = (expression: string, answer: string): string => {
    const isComplex = expression.length > 30 || expression.includes("\n");

    if (isComplex) {
      const cleanedExpression = expression.replace(/\s+/g, " ").trim();
      const formattedLines: string[] = [];
      let currentLine = "";
      const maxLineLength = 25;

      for (let i = 0; i < cleanedExpression.length; i++) {
        const char = cleanedExpression[i];
        currentLine += char;

        const isOperator = /[+\-*/=]/.test(char);
        const nextCharIsDigitOrLetter =
          i < cleanedExpression.length - 1 && /[a-zA-Z0-9]/.test(cleanedExpression[i + 1]);

        if (currentLine.length >= maxLineLength && isOperator && nextCharIsDigitOrLetter) {
          formattedLines.push(currentLine);
          currentLine = "";
        } else if (currentLine.length >= maxLineLength && char === " ") {
          formattedLines.push(currentLine);
          currentLine = "";
        }
      }

      if (currentLine) {
        formattedLines.push(currentLine);
      }

      if (answer) {
        formattedLines.push(`= ${answer}`);
      }

      return formattedLines.join("\n");
    } else {
      return `${expression}\n= ${answer}`;
    }
  };

  const renderLatexToCanvas = (expression: string, answer: string) => {
    const formattedExpression = formatMathExpression(expression, answer);
    setLatexExpression((prev) => [...prev, formattedExpression]);
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setTranscribedCanvasText("");
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      if (!imageLoaded) {
        canvas.style.background = "black";
      }
      const ctx = canvas.getContext("2d");
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
      const ctx = canvas.getContext("2d");
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
    setIsLoading(true);
    const canvas = canvasRef.current;

    if (canvas) {
      try {
        const dataUrl = canvas.toDataURL("image/png");

        const response = await axios({
          method: "post",
          url: "https://math-ai-backend-2.onrender.com/calculate",
          data: {
            image: dataUrl,
            dict_of_vars: dictOfVars,
            text: transcribedCanvasText,
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

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let minX = canvas.width,
          minY = canvas.height,
          maxX = 0,
          maxY = 0;

        let foundContent = false;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if (imageData.data[i + 3] > 0) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
              foundContent = true;
            }
          }
        }

        let centerX, centerY;
        if (foundContent) {
          centerX = (minX + maxX) / 2;
          centerY = (minY + maxY) / 2;
        } else {
          centerX = canvas.width / 2;
          centerY = canvas.height / 2;
        }

        setLatexPosition({ x: centerX, y: centerY });

        resetCanvas();
        canvas.style.background = "black";
        setUploadedImage(null);
        setImageLoaded(false);

        if (results.length > 0) {
          results.forEach((data: Response, index) => {
            setTimeout(() => {
              setResult({
                expression: data.expr,
                answer: data.result,
              });
            }, 500 * (index + 1));
          });
        } else {
          console.log("No results returned from API");
        }
      } catch (error) {
        console.error("Error processing image:", error);
        alert("Error processing the image. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const drawTextOnCanvas = (text: string) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        if (!imageLoaded) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        ctx.font = "18px serif";
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

  const addCalculationText = () => {
    if (calculationInput.trim()) {
      drawTextOnCanvas(calculationInput);
      setCalculationInput("");
      setShowCalculationInput(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedImage(dataUrl);
  
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
  
        const img = new Image();
        img.onload = () => {
          const maxWidth = 100;
          const maxHeight = 100;
  
          let width = img.width;
          let height = img.height;
  
          const aspectRatio = img.width / img.height;
  
          if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
          }
  
          if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
          }
  
          const x = (canvas.width - width) / 2;
          const y = (canvas.height - height) / 2;
  
          ctx.drawImage(img, x, y, width, height);
          setImageLoaded(true);
        };
  
        img.src = dataUrl;
      }
    };
  
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-gray-900 bg-opacity-90 backdrop-blur-sm border-b border-gray-700">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setReset(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
              variant="default"
            >
              Reset
            </Button>

            <Group>
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
              className={`text-white ${
                isLoading ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
              variant="default"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Run"}
            </Button>

            <Button
              onClick={toggleListening}
              className={`text-white ${
                listening ? "bg-green-600 hover:bg-green-700" : "bg-gray-700 hover:bg-gray-800"
              }`}
              variant="default"
            >
              {listening ? "Stop Listening" : "Start Listening"}
            </Button>

            <Button
              onClick={() => setShowNotesBox(!showNotesBox)}
              className="bg-gray-700 hover:bg-gray-800 text-white"
              variant="default"
            >
              {showNotesBox ? "Hide Notes" : "Show Notes"}
            </Button>

            <Button
              onClick={() => setShowCalculationInput(!showCalculationInput)}
              className="bg-gray-700 hover:bg-gray-800 text-white"
              variant="default"
            >
              {showCalculationInput ? "Hide Text Input" : "Add Text Input"}
            </Button>

            <Button
              onClick={triggerFileInput}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              variant="default"
            >
              Upload Image
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>
        </div>
      </div>

      {showCalculationInput && (
        <div className="fixed top-20 right-4 z-20 w-72">
          <Card className="bg-gray-800 bg-opacity-90 backdrop-blur-sm border border-gray-700">
            <CardHeader className="p-4 border-b border-gray-700">
              <CardTitle className="text-lg font-semibold text-white">
                Add Calculation Text
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Textarea
                value={calculationInput}
                onChange={(e) => setCalculationInput(e.target.value)}
                className="bg-transparent text-white border-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="Type your calculation here..."
              />
              <Button
                onClick={addCalculationText}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Add to Canvas
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {showNotesBox && (
        <NotesBox
          position={notesPosition}
          content={notesContent}
          onContentChange={setNotesContent}
          onPositionChange={setNotesPosition}
        />
      )}

      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute top-0 left-0 w-full h-full bg-gray-900"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />

      {latexExpression &&
        latexExpression.map((latex, index) => (
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