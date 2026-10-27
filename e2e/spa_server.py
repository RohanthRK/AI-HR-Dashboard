import http.server, os, sys, functools
root = sys.argv[1]


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.translate_path(self.path.split('?')[0])
        if not os.path.exists(path) or os.path.isdir(path):
            self.path = '/index.html'
        return super().do_GET()

    def log_message(self, *a):
        pass


http.server.ThreadingHTTPServer(('127.0.0.1', 3999), functools.partial(Handler, directory=root)).serve_forever()
