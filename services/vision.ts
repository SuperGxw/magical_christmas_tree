
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { HandData } from "../types";

export default class VisionService {
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement;

  constructor(video: HTMLVideoElement) {
    this.video = video;
  }

  async initialize() {
    // 确保 WASM 路径与 package.json 中的版本一致
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.13/wasm"
    );
    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 1,
    });

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 160 }, 
            height: { ideal: 120 } 
          } 
        });
        this.video.srcObject = stream;
        await this.video.play();
      } catch (err) {
        console.error("Camera access denied or not available:", err);
      }
    }
  }

  detect(): HandData | null {
    if (!this.handLandmarker || this.video.readyState < 2) return null;

    const results = this.handLandmarker.detectForVideo(this.video, performance.now());
    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      const thumb = landmarks[4];
      const index = landmarks[8];
      const wrist = landmarks[0];
      const palmCenter = landmarks[9];
      
      const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
      const tips = [8, 12, 16, 20];
      let totalDist = 0;
      tips.forEach(t => {
          totalDist += Math.hypot(landmarks[t].x - wrist.x, landmarks[t].y - wrist.y);
      });
      const avgDist = totalDist / tips.length;

      return {
        x: palmCenter.x,
        y: palmCenter.y,
        pinch: pinchDist < 0.05,
        fist: avgDist < 0.22, 
        open: avgDist > 0.38  
      };
    }
    return null;
  }
}
