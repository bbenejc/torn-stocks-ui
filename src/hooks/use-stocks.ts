import { useEffect } from "react";
import { useSelector, useStore } from "react-redux";
import { UPDATE_SECOND, worker } from "config";
import {
  selectStocksUpdated,
  selectVisibility,
  setStocksList,
} from "app/store";

export function useStocks(): void {
  const store = useStore();
  const visibility = useSelector(selectVisibility);

  useEffect(() => {
    function scheduleStocksUpdate() {
      const timeNext = new Date();
      timeNext.setMinutes(
        timeNext.getMinutes() + (timeNext.getSeconds() >= 3 ? 1 : 0),
        UPDATE_SECOND,
        0
      );
      worker.postMessage({
        set: "stocks",
        interval: Math.max(0, timeNext.getTime() - Date.now()),
      });
    }
    function loadStocks() {
      fetchStocks()
        .then(({ data, timestamp }) => {
          const stocks: TStockInfo[] = [];
          data.forEach(
            ({
              stock,
              index,
              name,
              price,
              price_m1,
              total_shares,
              marketcap,
            }) => {
              const cur = parseFloat(price);
              const prev = parseFloat(price_m1);

              stocks.push({
                stock: stock || index || "",
                name,
                price,
                diff_m1: cur - prev,
                diff_percent_m1: ((cur - prev) / prev) * 100,
                total_shares,
                marketcap,
              });
            }
          );
          store.dispatch(setStocksList(stocks, timestamp));
        })
        .catch(() => {})
        .finally(() => {
          scheduleStocksUpdate();
        });
    }

    const onMessage = (e: MessageEvent) => {
      if (e.data.tick === "stocks") loadStocks();
    };
    worker.addEventListener("message", onMessage);

    const lastUpdate = selectStocksUpdated(store.getState());
    if (lastUpdate > Date.now() - 60000) scheduleStocksUpdate();
    else loadStocks();

    return () => {
      worker.removeEventListener("message", onMessage);
      worker.postMessage({ clear: "stocks" });
    };
  }, [store, visibility]);
}

async function fetchStocks(): Promise<{
  data: TStockList[];
  timestamp: number;
}> {
  const res = await fetch(process.env.REACT_APP_API + "/stocks?indexes=1").then(
    (response) => response.json()
  );
  const data = res && res.data ? res.data : [];
  const timestamp = res && res.timestamp ? res.timestamp : 0;

  return { data, timestamp };
}
