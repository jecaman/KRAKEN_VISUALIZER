import krakenex
from pykrakenapi import KrakenAPI
import datetime

def get_valid_pair(kraken, asset, quote="ZEUR"):
    asset_pairs = kraken.get_tradable_asset_pairs()
    for pair_name in asset_pairs.index:
        if pair_name.startswith(asset) and pair_name.endswith(quote):
            return pair_name
    return None


def obtener_rentabilidad(api_key, api_secret):
    k = krakenex.API()
    k.key = api_key
    k.secret = api_secret
    kraken = KrakenAPI(k)

    # Obtener balances actuales
    balances = kraken.get_account_balance()
    balances = balances[balances['vol'].astype(float) > 0]

    # Obtener historial de operaciones (trades)
    since = int((datetime.datetime.now() - datetime.timedelta(days=365*5)).timestamp())
    trades, _ = kraken.get_trades_history(start=since)

    resultados = []

    # Iterar sobre cada asset en los balances
    for asset in balances.index:
        # Obtener el par de trading correspondiente
        pair = get_valid_pair(kraken, asset)
        if not pair:
            print(f"Par no encontrado para {asset}")
            continue
        # Obtener el precio actual del asset
        current_price = kraken.get_ticker_information(pair).loc[pair]["c"][0]

        # Filtrar compras de este asset
        asset_trades = trades[(trades['pair'].str.contains(asset)) & (trades['type'] == 'buy')]
        if asset_trades.empty:
            continue

        # Calcular el total de volumen (BTC) y costo (EUR) de las compras
        total_vol = asset_trades['vol'].astype(float).sum()
        total_cost = asset_trades['cost'].astype(float).sum()

        if total_vol == 0:
            continue
        # Calcular el precio promedio de compra
        avg_price = total_cost / total_vol

        current_vol = float(balances.loc[asset]['vol'])
        current_value = float(current_price) * current_vol
        pnl = current_value - total_cost
        pnl_percent = (pnl / total_cost) * 100

        resultados.append({
            "asset": asset,
            "amount": current_vol,
            "average_cost": round(avg_price, 2),
            "current_price": round(float(current_price), 2),
            "total_invested": round(total_cost, 2),
            "current_value": round(current_value, 2),
            "pnl_eur": round(pnl, 2),
            "pnl_percent": round(pnl_percent, 2)
        })

    return resultados
