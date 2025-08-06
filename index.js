const NO_PIPELINE_PROJECTS = ["app-qaft", "iwe-app-dsl", "functionnal-tests", "k8s-deploy", "iwe", "app-admin"];
const IWE_LOGO =
  "https://iwecloud.com/wp-content/uploads/2020/06/logo-application-web-outil-collaboration-low-code-parcours-processus-client-digital.svg";

TrelloPowerUp.initialize({
  "card-buttons": function (t, options) {
    return t
      .card("customFieldItems", "id", "members", "url", "name", "labels", "attachments")
      .then(async function ({
        customFieldItems,
        id,
        members,
        url,
        name: title,
        labels,
        attachments
      }) {
        const platformBranchName = getCustomFieldValue(
          customFieldItems,
          "66a7b730211062b563b92f53"
        );

        const deliveryBranchName = getCustomFieldValue(
          customFieldItems,
          "6784dcdd88cdd86ab7ab309a"
        );

        const branchName = platformBranchName || deliveryBranchName;

        const platformMyTickets = getCustomFieldValue(customFieldItems, '6593ebbb699e895d318adbfa')?.replace(' ', '') ?? '';
        const deliveryMyTickets = getCustomFieldValue(customFieldItems, '678f661e6b95b0f4b69998c7')?.replace(' ', '') ?? '';
        const myTickets = platformMyTickets || deliveryMyTickets;

        const isBugfix = labels.some((label) => label.name.includes('Bug') || label.name.includes('HotFix'));
        const isRelease = labels.some((label) => label.name.includes('Release'));

        const releaseNoteAttachment = attachments.find((attachment) => attachment.name.includes("Release note"));
        const releaseNumber = releaseNoteAttachment?.name.split(' ')[2];

        const shouldShowReleaseRegenButton = isRelease && releaseNoteAttachment;

        const buttons = await Promise.all([
          branchName && generateBranchNameButton(branchName, t),
          branchName && generateCreateMergeRequestsButton(
            branchName,
            id,
            members[0].fullName,
            url,
            title
          ),
          branchName && generatePatchedVersionsButton(branchName),
          branchName && generateLaunchPipelinesButton(branchName),
          branchName && generateReleaseDocumentButton(branchName, id, title, isBugfix, myTickets),
          shouldShowReleaseRegenButton && generateReleaseUpdateButton(id, releaseNoteAttachment, releaseNumber)
      ]);

        return buttons.filter(Boolean);
      });
  },

  "card-detail-badges": function (t, options) {
    return t
      .card("customFieldItems", "url", "name")
      .then(async function ({ customFieldItems, url, name }) {
        const platformBranchName = getCustomFieldValue(
          customFieldItems,
          "66a7b730211062b563b92f53"
        );

        const deliveryBranchName = getCustomFieldValue(
          customFieldItems,
          "6784dcdd88cdd86ab7ab309a"
        );

        const branchName = platformBranchName || deliveryBranchName;

        if (!branchName) {
          return null;
        }

        const gitlabAndJenkinsBadges = await generateGitlabAndJenkinsBadges(branchName);
        const ftBadge = await generateFtBadge(branchName, url, name);

        return [...gitlabAndJenkinsBadges, ftBadge].map((badge) => ({ title: badge.title, text: badge.text, color: badge.color, ...(badge.url ? {
          callback: (t) => {
          window
            .open(
              badge.url,
              "_blank"
            )
            .focus();
        }} : {})}));
      });
  },

  "board-buttons": function (t) {
    return [{
      icon: {
        dark: IWE_LOGO,
        light: IWE_LOGO
      },
      text: "iWE - Release",
      callback: function (t) {
        return t.popup({
          title: "iWE - Release",
          url: 'release.html',
        });
      }
    }]
  }
});

// Helper function to get custom field value
function getCustomFieldValue(customFieldItems, customFieldId) {
  const field = customFieldItems.find(
    (item) => item.idCustomField === customFieldId
  );
  return field ? field.value.text : null;
}

// Helper function to generate release document button
async function generateReleaseDocumentButton(
  branchName,
  id,
  title,
  isBugfix,
  myTickets) {
  const params = new URLSearchParams({
    branchName,
    cardId: id,
    title,
    isBugfix,
    myTickets
  });

  const endpoint = sanitize(
    `https://n8n.tools.i-we.io/webhook/release-document?${params.toString()}`
  );

  return {
    icon: IWE_LOGO,
    text: "iWE - Release doc",
    callback: async function (t) {
      await fetch(endpoint, { method: "POST" });
      return t.alert({
        message: "Release document has been generated and attached !",
      });
    },
  };
}

// Helper function to generate Branch Name button
async function generateBranchNameButton(branchName) {
  return {
    icon: IWE_LOGO,
    text: "iWE - Branche",
    callback: (t) => {
      window
        .open(
          sanitize(
            `https://i-we.github.io/trello-powerup/copy-and-close.html?value=${branchName}`
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
  const params = new URLSearchParams({
    branch: branchName,
  });
  const response = await fetch(`https://n8n.tools.i-we.io/webhook/badges-gitlab-jenkins?${params.toString()}`);
  const badges = await response.json();

  return badges;
}

// Helper function to generate functional tests badge
async function generateFtBadge(branchName, url, name) {
  const params = new URLSearchParams({
    branch: branchName,
    url,
    name
  });
  const response = await fetch(`https://n8n.tools.i-we.io/webhook/badge-ft?${params.toString()}`);
  const badges = await response.json();

  return badges;
}

// Helper function to generate patched versions button
async function generatePatchedVersionsButton(branchName) {
  const params = new URLSearchParams({
    branch: branchName,
  });
  const response = await fetch(
    sanitize(
      `https://n8n.tools.i-we.io/webhook/patched-versions?${params.toString()}`
    )
  );
  const {patchedVersions} = await response.json();

  return {
    icon: IWE_LOGO,
    text: 'iWE - Patched Versions',
    callback: (t) => {
      window
        .open(
          sanitize(
            `https://i-we.github.io/trello-powerup/copy-and-close.html?value=${patchedVersions}`
          ),
          "_blank"
        )
        .focus();
      return t.alert({
        message: "Patched versions have been copied to your clipboard!",
      });
    }
  }
}

async function generateCreateMergeRequestsButton(
  branchName,
  id,
  userFullName,
  url,
  title
) {
  const params = new URLSearchParams({
    branch: branchName,
    title,
    cardId: id,
    trelloUserFullName: userFullName,
    url,
  });

  const endpoint = sanitize(
    `https://n8n.tools.i-we.io/webhook/create-merge-requests?${params.toString()}`
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

function sanitize(str) {
  return str.replace(/%E2%80%8C/g, "").trim();
}

async function generateLaunchPipelinesButton(branchName) {
  const params = new URLSearchParams({branch: branchName});
  const response = await fetch(`https://n8n.tools.i-we.io/webhook/bouton-jenkins?${params.toString()}`);
  const repositories = await response.json();

  return {
    icon: IWE_LOGO,
    text: "iWE - Jenkins",
    callback: function (t) {
      return t.popup({
        title: "iWE - Jenkins",
        url: `jenkins.html?branch=${branchName}&repositories=${repositories.map((item) => item.repository).join(',')}`,
      });
    },
  };
}

async function generateReleaseUpdateButton(id, releaseNoteAttachment, releaseNumber) {
  const body = { trelloCardId: id, releaseNoteAttachmentId: releaseNoteAttachment.id, releaseNoteUrl: releaseNoteAttachment.url, releaseNumber }
  const endpoint = `https://n8n.tools.i-we.io/webhook/release-update`;

  return {
    icon: IWE_LOGO,
    text: "iWE - Release update",
    callback: function (t) {
      fetch(endpoint, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)}).then(() => {
        return t.alert({message: "Release note has been updated !"});
      }).catch(() => {
        return t.alert({message: "Something went wrong when updating release note"});
      });
      return t.alert({
        message: "Release note is being updated, this will take 30 seconds max...",
      });
    },
  };
}
