TrelloPowerUp.initialize({
  "card-buttons": function (t, options) {
    return [
      {
        icon: "https://cdn.glitch.com/1b42d7fe-bda8-4af8-a6c8-eff0cea9e08a/rocket-ship.png?1494946700421",
        text: "Lancer une preview",
        callback: function (t) {
          return t.popup({
            title: "Lancer une preview",
            url: "preview.html",
          });
        },
      },
    ];
  },
  'card-detail-badges': function(t, options) {
    return t.card('desc', 'customFieldItems')
      .then(async function(card) {
        const sections = card.desc.split('---');
        if (sections.length < 2) {
          return [];
        }
        const header = sections[0];
        const customFieldItems = card.customFieldItems;
        
        // Parse the header for merge request details
        const mergeRequests = parseMergeRequests(header);
        
        // Retrieve necessary custom field value
        const branchName = getCustomFieldValue(customFieldItems, '66a7b730211062b563b92f53');
        
        const branchNameBadge = branchName ? {
          title: 'Branch',
          text: 'Click here to copy',
          color: 'sky',
          callback: () => {
            window.open(`https://lweinhard.github.io/copy-and-close.html?value=${branchName}`, "_blank").focus();
            t.alert({message: "Branch name has been copied to your clipboard !"})
          }
        } : null;

        // Generate status badges for each merge request
        const statusBadges = mergeRequests.flatMap(mr => generateStatusBadges(mr, branchName));
        // Generate image badge for patched versions in case every merge request has an image
        const imageBadge = await generateImageBadge(mergeRequests, branchName);

        return [branchNameBadge, ...statusBadges, imageBadge].filter(Boolean);
      });
  } 
});

// Helper function to parse merge requests from the card header
function parseMergeRequests(header) {
  const regex = /\• \[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  const mergeRequests = [];

  while (match = regex.exec(header)) {
    const cleanedUrl = match[2].replace(/["\s]/g, '').trim();
    mergeRequests.push({
      name: match[1],
      url: cleanedUrl,
      id: cleanedUrl.split('/').pop()
    });
  }

  return mergeRequests;
}

function getCustomFieldValue(customFieldItems, customFieldId) {
  const field = customFieldItems.find(item => item.idCustomField === customFieldId);
  return field ? field.value.text : null;
}

function generateStatusBadges(mergeRequest, branchName) {
  const gitlabUrl = sanitize(`https://n8n.tools.i-we.io/webhook/9d86d521-93c9-4e2f-90b5-7e4187c2cc9c?repository=${mergeRequest.name}&branch=${branchName}&merge_request_id=${mergeRequest.id}`);
  const jenkinsUrl = sanitize(`https://n8n.tools.i-we.io/webhook/6bc11b9a-a602-437b-b021-7a40032c06c2?repository=${mergeRequest.name}&branch=${branchName}&merge_request_id=${mergeRequest.id}`);

  return [
    {
      dynamic: async () => {
        const response = await fetch(jenkinsUrl);
        const body = await response.json();
        return {
          title: `${mergeRequest.name} - Jenkins`,
          text: body.message,
          color: body.color,
          refresh: 10
        }
      }
    },
    {
      dynamic: async () => {
        const response = await fetch(gitlabUrl);
        const body = await response.json();
        return {
          title: `${mergeRequest.name} - GitLab`,
          text: body.message,
          color: body.color,
          refresh: 10
        }
      }
    }
  ];
}

 async function generateImageBadge(mergeRequests, branchName) {
  const images = await Promise.all(mergeRequests.map(async (mr) => {
    const response = await fetch(`https://n8n.tools.i-we.io/webhook/15a4a541-34ea-4742-9120-d899e8dd23a0?repository=${mr.name}&branch=${branchName}`);
    if (response.status === 404) {
      return null;
    }
    const body = await response.json();
    const componentName = mr.name.split('-').slice(1).join('_').toUpperCase();
    return `VERSION_${componentName}: ${body.tag}`
  }));

  if (images.includes(null)) {
    return null;
  }

  const patchedVersions = encodeURIComponent(images.join('\n'));
  return {
      dynamic: async () => {
        const response = await fetch(jenkinsUrl);
        const body = await response.json();
        return {
          title: `Patched versions`,
          text: "Click here to copy",
          color: "sky",
          callback: () => {
            window.open(`https://lweinhard.github.io/copy-and-close.html?value=${patchedVersions}`, "_blank").focus();
            t.alert({message: "Patched versions have been copied to your clipboard !"})
          },
          refresh: 10
        }
      }
    }
}

function sanitize(str) {
  // Remove common invisible characters, including Zero Width Non-Joiner and Zero Width Space
  return str.replace(/[\u200C\u200B]/g, '').trim();
}