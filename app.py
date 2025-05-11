from flask import Flask, request, jsonify
from kraken_portfolio import obtener_rentabilidad

app = Flask(__name__)

@app.route('/api/portfolio', methods=['POST'])
def portfolio():
    data = request.json
    api_key = data.get('api_key')
    api_secret = data.get('api_secret')

    if not api_key or not api_secret:
        return jsonify({"error": "API key and secret required"}), 400

    try:
        resultados = obtener_rentabilidad(api_key, api_secret)
        return jsonify(resultados)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
