TrelloPowerUp.initialize({
  "card-buttons": function (t, options) {
    return t
      .card("desc", "customFieldItems")
      .then(function ({ desc, customFieldItems }) {
        const sections = desc.split("---");
        if (sections.length < 2) {
          return [];
        }
        const header = sections[0];
        const mergeRequests = parseMergeRequests(header);
        const branchName = getCustomFieldValue(
          customFieldItems,
          "66a7b730211062b563b92f53"
        );
        const branchNameButton = branchName
          ? {
              text: "Copier la branche",
              callback: () => {
                window
                  .open(
                    `https://lweinhard.github.io/copy-and-close.html?value=${branchName}`,
                    "_blank"
                  )
                  .focus();
                t.alert({
                  message: "Branch name has been copied to your clipboard !",
                });
              },
            }
          : null;
        const patchedVersionsButton = generatePatchedVersionsButton(
          mergeRequests,
          branchName,
          t
        );
        const launchPreviewButton = {
          icon: "https://cdn.glitch.com/1b42d7fe-bda8-4af8-a6c8-eff0cea9e08a/rocket-ship.png?1494946700421",
          text: "Lancer une preview",
          callback: function (t) {
            return t.popup({
              title: "Lancer une preview",
              url: "preview.html",
            });
          },
        };

        return [
          branchNameButton,
          patchedVersionsButton,
          launchPreviewButton,
        ].filter(Boolean);
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

        // Parse the header for merge request details
        const mergeRequests = parseMergeRequests(header);

        const gitlabBadges = mergeRequests.flatMap((mr) =>
          generateStatusBadges(mr, branchName, "GitLab")
        );
        const jenkinsBadges = mergeRequests.flatMap((mr) =>
          generateStatusBadges(mr, branchName, "Jenkins")
        );

        const gitlabGroupedBadges = gitlabBadges.reduce((acc, curr) => {
          if (curr.status === "mergeable") {
            return { ...acc, mergeable: [...acc?.mergeable, curr] };
          }
          if (curr.status === "merged") {
            return { ...acc, merged: [...acc?.merged, curr] };
          }
          return { ...acc, others: [...acc?.others, curr] };
        }, {});
        const jenkinsGroupedBadges = jenkinsBadges.reduce((acc, curr) => {
          if (curr.status === "Waiting for tests") {
            return acc;
          }
          if (curr.status === "Success") {
            return { ...acc, success: [...acc?.success, curr] };
          }
          return { ...acc, others: [...acc?.others, curr] };
        }, {});

        return [
          gitlabGroupedBadges?.merged.length
            ? {
                title: "GitLab",
                text: `merged - (${gitlabGroupedBadges.merged.length}/${mergeRequests.length})`,
                color: "purple",
              }
            : null,
          gitlabGroupedBadges?.mergeable.length
            ? {
                title: "GitLab",
                text: `mergeable - (${gitlabGroupedBadges.mergeable.length}/${mergeRequests.length})`,
                color: "green",
              }
            : null,
          jenkinsGroupedBadges?.success.length
            ? {
                title: "Jenkins",
                text: `Success - (${jenkinsGroupedBadges.success.length}/${mergeRequests.length})`,
                color: "green",
              }
            : null,
          ...(gitlabGroupedBadges?.others.length
            ? gitlabGroupedBadges.others
            : []),
          ...(jenkinsGroupedBadges?.others.length
            ? jenkinsGroupedBadges.others
            : []),
        ].filter(Boolean);
      });
  },
});

// Helper function to parse merge requests from the card header
function parseMergeRequests(header) {
  const regex = /\• \[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  const mergeRequests = [];

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

function getCustomFieldValue(customFieldItems, customFieldId) {
  const field = customFieldItems.find(
    (item) => item.idCustomField === customFieldId
  );
  return field ? field.value.text : null;
}

function generateStatusBadges(mergeRequest, branchName, platform) {
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
        url: body.url,
        refresh: 10,
      };
    },
  };
}

async function generatePatchedVersionsButton(mergeRequests, branchName, t) {
  const images = await Promise.all(
    mergeRequests.map(async (mr) => {
      const response = await fetch(
        `https://n8n.tools.i-we.io/webhook/15a4a541-34ea-4742-9120-d899e8dd23a0?repository=${mr.name}&branch=${branchName}`
      );
      if (response.status === 404) {
        return null;
      }
      const body = await response.json();
      const componentName = mr.name.split("-").slice(1).join("_").toUpperCase();
      return `VERSION_${componentName}: ${body.tag}`;
    })
  );

  if (!images.length || images.includes(null)) {
    return null;
  }

  const patchedVersions = encodeURIComponent(images.join("\n"));
  return {
    icon: "https://cdn.glitch.com/1b42d7fe-bda8-4af8-a6c8-eff0cea9e08a/rocket-ship.png?1494946700421",
    text: `Patched versions`,
    callback: () => {
      window
        .open(
          `https://lweinhard.github.io/copy-and-close.html?value=${patchedVersions}`,
          "_blank"
        )
        .focus();
      t.alert("Patched versions have been copied to your clipboard !");
    },
    refresh: 10,
  };
}

async function generateLaunchPreviewButton(mergeRequests, branchName, t) {
  const images = await Promise.all(
    mergeRequests.map(async (mr) => {
      const response = await fetch(
        `https://n8n.tools.i-we.io/webhook/15a4a541-34ea-4742-9120-d899e8dd23a0?repository=${mr.name}&branch=${branchName}`
      );
      if (response.status === 404) {
        return null;
      }
      const body = await response.json();
      const componentName = mr.name.split("-").slice(1).join("_").toUpperCase();
      return `VERSION_${componentName}=${body.tag}`;
    })
  );

  if (!images.length || images.includes(null)) {
    return null;
  }

  const patchedVersions = images.join("&");
  return {
    icon: "https://cdn.glitch.com/1b42d7fe-bda8-4af8-a6c8-eff0cea9e08a/rocket-ship.png?1494946700421",
    text: "Lancer une preview",
    callback: function (t) {
      return t.popup({
        title: "Lancer une preview",
        url: `preview.html?${patchedVersions}`,
      });
    },
  };
}

function sanitize(str) {
  // Remove common invisible characters, including Zero Width Non-Joiner and Zero Width Space
  return str.replace(/[\u200C\u200B]/g, "").trim();
}
