import { useState, useEffect } from 'react';
import type { PredictionData, HistoricalDataPoint } from './types/prediction';
import { fetchPredictionData, fetchHistoricalData } from './services/dataService';
import { motion } from 'framer-motion';

import Header from './components/Header';
import ChartComponent from './components/ChartComponent';
import Footer from './components/Footer';

function App() {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [historical, setHistorical] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
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
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 font-sans">
      <motion.div 
        className="w-full max-w-7xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {loading && <p className="text-center text-text-secondary">Cargando la máquina de la verdad...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        
        {!loading && !error && prediction && historical.length > 0 && (
          <>
            <Header lastUpdated={prediction.prediction_generated_on} />
            
            <div className="mt-8 p-4 sm:p-6 bg-surface/50 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-lg">
              <ChartComponent 
                predictionData={prediction} 
                historicalData={historical} 
              />
            </div>

            <Footer />
          </>
        )}
      </motion.div>
    </main>
  );
}

export default App;