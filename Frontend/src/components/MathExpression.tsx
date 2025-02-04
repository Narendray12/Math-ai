import Draggable from "react-draggable";

interface MathExpressionProps {
  expression: string;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
}

export const MathExpression = ({
  expression,
  position,
  onPositionChange,
}: MathExpressionProps) => {
  const formatExpression = (expr: string) => {
    return expr
      .replace(/\\(.+?)\{(.+?)\}/g, "$2")
      .replace(/=/g, " = ")
      .replace(/\+/g, " + ")
      .replace(/\-/g, " - ")
      .replace(/\*/g, " × ")
      .replace(/\//g, " ÷ ");
  };

  return (
    <Draggable
      defaultPosition={position}
      onStop={(_, data) => onPositionChange({ x: data.x, y: data.y })}
    >
      <div className="absolute z-20 shadow-lg">
        <div className="p-4 bg-gray-800 bg-opacity-90 rounded-lg backdrop-blur-sm border border-gray-700 cursor-grab active:cursor-grabbing hover:scale-105 transition-transform">
          <div className="text-xl font-mono text-white">
            {formatExpression(expression)}
          </div>
        </div>
      </div>
    </Draggable>
  );
};