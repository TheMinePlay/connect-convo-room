import { useParams } from "react-router-dom";
import { VideoCall } from "@/components/VideoCall";

const VideoRoom = () => {
  const { roomId } = useParams();

  return (
    <div className="min-h-screen bg-background">
      <VideoCall roomId={roomId || ""} />
    </div>
  );
};

export default VideoRoom;
