import http.server
import socketserver
import webbrowser
import threading
import os
import urllib.request
import json

PUERTO = 8080
ARCHIVO = "index.html"

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"  → {args[0]} {args[1]}")
    
    def do_GET(self):
        if self.path.startswith('/api/weather'):
            lat = self.path.split('lat=')[1].split('&')[0]
            lon = self.path.split('lon=')[1].split('&')[0]
            api_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid=706c1df808bd988fad8aff24039f11f4&units=metric&lang=es"
            
            try:
                with urllib.request.urlopen(api_url) as response:
                    data = json.loads(response.read().decode())
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(data).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            super().do_GET()

def abrir_navegador():
    webbrowser.open(f"http://localhost:{PUERTO}/{ARCHIVO}")

print("=" * 40)
print("   🌤  Servidor de Clima iniciado")
print("=" * 40)
print(f"   URL: http://localhost:{PUERTO}/{ARCHIVO}")
print("   Presioná Ctrl+C para detener")
print("=" * 40)

threading.Timer(1.0, abrir_navegador).start()

with socketserver.TCPServer(("", PUERTO), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n   Servidor detenido. ¡Hasta luego!")