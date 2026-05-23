import frappe


def after_request(response, request):
    """Add Service-Worker-Allowed header so the SW at /assets/.../sw.js can claim scope /pwa."""
    if request.path.endswith("/sw.js") and "fateh_pwa" in request.path:
        response.headers["Service-Worker-Allowed"] = "/pwa"
    return response
