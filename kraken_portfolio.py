import krakenex
from pykrakenapi import KrakenAPI
import datetime

FIAT_ASSETS = {"ZEUR", "ZUSD", "ZGBP", "ZCAD", "ZCHF", "ZJPY", "ZKRW"}


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

    since = int((datetime.datetime.now() - datetime.timedelta(days=365 * 5)).timestamp())
    trades, _ = kraken.get_trades_history(start=since)

    FIAT_ASSETS = ['ZEUR', 'ZUSD', 'ZGBP']
    resultados = []

    # Obtener todos los pares únicos
    unique_pairs = trades['pair'].unique()

    for pair in unique_pairs:
        if not isinstance(pair, str):
            continue

        # Extraer el asset base del par (ej. 'XXBTZEUR' → 'XXBT')
        for fiat in FIAT_ASSETS:
            if pair.endswith(fiat):
                asset = pair.replace(fiat, '')
                break
        else:
            continue  # Si no termina en fiat, lo ignoramos

        if asset in FIAT_ASSETS:
            continue

        valid_pair = get_valid_pair(kraken, asset)
        if not valid_pair:
            print(f"Par no encontrado para {asset}")
            continue

        try:
            current_price = float(kraken.get_ticker_information(valid_pair).loc[valid_pair]["c"][0])
        except:
            print(f"No se pudo obtener precio para {asset}")
            continue

        # Filtrar compras y ventas de ese par
        trades_asset = trades[trades['pair'] == pair]
        buys = trades_asset[trades_asset['type'] == 'buy']
        sells = trades_asset[trades_asset['type'] == 'sell']

        total_bought = buys['vol'].astype(float).sum()
        total_cost = buys['cost'].astype(float).sum()
        total_sold = sells['vol'].astype(float).sum()

        net_volume = total_bought - total_sold
        if net_volume <= 0:
            continue  # Ya no tienes nada de este asset

        avg_price = total_cost / total_bought if total_bought > 0 else current_price
        current_value = net_volume * current_price
        pnl = current_value - total_cost
        pnl_percent = (pnl / total_cost) * 100 if total_cost > 0 else 0

        resultados.append({
            "asset": asset,
            "amount": round(net_volume, 8),
            "average_cost": round(avg_price, 2),
            "current_price": round(current_price, 2),
            "total_invested": round(total_cost, 2),
            "current_value": round(current_value, 2),
            "pnl_eur": round(pnl, 2),
            "pnl_percent": round(pnl_percent, 2)
        })

    # Incluir fiat si queda
    balances = kraken.get_account_balance()
    for fiat in FIAT_ASSETS:
        if fiat in balances.index:
            amount = float(balances.loc[fiat]['vol'])
            if amount > 0:
                resultados.append({
                    "asset": fiat,
                    "amount": amount,
                    "average_cost": None,
                    "current_price": 1.0,
                    "total_invested": None,
                    "current_value": round(amount, 2),
                    "pnl_eur": None,
                    "pnl_percent": None
                })

    return resultados

