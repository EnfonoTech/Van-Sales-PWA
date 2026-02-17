__version__ = "0.0.1"


def _patch_csrf_for_pwa_login():
	"""Exempt PWA login from CSRF so SPA/cross-origin login works (no session cookie before login)."""
	import frappe.auth

	_original = frappe.auth.HTTPRequest.validate_csrf_token

	def _validate_csrf_token(self):
		req = getattr(frappe.local, "request", None)
		if req and getattr(req, "path", "").endswith("fateh_pwa.pwa.login"):
			return
		return _original(self)

	frappe.auth.HTTPRequest.validate_csrf_token = _validate_csrf_token


_patch_csrf_for_pwa_login()
