(function () {
  const isInInviteGroupPage = () =>
    Boolean(getElementWithText("h3", "Suggested guests"));
  const buttonSettings = {
    id: "invite-group-button-extension",
    text: "Invite Noname",
  };
  const isInviteGroupButtonExists = () =>
    Boolean(document.getElementById(buttonSettings.id));

  function getElementWithText(element, text) {
    const xpath = `//${element}[.//*[contains(text(), "${text}")]]`;
    return document
      .evaluate(xpath, document, null, XPathResult.ANY_TYPE, null)
      .iterateNext();
  }

  function getBtn() {
    const btn = document.createElement("button");
    btn.setAttribute("id", buttonSettings.id);
    const btnText = document.createTextNode(buttonSettings.text);
    btn.appendChild(btnText);
    btn.onclick = () => inviteAllGuests();
    return btn;
  }

  async function inviteAllGuests() {
    const guests = await getAllGuests();
    for (guest of guests) {
      getElementWithText("li", guest)?.querySelector("button")?.click();
    }
  }

  async function getAllGuests() {
    const response = await fetch(
      "https://noname-employees.free.beeceptor.com/"
    );
    const responseJson = await response.json();
    return responseJson;
  }
  setInterval(() => {
    if (!isInviteGroupButtonExists() && isInInviteGroupPage()) {
      const btn = getBtn();
      const suggestedGuestsElement = getElementWithText(
        "h3",
        "Suggested guests"
      );
      suggestedGuestsElement.appendChild(btn);
    }
  }, 500);
})();
