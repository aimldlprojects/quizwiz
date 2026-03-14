@echo off

echo Starting React Native (Expo) frontend...
start "React Native Frontend" cmd /k npx expo start

echo Starting FastAPI backend...
start "FastAPI Backend" cmd /k cd server ^&^& uvicorn main:app --reload --host 0.0.0.0 --port 8000

exit