import ReactECharts from 'echarts-for-react';
import type { PredictionData, HistoricalDataPoint } from '../types/prediction';
import * as echarts from 'echarts';

interface ChartComponentProps {
  predictionData: PredictionData;
  historicalData: HistoricalDataPoint[];
  isLoading: boolean;
}

const designTokens = {
  base: '#0D1117',
  surface: '#161B22',
  primary: '#2F81F7',
  secondary: '#FF7F0E',
  textPrimary: '#C9D1D9',
  textSecondary: '#8B949E',
  danger: '#F85149',
};

function ChartComponent({ predictionData, historicalData, isLoading }: ChartComponentProps) {
  const historicalSeriesData = historicalData.map(p => [p.date, p.value]);
  const lastHistoricalPoint = historicalData[historicalData.length - 1];
  const anchorPoint = [lastHistoricalPoint?.date, lastHistoricalPoint?.value];
  
  const trajectoryData = predictionData.trajectory.map(p => {
    const midPoint = (p.lower_bound + p.upper_bound) / 2;
    return [p.date, midPoint];
  });
  trajectoryData.unshift(anchorPoint);

  const confidenceBandDataLower = predictionData.trajectory.map(p => [p.date, p.lower_bound]);
  confidenceBandDataLower.unshift(anchorPoint);
  
  const confidenceBandDataUpper = predictionData.trajectory.map(p => [p.date, p.upper_bound]);
  confidenceBandDataUpper.unshift(anchorPoint);

  const option = {
    animation: !isLoading,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: designTokens.surface,
      borderColor: designTokens.textSecondary,
      textStyle: { color: designTokens.textPrimary },
      formatter: (params: any) => {
        const date = new Date(params[0].axisValue).toLocaleDateString('es-AR', {
          year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
        });
        let tooltipHtml = `${date}<br />`;
        params.forEach((param: any) => {
          const value = param.value[1];
          if (param.seriesName === 'Histórico' || param.seriesName === 'Predicción Central') {
            tooltipHtml += `${param.marker} ${param.seriesName}: <strong>${Number(value).toFixed(2)} ARS</strong><br />`;
          }
          if (param.seriesName === 'Banda Superior') {
             const lowerBound = confidenceBandDataLower.find(d => d[0] === param.axisValue)?.[1];
             if (lowerBound !== undefined) {
               // --- AJUSTE FINAL AQUÍ ---
               // Forzamos la conversión a Número para asegurar que .toFixed() funcione.
               tooltipHtml += `${param.marker.replace(designTokens.secondary, 'rgba(255, 127, 14, 0.5)')} Intervalo: <strong>${Number(lowerBound).toFixed(2)} - ${Number(value).toFixed(2)} ARS</strong><br />`;
             }
          }
        });
        return tooltipHtml;
      }
    },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: designTokens.textSecondary } },
      axisLabel: { color: designTokens.textSecondary },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: { color: designTokens.textSecondary },
      splitLine: {
        show: true,
        lineStyle: { color: designTokens.textSecondary, opacity: 0.15, type: 'dashed' }
      },
    },
    dataZoom: [{ type: 'inside', start: 80, end: 100 }],
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    series: [
      {
        name: 'Histórico',
        type: 'line',
        data: historicalSeriesData,
        showSymbol: false,
        smooth: true,
        lineStyle: { color: designTokens.primary, width: 2.5 }
      },
      {
        name: 'Predicción Central',
        type: 'line',
        data: trajectoryData,
        showSymbol: false,
        smooth: true,
        lineStyle: { type: 'dashed', color: designTokens.primary, width: 2.5 }
      },
      {
        name: 'Banda Inferior',
        type: 'line',
        data: confidenceBandDataLower,
        showSymbol: false,
        lineStyle: { opacity: 0 },
        stack: 'confidence'
      },
      {
        name: 'Banda Superior',
        type: 'line',
        data: confidenceBandDataUpper,
        showSymbol: false,
        lineStyle: { opacity: 0 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 127, 14, 0.5)' },
            { offset: 1, color: 'rgba(255, 127, 14, 0.05)' }
          ])
        },
        stack: 'confidence'
      }
    ]
  };

  return (
    <div className="w-full h-[60vh] min-h-[500px]">
      <ReactECharts 
        option={option} 
        notMerge={true}
        lazyUpdate={true}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}

export default ChartComponent;