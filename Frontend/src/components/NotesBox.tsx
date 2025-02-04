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
      <div className="absolute z-20">
        <Card className="w-64 bg-gray-900 bg-opacity-80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              className="min-h-32 bg-transparent text-white border-gray-700"
              placeholder="Add your notes here..."
            />
          </CardContent>
        </Card>
      </div>
    </Draggable>
  );
};