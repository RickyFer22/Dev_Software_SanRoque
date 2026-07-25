#!/usr/bin/env python3
"""
Simple HTTP server with proxy for /api/* routes to localhost:4000
Serves static files from current directory, proxies API calls to admin backend.
"""
import http.server
import socketserver
import urllib.request
import urllib.error
import json
from pathlib import Path

# Temporal: usar 8001 si 8000 está ocupado
PORT = 8001
# Temporal: si el admin no puede arrancar en 4000 por estar ocupado, use 4001
ADMIN_HOST = 'http://127.0.0.1:4001'

class ProxyHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self._is_api_route():
            self._proxy_request('GET')
        elif self._is_friendly_route():
            self._serve_friendly_route()
        else:
            super().do_GET()
    
    def do_POST(self):
        if self._is_api_route():
            self._proxy_request('POST')
        else:
            self.send_error(405, 'Method Not Allowed')
    
    def do_OPTIONS(self):
        if self._is_api_route():
            self._proxy_request('OPTIONS')
        else:
            super().do_OPTIONS()
    
    def _is_api_route(self):
        return self.path.startswith('/api/')

    def _is_friendly_route(self):
        return any(self.path.startswith(prefix) for prefix in ['/agenda/', '/hospedajes/', '/gastronomia/'])

    def _serve_friendly_route(self):
        route_map = {
            '/agenda/': 'agenda.html',
            '/hospedajes/': 'index.html',
            '/gastronomia/': 'gastronomia.html',
        }
        for prefix, filename in route_map.items():
            if self.path.startswith(prefix):
                self.path = '/' + filename
                return super().do_GET()
        super().do_GET()
    
    def _proxy_request(self, method):
        """Forward request to admin backend"""
        upstream_url = ADMIN_HOST + self.path
        
        # Prepare headers
        headers = {
            'Content-Type': self.headers.get('Content-Type', 'application/json'),
        }
        
        # Add CORS headers
        cors_origin = self.headers.get('Origin', '*')
        
        try:
            # Get body if POST/PUT
            body = None
            if method in ['POST', 'PUT', 'PATCH']:
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length > 0:
                    body = self.rfile.read(content_length)
            
            # Make request to admin backend
            request = urllib.request.Request(
                upstream_url,
                data=body,
                headers=headers,
                method=method
            )
            
            with urllib.request.urlopen(request) as response:
                response_body = response.read()
                
                # Send response back to client
                self.send_response(response.status)
                
                # Send all headers from upstream + CORS headers
                for header, value in response.headers.items():
                    self.send_header(header, value)
                
                # Add CORS headers
                self.send_header('Access-Control-Allow-Origin', cors_origin)
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                self.send_header('Access-Control-Allow-Credentials', 'true')
                
                self.end_headers()
                self.wfile.write(response_body)
        
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', cors_origin)
            self.end_headers()
            
            error_response = json.dumps({
                'error': f'Upstream error: {e.code}',
                'message': str(e.reason)
            }).encode()
            self.wfile.write(error_response)
        
        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', cors_origin)
            self.end_headers()
            
            error_response = json.dumps({
                'error': 'Gateway error',
                'message': str(e)
            }).encode()
            self.wfile.write(error_response)

if __name__ == '__main__':
    Handler = ProxyHTTPHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving on port {PORT}")
        print(f"Static files: ./")
        print(f"API proxy: /api/* → {ADMIN_HOST}/api/*")
        print(f"Open: http://localhost:{PORT}/index.html")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
