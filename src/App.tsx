import { useState, useEffect } from 'react';
import type { PredictionData, HistoricalDataPoint } from './types/prediction';
import { fetchPredictionData, fetchHistoricalData } from './services/dataService';

// Importa los componentes que vamos a crear (marcarán error por ahora)
import Header from './components/Header';
import ChartComponent from './components/ChartComponent';
import Footer from './components/Footer';

function App() {
  // --- Gestión de Estado Local ---
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [historical, setHistorical] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- Lógica de Carga de Datos ---
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Carga los datos de predicción e históricos en paralelo para mayor eficiencia
        const [predictionData, historicalData] = await Promise.all([
          fetchPredictionData(),
          fetchHistoricalData()
        ]);
        setPrediction(predictionData);
        setHistorical(historicalData);
        setError(null);
      } catch (err) {
        setError('Error al cargar los datos. Por favor, intente de nuevo más tarde.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []); // El array vacío asegura que esto se ejecute solo una vez, al montar el componente

  return (
    <main className="bg-[#0D1117] min-h-screen flex flex-col items-center justify-center p-4 font-sans text-[#C9D1D9]">
      <div className="w-full max-w-6xl mx-auto flex flex-col flex-grow">
        
        {/* Renderiza el Header solo si hay datos de predicción */}
        {prediction && <Header lastUpdated={prediction.prediction_generated_on} />}

        <div className="flex-grow flex items-center justify-center">
          {loading && <p>Cargando datos del modelo...</p>}
          {error && <p className="text-red-500">{error}</p>}
          
          {/* Renderiza el gráfico solo si no hay carga, no hay error y existen los datos */}
          {!loading && !error && prediction && (
            <ChartComponent 
              predictionData={prediction} 
              historicalData={historical}  
            />
          )}
        </div>

        <Footer />
      </div>
    </main>
  );
}

export default App;