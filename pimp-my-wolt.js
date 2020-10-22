(function () {
  const buttonSettings = {
    id: "invite-group-button-extension",
    text: "Invite Noname",
  };

  const orderButtonHookSettings = {
    saveOrdersAttribute: "save-orders",
  };

  const isInInviteGroupPage = () =>
    Boolean(getElementWithText("h3", "Suggested guests"));
  const isInviteGroupButtonExists = () =>
    Boolean(document.getElementById(buttonSettings.id));
  const isOrderButtonExists = () =>
    Boolean(document.querySelector('[data-test-id="SendOrderButton"]'));

  const isOrderButtonUpdated = () => {
    const orderButton = document.querySelector(
      '[data-test-id="SendOrderButton"]'
    );
    return (
      orderButton.getAttribute(orderButtonHookSettings.saveOrdersAttribute) ===
      "true"
    );
  };
  function getElementWithText(element, text) {
    const xpath = `//${element}[.//*[contains(text(), "${text}")]]`;
    return document
      .evaluate(xpath, document, null, XPathResult.ANY_TYPE, null)
      .iterateNext();
  }

  async function getBtn() {
    const btn = document.createElement("button");
    btn.setAttribute("id", buttonSettings.id);
    const teamName = await getTeamName();
    const btnText = document.createTextNode(`Invite ${teamName}`);
    btn.appendChild(btnText);
    btn.onclick = () => inviteAllGuests();
    return btn;
  }

  async function inviteAllGuests() {
    const guests = await getAllGuests();
    for (guest of guests) {
      getElementWithText("li", guest.woltName)?.querySelector("button")?.click();
    }
  }

  async function getTeamName() {
    return new Promise((res) => {
      chrome.storage.sync.get("teamName", ({ teamName }) => res(teamName));
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

  function getDeliveryPrice() {
    const amountWithCurrency = getElementWithText(
      "dl",
      "Delivery"
    )?.querySelector("dd")?.innerText;
    return priceToNumber(amountWithCurrency ?? "");
  }

  function priceToNumber(price) {
    return Number(price.replace(/[^0-9.-]+/g, ""));
  }

  function getGuestsOrders() {
    const orderTable = document.querySelector(
      "[class^=Tabs__root] [class^=Tabs__content]"
    );
    return Array.from(orderTable.querySelectorAll("li") || []).map((item) => {
      return {
        name: item.querySelector('[class*="GuestItem__listName"] span')
          .innerText,
        price: priceToNumber(
          item.querySelector('[class*="GuestItem__price"]').innerText
        ),
      };
    });
  }

  function updateOrderButtonToSaveGuestsOrders() {
    const sendOrderButton = document.querySelector(
      '[data-test-id="SendOrderButton"]'
    );
    sendOrderButton.onclick = () => {
      const guestsOrders = getGuestsOrders();
      const deliveryPrice = getDeliveryPrice();
      chrome.storage.local.set({ guestsOrders, deliveryPrice });
    };
    sendOrderButton.setAttribute(
      orderButtonHookSettings.saveOrdersAttribute,
      "true"
    );
  }

  async function addInviteGroupBtton() {
    const btn = await getBtn();
    const suggestedGuestsElement = getElementWithText("h3", "Suggested guests");
    suggestedGuestsElement.appendChild(btn);
  }

  setInterval(() => {
    if (!isInviteGroupButtonExists() && isInInviteGroupPage()) {
      addInviteGroupBtton();
    }
    if (isOrderButtonExists() && !isOrderButtonUpdated()) {
      updateOrderButtonToSaveGuestsOrders();
    }
  }, 500);
})();
