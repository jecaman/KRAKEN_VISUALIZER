from flask import Flask, request, jsonify, render_template
from kraken_portfolio import obtener_rentabilidad

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

    # Extraer claves del cuerpo de la petición
    api_key = data.get('api_key')
    api_secret = data.get('api_secret')

    # Validación básica
    if not api_key or not api_secret:
        return jsonify({"error": "API key and secret required"}), 400

    try:
        # Calcular rentabilidad usando tu función del script
        resultados = obtener_rentabilidad(api_key, api_secret)
        return jsonify(resultados)
    except Exception as e:
        # Devolver error si algo falla
        return jsonify({"error": str(e)}), 500

# Ejecutar la app en modo desarrollo
if __name__ == '__main__':
    app.run(debug=True)
