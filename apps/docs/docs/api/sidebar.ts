import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api/meridianjs-api",
    },
    {
      type: "category",
      label: "Auth",
      link: {
        type: "doc",
        id: "api/auth",
      },
      items: [
        {
          type: "doc",
          id: "api/register-the-first-user",
          label: "Register the first user",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/log-in-and-get-a-jwt",
          label: "Log in and get a JWT",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/invalidate-the-current-session",
          label: "Invalidate the current session",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/check-if-initial-setup-is-required",
          label: "Check if initial setup is required",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/validate-an-invitation-token",
          label: "Validate an invitation token",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/accept-an-invitation-register-or-login",
          label: "Accept an invitation (register or login)",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Users",
      link: {
        type: "doc",
        id: "api/users",
      },
      items: [
        {
          type: "doc",
          id: "api/list-all-users",
          label: "List all users",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-the-current-users-profile",
          label: "Get the current user's profile",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/update-the-current-users-profile",
          label: "Update the current user's profile",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/upload-a-profile-avatar",
          label: "Upload a profile avatar",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/invite-a-user-to-a-workspace-by-email",
          label: "Invite a user to a workspace by email",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-a-user-by-id",
          label: "Get a user by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/update-a-user-admin-only",
          label: "Update a user (admin only)",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/assign-an-app-role-to-a-user",
          label: "Assign an AppRole to a user",
          className: "api-method put",
        },
      ],
    },
    {
      type: "category",
      label: "Workspaces",
      link: {
        type: "doc",
        id: "api/workspaces",
      },
      items: [
        {
          type: "doc",
          id: "api/list-workspaces",
          label: "List workspaces",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-a-workspace",
          label: "Create a workspace",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-a-workspace-by-id",
          label: "Get a workspace by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/update-a-workspace",
          label: "Update a workspace",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/delete-a-workspace",
          label: "Delete a workspace",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/upload-a-workspace-logo",
          label: "Upload a workspace logo",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Workspace Members",
      link: {
        type: "doc",
        id: "api/workspace-members",
      },
      items: [
        {
          type: "doc",
          id: "api/list-workspace-members",
          label: "List workspace members",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/add-a-user-to-a-workspace",
          label: "Add a user to a workspace",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/update-a-members-role",
          label: "Update a member's role",
          className: "api-method patch",
        },
        {
          type: "doc",
          id: "api/remove-a-member-from-a-workspace",
          label: "Remove a member from a workspace",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/list-pending-invitations-for-a-workspace",
          label: "List pending invitations for a workspace",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-a-workspace-invitation",
          label: "Create a workspace invitation",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/revoke-a-pending-invitation",
          label: "Revoke a pending invitation",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "Teams",
      link: {
        type: "doc",
        id: "api/teams",
      },
      items: [
        {
          type: "doc",
          id: "api/list-teams-in-a-workspace",
          label: "List teams in a workspace",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-a-team",
          label: "Create a team",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-a-team-by-id",
          label: "Get a team by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/update-a-team",
          label: "Update a team",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/delete-a-team",
          label: "Delete a team",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/list-team-members",
          label: "List team members",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/add-a-user-to-a-team",
          label: "Add a user to a team",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/remove-a-user-from-a-team",
          label: "Remove a user from a team",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "Projects",
      link: {
        type: "doc",
        id: "api/projects",
      },
      items: [
        {
          type: "doc",
          id: "api/list-projects",
          label: "List projects",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-a-project",
          label: "Create a project",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-a-project-by-id",
          label: "Get a project by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/update-a-project",
          label: "Update a project",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/soft-delete-a-project",
          label: "Soft-delete a project",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "Project Members",
      link: {
        type: "doc",
        id: "api/project-members",
      },
      items: [
        {
          type: "doc",
          id: "api/get-enriched-access-list-members-teams",
          label: "Get enriched access list (members + teams)",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/add-a-user-to-a-project",
          label: "Add a user to a project",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/remove-a-user-from-a-project",
          label: "Remove a user from a project",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/grant-a-team-access-to-a-project",
          label: "Grant a team access to a project",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/remove-a-teams-access-from-a-project",
          label: "Remove a team's access from a project",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "Project Statuses",
      link: {
        type: "doc",
        id: "api/project-statuses",
      },
      items: [
        {
          type: "doc",
          id: "api/list-custom-statuses-for-a-project",
          label: "List custom statuses for a project",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-a-custom-status",
          label: "Create a custom status",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/update-a-status",
          label: "Update a status",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/delete-a-status",
          label: "Delete a status",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/reorder-statuses",
          label: "Reorder statuses",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Issues",
      link: {
        type: "doc",
        id: "api/issues",
      },
      items: [
        {
          type: "doc",
          id: "api/list-issues",
          label: "List issues",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-an-issue",
          label: "Create an issue",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-an-issue-by-id",
          label: "Get an issue by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/update-an-issue",
          label: "Update an issue",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/soft-delete-an-issue",
          label: "Soft-delete an issue",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "Comments",
      link: {
        type: "doc",
        id: "api/comments",
      },
      items: [
        {
          type: "doc",
          id: "api/list-comments-on-an-issue",
          label: "List comments on an issue",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/post-a-comment-on-an-issue",
          label: "Post a comment on an issue",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Sprints",
      link: {
        type: "doc",
        id: "api/sprints",
      },
      items: [
        {
          type: "doc",
          id: "api/list-sprints",
          label: "List sprints",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-a-sprint",
          label: "Create a sprint",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-a-sprint-by-id",
          label: "Get a sprint by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/update-a-sprint",
          label: "Update a sprint",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/delete-a-sprint",
          label: "Delete a sprint",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "Notifications",
      link: {
        type: "doc",
        id: "api/notifications",
      },
      items: [
        {
          type: "doc",
          id: "api/list-notifications-for-the-current-user",
          label: "List notifications for the current user",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/mark-a-notification-as-read",
          label: "Mark a notification as read",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/mark-all-notifications-as-read",
          label: "Mark all notifications as read",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Roles",
      link: {
        type: "doc",
        id: "api/roles",
      },
      items: [
        {
          type: "doc",
          id: "api/list-all-app-roles",
          label: "List all AppRoles",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-a-custom-app-role",
          label: "Create a custom AppRole",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-a-role-by-id",
          label: "Get a role by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/update-a-role",
          label: "Update a role",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/delete-a-role",
          label: "Delete a role",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "Org Calendar",
      link: {
        type: "doc",
        id: "api/org-calendar",
      },
      items: [
        {
          type: "doc",
          id: "api/get-the-organisations-working-calendar",
          label: "Get the organisation's working calendar",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/update-the-organisations-working-calendar",
          label: "Update the organisation's working calendar",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/list-organisation-holidays",
          label: "List organisation holidays",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/add-a-holiday",
          label: "Add a holiday",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/update-a-holiday",
          label: "Update a holiday",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/delete-a-holiday",
          label: "Delete a holiday",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "Public",
      link: {
        type: "doc",
        id: "api/public",
      },
      items: [
        {
          type: "doc",
          id: "api/get-a-shared-project-by-share-token",
          label: "Get a shared project by share token",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/list-issues-on-a-shared-project",
          label: "List issues on a shared project",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/list-sprints-on-a-shared-project",
          label: "List sprints on a shared project",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
