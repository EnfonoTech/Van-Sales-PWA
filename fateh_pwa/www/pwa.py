import frappe
import os

no_cache = 1


def get_context(context):
    context.no_cache = 1
    context.no_breadcrumbs = 1
    context.no_header = 1
    context.no_sidebar = 1
    context.no_footer = 1
    context.no_navbar = 1

    index_path = frappe.get_app_path("fateh_pwa", "public/pwa/index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            context.pwa_html = f.read()
    else:
        context.pwa_html = "<h1>PWA not built. Run: cd frontend && npm run build</h1>"
