import { getUrl } from 'aws-amplify/storage';
import axios from 'axios';
import type { PredictionData, HistoricalDataPoint } from '../types/prediction';

const HISTORICAL_DATA_KEY = 'raw/dataset_macro.json';
const PREDICTION_DATA_KEY = 'raw/prediccion_dolar.json';

async function getPrivateS3Json(key: string): Promise<any> {
  try {
    const getUrlResult = await getUrl({
      key: key,
      options: {
        accessLevel: 'guest',
        expiresIn: 300,
        validateObjectExistence: true
      },
    });

    const response = await axios.get(getUrlResult.url.toString());
    return response.data;

  } catch (error) {
    console.error(`Error al obtener el archivo desde S3 con la clave: ${key}`, error);
    throw error;
  }
}

export async function fetchPredictionData(): Promise<PredictionData> {
  return await getPrivateS3Json(PREDICTION_DATA_KEY);
}

export async function fetchHistoricalData(): Promise<HistoricalDataPoint[]> {
  const data = await getPrivateS3Json(HISTORICAL_DATA_KEY);
  
  return data.map((item: any) => ({
    date: item.fecha_dato,
    value: item.dolar_oficial,
  }));
}