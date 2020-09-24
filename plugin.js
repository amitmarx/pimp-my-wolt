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

  function getGuestsOrders() {
    const orderTable = document.querySelector(
      "[class^=Tabs__root] [class^=Tabs__content]"
    );
    const priceToNumber = (price) => Number(price.replace(/[^0-9.-]+/g, ""));
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
      chrome.storage.local.set({ guestsOrders });
    };
    sendOrderButton.setAttribute(
      orderButtonHookSettings.saveOrdersAttribute,
      "true"
    );
  }

  function handleCibusPayment() {
    chrome.storage.local.get("guestsOrders", (guestsOrders) => {
      for (guestOrder of guestsOrders) {
        getElementWithText("label", guestOrder.name).click();
      }
    });
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
    if (isOrderButtonExists() && !isOrderButtonUpdated()) {
      updateOrderButtonToSaveGuestsOrders();
    }
  }, 500);
})();
