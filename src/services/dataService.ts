import { Storage } from 'aws-amplify';
import axios from 'axios';
import { PredictionData, HistoricalDataPoint } from '../types/prediction';

// Clave del archivo histórico en S3
const HISTORICAL_DATA_KEY = 'raw/dataset_macro.json';

// Clave del archivo de predicción en S3
const PREDICTION_DATA_KEY = 'raw/prediccion_dolar.json'; 

/**
 * Obtiene de forma segura la URL de un objeto en S3 y luego descarga su contenido.
 * @param key La ruta del archivo en el bucket de S3.
 * @returns El contenido del archivo JSON.
 */
async function getPrivateS3Json(key: string): Promise<any> {
  try {
    // Obtiene una URL firmada y temporal para el objeto privado para usuarios "invitados"
    const signedUrl = await Storage.get(key, { level: 'guest' });

    // Usa axios para descargar el contenido desde esa URL segura
    const response = await axios.get(signedUrl as string);
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
  //                                     👇 ***AQUÍ ESTABA EL ERROR CORREGIDO***
  const data = await getPrivateS3Json(HISTORICAL_DATA_KEY);
  
  // Transforma los datos del JSON histórico al formato que espera el frontend
  return data.map((item: any) => ({
    date: item.fecha_dato,
    value: item.dolar_oficial,
  }));
}