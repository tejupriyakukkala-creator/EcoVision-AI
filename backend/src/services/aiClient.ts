import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

export interface ImageInferenceResponse {
  total_objects: number;
  detections: Array<{
    id: string;
    bbox: { x1: number; y1: number; x2: number; y2: number };
    yolo_label: string;
    yolo_confidence: number;
    cnn_subtype: string;
    cnn_confidence: number;
    cnn_probabilities: Record<string, number>;
    final_classification: string;
    waste_category: string;
    review_status: string;
    confidence_score: number;
    disposal_recommendation: {
      detected_item: string;
      waste_category: string;
      suggested_disposal: string;
      preparation_instructions: string[];
      recycling_eligibility: boolean;
      confidence_score: number;
      reason: string;
      local_rules_notice: string;
    };
  }>;
  category_distribution: Record<string, number>;
  processing_time_ms: number;
  annotated_image_base64: string;
  yolo_model_name: string;
  cnn_model_name: string;
}

export class AIServiceClient {
  private baseUrl: string;

  constructor(url: string = AI_SERVICE_URL) {
    this.baseUrl = url;
  }

  async checkHealth(): Promise<any> {
    try {
      const resp = await axios.get(`${this.baseUrl}/health`, { timeout: 3000 });
      return resp.data;
    } catch (err: any) {
      return { status: 'offline', error: err.message };
    }
  }

  async getModelStatus(): Promise<any> {
    try {
      const resp = await axios.get(`${this.baseUrl}/models/status`, { timeout: 3000 });
      return resp.data;
    } catch (err: any) {
      return {
        service_status: 'unavailable',
        error: err.message,
      };
    }
  }

  async predictImage(filePath: string, confidence: number = 0.25): Promise<ImageInferenceResponse> {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await axios.post<ImageInferenceResponse>(
      `${this.baseUrl}/predict/image?confidence_threshold=${confidence}`,
      form,
      {
        headers: form.getHeaders(),
        maxContentLength: 50 * 1024 * 1024,
        timeout: 30000,
      }
    );
    return response.data;
  }

  async predictFrame(buffer: Buffer, frameIndex: number = 0, confidence: number = 0.25): Promise<any> {
    const form = new FormData();
    form.append('file', buffer, { filename: 'frame.jpg', contentType: 'image/jpeg' });
    form.append('frame_index', frameIndex.toString());
    form.append('confidence_threshold', confidence.toString());

    const response = await axios.post(
      `${this.baseUrl}/predict/video-frame`,
      form,
      {
        headers: form.getHeaders(),
        timeout: 10000,
      }
    );
    return response.data;
  }

  async predictVideo(filePath: string, sampleInterval: number = 15, maxFrames: number = 120): Promise<any> {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await axios.post(
      `${this.baseUrl}/predict/video?sample_interval=${sampleInterval}&max_frames=${maxFrames}`,
      form,
      {
        headers: form.getHeaders(),
        maxContentLength: 100 * 1024 * 1024,
        timeout: 120000,
      }
    );
    return response.data;
  }

  async triggerArduino(category: string, subtype: string, confidence: number, simulation: boolean = true): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/arduino/trigger`, {
      waste_category: category,
      item_subtype: subtype,
      confidence,
      simulation,
    });
    return response.data;
  }

  async arduinoEstop(): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/arduino/estop`);
    return response.data;
  }

  async arduinoReset(): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/arduino/reset`);
    return response.data;
  }
}

export const aiClient = new AIServiceClient();
