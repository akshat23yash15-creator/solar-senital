import axios from "axios";

const API_URL = "https://solar-sentinel-v3.onrender.com";

// Health Check
export async function fetchBackendHealth() {
  const response = await axios.get(
    `${API_URL}/health`
  );

  return {
    status: response.data.status
      ? response.data.status.toLowerCase()
      : "unknown",
    scope: response.data.scope || "",
    raw: response.data, 
  };
}

// Live Prediction
export async function fetchLivePrediction() {
  const response = await axios.post(
    `${API_URL}/api/v1/ai/predict-live`
  );

  const data = response.data;

  return {
    predictedLogFlux: data.predicted_log_flux,
    realSpaceFlux: data.real_space_flux,
    flareClass: data.flare_class,
    riskLevel: data.risk_level
      ? data.risk_level.toUpperCase()
      : "LOW",
    confidenceScore: data.confidence_score,

    anomaly: {
      quadrant:
        data.anomaly_localization?.quadrant ||
        "None",

      xPercent:
        data.anomaly_localization
          ?.x_coordinate_percent || 0,

      yPercent:
        data.anomaly_localization
          ?.y_coordinate_percent || 0,

      regionName:
        data.anomaly_localization?.region_name ||
        "Stable Matrix",
    },
  };
}

// Manual Image Prediction
export async function fetchManualPrediction(
  imageFile
) {
  const formData = new FormData();

  formData.append("file", imageFile);

  const response = await axios.post(
    `${API_URL}/api/v1/ai/flare-prediction`,
    formData,
    {
      headers: {
        "Content-Type":
          "multipart/form-data",
      },
    }
  );

  const data = response.data;

  return {
    predictedLogFlux: data.predicted_log_flux,
    realSpaceFlux: data.real_space_flux,
    flareClass: data.flare_class,
    riskLevel: data.risk_level
      ? data.risk_level.toUpperCase()
      : "LOW",
    confidenceScore: data.confidence_score,

    anomaly: {
      quadrant:
        data.anomaly_localization?.quadrant ||
        "None",

      xPercent:
        data.anomaly_localization
          ?.x_coordinate_percent || 0,

      yPercent:
        data.anomaly_localization
          ?.y_coordinate_percent || 0,

      regionName:
        data.anomaly_localization?.region_name ||
        "Stable Matrix",
    },
  };
}