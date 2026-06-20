export const loadHomePage = () => import("@/pages/home");
export const loadToolPage = () => import("@/pages/tool-page");
export const loadWorkflowPage = () => import("@/pages/workflow-page");
export const loadEditPdfPage = () => import("@/pages/edit-pdf-page");
export const loadPricingPage = () => import("@/pages/pricing");
export const loadPrivacyPage = () => import("@/pages/privacy");
export const loadTermsPage = () => import("@/pages/terms");
export const loadContactPage = () => import("@/pages/contact");
export const loadNotFoundPage = () => import("@/pages/not-found");

export function preloadToolRoute(slug?: string) {
  if (slug === "edit-pdf") {
    void loadEditPdfPage();
    return;
  }

  void loadToolPage();
}

export function warmPrimaryRoutes() {
  return Promise.allSettled([
    loadHomePage(),
    loadToolPage(),
    loadWorkflowPage(),
    loadPricingPage(),
    loadPrivacyPage(),
    loadTermsPage(),
    loadContactPage(),
  ]);
}
