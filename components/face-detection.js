"use client";

import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceMesh from "@tensorflow-models/facemesh";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";

export default function FaceTrackingApp() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState(null);

  let mediaRecorder = useRef(null);
  let recordedChunks = useRef([]);

  // Initialize the FaceMesh model and start detection
  const runFaceMesh = async () => {
    await tf.setBackend("webgl");
    await tf.ready();

    const net = await faceMesh.load();

    setInterval(() => {
      if (webcamRef.current && webcamRef.current.video.readyState === 4) {
        detectFace(net);
      }
    }, 100);
  };

  // Face Detection Function
  const detectFace = async (net) => {
    const video = webcamRef.current.video;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // Set canvas dimensions
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, videoWidth, videoHeight); // Clear canvas

    // Draw video feed on canvas (not visible during recording)
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

    // Detect faces
    const faces = await net.estimateFaces(video);

    // Draw face landmarks
    faces.forEach((face) => {
      const keypoints = face.scaledMesh;
      keypoints.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "red";
        ctx.fill();
      });
    });
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
    runFaceMesh();
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Webcam and Hidden Canvas */}
      <div className="relative">
        <Webcam
          ref={webcamRef}
          muted
          className="rounded-lg"
          style={{ display: "block" }}
        />
        {/* Hidden Canvas */}
        <canvas
          ref={canvasRef}
          className="hidden" // Canvas is hidden during recording
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
