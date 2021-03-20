(function () {
  async function getTeamName() {
    return new Promise((res) => {
      chrome.storage.sync.get("teamName", ({ teamName }) =>
        res(teamName?.toLowerCase())
      );
    });
  }

  async function getUserId() {
    return new Promise((res) => {
      chrome.storage.sync.get("userId", ({ userId }) => {
        if (!userId) {
          userId = Date.now().toString();
          chrome.storage.sync.set({ userId });
        }
        res(userId);
      });
    });
  }

  async function getAllGuests() {
    const teamName = await getTeamName();
    const response = await fetch(
      `https://amitmarx.wixsite.com/pimp-my-wolt/_functions/list_group_members/${teamName}`
    );
    const responseJson = await response.json();
    return responseJson.items;
  }

  window.pimpMyWolt = {
    ...window.pimpMyWolt,
    groupManager: {
      getTeamName,
      getAllGuests,
      getUserId,
    },
  };
})();
