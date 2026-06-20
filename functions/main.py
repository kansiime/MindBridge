"""
MindBridge — Firebase Cloud Function entry point.
Wraps Django WSGI application as a Firebase HTTP Function.
"""
import os
import sys
import io

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Must import firebase_functions before django setup
from firebase_functions import https_fn  # noqa: E402

import django  # noqa: E402
from django.core.wsgi import get_wsgi_application  # noqa: E402

django.setup()
_application = get_wsgi_application()


def _django_to_wsgi_environ(req: https_fn.Request) -> dict:
    """Convert Firebase Request to WSGI environ dict."""
    body = req.get_data() or b''
    environ = {
        'REQUEST_METHOD':  req.method,
        'PATH_INFO':       req.path or '/',
        'QUERY_STRING':    req.query_string.decode('utf-8', errors='replace'),
        'CONTENT_TYPE':    req.content_type or '',
        'CONTENT_LENGTH':  str(len(body)),
        'wsgi.input':      io.BytesIO(body),
        'wsgi.errors':     sys.stderr,
        'wsgi.multithread':  False,
        'wsgi.multiprocess': False,
        'wsgi.run_once':     False,
        'wsgi.url_scheme':   'https',
        'SERVER_NAME':       'mindbridge-noel.web.app',
        'SERVER_PORT':       '443',
        'SERVER_PROTOCOL':   'HTTP/1.1',
    }
    # Forward HTTP headers
    for key, value in req.headers:
        key_upper = key.upper().replace('-', '_')
        if key_upper == 'CONTENT_TYPE':
            environ['CONTENT_TYPE'] = value
        elif key_upper == 'CONTENT_LENGTH':
            environ['CONTENT_LENGTH'] = value
        else:
            environ[f'HTTP_{key_upper}'] = value
    return environ


@https_fn.on_request(
    region='us-central1',
    memory=https_fn.options.MemoryOption.MB_512,
    timeout_sec=120,
    max_instances=10,
    cors=https_fn.options.CorsOptions(
        cors_origins='*',
        cors_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    ),
)
def mindbridge(req: https_fn.Request) -> https_fn.Response:
    """
    Main Firebase Cloud Function.
    Handles all Django API requests: /api/v1/*, /admin/*
    """
    environ = _django_to_wsgi_environ(req)

    status_holder = []
    headers_holder = []
    body_parts = []

    def start_response(status, response_headers, exc_info=None):
        status_holder.append(status)
        headers_holder.extend(response_headers)

    result = _application(environ, start_response)
    try:
        for chunk in result:
            body_parts.append(chunk)
    finally:
        if hasattr(result, 'close'):
            result.close()

    status_code = int(status_holder[0].split(' ', 1)[0]) if status_holder else 200
    headers = dict(headers_holder)
    body = b''.join(body_parts)

    return https_fn.Response(
        response=body,
        status=status_code,
        headers=headers,
    )
