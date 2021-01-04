(function () {
  const { groupManager, biLogger } = window.pimpMyWolt;
  
  const allGuests = groupManager.getAllGuests();

  const buttonSettings = {
    id: "invite-group-button-extension",
    text: "Invite Noname",
  };

  const orderButtonHookSettings = {
    saveOrdersAttribute: "save-orders",
  };

  const isHebrewWolt = window.location.href.toLowerCase().includes("com/he/");
  const suggestedGuestsText = isHebrewWolt
    ? "אנשים שאולי ירצו להזמין איתך"
    : "Suggested guests";
  const deliveryText = isHebrewWolt ? "משלוח" : "Delivery";

  const isInInviteGroupPage = () =>
    Boolean(getElementWithText("h3", suggestedGuestsText));
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
    const teamName = await groupManager.getTeamName();
    const text = !teamName
      ? ""
      : isHebrewWolt
      ? `הזמן את ${teamName}`
      : `Invite ${teamName}`;
    const btnText = document.createTextNode(text);
    btn.appendChild(btnText);
    btn.onclick = async () => {
      const { invitedGuests, notInvitedGuests } = await inviteAllGuests();
      biLogger.logEvent('invite_all_group',{
        invited_guests: invitedGuests,
        not_invited_guests: notInvitedGuests,
      });
    };
    return btn;
  }

  async function inviteAllGuests() {
    const guests = await allGuests;
    const invitedGuests = [];
    const notInvitedGuests = [];
    for (guest of guests) {
      const guestName = guest.woltName;
      const inviteButton = getElementWithText("li", guestName)?.querySelector(
        "button"
      );
      inviteButton?.click();
      (inviteButton ? invitedGuests : notInvitedGuests).push(guestName);
    }
    return {
      invitedGuests,
      notInvitedGuests,
    };
  }

  function getDeliveryPrice() {
    const amountWithCurrency = getElementWithText(
      "dl",
      deliveryText
    )?.querySelector("dd")?.innerText;
    return priceToNumber(amountWithCurrency ?? "");
  }

  function priceToNumber(price) {
    if (typeof price !== "string") return 0;
    const maybeNumber = Number(price.replace(/[^0-9.-]+/g, ""));
    return isNaN(maybeNumber) ? 0 : maybeNumber;
  }

  function getGuestsOrders() {
    const orderTable = document.querySelector(
      "[class^=Tabs__root] [class^=Tabs__content]"
    );
    const guestsLineItems = Array.from(orderTable.querySelectorAll("li") || []);

    return guestsLineItems
      .map((item) => {
        const name = item.querySelector('[class*="GuestItem__listName"] span')
          ?.innerText;
        const price = priceToNumber(
          item.querySelector('[class*="GuestItem__price"]')?.innerText
        );

        return {
          name,
          price,
        };
      })
      .filter((guest) => guest.name && guest.price);
  }

  function updateOrderButtonToSaveGuestsOrders() {
    const sendOrderButton = document.querySelector(
      '[data-test-id="SendOrderButton"]'
    );
    sendOrderButton.onclick = () => {
      const guestsOrders = getGuestsOrders();
      const deliveryPrice = getDeliveryPrice();
      const orderTimestamp = Date.now();
      chrome.storage.local.set({ guestsOrders, deliveryPrice, orderTimestamp });
    };
    sendOrderButton.setAttribute(
      orderButtonHookSettings.saveOrdersAttribute,
      "true"
    );
  }

  async function addInviteGroupBtton() {
    const btn = await getBtn();
    const suggestedGuestsElement = getElementWithText(
      "h3",
      suggestedGuestsText
    );
    suggestedGuestsElement.appendChild(btn);
  }

  setInterval(() => {
    if (!isInviteGroupButtonExists() && isInInviteGroupPage()) {
      addInviteGroupBtton();
    }
    if (isOrderButtonExists() && !isOrderButtonUpdated()) {
      updateOrderButtonToSaveGuestsOrders();
    }
  }, 200);
})();
