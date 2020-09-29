(function () {
  const splitPaymentButtonSettings = {
    id: "split-payment-button-extension",
    text: "Split Payment",
  };

  const isPaymentButtonExists = () =>
    Boolean(document.getElementById("pnlBtnPay"));
  const isSplitPaymentButtonExists = () =>
    Boolean(document.getElementById(splitPaymentButtonSettings.id));

  function getElementWithText(element, text) {
    const xpath = `//${element}[.//*[contains(text(), "${text}")]]`;
    return document
      .evaluate(xpath, document, null, XPathResult.ANY_TYPE, null)
      .iterateNext();
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

  async function handleCibusPayment() {
    const guests = await getAllGuests();
    chrome.storage.local.get(
      ["deliveryPrice", "guestsOrders"],
      ({ deliveryPrice, guestsOrders }) => {
        const guestDeliveryShare = deliveryPrice / guestsOrders.length;
        const guestDebts = guestsOrders.map((guestOrder) => {
          const cibusName = guests.find(
            (guest) => guest.woltName === guestOrder.name
          )?.cibusName;
          return {
            cibusName,
            debt: guestOrder.price + guestDeliveryShare,
          };
        });
        setGuestsDebts(guestDebts);
      }
    );
  }

  async function setGuestsDebts(guestDebts) {
    for (guestDebt of guestDebts) {
      getElementWithText("label", guestDebt.cibusName)?.click();
    }

    for (guestDebt of guestDebts) {
      const guestInput = await waitForValue(() =>
        getElementWithText("label", guestDebt.cibusName)?.querySelector("input")
      );
      if (guestInput) {
        guestInput.value = guestDebt.debt;
        guestInput.dispatchEvent(
          new UIEvent("change", {
            view: window,
            bubbles: true,
            cancelable: true,
          })
        );
      }
    }
  }

  function waitForValue(f, attempts = 100) {
    return new Promise((res, rej) => {
      function tryGetValue(attempts) {
        const maybe = f();
        if (attempts === 0 || maybe) res(maybe);
        else {
          setTimeout(() => tryGetValue(attempts - 1), 10);
        }
      }
      tryGetValue(attempts);
    });
  }

  function getSplitPaymentButton() {
    const btn = document.createElement("button");
    btn.setAttribute("id", splitPaymentButtonSettings.id);
    btn.setAttribute("type", "button");
    const btnText = document.createTextNode(splitPaymentButtonSettings.text);
    btn.appendChild(btnText);
    btn.onclick = () => handleCibusPayment();
    return btn;
  }

  function addSplitPaymentButton() {
    const btn = getSplitPaymentButton();
    const paymentPanel = document.getElementById("pnlBtnPay");
    paymentPanel.appendChild(btn);
  }

  function openSplitPaymentTable() {
    document.querySelector('label[for="cbSplit"]').click();
  }

  setInterval(() => {
    if (isPaymentButtonExists() && !isSplitPaymentButtonExists()) {
      openSplitPaymentTable();
      addSplitPaymentButton();
    }
  }, 500);
})();
