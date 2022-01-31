import { memo, ReactElement } from 'react';
import { useSelector } from 'react-redux';
import { selectFavourites, selectOrderedStocksList } from 'app/store';
import { WatchlistMenu } from './menu';
import { WatchlistHeader } from './header';
import { WatchlistItem } from './item';
import css from './watchlist.module.css';

function WatchlistComponent({ small = false }: TProps): ReactElement {
  return (
    <div className={css.Watchlist}>
      <WatchlistMenu small={small} />
      <div className={css.List}>
        <WatchlistHeader className={css.Header} />
        <List />
      </div>
    </div>
  );
}

export const Watchlist = memo(WatchlistComponent);

function List(): ReactElement {
  const stocks = useSelector(selectOrderedStocksList);
  const favourites = useSelector(selectFavourites);

  const favStocks: typeof stocks = [];
  const otherStocks: typeof stocks = [];
  stocks.forEach((s) => {
    if (favourites.includes(s.stock)) favStocks.push(s);
    else otherStocks.push(s);
  });

  return (
    <>
      {favStocks.length > 0 && (
        <div className={css.Group}>
          {favStocks.map((stock) => {
            return <WatchlistItem stock={stock} key={stock.stock} />;
          })}
        </div>
      )}
      {otherStocks.length > 0 && (
        <div className={css.Group}>
          {otherStocks.map((stock) => {
            return <WatchlistItem stock={stock} key={stock.stock} />;
          })}
        </div>
      )}
    </>
  );
}

type TProps = {
  small?: boolean;
};
