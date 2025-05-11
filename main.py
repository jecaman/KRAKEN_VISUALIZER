from kraken_portfolio import obtener_rentabilidad
import os
from dotenv import load_dotenv
import json

load_dotenv()

api_key = os.getenv("KRAKEN_API_KEY")
api_secret = os.getenv("KRAKEN_API_SECRET")

resultados = obtener_rentabilidad(api_key, api_secret)
print(json.dumps(resultados, indent=2))
