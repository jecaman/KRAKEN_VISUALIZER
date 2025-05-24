from flask import Flask, request, jsonify, render_template
from kraken_portfolio import (
    obtener_rentabilidad,
    reconstruir_holdings_diarios,
    obtener_precios_diarios,
    crear_kraken_api,
    calcular_profit_timeline  # 👈 añade esta línea
)

# Crear la aplicación Flask
app = Flask(__name__)

# Ruta raíz: carga la página principal con el formulario
@app.route('/')
def index():
    return render_template('index.html')

# Ruta API que recibe las claves API y devuelve la rentabilidad
@app.route('/api/portfolio', methods=['POST'])
def portfolio():
    data = request.json

    api_key = data.get('api_key')
    api_secret = data.get('api_secret')

    if not api_key or not api_secret:
        return jsonify({"error": "API key and secret required"}), 400

    try:
        # Paso 1: obtener datos actuales y trades históricos
        resultados, trades_df = obtener_rentabilidad(api_key, api_secret)

        # Paso 2: reconstruir holdings diarios
        holdings_diarios = reconstruir_holdings_diarios(trades_df)

        # Paso 3: obtener precios históricos
        kraken = crear_kraken_api(api_key, api_secret)
        start_date = list(holdings_diarios.keys())[0]
        end_date = list(holdings_diarios.keys())[-1]

        assets_unicos = set()
        for snapshot in holdings_diarios.values():
            assets_unicos.update(snapshot.keys())

        precios_por_asset = {}
        for asset in assets_unicos:
            precios_por_asset[asset] = obtener_precios_diarios(asset, kraken, start_date, end_date)

        # Paso 4: calcular evolución diaria con profit incluido
        timeline = calcular_profit_timeline(trades_df, holdings_diarios, precios_por_asset)

        return jsonify({
            "summary": resultados,
            "timeline": timeline
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Ejecutar la app en modo desarrollo
if __name__ == '__main__':
    app.run(debug=True)
