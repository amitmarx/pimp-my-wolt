const input = document.getElementById("team");

input.addEventListener("change", () => {
  const teamName = input.value;
  chrome.storage.sync.set({ teamName });
});

chrome.storage.sync.get("teamName", ({ teamName }) => {
  input.value = teamName;
});
