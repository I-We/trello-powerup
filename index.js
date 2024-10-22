const NO_PIPELINE_PROJECTS = ["app-qaft", "iwe-app-dsl", "functionnal-tests", "k8s-deploy", "iwe", "app-admin"];
const IWE_LOGO =
  "https://iwecloud.com/wp-content/uploads/2020/06/logo-application-web-outil-collaboration-low-code-parcours-processus-client-digital.svg";

TrelloPowerUp.initialize({
  "card-buttons": function (t, options) {
    return t
      .card("desc", "customFieldItems", "id", "members", "url", "name")
      .then(async function ({
        desc,
        customFieldItems,
        id,
        members,
        url,
        name: title,
      }) {
        const sections = desc.split("---");
        if (sections.length < 2) {
          return [];
        }
        const header = sections[0];
        const branchName = getCustomFieldValue(
          customFieldItems,
          "66a7b730211062b563b92f53"
        );

        const buttons = [
          branchName ? generateBranchNameButton(branchName, t) : null,
          await generateCreateMergeRequestsButton(
            branchName,
            id,
            members[0].id,
            url,
            title
          )
        ];

        return buttons.filter(Boolean);
      });
  },

  "card-detail-badges": function (t, options) {
    return t
      .card("desc", "customFieldItems")
      .then(async function ({ customFieldItems }) {
        const branchName = getCustomFieldValue(
          customFieldItems,
          "66a7b730211062b563b92f53"
        );

        const gitlabAndJenkinsBadges = generateGitlabAndJenkinsBadges(branchName);

        const awaitedBadges = await Promise.all(
          [...gitlabAndJenkinsBadges].filter(Boolean)
        );

        return awaitedBadges;
      });
  },
});

// Helper function to get custom field value
function getCustomFieldValue(customFieldItems, customFieldId) {
  const field = customFieldItems.find(
    (item) => item.idCustomField === customFieldId
  );
  return field ? field.value.text : null;
}

// Helper function to generate Branch Name button
function generateBranchNameButton(branchName) {
  return {
    icon: IWE_LOGO,
    text: "iWE - Branche",
    callback: (t) => {
      window
        .open(
          sanitize(
            `https://lweinhard.github.io/copy-and-close.html?value=${branchName}`
          ),
          "_blank"
        )
        .focus();
      return t.alert({
        message: "Branch name has been copied to your clipboard!",
      });
    },
  };
}

// Helper function to generate GitLab badges
async function generateGitlabAndJenkinsBadges(branchName) {
  return {
    dynamic: async () => {
      const params = new URLSearchParams({
        branch: branchName,
      });
      const response = await fetch(`https://n8n.tools.i-we.io/webhook/9d86d521-93c9-4e2f-90b5-7e4187c2cc9c?${params.toString()}`);
      const badges = await response.json();
    
      return badges.map((badge) => ({ ...badge, refresh: 10}));
    }
  }
}

// Helper function to generate patched versions button
async function generatePatchedVersionsButton(mergeRequests, branchName) {
  const mergeRequestsWithPipeline = mergeRequests.filter(
    (mr) => !NO_PIPELINE_PROJECTS.includes(mr.name)
  );
  const images = await Promise.all(
    mergeRequestsWithPipeline.map(async (mr) => {
      const params = new URLSearchParams({
        repository: mr.name,
        branch: branchName,
      });
      const response = await fetch(
        sanitize(
          `https://n8n.tools.i-we.io/webhook/15a4a541-34ea-4742-9120-d899e8dd23a0?${params.toString()}`
        )
      );
      if (response.status === 404) return null;
      const body = await response.json();
      const componentName = mr.name.split("-").slice(1).join("_").toUpperCase();
      return `VERSION_${componentName}: ${body.tag}`;
    })
  );

  if (!images.length || images.includes(null)) return null;

  const hasFunctionalTests = mergeRequests.filter(
    (mr) => mr.name === "functionnal-tests"
  ).length;
  const hasAppQaft = mergeRequests.filter(
    (mr) => mr.name === "app-qaft"
  ).length;
  const patchedVersions = encodeURIComponent(
    [
      ...images,
      hasFunctionalTests ? `ft:resourceBranch: ${branchName}` : null,
      hasAppQaft ? `ft:qaftBranch : ${branchName}` : null,
    ].join("\n")
  );
  return {
    icon: IWE_LOGO,
    text: `iWE - Patched versions`,
    callback: (t) => {
      window
        .open(
          sanitize(
            `https://lweinhard.github.io/copy-and-close.html?value=${patchedVersions}`
          ),
          "_blank"
        )
        .focus();
      return t.alert({
        message: "Patched versions have been copied to your clipboard!",
      });
    },
    refresh: 10,
  };
}

// Helper function to generate launch preview button
async function generateLaunchPreviewButton(mergeRequests, branchName) {
  const mergeRequestsWithPipeline = mergeRequests.filter(
    (mr) => !NO_PIPELINE_PROJECTS.includes(mr.name)
  );
  const images = await Promise.all(
    mergeRequestsWithPipeline.map(async (mr) => {
      const params = new URLSearchParams({
        repository: mr.name,
        branch: branchName,
      });
      const response = await fetch(
        sanitize(
          `https://n8n.tools.i-we.io/webhook/15a4a541-34ea-4742-9120-d899e8dd23a0?${params.toString()}`
        )
      );
      if (response.status === 404) return null;
      const body = await response.json();
      const componentName = mr.name.split("-").slice(1).join("_").toUpperCase();
      return `VERSION_${componentName}=${body.tag}`;
    })
  );

  if (!images.length || images.includes(null)) return null;

  const hasFunctionalTests = mergeRequests.filter(
    (mr) => mr.name === "functionnal-tests"
  ).length;
  const hasAppQaft = mergeRequests.filter(
    (mr) => mr.name === "app-qaft"
  ).length;
  const patchedVersions = [
    ...images,
    hasFunctionalTests ? `ft:resourceBranch: ${branchName}` : null,
    hasAppQaft ? `ft:qaftBranch: ${branchName}` : null,
  ].join("&");
  return {
    icon: IWE_LOGO,
    text: "iWE - Preview",
    callback: function (t) {
      return t.popup({
        title: "iWE - Preview",
        url: `preview.html?${patchedVersions}`,
      });
    },
  };
}

async function generateCreateMergeRequestsButton(
  branchName,
  id,
  userId,
  url,
  title
) {
  const params = new URLSearchParams({
    branch: branchName,
    title,
    cardId: id,
    trelloUserId: userId,
    url,
  });

  const endpoint = sanitize(
    `https://n8n.tools.i-we.io/webhook/c35dfd4a-f501-4435-83f7-81b2040da473?${params.toString()}`
  );

  return {
    icon: IWE_LOGO,
    text: "iWE - Merge Requests",
    callback: async function (t) {
      await fetch(endpoint, { method: "POST" });
      return t.alert({
        message: "Merge requests are being created on GitLab...",
      });
    },
  };
}

// Sanitize strings to remove unwanted characters
function sanitize(str) {
  return str.replace(/%E2%80%8C/g, "").trim();
}

async function generateLaunchPipelinesButton(mergeRequests, branchName) {
  const mergeRequestsWithPipeline = mergeRequests
    .filter((mr) => !NO_PIPELINE_PROJECTS.includes(mr.name))
    .map((mr) => mr.name)
    .join(",");

  const queryParams = `branch=${branchName}&repositories=${mergeRequestsWithPipeline}`;

  return {
    icon: IWE_LOGO,
    text: "iWE - Jenkins",
    callback: function (t) {
      return t.popup({
        title: "iWE - Jenkins",
        url: `jenkins.html?${queryParams}`,
      });
    },
  };
}

async function generateFtBadges(mergeRequests, branchName) {
  const mergeRequestsWithPipeline = mergeRequests.filter(
    (mr) => !NO_PIPELINE_PROJECTS.includes(mr.name)
  );
  const images = await Promise.all(
    mergeRequestsWithPipeline.map(async (mr) => {
      const params = new URLSearchParams({
        repository: mr.name,
        branch: branchName,
      });
      const response = await fetch(
        sanitize(
          `https://n8n.tools.i-we.io/webhook/15a4a541-34ea-4742-9120-d899e8dd23a0?${params.toString()}`
        )
      );
      if (response.status === 404) return null;
      const body = await response.json();
      const componentName = mr.name.split("-").slice(1).join("_").toUpperCase();
      return { [`VERSION_${componentName}`]: body.tag };
    })
  );

  if (!images.length || images.includes(null)) return [];

  const patchedVersions = images.reduce(
    (obj, patchedVersion) => ({ ...obj, ...patchedVersion }),
    {}
  );

  const params = new URLSearchParams({
    branch: branchName,
    patchedVersions: JSON.stringify(patchedVersions),
  });

  const ftBadgesResponse = await fetch(
    sanitize(
      `https://n8n.tools.i-we.io/webhook/00e71c0d-7031-4afe-a124-68adddc29a43?${params.toString()}`
    )
  );
  const ftBadges = await ftBadgesResponse.json();

  return ftBadges;
}
