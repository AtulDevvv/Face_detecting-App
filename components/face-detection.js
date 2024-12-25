"use client";

import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";

export default function FaceTrackingApp() {
  const webcamRef = useRef(null);
  const displayCanvasRef = useRef(null); // For live display without landmarks
  const recordingCanvasRef = useRef(null); // For recording with landmarks
  const [isRecording, setIsRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState(null);

  let mediaRecorder = useRef(null);
  let recordedChunks = useRef([]);

  // Load FaceAPI.js models
  const loadModels = async () => {
    const MODEL_URL = "/models"; // Path to models directory
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  };

  // Start Face Detection
  const startFaceDetection = async () => {
    setInterval(async () => {
      if (webcamRef.current && webcamRef.current.video.readyState === 4) {
        const video = webcamRef.current.video;
        const displaySize = {
          width: video.videoWidth,
          height: video.videoHeight,
        };

        // Adjust canvas sizes
        faceapi.matchDimensions(displayCanvasRef.current, displaySize);
        faceapi.matchDimensions(recordingCanvasRef.current, displaySize);

        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        // Draw video feed on the display canvas
        const displayCtx = displayCanvasRef.current.getContext("2d");
        displayCtx.clearRect(0, 0, displayCanvasRef.current.width, displayCanvasRef.current.height);
        displayCtx.drawImage(video, 0, 0, displaySize.width, displaySize.height);

        // Draw landmarks only on the recording canvas
        const recordingCtx = recordingCanvasRef.current.getContext("2d");
        recordingCtx.clearRect(0, 0, recordingCanvasRef.current.width, recordingCanvasRef.current.height);
        recordingCtx.drawImage(video, 0, 0, displaySize.width, displaySize.height);
        faceapi.draw.drawFaceLandmarks(recordingCanvasRef.current, resizedDetections);
      }
    }, 100);
  };

  // Start Recording
  const startRecording = () => {
    const canvasStream = recordingCanvasRef.current.captureStream(30); // 30 FPS
    mediaRecorder.current = new MediaRecorder(canvasStream, {
      mimeType: "video/webm",
    });

    recordedChunks.current = [];

    mediaRecorder.current.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.current.push(event.data);
    };

    mediaRecorder.current.onstop = () => {
      const blob = new Blob(recordedChunks.current, { type: "video/webm" });
      setVideoBlob(blob);
    };

    setIsRecording(true);
    mediaRecorder.current.start();
  };

  // Stop Recording
  const stopRecording = () => {
    mediaRecorder.current.stop();
    setIsRecording(false);
  };

  // Save Video to Local Storage
  const saveVideo = () => {
    if (!videoBlob) return;

    const url = window.URL.createObjectURL(videoBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "face-tracking-video.webm";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadModels().then(() => {
      startFaceDetection();
    });
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Webcam and Display Canvas */}
      <div className="relative">
        <Webcam
          ref={webcamRef}
          muted
          className="rounded-lg"
          style={{ display: "block" }}
        />
        <canvas
          ref={displayCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 1,
          }}
        ></canvas>
        <canvas
          ref={recordingCanvasRef}
          style={{ display: "none" }} // Hidden during live display
        ></canvas>
      </div>

      {/* Control Buttons */}
      <div className="flex space-x-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Stop Recording
          </button>
        )}
        {videoBlob && (
          <button
            onClick={saveVideo}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Save Video
          </button>
        )}
      </div>

      {/* Render Recorded Video */}
      {videoBlob && (
        <div className="mt-4">
          <h3 className="text-lg font-bold">Recorded Video:</h3>
          <video
            src={URL.createObjectURL(videoBlob)}
            controls
            className="mt-2 rounded-lg"
          ></video>
        </div>
      )}
    </div>
  );
}
