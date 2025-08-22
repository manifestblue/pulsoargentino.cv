import ReactECharts from 'echarts-for-react';
import type { PredictionData, HistoricalDataPoint } from '../types/prediction';
import * as echarts from 'echarts';
import { format as formatDate } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChartComponentProps {
  predictionData: PredictionData;
  historicalData: HistoricalDataPoint[];
}

const colors = {
  primary: '#2F81F7',
  primaryLight: '#58A6FF',
  secondary: '#FFC107', // CORRECCIÓN: Se añade el color 'secondary' que faltaba
  textSecondary: '#8B949E',
  surface: '#161B22',
  textPrimary: '#C9D1D9',
};

const numberFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function ChartComponent({ predictionData, historicalData }: ChartComponentProps) {
  
  const lastHistoricalPoint = historicalData[historicalData.length - 1];
  
  // --- LÓGICA DE ROBUSTEZ: ZOOM INICIAL ---
  const firstZoomDate = new Date(lastHistoricalPoint.date);
  firstZoomDate.setDate(new Date(lastHistoricalPoint.date).getDate() - 15);
  const lastForecastDate = new Date(predictionData.trajectory[predictionData.trajectory.length - 1].date);

  // --- TRANSFORMACIÓN DE DATOS ROBUSTA ---
  const historicalSeriesData = historicalData.map(p => [p.date, p.value]);
  
  const centralPredictionData = predictionData.trajectory.map(p => [p.date, (p.lower_bound + p.upper_bound) / 2]);
  centralPredictionData.unshift([lastHistoricalPoint.date, lastHistoricalPoint.value]);

  // SOLUCIÓN DE ROBUSTEZ: Se crea una única serie para el intervalo con todos los datos necesarios
  const intervalSeriesData = predictionData.trajectory.map(p => [p.date, p.lower_bound, p.upper_bound]);
  intervalSeriesData.unshift([lastHistoricalPoint.date, lastHistoricalPoint.value, lastHistoricalPoint.value]);
  
  // Se crea un polígono separado solo para el área visual
  const polygonDataForArea = [[lastHistoricalPoint.date, lastHistoricalPoint.value], ...predictionData.trajectory.map(p => [p.date, p.upper_bound]), ...[...predictionData.trajectory].reverse().map(p => [p.date, p.lower_bound])];


  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.surface,
      borderColor: '#30363d',
      textStyle: { color: colors.textPrimary, fontSize: 14 },
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: colors.surface,
          formatter: (params: any) => formatDate(new Date(params.value), 'dd MMM yyyy', { locale: es })
        }
      },
      // --- TOOLTIP ROBUSTO ---
      formatter: (params: any[]) => {
        const date = formatDate(new Date(params[0].axisValue), 'dd MMMM yyyy', { locale: es });
        let tooltipHtml = `<div class="font-bold text-base mb-1">${date}</div>`;
        
        params.forEach(param => {
          const value = param.value[1]; // Valor principal en la posición 1
          if (param.seriesName === 'Histórico') {
            tooltipHtml += `<div>${param.marker} Histórico: <span class="font-semibold">${numberFormatter.format(value)} ARS</span></div>`;
          }
          // Usamos la serie de intervalo, que tiene toda la data y evita errores
          if (param.seriesName === 'Intervalo' && param.axisValue !== lastHistoricalPoint.date) {
            const lowerBound = param.value[1];
            const upperBound = param.value[2];
            const centralPoint = (lowerBound + upperBound) / 2;

            tooltipHtml += `<div><span style="color:${colors.primaryLight}; margin-right:5px">●</span> Predicción Central: <span class="font-semibold">${numberFormatter.format(centralPoint)} ARS</span></div>`;
            tooltipHtml += `<div><span style="color:${colors.secondary}; margin-right:5px">●</span> Intervalo: <span class="font-semibold">${numberFormatter.format(lowerBound)} - ${numberFormatter.format(upperBound)} ARS</span></div>`;
          }
        });
        return tooltipHtml;
      }
    },
    xAxis: { type: 'time', axisLine: { lineStyle: { color: colors.textSecondary } }, axisLabel: { color: colors.textSecondary } },
    yAxis: {
      type: 'value',
      name: 'ARS/USD',
      nameTextStyle: { color: colors.textSecondary, align: 'left' },
      scale: true,
      axisLabel: { color: colors.textSecondary, formatter: (value: number) => numberFormatter.format(value) },
      splitLine: { show: true, lineStyle: { color: colors.textSecondary, opacity: 0.15, type: 'dashed' } },
    },
    dataZoom: [{ type: 'inside', startValue: firstZoomDate.getTime(), endValue: lastForecastDate.getTime() }],
    grid: { left: '2%', right: '5%', bottom: '10%', containLabel: true },
    series: [
      {
        name: 'Histórico',
        type: 'line',
        data: historicalSeriesData,
        showSymbol: false,
        smooth: 0.2,
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
        name: 'Área del Intervalo',
        type: 'line',
        data: polygonDataForArea,
        lineStyle: { opacity: 0 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, 
            [{ offset: 0, color: 'rgba(255, 193, 7, 0.4)' }, { offset: 1, color: 'rgba(255, 193, 7, 0.05)' }],
            false
          ),
        },
        stack: 'confidence',
        symbol: 'none'
      },
       // Serie invisible solo para controlar el tooltip de forma robusta
      {
        name: 'Intervalo',
        type: 'line',
        data: intervalSeriesData,
        symbol: 'none',
        lineStyle: {
            opacity: 0
        }
      }
    ]
  };

  return (
    <div className="w-full h-[65vh] min-h-[550px]">
      <ReactECharts 
        option={option} 
        notMerge={true}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}

export default ChartComponent;