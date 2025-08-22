import ReactECharts from 'echarts-for-react';
import type { PredictionData, HistoricalDataPoint } from '../types/prediction';
import * as echarts from 'echarts';
import { format as formatDate, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChartComponentProps {
  predictionData: PredictionData;
  historicalData: HistoricalDataPoint[];
}

const colors = {
  primary: '#2F81F7',
  primaryLight: '#58A6FF',
  secondary: '#FFC107',
  textSecondary: '#8B949E',
  surface: '#161B22',
  textPrimary: '#C9D1D9',
};

const numberFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

function ChartComponent({ predictionData, historicalData }: ChartComponentProps) {

  const lastHistoricalPoint = historicalData[historicalData.length - 1];
  const lastHistoricalDate = new Date(lastHistoricalPoint.date);
  const firstZoomDate = subDays(lastHistoricalDate, 15);
  const lastForecastDate = new Date(predictionData.trajectory[predictionData.trajectory.length - 1].date);

  const historicalSeriesData = historicalData.map(p => [p.date, p.value]);
  
  const centralPredictionData = predictionData.trajectory.map(p => [p.date, (p.lower_bound + p.upper_bound) / 2]);
  centralPredictionData.unshift([lastHistoricalPoint.date, lastHistoricalPoint.value]);

  // SOLUCIÓN: Se crea una serie de datos específica para el intervalo que contiene los 3 valores necesarios
  const intervalSeriesData = predictionData.trajectory.map(p => [p.date, p.lower_bound, p.upper_bound]);
  intervalSeriesData.unshift([lastHistoricalPoint.date, lastHistoricalPoint.value, lastHistoricalPoint.value]);
  
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
          formatter: (params: any) => {
             if (!params.value) return '';
             return formatDate(new Date(params.value), 'dd MMM yyyy', { locale: es });
          }
        }
      },
      // SOLUCIÓN: Tooltip robusto que lee directamente de los datos de la serie
      formatter: (params: any[]) => {
        if (!params.length) return '';
        const date = formatDate(new Date(params[0].axisValue), 'dd MMMM yyyy', { locale: es });
        let tooltipHtml = `<div class="font-bold text-base mb-1" style="color: ${colors.textPrimary};">${date}</div>`;
        
        // Se busca el dato del intervalo directamente en los parámetros que provee ECharts
        const intervalParam = params.find(p => p.seriesName === 'Intervalo');

        params.forEach(param => {
          if (param.seriesName === 'Histórico') {
            tooltipHtml += `<div style="color: ${colors.textPrimary};">${param.marker} Histórico: <span class="font-semibold">${numberFormatter.format(param.value[1])}</span></div>`;
          }
          if (param.seriesName === 'Predicción Central' && param.axisValue !== lastHistoricalPoint.date) {
            tooltipHtml += `<div style="color: ${colors.textPrimary};">${param.marker} Predicción: <span class="font-semibold">${numberFormatter.format(param.value[1])}</span></div>`;
          }
        });

        if (intervalParam && intervalParam.axisValue !== lastHistoricalPoint.date) {
            const lowerBound = intervalParam.value[1];
            const upperBound = intervalParam.value[2];
            tooltipHtml += `<div style="color: ${colors.textPrimary};"><span style="color:${colors.secondary}; margin-right:5px">●</span> Intervalo: <span class="font-semibold">${numberFormatter.format(lowerBound)} - ${numberFormatter.format(upperBound)}</span></div>`;
        }
        return tooltipHtml;
      }
    },
    xAxis: { type: 'time', axisLine: { lineStyle: { color: colors.textSecondary } }, axisLabel: { color: colors.textSecondary } },
    yAxis: {
      type: 'value',
      name: 'ARS/USD',
      nameTextStyle: { color: colors.textSecondary, align: 'left' },
      scale: true,
      axisLabel: { color: colors.textSecondary, formatter: (value: number) => value.toLocaleString('es-AR') },
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
        symbol: 'none',
        tooltip: { show: false }
      },
      // Serie invisible que contiene los datos del intervalo para un acceso seguro en el tooltip
      {
        name: 'Intervalo',
        type: 'line',
        data: intervalSeriesData,
        symbol: 'none',
        lineStyle: { opacity: 0 },
        tooltip: { show: true } 
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