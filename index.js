const NO_PIPELINE_PROJECTS = ["app-qaft", "iwe-app-dsl", "functionnal-tests", "k8s-deploy", "iwe", "app-admin"];
const IWE_LOGO =
  "https://iwecloud.com/wp-content/uploads/2020/06/logo-application-web-outil-collaboration-low-code-parcours-processus-client-digital.svg";

TrelloPowerUp.initialize({
  "card-buttons": function (t, options) {
    return t
      .card("customFieldItems", "id", "members", "url", "name", "labels")
      .then(async function ({
        customFieldItems,
        id,
        members,
        url,
        name: title,
        labels
      }) {
        const branchName = getCustomFieldValue(
          customFieldItems,
          "66a7b730211062b563b92f53"
        );

        if (!branchName) {
          return null;
        }

        const isBugfix = labels.some((label) => label.includes('Bug') || label.includes('HotFix'));

        const buttons = await Promise.all([
          generateBranchNameButton(branchName, t),
          generateCreateMergeRequestsButton(
            branchName,
            id,
            members[0].fullName,
            url,
            title
          ),
          generatePatchedVersionsButton(branchName),
          generateLaunchPipelinesButton(branchName),
          generateReleaseDocumentButton(branchName, id, title, isBugfix)
      ]);

        return buttons.filter(Boolean);
      });
  },

  "card-detail-badges": function (t, options) {
    return t
      .card("customFieldItems")
      .then(async function ({ customFieldItems }) {
        const branchName = getCustomFieldValue(
          customFieldItems,
          "66a7b730211062b563b92f53"
        );

        if (!branchName) {
          return null;
        }

        const gitlabAndJenkinsBadges = await generateGitlabAndJenkinsBadges(branchName);

        return gitlabAndJenkinsBadges;
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

// Helper function to generate release document button
async function generateReleaseDocumentButton(
  branchName,
  id,
  title,
  isBugfix) {
  const params = new URLSearchParams({
    branchName,
    cardId: id,
    title,
    isBugfix
  });

  const endpoint = sanitize(
    `https://n8n.tools.i-we.io/webhook/0cc6fe98-a97e-4b2e-a42d-50c9ceee6d13?${params.toString()}`
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
  const response = await fetch(`https://n8n.tools.i-we.io/webhook/9d86d521-93c9-4e2f-90b5-7e4187c2cc9c?${params.toString()}`);
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
      `https://n8n.tools.i-we.io/webhook/b9ff3b81-0713-480a-96ed-ccd8fedc3c64?${params.toString()}`
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
    },
    refresh: 60,
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

function sanitize(str) {
  return str.replace(/%E2%80%8C/g, "").trim();
}

async function generateLaunchPipelinesButton(branchName) {
  const params = new URLSearchParams({branch: branchName});
const response = await fetch(`https://n8n.tools.i-we.io/webhook/92beefb2-760b-4a3a-837d-5788a2c340e7?${params.toString()}`);
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
