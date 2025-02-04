import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import Draggable from "react-draggable";

interface NotesBoxProps {
  position: { x: number; y: number };
  content: string;
  onContentChange: (content: string) => void;
  onPositionChange: (position: { x: number; y: number }) => void;
}

export const NotesBox = ({
  position,
  content,
  onContentChange,
  onPositionChange,
}: NotesBoxProps) => {
  return (
    <Draggable
    defaultPosition={position}
    onStop={(_, data) => onPositionChange({ x: data.x, y: data.y })}
  >
    <div className="absolute z-20 shadow-2xl">
      <Card className="w-72 bg-gray-800 bg-opacity-90 backdrop-blur-sm border border-gray-700">
        <CardHeader className="p-4 border-b border-gray-700">
          <CardTitle className="text-lg font-semibold text-white">
            📝 Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="min-h-40 bg-transparent text-white border-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            placeholder="Write your notes here..."
          />
        </CardContent>
      </Card>
    </div>
  </Draggable>
  );
};