import Draggable from "react-draggable";

interface MathExpressionProps {
  expression: string;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
}

const MathExpression = ({
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
      <div className="absolute p-4 bg-gray-900 bg-opacity-80 rounded-lg shadow-lg backdrop-blur-sm cursor-grab active:cursor-grabbing hover:scale-105 transition-transform">
        <div className="text-xl font-serif tracking-wide text-white">
          {formatExpression(expression)}
        </div>
      </div>
    </Draggable>
  );
};

export default MathExpression;