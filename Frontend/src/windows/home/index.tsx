import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotesBox } from "../home../../../components/NotesBox";
import  MathExpression  from "../home../../../components/MathExpression";
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

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { listening, toggleListening } = useSpeechRecognition();
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("rgb(255, 255, 255)");
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState({});
  const [result, setResult] = useState<GeneratedResult>();
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [showNotesBox, setShowNotesBox] = useState(false);
  const [notesContent, setNotesContent] = useState("");
  const [notesPosition, setNotesPosition] = useState({ x: 10, y: 10 });
  const [calculationInput, setCalculationInput] = useState("");
  const [showCalculationInput, setShowCalculationInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.background = "black";
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
        const response = await axios({
          method: "post",
          url: "https://math-ai-backend-2.onrender.com/calculate",
          data: {
            image: canvas.toDataURL("image/png"),
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

        const ctx = canvas.getContext("2d");
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
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error("Error processing image:", error);
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);

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

  return (
    <>
      <div className="grid grid-cols-6 gap-2 mt-2">
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
          className={`z-20 text-white hover:bg-gray-800 ${
            isLoading ? "bg-green-500" : "bg-black"
          }`}
          variant="default"
        >
          {isLoading ? "Processing..." : "Run"}
        </Button>

        <Button
          onClick={toggleListening}
          className={`z-20 text-white transition-colors ${
            listening
              ? "bg-green-500 hover:bg-green-600"
              : "bg-black hover:bg-gray-800"
          }`}
          variant="default"
        >
          {listening ? "Stop Listening" : "Start Listening"}
        </Button>

        <Button
          onClick={() => setShowNotesBox(!showNotesBox)}
          className="z-20 bg-black text-white hover:bg-gray-800"
          variant="default"
        >
          {showNotesBox ? "Hide Notes" : "Show Notes"}
        </Button>

        <Button
          onClick={() => setShowCalculationInput(!showCalculationInput)}
          className="z-20 bg-black text-white hover:bg-gray-800"
          variant="default"
        >
          {showCalculationInput ? "Hide Text Input" : "Add Text Input"}
        </Button>
      </div>

      {showCalculationInput && (
        <div className="fixed top-20 right-4 z-20 w-64">
          <Card className="bg-gray-900 bg-opacity-80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Add Calculation Text</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={calculationInput}
                onChange={(e) => setCalculationInput(e.target.value)}
                className="bg-transparent text-white border-gray-700"
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
        className="absolute top-0 left-0 w-full h-full"
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