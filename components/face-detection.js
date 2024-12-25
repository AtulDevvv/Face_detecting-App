"use client";

import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";

export default function FaceTrackingApp() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState(null);

  let mediaRecorder = useRef(null);
  let recordedChunks = useRef([]);
  let animationFrameId = useRef(null);

  // Load FaceAPI.js models
  const loadModels = async () => {
    const MODEL_URL = "/models"; // Path to models directory
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  };

  // Start Face Detection
  const startFaceDetection = async () => {
    const detectFaces = async () => {
      if (webcamRef.current && webcamRef.current.video.readyState === 4) {
        const video = webcamRef.current.video;
        const displaySize = {
          width: video.videoWidth,
          height: video.videoHeight,
        };

        // Adjust canvas size only once
        if (
          canvasRef.current.width !== displaySize.width ||
          canvasRef.current.height !== displaySize.height
        ) {
          canvasRef.current.width = displaySize.width;
          canvasRef.current.height = displaySize.height;
        }

        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Draw video feed on the canvas
        ctx.drawImage(video, 0, 0, displaySize.width, displaySize.height);

        // Draw landmarks
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
      }

      // Request the next animation frame
      animationFrameId.current = requestAnimationFrame(detectFaces);
    };

    detectFaces(); // Start the loop
  };

  // Stop Face Detection
  const stopFaceDetection = () => {
    cancelAnimationFrame(animationFrameId.current);
  };

  // Start Recording
  const startRecording = () => {
    const canvasStream = canvasRef.current.captureStream(30); // 30 FPS
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

    return () => {
      stopFaceDetection(); // Clean up on unmount
    };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Video and Canvas */}
      <div className="relative">
        <Webcam
          ref={webcamRef}
          muted
          className="absolute top-0 left-0 rounded-lg"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            opacity: 0, // Hide the actual webcam
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "640px",
            borderRadius: "8px",
            zIndex: 1,
          }}
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
            style={{ maxWidth: "100%" }}
          ></video>
        </div>
      )}
    </div>
  );
}
