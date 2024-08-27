const NO_PIPELINE_PROJECTS = ["app-qaft", "iwe-app-dsl"];
const IWE_LOGO =
  "https://iwecloud.com/wp-content/uploads/2020/06/logo-application-web-outil-collaboration-low-code-parcours-processus-client-digital.svg";

TrelloPowerUp.initialize({
  "card-buttons": function (t, options) {
    return t
      .card("desc", "customFieldItems", "actions")
      .then(async function ({ desc, customFieldItems, actions }) {
        const sections = desc.split("---");
        if (sections.length < 2) {
          return [];
        }
        console.log(actions);
        const header = sections[0];
        const mergeRequests = parseMergeRequests(header);
        const branchName = getCustomFieldValue(
          customFieldItems,
          "66a7b730211062b563b92f53"
        );

        const buttons = [
          branchName ? generateBranchNameButton(branchName, t) : null,
          mergeRequests.length
            ? await generatePatchedVersionsButton(mergeRequests, branchName, t)
            : null,
          await generateLaunchPreviewButton(mergeRequests, branchName),
        ];

        return buttons.filter(Boolean); // Remove nulls
      });
  },

  "card-detail-badges": function (t, options) {
    return t
      .card("desc", "customFieldItems")
      .then(async function ({ desc, customFieldItems }) {
        const sections = desc.split("---");
        if (sections.length < 2) {
          return [];
        }

        const header = sections[0];
        const branchName = getCustomFieldValue(
          customFieldItems,
          "66a7b730211062b563b92f53"
        );
        const mergeRequests = parseMergeRequests(header);
        const mergeRequestsWithPipeline = mergeRequests.filter(
          (mr) => !NO_PIPELINE_PROJECTS.includes(mr.name)
        );

        const gitlabBadges = await generateGroupedBadges(
          mergeRequests,
          branchName,
          "GitLab"
        );
        const jenkinsBadges = await generateGroupedBadges(
          mergeRequestsWithPipeline,
          branchName,
          "Jenkins"
        );

        const awaitedBadges = await Promise.all(
          [...gitlabBadges, ...jenkinsBadges].filter(Boolean)
        );

        return awaitedBadges;
      });
  },
});

// Helper function to parse merge requests from the card header
function parseMergeRequests(header) {
  const regex = /\• \[([^\]]+)\]\(([^)]+)\)/g;
  const mergeRequests = [];
  let match;

  while ((match = regex.exec(header))) {
    const cleanedUrl = match[2].replace(/["\s]/g, "").trim();
    mergeRequests.push({
      name: match[1],
      url: cleanedUrl,
      id: cleanedUrl.split("/").pop(),
    });
  }

  return mergeRequests;
}

// Helper function to get custom field value
function getCustomFieldValue(customFieldItems, customFieldId) {
  const field = customFieldItems.find(
    (item) => item.idCustomField === customFieldId
  );
  return field ? field.value.text : null;
}

// Helper function to generate Branch Name button
function generateBranchNameButton(branchName, t) {
  return {
    icon: IWE_LOGO,
    text: "iWE - Branche",
    callback: () => {
      window
        .open(
          `https://lweinhard.github.io/copy-and-close.html?value=${branchName}`,
          "_blank"
        )
        .focus();
      t.alert({
        message: "Branch name has been copied to your clipboard!",
      });
    },
  };
}

// Helper function to generate grouped badges
async function generateGroupedBadges(mergeRequests, branchName, platform) {
  const badges = [];

  for (const mr of mergeRequests) {
    const badge = generateStatusBadge(mr, branchName, platform);
    if (badge) {
      badges.push(badge);
    }
  }

  // Group badges by status
  const groupedBadges = {
    mergeable: [],
    merged: [],
    success: [],
    others: [],
  };

  for (const badge of badges) {
    const current = await badge.dynamic();
    if (platform === "GitLab") {
      if (current.text === "mergeable") groupedBadges.mergeable.push(badge);
      else if (current.text === "merged") groupedBadges.merged.push(badge);
      else groupedBadges.others.push(badge);
    } else if (platform === "Jenkins") {
      if (current.text === "Success") groupedBadges.success.push(badge);
      else if (current.text !== "Waiting for tests")
        groupedBadges.others.push(badge);
    }
  }

  const mergeRequestsWithPipeline = mergeRequests.filter(
    (mr) => !NO_PIPELINE_PROJECTS.includes(mr.name)
  );

  // Create final badge set
  const finalBadges = [];
  if (groupedBadges.merged.length) {
    finalBadges.push({
      title: platform,
      text: `merged (${groupedBadges.merged.length}/${mergeRequests.length})`,
      color: "purple",
    });
  }
  if (groupedBadges.mergeable.length) {
    finalBadges.push({
      title: platform,
      text: `mergeable (${groupedBadges.mergeable.length}/${mergeRequests.length})`,
      color: "green",
    });
  }
  if (groupedBadges.success.length) {
    finalBadges.push({
      title: platform,
      text: `Success (${groupedBadges.success.length}/${mergeRequestsWithPipeline.length})`,
      color: "green",
    });
  }
  finalBadges.push(...groupedBadges.others);

  return finalBadges;
}

// Helper function to generate status badges
function generateStatusBadge(mergeRequest, branchName, platform) {
  const platformMap = {
    GitLab: sanitize(
      `https://n8n.tools.i-we.io/webhook/9d86d521-93c9-4e2f-90b5-7e4187c2cc9c?repository=${mergeRequest.name}&branch=${branchName}&merge_request_id=${mergeRequest.id}`
    ),
    Jenkins: sanitize(
      `https://n8n.tools.i-we.io/webhook/6bc11b9a-a602-437b-b021-7a40032c06c2?repository=${mergeRequest.name}&branch=${branchName}&merge_request_id=${mergeRequest.id}`
    ),
  };

  return {
    dynamic: async () => {
      const response = await fetch(platformMap[platform]);
      const body = await response.json();
      return {
        title: `${mergeRequest.name} - ${platform}`,
        text: body.message,
        color: body.color,
        ...(body.url ? { url: body.url } : {}),
        refresh: 10,
      };
    },
  };
}

// Helper function to generate patched versions button
async function generatePatchedVersionsButton(mergeRequests, branchName, t) {
  const mergeRequestsWithPipeline = mergeRequests.filter(
    (mr) => !NO_PIPELINE_PROJECTS.includes(mr.name)
  );
  const images = await Promise.all(
    mergeRequestsWithPipeline.map(async (mr) => {
      const response = await fetch(
        `https://n8n.tools.i-we.io/webhook/15a4a541-34ea-4742-9120-d899e8dd23a0?repository=${mr.name}&branch=${branchName}`
      );
      if (response.status === 404) return null;
      const body = await response.json();
      const componentName = mr.name.split("-").slice(1).join("_").toUpperCase();
      return `VERSION_${componentName}: ${body.tag}`;
    })
  );

  if (!images.length || images.includes(null)) return null;

  const hasAppQaft = mergeRequests.filter(
    (mr) => mr.name === "app-qaft"
  ).length;
  const patchedVersions = encodeURIComponent(
    [...images, hasAppQaft ? `ft:resourceBranch: ${branchName}` : null].join(
      "\n"
    )
  );
  return {
    icon: IWE_LOGO,
    text: `iWE - Patched versions`,
    callback: () => {
      window
        .open(
          `https://lweinhard.github.io/copy-and-close.html?value=${patchedVersions}`,
          "_blank"
        )
        .focus();
      t.alert("Patched versions have been copied to your clipboard!");
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
      const response = await fetch(
        `https://n8n.tools.i-we.io/webhook/15a4a541-34ea-4742-9120-d899e8dd23a0?repository=${mr.name}&branch=${branchName}`
      );
      if (response.status === 404) return null;
      const body = await response.json();
      const componentName = mr.name.split("-").slice(1).join("_").toUpperCase();
      return `VERSION_${componentName}=${body.tag}`;
    })
  );

  if (!images.length || images.includes(null)) return null;

  const hasAppQaft = mergeRequests.filter(
    (mr) => mr.name === "app-qaft"
  ).length;
  const patchedVersions = [
    ...images,
    hasAppQaft ? `ft:resourceBranch: ${branchName}` : null,
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

// Sanitize strings to remove unwanted characters
function sanitize(str) {
  return str.replace(/[\u200C\u200B]/g, "").trim();
}
