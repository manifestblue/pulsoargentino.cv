// Define la estructura de un punto en la trayectoria de predicción
export interface TrajectoryPoint {
  date: string;
  forecast_day: number;
  lower_bound: number;
  upper_bound: number;
}

// Define la estructura completa del archivo JSON de predicción
export interface PredictionData {
  prediction_generated_on: string;
  anchor_price: number;
  trajectory: TrajectoryPoint[];
}

// Define la estructura de un punto de datos históricos
export interface HistoricalDataPoint {
  date: string;
  value: number;
}