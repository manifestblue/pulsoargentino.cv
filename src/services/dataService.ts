import { fetchAuthSession } from 'aws-amplify/auth';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import axios from 'axios';
import type { PredictionData, HistoricalDataPoint } from '../types/prediction';

const BUCKET_NAME = 'pulso-argentino-data-ml';
const HISTORICAL_DATA_KEY = 'raw/dataset_macro.json';
const PREDICTION_DATA_KEY = 'production_predictions/prediccion_dolar.json';

async function getPrivateS3Json(key: string): Promise<any> {
  try {
    // 1. Obtenemos las credenciales de invitado que Amplify gestiona
    const { credentials } = await fetchAuthSession({ forceRefresh: true });
    if (!credentials) {
      throw new Error("No se pudieron obtener las credenciales");
    }

    // 2. Creamos un cliente de S3 de bajo nivel con esas credenciales
    const s3Client = new S3Client({
      region: 'us-east-1',
      credentials,
    });

    // 3. Creamos el comando para obtener el objeto con la ruta exacta
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    // 4. Generamos una URL firmada con control total, sin prefijos
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // 5. Usamos axios para descargar el contenido desde la URL segura
    const response = await axios.get(signedUrl);
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