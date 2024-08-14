TrelloPowerUp.initialize({
  "card-buttons": function (t, options) {
    return [
      {
        icon: "https://cdn.glitch.com/1b42d7fe-bda8-4af8-a6c8-eff0cea9e08a%2Frocket-ship.png?1494946700421",
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
      .then(function(card) {
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
        
        // Generate badges for each merge request
        const badges = mergeRequests.map(mr => generateBadges(mr, branchName));

        return badges;
      });
  } 
});

// Helper function to parse merge requests from the card description
function parseMergeRequests(description) {
  const regex = /Merge Requests:\s*•\s*\[([^\]]+)\]\((http[^\)]+)\)/g;
  let match;
  const mergeRequests = [];

  while (match = regex.exec(description)) {
    mergeRequests.push({
      name: match[1],
      url: match[2],
      id: match[2].slice(-1)
    });
  }

  return mergeRequests;
}

function getCustomFieldValue(customFieldItems, customFieldId) {
  const field = customFieldItems.find(item => item.idCustomField === customFieldId);
  return field ? field.value.text : null;
}

function generateBadges(mergeRequest, branchName) {
  const badges = [];

  badges.push({
    dynamic: () => ({
      text: `${mergeRequest.name} - Jenkins`,
      icon: 'https://example.com/jenkins-icon.png',
      refresh: 10,
      url: `https://img.shields.io/endpoint?url=https%3A%2F%2Fn8n.tools.i-we.io%2Fwebhook%2F6bc11b9a-a602-437b-b021-7a40032c06c2%3Frepository%3Diwe-ui%26branch%3D${branchName}%26merge_request_id%3D${mergeRequest.id}`,
    })
  });

  badges.push({
    dynamic: () => ({
      text: `${mergeRequest.name} - GitLab`,
      icon: 'https://example.com/gitlab-icon.png',
      refresh: 10,
      url: `https://img.shields.io/endpoint?url=https%3A%2F%2Fn8n.tools.i-we.io%2Fwebhook%2F9d86d521-93c9-4e2f-90b5-7e4187c2cc9c%3Frepository%3Diwe-ui%26branch%3D${branchName}%26merge_request_id%3D${mergeRequest.id}`,
    })
  });

  return badges;
}