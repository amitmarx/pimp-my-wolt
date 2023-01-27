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

  function getRestuarant() { //TODO - Use this function as a reference
    const location = document?.location?.pathname;
    const regex = /restaurant\/(.*)\//gm;
    const restaurant = location?.matchAll(regex)?.next()?.value?.[1];
    return restaurant;
  }

  function getTotalOrderPrice() {
    const amountWithCurrency = getElementWithText(
      "dl",
      totalText
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
      "[class^=Tabs-module__root] [class^=Tabs-module__content]"
    );
    const guestsLineItems = Array.from(
      orderTable?.querySelectorAll("li") || []
    );

    return guestsLineItems
      .map((item) => {
        const name = item.querySelector(
          '[class*="GuestItem-module__listName"] span'
        )?.innerText;
        const price = priceToNumber(
          item.querySelector('[class*="GuestItem-module__price"]')?.innerText
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
      const totalOrderPrice = getTotalOrderPrice();
      const guestsOrders = getGuestsOrders();
      const restaurant = getRestuarant();
      const orderTimestamp = Date.now();
      chrome.storage.local.set({
        totalOrderPrice,
        guestsOrders,
        orderTimestamp,
        restaurant,
      });
    };
    sendOrderButton.setAttribute(
      orderButtonHookSettings.saveOrdersAttribute,
      "true"
    );
  }

  module.exports = {updateOrderButtonToSaveGuestsOrders, getGuestsOrders, priceToNumber,
     getTotalOrderPrice, getRestuarant, inviteAllGuests};