import ReactECharts from 'echarts-for-react';
import type { PredictionData, HistoricalDataPoint } from '../types/prediction';
import * as echarts from 'echarts';

interface ChartComponentProps {
  predictionData: PredictionData;
  historicalData: HistoricalDataPoint[];
}

// Paleta de colores extraída de la especificación
const colors = {
  primary: '#2F81F7',
  primaryLight: '#58A6FF',
  secondary: '#FFC107',
  textSecondary: '#8B949E',
  danger: '#FFFFFF',
  surface: '#161B22',
  textPrimary: '#C9D1D9',
};

function ChartComponent({ predictionData, historicalData }: ChartComponentProps) {

  // --- SOLUCIÓN: MÉTODO DEL POLÍGONO PARA LA BANDA DE CONFIANZA ---
  const lastHistoricalPoint = historicalData[historicalData.length - 1];
  
  const upperBand = predictionData.trajectory.map(p => [p.date, p.upper_bound]);
  const lowerBandReversed = [...predictionData.trajectory].reverse().map(p => [p.date, p.lower_bound]);
  
  // Se crea un polígono cerrado para el área del gradiente.
  const polygonData = [
    [lastHistoricalPoint.date, lastHistoricalPoint.value],
    ...upperBand,
    ...lowerBandReversed,
  ];
  
  const historicalSeriesData = historicalData.map(p => [p.date, p.value]);
  const centralPredictionData = predictionData.trajectory.map(p => [p.date, (p.lower_bound + p.upper_bound) / 2]);
  centralPredictionData.unshift([lastHistoricalPoint.date, lastHistoricalPoint.value]);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.surface,
      borderColor: colors.textSecondary,
      textStyle: { color: colors.textPrimary },
      axisPointer: {
        type: 'cross',
        label: {
          // SOLUCIÓN: Formato de fecha explícito en el puntero del tooltip
          formatter: (params: any) => {
            if (params.axisDimension === 'x') {
              return echarts.format.formatTime('dd MMM yyyy', params.value);
            }
            return params.value.toFixed(2);
          }
        }
      }
    },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: colors.textSecondary } },
      axisLabel: {
        color: colors.textSecondary,
        // SOLUCIÓN: Formatter para evitar etiquetas de fecha duplicadas
        formatter: (value: number) => {
            const date = new Date(value);
            return echarts.format.formatTime('dd MMM', date);
        }
      },
    },
    yAxis: {
      type: 'value',
      name: 'ARS/USD',
      nameTextStyle: { color: colors.textSecondary },
      scale: true,
      axisLabel: { color: colors.textSecondary },
      splitLine: { show: true, lineStyle: { color: colors.textSecondary, opacity: 0.15, type: 'dashed' } },
    },
    dataZoom: [{ type: 'inside' }],
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    series: [
      {
        name: 'Histórico',
        type: 'line',
        data: historicalSeriesData,
        showSymbol: false,
        lineStyle: { color: colors.primary, width: 2.5 }
      },
      {
        name: 'Predicción Central',
        type: 'line',
        data: centralPredictionData,
        showSymbol: false,
        lineStyle: { type: 'dashed', color: colors.primaryLight, width: 2 }
      },
      {
        name: 'Intervalo',
        type: 'line',
        data: polygonData,
        lineStyle: { opacity: 0 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 193, 7, 0.5)' },
            { offset: 1, color: 'rgba(255, 193, 7, 0.05)' }
          ]),
        },
        stack: 'confidence', // El stack es necesario para que el tooltip lo detecte correctamente
        symbol: 'none'
      },
      {
        name: 'Valor Real',
        type: 'scatter',
        data: [], // Aquí se podrían añadir puntos de realidad si existieran
        symbolSize: 8,
        itemStyle: { color: colors.danger }
      }
    ]
  };

  return (
    <div className="w-full h-[60vh] min-h-[500px] flex-grow">
      <ReactECharts 
        option={option} 
        notMerge={true}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}

export default ChartComponent;