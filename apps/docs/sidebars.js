/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  apiSidebar: require('./docs/api/sidebar.ts'),
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/getting-started',
        'getting-started/prerequisites',
        'getting-started/cli-getting-started',
        'getting-started/create-modules',
        'getting-started/create-subscribers',
        'getting-started/events',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/module-system',
        'architecture/di-container',
        'architecture/file-based-routes',
        'architecture/workflow-engine',
        'architecture/event-bus',
      ],
    },
    {
      type: 'category',
      label: 'Core Modules',
      items: [
        'modules/overview',
        'modules/auth',
        'modules/project',
        'modules/issue',
      ],
    },
    {
      type: 'category',
      label: 'Authentication & RBAC',
      items: [
        'auth/jwt-auth',
        'auth/rbac',
        'auth/middleware',
      ],
    },
    {
      type: 'category',
      label: 'Admin Dashboard',
      items: [
        'admin/overview',
        'admin/widgets',
      ],
    },
    {
      type: 'category',
      label: 'Plugins',
      items: [
        'plugins/overview',
        'plugins/webhook',
      ],
    },
    {
      type: 'category',
      label: 'Tutorials',
      items: [
        'tutorials/build-a-module',
        'tutorials/build-a-widget',
        'tutorials/build-a-plugin',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/production-checklist',
      ],
    },
  ],
}

module.exports = sidebars
