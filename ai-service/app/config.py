import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "EcoVision AI Inference Service"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # Model Weights & Configuration
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "models/weights/ecovision_yolov8n.pt")
    CNN_MODEL_PATH: str = os.getenv("CNN_MODEL_PATH", "models/weights/waste_cnn_resnet18.pth")
    DEVICE: str = os.getenv("DEVICE", "cpu")  # 'cuda' or 'cpu'
    
    # Thresholds
    YOLO_CONF_THRESHOLD: float = float(os.getenv("YOLO_CONF_THRESHOLD", "0.25"))
    CNN_CONF_THRESHOLD: float = float(os.getenv("CNN_CONF_THRESHOLD", "0.40"))
    FUSION_HIGH_CONF_THRESHOLD: float = float(os.getenv("FUSION_HIGH_CONF_THRESHOLD", "0.65"))
    
    # Video Processing
    VIDEO_SAMPLE_INTERVAL_FRAMES: int = int(os.getenv("VIDEO_SAMPLE_INTERVAL_FRAMES", "15"))
    MAX_VIDEO_FRAMES: int = int(os.getenv("MAX_VIDEO_FRAMES", "150"))
    
    # Arduino Configuration
    ARDUINO_PORT: str = os.getenv("ARDUINO_PORT", "COM3")
    ARDUINO_BAUDRATE: int = int(os.getenv("ARDUINO_BAUDRATE", "9600"))
    ARDUINO_SIMULATION_MODE: bool = os.getenv("ARDUINO_SIMULATION_MODE", "true").lower() == "true"
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
