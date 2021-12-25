import { memo, ReactElement, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useStockData } from 'hooks';
import { IChartApi, ISeriesApi, TimeRange } from 'lightweight-charts';
import {
  selectTheme,
  selectIndicators,
  selectAdvanced,
  selectStockPrice,
  selectVolume,
  selectStock,
  selectInterval,
} from 'app/store';
import { formatNumber } from 'tools';
import { Clock } from 'components';
import { Tooltip, TTooltip } from './tooltip';
import { getTheme } from 'themes';
import {
  applyTheme,
  createAdvancedSeries,
  createCrosshairHandler,
  createIndicatorSeries,
  createMainSeries,
  createVolumeSeries,
  disableLoadingMode,
  enableLoadingMode,
  initChart,
} from './utils';
import css from './chart.module.css';

function Chart({ height, width }: TProps): ReactElement {
  const stock = useSelector(selectStock);
  const interval = useSelector(selectInterval);
  const [data, loadHistory] = useStockData(stock, interval);
  const currentPrice = useSelector(selectStockPrice);
  const indicators = useSelector(selectIndicators);
  const advanced = useSelector(selectAdvanced);
  const volume = useSelector(selectVolume);
  const [hover, setHover] = useState<TTooltip[]>();
  const [lastData, setLastData] = useState<TTooltip[]>();
  const hoverPrev = useRef<string>();

  const theme = getTheme(useSelector(selectTheme));
  const divRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi>();
  const mainSeries = useRef<ISeriesApi<'Line' | 'Candlestick'>>();
  const volumeSeries = useRef<ISeriesApi<'Area'>>();
  const indicatorSeries = useRef<ISeriesApi<'Line'>[]>([]);
  const advancedSeries = useRef<ISeriesApi<'Line' | 'Histogram'>[]>([]);

  const chartKey = useRef('');
  const isLoading = useRef(false);
  const curKey = stock + '-' + interval;

  if (curKey !== chartKey.current) {
    isLoading.current = true;
    chartKey.current = curKey;
  }

  useEffect(() => {
    if (divRef.current) {
      if (!chart.current) {
        chart.current = initChart(divRef.current, width, height);
        createCrosshairHandler(
          chart.current,
          mainSeries,
          volumeSeries,
          indicatorSeries,
          advancedSeries,
          setHover,
          hoverPrev,
          isLoading
        );
      } else chart.current.resize(width, height);
    }
  }, [width, height]);

  // subscribe "load more" function
  useEffect(() => {
    if (chart.current) {
      let timeout: NodeJS.Timeout;
      const timeRangeHandler = (e: TimeRange | null) => {
        if (timeout) clearTimeout(timeout);
        if (!isLoading.current) {
          timeout = setTimeout(() => {
            if (e !== null && loadHistory) loadHistory(e.from as number);
          }, 50);
        }
      };
      const timeScale = chart.current.timeScale();
      timeScale.subscribeVisibleTimeRangeChange(timeRangeHandler);

      return () => {
        timeScale.unsubscribeVisibleTimeRangeChange(timeRangeHandler);
        clearTimeout(timeout);
      };
    }
  }, [loadHistory]);

  // apply general theme
  useEffect(() => {
    if (chart.current) applyTheme(chart.current, theme);
  }, [theme]);

  // handle data series
  useEffect(() => {
    const tooltip: TTooltip[] = [];
    if (chart.current) {
      if (data.length) {
        if (isLoading.current) {
          // fix for a kinetic bug (to stop kinetic scroll when new stock / interval is loaded)
          try {
            const ref =
              divRef.current?.childNodes[5].childNodes[0].childNodes[0].childNodes[1].childNodes[0].childNodes[1];
            if (ref) {
              ref.dispatchEvent(new Event('mousedown'));
              ref.dispatchEvent(new Event('mouseup', { bubbles: true }));
              setTimeout(() => {}, 10);
            }
          } catch {}

          disableLoadingMode(chart.current, interval);
          isLoading.current = false;
        }
        createMainSeries(chart.current, mainSeries, data, interval, tooltip, theme);
        createVolumeSeries(chart.current, volumeSeries, data, volume, tooltip, theme);
        createIndicatorSeries(chart.current, indicatorSeries, data, interval, indicators, tooltip, theme);
        createAdvancedSeries(chart.current, advancedSeries, data, interval, advanced, tooltip, theme);
      } else {
        isLoading.current = true;
        enableLoadingMode(chart.current);
      }
    }
    setLastData(tooltip);
    setHover(undefined);
  }, [theme, data, interval, indicators, advanced, volume]);

  // handle title change
  useEffect(() => {
    let title = stock.toUpperCase();
    if (currentPrice !== '') title += ' ' + formatNumber(parseFloat(currentPrice));
    if (title !== '') title += ' | ';
    title += 'Tornsy';

    if (document.title !== title) document.title = title;
  }, [currentPrice, stock]);

  const classNames = [css.Chart];
  if (!data.length) classNames.push(css.Loading);

  return (
    <div ref={divRef} className={classNames.join(' ')}>
      <Tooltip data={data} series={hover || lastData || []} stock={stock} interval={interval} chart={chart} />
      <Clock />
    </div>
  );
}

export default memo(Chart);

type TProps = {
  height: number;
  width: number;
};
